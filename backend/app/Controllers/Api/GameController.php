<?php

namespace App\Controllers\Api;

use App\Models\GameModel;
use App\Models\MoveModel;
use App\Models\ProfileModel;
use CodeIgniter\RESTful\ResourceController;

class GameController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $userId = $_SERVER['JWT_USER']->sub;
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
        $userId = (int) $_SERVER['JWT_USER']->sub;
        $db     = \Config\Database::connect();

        $games = $db->table('games')
            ->where('status', 'waiting')
            ->groupStart()
                ->where('player_white_id !=', $userId)
                ->orWhere('player_white_id IS NULL', null, false)
            ->groupEnd()
            ->groupStart()
                ->where('player_black_id !=', $userId)
                ->orWhere('player_black_id IS NULL', null, false)
            ->groupEnd()
            ->orderBy('created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        return $this->respond(['status' => 'success', 'data' => $games]);
    }

    public function create()
    {
        $userId   = $_SERVER['JWT_USER']->sub;
        $timeCtrl = (int) ($this->request->getVar('time_control') ?? 600);
        $color    = $this->request->getVar('color') ?? 'white';

        if (!\in_array($color, ['white', 'black', 'random'])) {
            $color = 'white';
        }
        if ($color === 'random') {
            $color = rand(0, 1) ? 'white' : 'black';
        }

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
        $userId = $_SERVER['JWT_USER']->sub;
        $game   = (new GameModel())->find($id);

        if (!$game || $game['status'] !== 'waiting') {
            return $this->respond(['status' => 'error', 'message' => 'Partida no disponible'], 400);
        }

        if ($game['player_white_id'] == $userId || $game['player_black_id'] == $userId) {
            return $this->respond(['status' => 'error', 'message' => "Ja ets jugador d'aquesta partida"], 400);
        }

        if ($game['player_white_id'] === null) {
            $color = 'white';
            (new GameModel())->update($id, ['player_white_id' => $userId, 'status' => 'ongoing', 'started_at' => date('Y-m-d H:i:s')]);
        } else {
            $color = 'black';
            (new GameModel())->update($id, ['player_black_id' => $userId, 'status' => 'ongoing', 'started_at' => date('Y-m-d H:i:s')]);
        }

        $updatedGame = (new GameModel())->find($id);
        return $this->respond([
            'status' => 'success',
            'data'   => ['game_id' => $id, 'color' => $color, 'time_control' => $updatedGame['time_control']],
        ]);
    }

    public function active()
    {
        $db = \Config\Database::connect();
        $games = $db->table('games g')
            ->select('g.id, g.time_control, g.created_at, uw.username as white_username, ub.username as black_username, pw.elo as white_elo, pb.elo as black_elo')
            ->join('users uw', 'uw.id = g.player_white_id', 'left')
            ->join('users ub', 'ub.id = g.player_black_id', 'left')
            ->join('profiles pw', 'pw.user_id = g.player_white_id', 'left')
            ->join('profiles pb', 'pb.user_id = g.player_black_id', 'left')
            ->where('g.status', 'ongoing')
            ->orderBy('g.started_at', 'DESC')
            ->limit(20)
            ->get()->getResultArray();

        return $this->respond(['status' => 'success', 'data' => $games]);
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
        $userId = $_SERVER['JWT_USER']->sub;
        $game   = (new GameModel())->find($id);

        if (!$game) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no trobada'], 404);
        }

        if ($game['status'] !== 'ongoing') {
            return $this->respond(['status' => 'error', 'message' => "La partida no està activa"], 400);
        }

        $isWhite = $game['player_white_id'] == $userId;
        $isBlack = $game['player_black_id'] == $userId;

        if (!$isWhite && !$isBlack) {
            return $this->respond(['status' => 'error', 'message' => "No ets jugador d'aquesta partida"], 403);
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
        $userId = $_SERVER['JWT_USER']->sub;
        $game   = (new GameModel())->find($id);

        if (!$game || ($game['status'] !== 'ongoing' && $game['status'] !== 'waiting')) {
            return $this->respond(['status' => 'error', 'message' => "Partida no vàlida"], 400);
        }

        $isWhite = $game['player_white_id'] == $userId;
        $isBlack = $game['player_black_id'] == $userId;

        if (!$isWhite && !$isBlack) {
            return $this->respond(['status' => 'error', 'message' => "No ets jugador d'aquesta partida"], 403);
        }

        // Cancel a waiting game (no opponent yet) — just delete it
        if ($game['status'] === 'waiting') {
            (new \App\Models\GameModel())->delete($id);
            return $this->respond(['status' => 'success', 'message' => 'Partida cancel·lada']);
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

    public function finish($id = null)
    {
        $userId = $_SERVER['JWT_USER']->sub;
        $game   = (new GameModel())->find($id);

        if (!$game || $game['status'] !== 'ongoing') {
            return $this->respond(['status' => 'error', 'message' => "Partida no vàlida"], 400);
        }

        $isWhite = $game['player_white_id'] == $userId;
        $isBlack = $game['player_black_id'] == $userId;

        if (!$isWhite && !$isBlack) {
            return $this->respond(['status' => 'error', 'message' => "No ets jugador d'aquesta partida"], 403);
        }

        $result    = $this->request->getVar('result');
        $endReason = $this->request->getVar('end_reason') ?? 'checkmate';
        $pgn       = $this->request->getVar('pgn');

        if (!\in_array($result, ['white', 'black', 'draw'])) {
            return $this->respond(['status' => 'error', 'message' => 'Resultat no vàlid'], 422);
        }

        (new GameModel())->update($id, [
            'status'     => 'finished',
            'result'     => $result,
            'end_reason' => $endReason,
            'pgn'        => $pgn,
            'ended_at'   => date('Y-m-d H:i:s'),
        ]);

        if ($result !== 'draw') {
            $winnerId = $result === 'white' ? $game['player_white_id'] : $game['player_black_id'];
            $loserId  = $result === 'white' ? $game['player_black_id'] : $game['player_white_id'];
            if ($winnerId && $loserId) $this->updateElo($winnerId, $loserId);
        } else {
            $this->updateEloDraw($game['player_white_id'], $game['player_black_id']);
        }

        return $this->respond(['status' => 'success', 'message' => 'Partida finalitzada']);
    }

    private function updateElo(int $winnerId, int $loserId): void
    {
        $profileModel = new ProfileModel();
        $winner = $profileModel->findByUserId($winnerId);
        $loser  = $profileModel->findByUserId($loserId);

        if (!$winner || !$loser) return;

        $k = 32;
        $expectedWinner = 1 / (1 + pow(10, ($loser['elo'] - $winner['elo']) / 400));
        $deltaWinner = (int) round($k * (1 - $expectedWinner));
        $deltaLoser  = (int) round($k * (0 - (1 - $expectedWinner)));

        $profileModel->where('user_id', $winnerId)
            ->set(['elo' => $winner['elo'] + $deltaWinner, 'wins' => $winner['wins'] + 1])
            ->update();

        $profileModel->where('user_id', $loserId)
            ->set(['elo' => max(100, $loser['elo'] + $deltaLoser), 'losses' => $loser['losses'] + 1])
            ->update();
    }

    private function updateEloDraw(int $userId1, int $userId2): void
    {
        $profileModel = new ProfileModel();
        $p1 = $profileModel->findByUserId($userId1);
        $p2 = $profileModel->findByUserId($userId2);

        if (!$p1 || !$p2) return;

        $k = 32;
        $exp1 = 1 / (1 + pow(10, ($p2['elo'] - $p1['elo']) / 400));
        $delta1 = (int) round($k * (0.5 - $exp1));
        $delta2 = -$delta1;

        $profileModel->where('user_id', $userId1)
            ->set(['elo' => max(100, $p1['elo'] + $delta1), 'draws' => $p1['draws'] + 1])
            ->update();

        $profileModel->where('user_id', $userId2)
            ->set(['elo' => max(100, $p2['elo'] + $delta2), 'draws' => $p2['draws'] + 1])
            ->update();
    }
}
