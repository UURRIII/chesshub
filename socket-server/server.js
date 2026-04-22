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

// Mapa de partides actives: gameId -> { white, black, fen, turn }
const activeGames = new Map();

io.on('connection', (socket) => {
    console.log(`[Socket] Connectat: ${socket.id}`);

    // Unir-se a una sala de joc
    socket.on('join_game', ({ gameId, userId, color }) => {
        socket.join(`game_${gameId}`);
        socket.gameId  = gameId;
        socket.userId  = userId;
        socket.color   = color;

        if (!activeGames.has(gameId)) {
            activeGames.set(gameId, {
                white: null,
                black: null,
                fen:   'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                turn:  'white',
            });
        }

        const game = activeGames.get(gameId);
        if (color === 'white') game.white = userId;
        if (color === 'black') game.black = userId;

        console.log(`[Socket] Usuari ${userId} s'ha unit a la partida ${gameId} com a ${color}`);

        // Notifica els altres jugadors
        socket.to(`game_${gameId}`).emit('player_joined', { userId, color });

        // Si els dos jugadors estan connectats, inicia la partida
        if (game.white && game.black) {
            io.to(`game_${gameId}`).emit('game_start', {
                fen:  game.fen,
                turn: game.turn,
            });
        }
    });

    // Moviment d'un jugador
    socket.on('make_move', ({ gameId, move, fen, turn }) => {
        const game = activeGames.get(gameId);
        if (!game) return;

        game.fen  = fen;
        game.turn = turn;

        console.log(`[Socket] Moviment a partida ${gameId}: ${move.san}`);

        // Envia el moviment a l'altre jugador
        socket.to(`game_${gameId}`).emit('move_made', { move, fen, turn });
    });

    // Fi de partida
    socket.on('game_over', ({ gameId, result, reason }) => {
        console.log(`[Socket] Partida ${gameId} acabada: ${result} per ${reason}`);

        io.to(`game_${gameId}`).emit('game_ended', { result, reason });
        activeGames.delete(gameId);
    });

    // Oferir taules
    socket.on('offer_draw', ({ gameId, userId }) => {
        socket.to(`game_${gameId}`).emit('draw_offered', { userId });
    });

    socket.on('accept_draw', ({ gameId }) => {
        io.to(`game_${gameId}`).emit('game_ended', { result: 'draw', reason: 'agreement' });
        activeGames.delete(gameId);
    });

    socket.on('decline_draw', ({ gameId }) => {
        socket.to(`game_${gameId}`).emit('draw_declined');
    });

    // Rendició
    socket.on('resign', ({ gameId, userId, color }) => {
        const result = color === 'white' ? 'black' : 'white';
        io.to(`game_${gameId}`).emit('game_ended', { result, reason: 'resignation' });
        activeGames.delete(gameId);
    });

    // Rellotge
    socket.on('time_update', ({ gameId, white_time, black_time }) => {
        socket.to(`game_${gameId}`).emit('clock_sync', { white_time, black_time });
    });

    socket.on('timeout', ({ gameId, color }) => {
        const result = color === 'white' ? 'black' : 'white';
        io.to(`game_${gameId}`).emit('game_ended', { result, reason: 'timeout' });
        activeGames.delete(gameId);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Desconnectat: ${socket.id}`);
        if (socket.gameId) {
            socket.to(`game_${socket.gameId}`).emit('player_disconnected', {
                userId: socket.userId,
                color:  socket.color,
            });
        }
    });
});

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
    console.log(`[Socket.IO] Server corrent al port ${PORT}`);
});
