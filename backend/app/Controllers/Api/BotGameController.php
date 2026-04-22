<?php

namespace App\Controllers\Api;

use App\Models\BotGameModel;
use App\Models\BotMoveModel;
use App\Models\ProfileModel;
use CodeIgniter\RESTful\ResourceController;

class BotGameController extends ResourceController
{
    protected $format = 'json';

    public function create()
    {
        $userId   = $_SERVER["JWT_USER"]->sub;
        $color    = $this->request->getVar('color')    ?? 'white';
        $level    = $this->request->getVar('bot_level') ?? 5;
        $timeCtrl = $this->request->getVar('time_control') ?? 600;

        $gameId = (new BotGameModel())->insert([
            'user_id'      => $userId,
            'user_color'   => $color,
            'bot_level'    => min(max((int)$level, 1), 20),
            'status'       => 'ongoing',
            'time_control' => $timeCtrl,
            'started_at'   => date('Y-m-d H:i:s'),
        ]);

        return $this->respond([
            'status' => 'success',
            'data'   => ['game_id' => $gameId, 'color' => $color, 'bot_level' => $level],
        ], 201);
    }

    public function show($id = null)
    {
        $game = (new BotGameModel())->find($id);
        if (!$game) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no trobada'], 404);
        }

        $moves = (new BotMoveModel())->where('bot_game_id', $id)
                                     ->orderBy('move_number', 'ASC')
                                     ->findAll();

        return $this->respond([
            'status' => 'success',
            'data'   => ['game' => $game, 'moves' => $moves],
        ]);
    }

    public function move($id = null)
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $game   = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no vàlida'], 403);
        }

        if ($game['status'] !== 'ongoing') {
            return $this->respond(['status' => 'error', 'message' => 'La partida ha acabat'], 400);
        }

        $moveSan  = $this->request->getVar('move_san');
        $moveUci  = $this->request->getVar('move_uci');
        $fenAfter = $this->request->getVar('fen_after');
        $timeSp   = $this->request->getVar('time_spent');

        if (!$moveSan || !$moveUci || !$fenAfter) {
            return $this->respond(['status' => 'error', 'message' => 'Falten dades del moviment'], 422);
        }

        $botMoveModel = new BotMoveModel();
        $lastMove     = $botMoveModel->where('bot_game_id', $id)->orderBy('move_number', 'DESC')->first();
        $moveNumber   = $lastMove ? $lastMove['move_number'] + 1 : 1;

        // Guardar moviment de l'usuari
        $botMoveModel->insert([
            'bot_game_id' => $id,
            'move_number' => $moveNumber,
            'is_bot'      => 0,
            'move_san'    => $moveSan,
            'move_uci'    => $moveUci,
            'fen_after'   => $fenAfter,
            'time_spent'  => $timeSp,
        ]);

        // Demanar moviment a Stockfish
        $botMove = $this->getStockfishMove($fenAfter, $game['bot_level']);

        if ($botMove) {
            $botMoveModel->insert([
                'bot_game_id' => $id,
                'move_number' => $moveNumber + 1,
                'is_bot'      => 1,
                'move_san'    => $botMove['san'] ?? $botMove['uci'],
                'move_uci'    => $botMove['uci'],
                'fen_after'   => $botMove['fen'] ?? $fenAfter,
                'time_spent'  => null,
            ]);
        }

        return $this->respond([
            'status' => 'success',
            'data'   => ['bot_move' => $botMove],
        ]);
    }

    public function resign($id = null)
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $game   = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no vàlida'], 403);
        }

        (new BotGameModel())->update($id, [
            'status'     => 'finished',
            'result'     => 'bot',
            'end_reason' => 'resignation',
            'ended_at'   => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['status' => 'success', 'message' => 'Has abandonat la partida']);
    }

    private function getStockfishMove(string $fen, int $level): ?array
    {
        // Stockfish via UCI per línia de comandes
        // Al servidor usarem el binari stockfish instal·lat al pod
        $stockfishPath = env('STOCKFISH_PATH', '/usr/games/stockfish');

        if (!file_exists($stockfishPath)) {
            // Fallback: moviment aleatori si no hi ha Stockfish
            return null;
        }

        $depth = min(5 + $level, 20);
        $cmd   = "echo -e 'position fen {$fen}\ngo depth {$depth}' | {$stockfishPath} 2>/dev/null";
        $output = shell_exec($cmd);

        if (!$output) return null;

        preg_match('/bestmove\s+(\S+)/', $output, $matches);
        if (!isset($matches[1]) || $matches[1] === '(none)') return null;

        return ['uci' => $matches[1], 'san' => $matches[1]];
    }
}
