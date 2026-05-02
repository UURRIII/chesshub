const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:4200',
        methods: ['GET', 'POST'],
    }
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', rooms: activeGames.size });
});

// gameId -> { white, black, fen, turn, lastActivity, chat[] }
const activeGames = new Map();

io.on('connection', (socket) => {
    console.log(`[Socket] Connectat: ${socket.id}`);

    // ── Unir-se a una sala (jugador o espectador) ─────────────────────────────
    socket.on('join_game', ({ gameId, userId, color }) => {
        socket.join(`game_${gameId}`);
        socket.gameId      = gameId;
        socket.userId      = userId;
        socket.color       = color;
        socket.isSpectator = (color === 'spectator');

        if (!activeGames.has(gameId)) {
            activeGames.set(gameId, {
                white:        null,
                black:        null,
                fen:          'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                turn:         'white',
                lastActivity: Date.now(),
                chat:         [],
            });
        }

        const game = activeGames.get(gameId);

        if (color === 'white') game.white = userId;
        if (color === 'black') game.black = userId;

        if (socket.isSpectator) {
            console.log(`[Socket] Espectador ${userId} s'ha unit a partida ${gameId}`);
            socket.emit('game_state', { fen: game.fen, turn: game.turn, chat: game.chat.slice(-50) });
            io.to(`game_${gameId}`).emit('spectator_count', { count: getSpectatorCount(gameId) });
        } else {
            console.log(`[Socket] Usuari ${userId} s'ha unit a partida ${gameId} com a ${color}`);
            socket.to(`game_${gameId}`).emit('player_joined', { userId, color });
            if (game.white && game.black) {
                io.to(`game_${gameId}`).emit('game_start', { fen: game.fen, turn: game.turn });
            }
        }
    });

    // ── Moviment ──────────────────────────────────────────────────────────────
    socket.on('make_move', ({ gameId, move, fen, turn }) => {
        const game = activeGames.get(gameId);
        if (!game) return;
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

    // ── Fi de partida ─────────────────────────────────────────────────────────
    socket.on('game_over', ({ gameId, result, reason }) => {
        console.log(`[Socket] Partida ${gameId} acabada: ${result} per ${reason}`);
        io.to(`game_${gameId}`).emit('game_ended', { result, reason });
        activeGames.delete(gameId);
    });

    // ── Taules ────────────────────────────────────────────────────────────────
    socket.on('offer_draw',   ({ gameId, userId }) => { socket.to(`game_${gameId}`).emit('draw_offered', { userId }); });
    socket.on('accept_draw',  ({ gameId })         => { io.to(`game_${gameId}`).emit('game_ended', { result: 'draw', reason: 'agreement' }); activeGames.delete(gameId); });
    socket.on('decline_draw', ({ gameId })         => { socket.to(`game_${gameId}`).emit('draw_declined'); });

    // ── Rendició ──────────────────────────────────────────────────────────────
    socket.on('resign', ({ gameId, userId, color }) => {
        const result = color === 'white' ? 'black' : 'white';
        io.to(`game_${gameId}`).emit('game_ended', { result, reason: 'resignation' });
        activeGames.delete(gameId);
    });

    // ── Rellotge ──────────────────────────────────────────────────────────────
    socket.on('time_update', ({ gameId, white_time, black_time }) => { socket.to(`game_${gameId}`).emit('clock_sync', { white_time, black_time }); });
    socket.on('timeout',     ({ gameId, color }) => {
        const result = color === 'white' ? 'black' : 'white';
        io.to(`game_${gameId}`).emit('game_ended', { result, reason: 'timeout' });
        activeGames.delete(gameId);
    });

    // ── Desconnexió ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[Socket] Desconnectat: ${socket.id}`);
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
