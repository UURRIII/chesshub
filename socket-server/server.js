const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const mysql      = require('mysql2/promise');
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
        // fail-open: si la BD no és accessible no bloquejem missatges legítims entre amics reals.
        // ATENCIÓ: això permet DMs sense verificació d'amistat mentre la BD és caiguda.
        console.error('[DB][WARN] areFriends error — failing open (DM bypass possible):', e.message);
        return true;
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
    socket.on('make_move', ({ gameId, move, fen, turn }) => {
        const game = activeGames.get(gameId);
        if (!game || !move) return;

        const expectedId = game.turn === 'white' ? String(game.white) : String(game.black);
        if (!socket.verifiedUserId || socket.verifiedUserId !== expectedId) {
            console.warn(`[Socket] Moviment no autoritzat: ${socket.verifiedUserId} vs esperat ${expectedId}`);
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
    });

    // ── [FIX C4] Xat: userId/username/color derivats del servidor ────────────
    socket.on('chat_message', ({ gameId, message }) => {
        if (!message || !message.trim() || message.length > 200) return;
        if (!socket.verifiedUserId) return; // rebutja missatges no autenticats
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

    // ── Fi de partida ─────────────────────────────────────────────────────────
    socket.on('game_over', ({ gameId, result, reason }) => {
        if (!isGamePlayer(socket, gameId)) return;
        console.log(`[Socket] Partida ${gameId} acabada: ${result} per ${reason}`);
        endGame(gameId, result, reason);
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
