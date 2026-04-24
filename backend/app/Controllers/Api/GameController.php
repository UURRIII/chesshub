<?php

namespace App\Controllers\Api;

use App\Models\GameModel;
use App\Models\MoveModel;
use App\Models\ProfileModel;
use App\Models\EloHistoryModel;
use CodeIgniter\RESTful\ResourceController;

class GameController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $db     = \Config\Database::connect();

        $games = $db->table('games')
            ->where('player_white_id', $userId)
            ->orWhere('player_black_id', $userId)
            ->orderBy('created_at', 'DESC')
            ->limit(20)
            ->get()->getResultArray();

        return $this->respond(['status' => 'success', 'data' => $games]);
    }

    public function waiting()
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $db     = \Config\Database::connect();

        $games = $db->table('games')
            ->where('status', 'waiting')
            ->where('(player_white_id != '.$userId.' OR player_white_id IS NULL)', null, false)
            ->where('(player_black_id != '.$userId.' OR player_black_id IS NULL)', null, false)
            ->orderBy('created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        return $this->respond(['status' => 'success', 'data' => $games]);
    }

    public function create()
    {
        $userId   = $_SERVER["JWT_USER"]->sub;
        $timeCtrl = $this->request->getVar('time_control') ?? 600;
        $color    = $this->request->getVar('color') ?? 'white';

        $whiteId = $color === 'white' ? $userId : null;
        $blackId = $color === 'black' ? $userId : null;

        $gameModel = new GameModel();
        $gameId = $gameModel->insert([
            'player_white_id' => $whiteId,
            'player_black_id' => $blackId,
            'status'          => 'waiting',
            'time_control'    => $timeCtrl,
        ]);

        return $this->respond([
            'status' => 'success',
            'data'   => ['game_id' => $gameId, 'color' => $color, 'status' => 'waiting'],
        ], 201);
    }

    public function join($id = null)
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $game   = (new GameModel())->find($id);

        if (!$game || $game['status'] !== 'waiting') {
            return $this->respond(['status' => 'error', 'message' => 'Partida no disponible'], 400);
        }

        if ($game['player_white_id'] == $userId || $game['player_black_id'] == $userId) {
            return $this->respond(['status' => 'error', 'message' => 'Ja ets jugador d\'aquesta partida'], 400);
        }

        // Assigna el color contrari
        if ($game['player_white_id'] === null) {
            $color = 'white';
            (new GameModel())->update($id, ['player_white_id' => $userId, 'status' => 'ongoing', 'started_at' => date('Y-m-d H:i:s')]);
        } else {
            $color = 'black';
            (new GameModel())->update($id, ['player_black_id' => $userId, 'status' => 'ongoing', 'started_at' => date('Y-m-d H:i:s')]);
        }

        return $this->respond([
            'status' => 'success',
            'data'   => ['game_id' => $id, 'color' => $color],
        ]);
    }

    public function show($id = null)
    {
        $game = (new GameModel())->find($id);
        if (!$game) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no trobada'], 404);
        }

        $moves = (new MoveModel())->where('game_id', $id)
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
        $game   = (new GameModel())->find($id);

        if (!$game) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no trobada'], 404);
        }

        if ($game['status'] !== 'ongoing') {
            return $this->respond(['status' => 'error', 'message' => 'La partida no està activa'], 400);
        }

        $isWhite = $game['player_white_id'] == $userId;
        $isBlack = $game['player_black_id'] == $userId;

        if (!$isWhite && !$isBlack) {
            return $this->respond(['status' => 'error', 'message' => 'No ets jugador d\'aquesta partida'], 403);
        }

        $moveSan  = $this->request->getVar('move_san');
        $moveUci  = $this->request->getVar('move_uci');
        $fenAfter = $this->request->getVar('fen_after');
        $timeSp   = $this->request->getVar('time_spent');

        if (!$moveSan || !$moveUci || !$fenAfter) {
            return $this->respond(['status' => 'error', 'message' => 'Falten dades del moviment'], 422);
        }

        $moveModel  = new MoveModel();
        $lastMove   = $moveModel->where('game_id', $id)->orderBy('move_number', 'DESC')->first();
        $moveNumber = $lastMove ? $lastMove['move_number'] + 1 : 1;

        $moveModel->insert([
            'game_id'     => $id,
            'move_number' => $moveNumber,
            'player_id'   => $userId,
            'move_san'    => $moveSan,
            'move_uci'    => $moveUci,
            'fen_after'   => $fenAfter,
            'time_spent'  => $timeSp,
        ]);

        return $this->respond([
            'status' => 'success',
            'data'   => ['move_number' => $moveNumber],
        ]);
    }

    public function resign($id = null)
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $game   = (new GameModel())->find($id);

        if (!$game || ($game['status'] !== 'ongoing' && $game['status'] !== 'waiting')) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no vàlida'], 400);
        }

        $isWhite = $game['player_white_id'] == $userId;
        $isBlack = $game['player_black_id'] == $userId;

        if (!$isWhite && !$isBlack) {
            return $this->respond(['status' => 'error', 'message' => 'No ets jugador d\'aquesta partida'], 403);
        }

        $result   = $isWhite ? 'black' : 'white';
        $winnerId = $isWhite ? $game['player_black_id'] : $game['player_white_id'];
        $loserId  = $userId;

        (new GameModel())->update($id, [
            'status'     => 'finished',
            'result'     => $result,
            'end_reason' => 'resignation',
            'ended_at'   => date('Y-m-d H:i:s'),
        ]);

        if ($winnerId) $this->updateElo($winnerId, $loserId);

        return $this->respond(['status' => 'success', 'message' => 'Has abandonat la partida']);
    }

    private function updateElo(int $winnerId, int $loserId): void
    {
        $profileModel = new ProfileModel();
        $winner = $profileModel->findByUserId($winnerId);
        $loser  = $profileModel->findByUserId($loserId);

        if (!$winner || !$loser) return;

        $k = 32;
        $expectedWinner = 1 / (1 + pow(10, ($loser['elo'] - $winner['elo']) / 400));
        $expectedLoser  = 1 - $expectedWinner;

        $deltaWinner = (int) round($k * (1 - $expectedWinner));
        $deltaLoser  = (int) round($k * (0 - $expectedLoser));

        $profileModel->where('user_id', $winnerId)
            ->set(['elo' => $winner['elo'] + $deltaWinner, 'wins' => $winner['wins'] + 1])
            ->update();

        $profileModel->where('user_id', $loserId)
            ->set(['elo' => max(100, $loser['elo'] + $deltaLoser), 'losses' => $loser['losses'] + 1])
            ->update();
    }
}
