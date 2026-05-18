const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const JWT_SECRET   = process.env.JWT_SECRET   || 'chesshub_secret';

const io = new Server(server, {
    cors: {
        origin: [FRONTEND_URL, 'http://localhost:4200', 'http://grup4.infla.cat'],
        methods: ['GET', 'POST'],
    }
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', rooms: activeGames.size });
});

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
// Un client sense token vàlid (verifiedUserId null) mai compta com a jugador.
function isGamePlayer(socket, gameId) {
    if (!socket.verifiedUserId) return false;
    const game = activeGames.get(gameId);
    if (!game) return false;
    return socket.verifiedUserId === String(game.white)
        || socket.verifiedUserId === String(game.black);
}

// ── Rellotge autoritzat del servidor ──────────────────────────────────────────
//  Un únic interval recorre les partides actives, descompta el temps del
//  jugador del torn i emet 'clock_sync' a tota la sala cada segon.
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

        // Només un usuari amb token verificat pot ocupar un lloc de jugador
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

        // Cal un token verificat i ser el jugador del torn correcte
        const expectedId = game.turn === 'white' ? String(game.white) : String(game.black);
        if (!socket.verifiedUserId || socket.verifiedUserId !== expectedId) {
            console.warn(`[Socket] Moviment no autoritzat: ${socket.verifiedUserId} vs esperat ${expectedId}`);
            return;
        }

        // Comptabilitza el temps pensat al jugador que acaba de moure i
        // reinicia el comptador perquè el rival no hereti aquest temps.
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

    // ── Xat ───────────────────────────────────────────────────────────────────
    socket.on('chat_message', ({ gameId, userId, username, message, color }) => {
        if (!message || !message.trim() || message.length > 200) return;
        const game = activeGames.get(gameId);
        if (!game) return;
        const msg = { userId, username, message: message.trim(), color: color || 'spectator', ts: Date.now() };
        game.chat.push(msg);
        if (game.chat.length > 100) game.chat.shift();
        io.to(`game_${gameId}`).emit('chat_message', msg);
    });

    // ── Fi de partida (només un jugador autenticat de la partida) ─────────────
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

    // ── Timeout reportat per un client (fallback; el servidor ja el detecta) ──
    socket.on('timeout', ({ gameId, color }) => {
        if (!isGamePlayer(socket, gameId)) return;
        const result = color === 'white' ? 'black' : 'white';
        endGame(gameId, result, 'timeout');
    });

    // ── Revenja (només jugadors, no espectadors) ──────────────────────────────
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

    // ── Lobby: unir-se al lobby ───────────────────────────────────────────────
    socket.on('lobby_join', ({ userId, username }) => {
        const uid = socket.verifiedUserId || String(userId);
        socket.lobbyUserId   = uid;
        socket.lobbyUsername = username;
        socket.inLobby       = true;
        lobbyUsers.set(uid, { username, socketId: socket.id });
        broadcastLobby();
    });

    // ── Lobby: enviar repte ───────────────────────────────────────────────────
    socket.on('send_challenge', ({ toUserId, timeControl }) => {
        const fromId       = socket.verifiedUserId || socket.lobbyUserId;
        const fromUsername = socket.lobbyUsername || 'Usuari';
        if (!fromId) return;
        const target = lobbyUsers.get(String(toUserId));
        if (!target) { socket.emit('challenge_error', { message: 'Usuari no disponible' }); return; }
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (!targetSocket) { socket.emit('challenge_error', { message: 'Usuari no disponible' }); return; }
        targetSocket.emit('challenge_received', { fromUserId: fromId, fromUsername, timeControl: timeControl || 600 });
    });

    // ── Lobby: acceptar repte ─────────────────────────────────────────────────
    socket.on('accept_challenge', ({ fromUserId, gameId }) => {
        const fromUser = lobbyUsers.get(String(fromUserId));
        if (!fromUser) return;
        const fromSocket = io.sockets.sockets.get(fromUser.socketId);
        if (fromSocket) {
            fromSocket.emit('challenge_accepted', {
                byUserId:   socket.lobbyUserId || socket.verifiedUserId,
                byUsername: socket.lobbyUsername || 'Oponent',
                gameId,
            });
        }
    });

    // ── Lobby: rebutjar repte ─────────────────────────────────────────────────
    socket.on('decline_challenge', ({ fromUserId }) => {
        const fromUser = lobbyUsers.get(String(fromUserId));
        if (!fromUser) return;
        const fromSocket = io.sockets.sockets.get(fromUser.socketId);
        if (fromSocket) {
            fromSocket.emit('challenge_declined', {
                byUserId:   socket.lobbyUserId || socket.verifiedUserId,
                byUsername: socket.lobbyUsername || 'Oponent',
            });
        }
    });

    // ── Missatge directe entre amics (entrega en temps real) ──────────────────
    socket.on('dm', ({ toUserId, body, senderName }) => {
        const fromId = socket.verifiedUserId || socket.lobbyUserId;
        if (!fromId || !body) return;
        const target = lobbyUsers.get(String(toUserId));
        if (!target) return;
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) {
            targetSocket.emit('dm_received', {
                fromUserId: fromId,
                senderName: senderName || socket.lobbyUsername || 'Amic',
                body:       String(body).slice(0, 500),
                ts:         Date.now(),
            });
        }
    });

    // ── Desconnexió ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[Socket] Desconnectat: ${socket.id}`);

        // Eliminar del lobby
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

        // Si la sala ha quedat buida (cap jugador ni espectador), alliberem
        // la partida de memòria — tant si estava acabada com abandonada.
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
