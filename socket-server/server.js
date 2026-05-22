const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cors         = require('cors');
const jwt          = require('jsonwebtoken');
const mysql        = require('mysql2/promise');
const { Chess }    = require('chess.js');
require('dotenv').config();

// ── [FIX C1] JWT_SECRET: falla ràpid si no està definit al entorn ─────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET no està definit. Afegeix-lo al .env o als secrets de K8s.');
    process.exit(1);
}

const app    = express();
const server = http.createServer(app);

// ── [FIX S1] CORS: orígens des de variable d'entorn ──────────────────────────
const rawOrigins  = process.env.ALLOWED_ORIGINS || 'http://localhost:4200';
const CORS_ORIGINS = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: CORS_ORIGINS,
        methods: ['GET', 'POST'],
    }
});

app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json());

// ── [FIX S2] /health: no exposa estat intern ──────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// ── [FIX C3] Pool MySQL per verificar amistats (dm) ───────────────────────────
const dbPool = mysql.createPool({
    host:            process.env.DB_HOSTNAME || 'mariadb',
    port:            Number(process.env.DB_PORT)     || 3306,
    user:            process.env.DB_USERNAME || 'chesshub',
    password:        process.env.DB_PASSWORD || '',
    database:        process.env.DB_DATABASE || 'chesshub',
    waitForConnections: true,
    connectionLimit:    5,
    queueLimit:         0,
});

async function areFriends(userId1, userId2) {
    try {
        const [rows] = await dbPool.query(
            `SELECT 1 FROM friendships
             WHERE status = 'accepted'
               AND ((requester_id = ? AND addressee_id = ?)
                 OR (requester_id = ? AND addressee_id = ?))
             LIMIT 1`,
            [userId1, userId2, userId2, userId1]
        );
        return rows.length > 0;
    } catch (e) {
        // [A3] fail-closed: si la BD no és accessible rebutgem DMs per seguretat.
        // Preferim perdre missatges legítims puntuals que permetre DMs entre no-amics.
        console.error('[DB][WARN] areFriends error — failing closed:', e.message);
        return false;
    }
}

// [A2] Comprova si un usuari segueix actiu a la BD.
// Cache de 30 s per evitar una consulta per cada moviment en partides ràpides.
// En el pitjor cas, un compte desactivat triga ≤ 30 s a ser expulsat del socket.
const activeCheckCache = new Map(); // userId -> { active: bool, ts: number }
const ACTIVE_CHECK_TTL_MS = 30_000;

async function isUserActive(userId) {
    const cached = activeCheckCache.get(userId);
    if (cached && Date.now() - cached.ts < ACTIVE_CHECK_TTL_MS) {
        return cached.active;
    }
    try {
        const [rows] = await dbPool.query('SELECT is_active FROM users WHERE id = ?', [userId]);
        const active = rows.length > 0 && !!rows[0].is_active;
        activeCheckCache.set(userId, { active, ts: Date.now() });
        return active;
    } catch {
        return true; // fail-open: no tallem partides en curs per un error puntual de BD
    }
}

// ── JWT middleware: verifica el token al handshake ────────────────────────────
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.verifiedUserId = String(decoded.sub);
        } catch (e) {
            socket.verifiedUserId = null;
        }
    } else {
        socket.verifiedUserId = null; // espectadors sense token
    }
    next();
});

// gameId -> { white, black, fen, turn, timeControl, whiteTime, blackTime,
//             started, finished, lastTick, lastActivity, chat[] }
const activeGames = new Map();

// userId -> { username, socketId }
const lobbyUsers = new Map();

// ── [FIX C2] pendingChallenges: toUserId -> { fromUserId, timeControl, ts } ──
const pendingChallenges = new Map();

// ── [FIX S3] Rate limiting per send_challenge ─────────────────────────────────
const challengeLastSent = new Map(); // fromUserId -> timestamp
const CHALLENGE_COOLDOWN_MS = 5000;

// ── Rate limiting per make_move i chat_message (per socket) ───────────────────
// Prevé que un client maliciós inundi el servidor amb events d'alta freqüència.
// make_move: màx 5 moviments/s (raonable fins a Bullet 1 min)
// chat_message: màx 3 missatges cada 2 s
const moveLastTick   = new Map(); // socketId -> { count, windowStart }
const chatLastTick   = new Map(); // socketId -> { count, windowStart }
const MOVE_LIMIT     = 5;    // màx moves per MOVE_WINDOW_MS
const MOVE_WINDOW_MS = 1000;
const CHAT_LIMIT     = 3;    // màx missatges per CHAT_WINDOW_MS
const CHAT_WINDOW_MS = 2000;

function isRateLimited(map, socketId, limit, windowMs) {
    const now   = Date.now();
    const entry = map.get(socketId) || { count: 0, windowStart: now };
    if (now - entry.windowStart > windowMs) {
        // Nova finestra
        map.set(socketId, { count: 1, windowStart: now });
        return false;
    }
    if (entry.count >= limit) return true;
    entry.count++;
    map.set(socketId, entry);
    return false;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ── Helpers compartits ────────────────────────────────────────────────────────

// Tanca una partida: la marca acabada, avisa la sala i l'allibera de memòria.
function endGame(gameId, result, reason) {
    const game = activeGames.get(gameId);
    if (game) game.finished = true;
    io.to(`game_${gameId}`).emit('game_ended', { result, reason });
    activeGames.delete(gameId);
}

// Difon la llista d'usuaris connectats al lobby.
function broadcastLobby() {
    io.emit('lobby_users', Array.from(lobbyUsers.entries())
        .map(([id, u]) => ({ userId: id, username: u.username })));
}

// Cert si el socket és un JUGADOR AUTENTICAT de la partida indicada.
function isGamePlayer(socket, gameId) {
    if (!socket.verifiedUserId) return false;
    const game = activeGames.get(gameId);
    if (!game) return false;
    return socket.verifiedUserId === String(game.white)
        || socket.verifiedUserId === String(game.black);
}

// Neteja desafiaments expirats (> 60 s sense resposta).
setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [toId, ch] of pendingChallenges) {
        if (ch.ts < cutoff) pendingChallenges.delete(toId);
    }
}, 30_000);

// ── Rellotge autoritzat del servidor ──────────────────────────────────────────
setInterval(() => {
    const now = Date.now();
    for (const [gameId, game] of activeGames) {
        if (!game.started || game.finished) continue;

        const elapsed = (now - game.lastTick) / 1000;
        game.lastTick = now;

        if (game.turn === 'white') game.whiteTime -= elapsed;
        else                       game.blackTime -= elapsed;

        const room = `game_${gameId}`;

        if (game.whiteTime <= 0) {
            game.whiteTime = 0;
            io.to(room).emit('clock_sync', { white_time: 0, black_time: Math.ceil(game.blackTime) });
            endGame(gameId, 'black', 'timeout');
            continue;
        }
        if (game.blackTime <= 0) {
            game.blackTime = 0;
            io.to(room).emit('clock_sync', { white_time: Math.ceil(game.whiteTime), black_time: 0 });
            endGame(gameId, 'white', 'timeout');
            continue;
        }

        io.to(room).emit('clock_sync', {
            white_time: Math.ceil(game.whiteTime),
            black_time: Math.ceil(game.blackTime),
        });
    }
}, 1000);

io.on('connection', (socket) => {
    console.log(`[Socket] Connectat: ${socket.id}`);

    // ── Unir-se a una sala (jugador o espectador) ─────────────────────────────
    socket.on('join_game', ({ gameId, userId, color, timeControl }) => {
        socket.join(`game_${gameId}`);
        socket.gameId      = gameId;
        socket.userId      = socket.verifiedUserId || String(userId);
        socket.color       = color;
        socket.isSpectator = (color === 'spectator');

        if (!activeGames.has(gameId)) {
            const tc = Number(timeControl) > 0 ? Number(timeControl) : 600;
            activeGames.set(gameId, {
                white:        null,
                black:        null,
                fen:          START_FEN,
                turn:         'white',
                timeControl:  tc,
                whiteTime:    tc,
                blackTime:    tc,
                started:      false,
                finished:     false,
                lastTick:     Date.now(),
                lastActivity: Date.now(),
                chat:         [],
            });
        }

        const game = activeGames.get(gameId);

        if (color === 'white' && socket.verifiedUserId) game.white = socket.verifiedUserId;
        if (color === 'black' && socket.verifiedUserId) game.black = socket.verifiedUserId;

        if (socket.isSpectator) {
            console.log(`[Socket] Espectador ${socket.userId} s'ha unit a partida ${gameId}`);
            socket.emit('game_state', {
                fen: game.fen, turn: game.turn, chat: game.chat.slice(-50),
                white_time: Math.ceil(game.whiteTime), black_time: Math.ceil(game.blackTime),
            });
            io.to(`game_${gameId}`).emit('spectator_count', { count: getSpectatorCount(gameId) });
        } else {
            console.log(`[Socket] Usuari ${socket.userId} s'ha unit a partida ${gameId} com a ${color}`);
            socket.to(`game_${gameId}`).emit('player_joined', { userId: socket.userId, color });
            if (game.white && game.black) {
                if (!game.started) {
                    game.started  = true;
                    game.lastTick = Date.now();
                }
                io.to(`game_${gameId}`).emit('game_start', { fen: game.fen, turn: game.turn });
            }
        }
    });

    // ── Moviment ──────────────────────────────────────────────────────────────
    socket.on('make_move', async ({ gameId, move, fen, turn }) => {
        if (isRateLimited(moveLastTick, socket.id, MOVE_LIMIT, MOVE_WINDOW_MS)) {
            console.warn(`[Socket] make_move rate limit: ${socket.id}`);
            return;
        }
        const game = activeGames.get(gameId);
        if (!game || !move) return;

        const expectedId = game.turn === 'white' ? String(game.white) : String(game.black);
        if (!socket.verifiedUserId || socket.verifiedUserId !== expectedId) {
            console.warn(`[Socket] Moviment no autoritzat: ${socket.verifiedUserId} vs esperat ${expectedId}`);
            return;
        }

        // [A2] Comprova que el compte segueix actiu (cache 30 s).
        // Un usuari desactivat mentre tenia la partida oberta quedarà expulsat aquí.
        if (!await isUserActive(socket.verifiedUserId)) {
            console.warn(`[Socket] make_move rebutjat: compte desactivat ${socket.verifiedUserId}`);
            socket.emit('error', { message: 'Compte desactivat' });
            socket.disconnect(true);
            return;
        }

        if (game.started && !game.finished) {
            const now = Date.now();
            const elapsed = (now - game.lastTick) / 1000;
            if (game.turn === 'white') game.whiteTime = Math.max(0, game.whiteTime - elapsed);
            else                       game.blackTime = Math.max(0, game.blackTime - elapsed);
            game.lastTick = now;
        }

        game.fen = fen; game.turn = turn; game.lastActivity = Date.now();
        console.log(`[Socket] Moviment a partida ${gameId}: ${move.san}`);
        socket.to(`game_${gameId}`).emit('move_made', { move, fen, turn });

        // ── Detecció de fi de partida al servidor (autoritzat) ───────────────
        // Fem servir chess.js per validar el FEN enviat i detectar escac i mat,
        // taules, etc. Això evita que el client hagi d'enviar un event addicional
        // i soluciona el problema que el guanyador no veia el missatge de victòria.
        try {
            const checker = new Chess();
            const loaded  = checker.load(fen);
            if (loaded !== false && checker.isGameOver()) {
                let result = 'draw';
                let reason = 'draw';
                if (checker.isCheckmate()) {
                    // El torn actual (data.turn) és el jugador que HA DE MOURE però
                    // està en escac i mat → el que ACABA DE MOURE és el guanyador.
                    result = turn === 'white' ? 'black' : 'white';
                    reason = 'checkmate';
                } else if (checker.isStalemate()) {
                    reason = 'stalemate';
                } else if (checker.isThreefoldRepetition()) {
                    reason = 'repetition';
                } else if (checker.isInsufficientMaterial()) {
                    reason = 'insufficient';
                }
                console.log(`[Socket] Fi de partida detectat al servidor: ${gameId} -> ${result} per ${reason}`);
                endGame(gameId, result, reason);
            }
        } catch (e) {
            console.error('[Socket] Error detectant fi de partida:', e.message);
        }
    });

    // ── [FIX C4] Xat: userId/username/color derivats del servidor ────────────
    socket.on('chat_message', async ({ gameId, message }) => {
        if (isRateLimited(chatLastTick, socket.id, CHAT_LIMIT, CHAT_WINDOW_MS)) {
            console.warn(`[Socket] chat_message rate limit: ${socket.id}`);
            return;
        }
        if (!message || !message.trim() || message.length > 200) return;
        if (!socket.verifiedUserId) return; // rebutja missatges no autenticats

        // [A2] Comprova que el compte segueix actiu abans d'acceptar el missatge.
        if (!await isUserActive(socket.verifiedUserId)) {
            socket.emit('error', { message: 'Compte desactivat' });
            socket.disconnect(true);
            return;
        }

        const game = activeGames.get(gameId);
        if (!game) return;

        // Deriva el color a partir de la partida (no del client)
        let color = 'spectator';
        if (socket.verifiedUserId === String(game.white))      color = 'white';
        else if (socket.verifiedUserId === String(game.black)) color = 'black';

        // El username es pren del lobby si l'usuari hi és; sino el socket el pot tenir guardat
        const username = lobbyUsers.get(socket.verifiedUserId)?.username
            || socket.lobbyUsername
            || `Usuari#${socket.verifiedUserId}`;

        const msg = {
            userId:   socket.verifiedUserId,
            username,
            message:  message.trim(),
            color,
            ts:       Date.now(),
        };
        game.chat.push(msg);
        if (game.chat.length > 100) game.chat.shift();
        io.to(`game_${gameId}`).emit('chat_message', msg);
    });

    // ── Taules ────────────────────────────────────────────────────────────────
    socket.on('offer_draw', ({ gameId, userId }) => {
        if (!isGamePlayer(socket, gameId)) return;
        socket.to(`game_${gameId}`).emit('draw_offered', { userId });
    });

    socket.on('accept_draw', ({ gameId }) => {
        if (!isGamePlayer(socket, gameId)) return;
        endGame(gameId, 'draw', 'agreement');
    });

    socket.on('decline_draw', ({ gameId }) => {
        if (!isGamePlayer(socket, gameId)) return;
        socket.to(`game_${gameId}`).emit('draw_declined');
    });

    // ── Rendició ──────────────────────────────────────────────────────────────
    socket.on('resign', ({ gameId, color }) => {
        if (!isGamePlayer(socket, gameId)) return;
        if (socket.color && socket.color !== color) return;
        const result = color === 'white' ? 'black' : 'white';
        endGame(gameId, result, 'resignation');
    });

    // ── Timeout reportat per un client (fallback) ─────────────────────────────
    socket.on('timeout', ({ gameId, color }) => {
        if (!isGamePlayer(socket, gameId)) return;
        const result = color === 'white' ? 'black' : 'white';
        endGame(gameId, result, 'timeout');
    });

    // ── Revenja ───────────────────────────────────────────────────────────────
    socket.on('rematch_offer', ({ gameId }) => {
        if (socket.isSpectator) return;
        socket.to(`game_${gameId}`).emit('rematch_offered', { gameId });
    });

    socket.on('rematch_accept', ({ gameId, newGameId }) => {
        if (socket.isSpectator) return;
        socket.to(`game_${gameId}`).emit('rematch_accepted', { newGameId });
    });

    socket.on('rematch_decline', ({ gameId }) => {
        if (socket.isSpectator) return;
        socket.to(`game_${gameId}`).emit('rematch_declined');
    });

    // ── Lobby: unir-se ────────────────────────────────────────────────────────
    socket.on('lobby_join', ({ username }) => {
        // [FIX S4] userId SEMPRE des de verifiedUserId; username client-supplied (cosmètic)
        const uid = socket.verifiedUserId;
        if (!uid) return; // rebutja usuaris sense token
        const safeUsername = String(username || '').slice(0, 32) || `Usuari#${uid}`;
        socket.lobbyUserId   = uid;
        socket.lobbyUsername = safeUsername;
        socket.inLobby       = true;
        lobbyUsers.set(uid, { username: safeUsername, socketId: socket.id });
        broadcastLobby();
    });

    // ── [FIX S3] Lobby: enviar repte amb rate limiting ────────────────────────
    socket.on('send_challenge', ({ toUserId, timeControl }) => {
        const fromId = socket.verifiedUserId || socket.lobbyUserId;
        if (!fromId) return;

        // Rate limit: 1 repte cada 5 s per usuari
        const now  = Date.now();
        const last = challengeLastSent.get(fromId) || 0;
        if (now - last < CHALLENGE_COOLDOWN_MS) {
            socket.emit('challenge_error', { message: 'Espera uns segons abans de tornar a reptar.' });
            return;
        }
        challengeLastSent.set(fromId, now);

        const toId = String(toUserId);
        const target = lobbyUsers.get(toId);
        if (!target) { socket.emit('challenge_error', { message: 'Usuari no disponible' }); return; }
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (!targetSocket) { socket.emit('challenge_error', { message: 'Usuari no disponible' }); return; }

        const fromUsername = socket.lobbyUsername || 'Usuari';
        const tc = Math.max(60, Math.min(Number(timeControl) || 600, 3600));

        // [FIX C2] Guarda el repte pendent per validar accept/decline
        pendingChallenges.set(toId, { fromUserId: fromId, fromUsername, timeControl: tc, ts: now });

        targetSocket.emit('challenge_received', { fromUserId: fromId, fromUsername, timeControl: tc });
    });

    // ── [FIX C2] Lobby: acceptar repte amb validació ──────────────────────────
    socket.on('accept_challenge', ({ fromUserId, gameId }) => {
        const myId = socket.verifiedUserId || socket.lobbyUserId;
        if (!myId) return;

        // Verifica que existia un repte pendent d'aquest usuari cap a mi
        const pending = pendingChallenges.get(myId);
        if (!pending || String(pending.fromUserId) !== String(fromUserId)) {
            console.warn(`[Socket] accept_challenge sense repte pendent: ${myId} <- ${fromUserId}`);
            return;
        }
        pendingChallenges.delete(myId);

        const fromUser = lobbyUsers.get(String(fromUserId));
        if (!fromUser) return;
        const fromSocket = io.sockets.sockets.get(fromUser.socketId);
        if (fromSocket) {
            fromSocket.emit('challenge_accepted', {
                byUserId:   myId,
                byUsername: socket.lobbyUsername || 'Oponent',
                gameId,
            });
        }
    });

    // ── [FIX C2] Lobby: rebutjar repte amb validació ──────────────────────────
    socket.on('decline_challenge', ({ fromUserId }) => {
        const myId = socket.verifiedUserId || socket.lobbyUserId;
        if (!myId) return;

        const pending = pendingChallenges.get(myId);
        if (!pending || String(pending.fromUserId) !== String(fromUserId)) {
            // No bloquem: pot ser que el repte hagi expirat, però avisem igualment
            console.warn(`[Socket] decline_challenge sense repte pendent: ${myId} <- ${fromUserId}`);
        }
        pendingChallenges.delete(myId);

        const fromUser = lobbyUsers.get(String(fromUserId));
        if (!fromUser) return;
        const fromSocket = io.sockets.sockets.get(fromUser.socketId);
        if (fromSocket) {
            fromSocket.emit('challenge_declined', {
                byUserId:   myId,
                byUsername: socket.lobbyUsername || 'Oponent',
            });
        }
    });

    // ── [FIX C3] Missatge directe: verifica amistat via BD ───────────────────
    socket.on('dm', async ({ toUserId, body }) => {
        const fromId = socket.verifiedUserId;
        if (!fromId || !body) return;

        const toId = String(toUserId);

        // Ambdós han de ser autenticats
        const target = lobbyUsers.get(toId);
        if (!target) return;

        // Verifica amistat a la BD
        const friends = await areFriends(fromId, toId);
        if (!friends) {
            console.warn(`[Socket] dm rebutjat: ${fromId} -> ${toId} (no amics)`);
            return;
        }

        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) {
            targetSocket.emit('dm_received', {
                fromUserId: fromId,
                senderName: socket.lobbyUsername || `Usuari#${fromId}`,
                body:       String(body).slice(0, 500),
                ts:         Date.now(),
            });
        }
    });

    // ── Lobby: sortir explícitament (sense desconnectar el socket) ───────────
    socket.on('lobby_leave', () => {
        if (socket.inLobby && socket.lobbyUserId) {
            socket.inLobby = false;
            lobbyUsers.delete(socket.lobbyUserId);
            broadcastLobby();
        }
    });

    // ── Desconnexió ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[Socket] Desconnectat: ${socket.id}`);
        // Neteja les entrades de rate limiting i cache d'activitat per alliberar memòria
        moveLastTick.delete(socket.id);
        chatLastTick.delete(socket.id);
        if (socket.verifiedUserId) activeCheckCache.delete(socket.verifiedUserId);

        if (socket.inLobby && socket.lobbyUserId) {
            lobbyUsers.delete(socket.lobbyUserId);
            broadcastLobby();
        }

        if (!socket.gameId) return;

        if (socket.isSpectator) {
            io.to(`game_${socket.gameId}`).emit('spectator_count', { count: getSpectatorCount(socket.gameId) });
        } else {
            socket.to(`game_${socket.gameId}`).emit('player_disconnected', { userId: socket.userId, color: socket.color });
        }

        const room = io.sockets.adapter.rooms.get(`game_${socket.gameId}`);
        if (!room || room.size === 0) {
            activeGames.delete(socket.gameId);
            console.log(`[Socket] Partida ${socket.gameId} eliminada (sala buida)`);
            return;
        }

        // Si no queda cap JUGADOR (només espectadors), allibera la partida.
        // Sense això, els espectadors mantindrien la partida en memòria indefinidament.
        if (!socket.isSpectator) {
            let hasPlayer = false;
            for (const sid of room) {
                const s = io.sockets.sockets.get(sid);
                if (s && !s.isSpectator) { hasPlayer = true; break; }
            }
            if (!hasPlayer) {
                activeGames.delete(socket.gameId);
                console.log(`[Socket] Partida ${socket.gameId} eliminada (sense jugadors, ${room.size} espectadors)`);
            }
        }
    });
});

function getSpectatorCount(gameId) {
    let count = 0;
    const room = io.sockets.adapter.rooms.get(`game_${gameId}`);
    if (!room) return 0;
    for (const sid of room) {
        const s = io.sockets.sockets.get(sid);
        if (s && s.isSpectator) count++;
    }
    return count;
}

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
    console.log(`[Socket.IO] Server corrent al port ${PORT}`);
});
