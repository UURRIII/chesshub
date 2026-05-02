<?php

namespace App\Controllers\Api;

use App\Models\BotGameModel;
use App\Models\BotMoveModel;
use CodeIgniter\RESTful\ResourceController;

class BotGameController extends ResourceController
{
    protected $format = 'json';

    public function create()
    {
        $userId   = $_SERVER['JWT_USER']->sub;
        $color    = $this->request->getVar('color')     ?? 'white';
        $level    = $this->request->getVar('bot_level') ?? 5;
        $timeCtrl = (int) ($this->request->getVar('time_control') ?? 600);

        if (!\in_array($color, ['white', 'black', 'random'])) $color = 'white';
        if ($color === 'random') $color = rand(0, 1) ? 'white' : 'black';

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
            'data'   => ['game_id' => $gameId, 'color' => $color, 'bot_level' => (int)$level],
        ], 201);
    }

    public function index()
    {
        $userId = $_SERVER['JWT_USER']->sub;
        $games  = (new BotGameModel())->where('user_id', $userId)
                                       ->orderBy('started_at', 'DESC')
                                       ->limit(20)
                                       ->findAll();
        return $this->respond(['status' => 'success', 'data' => $games]);
    }

    public function show($id = null)
    {
        $game = (new BotGameModel())->find($id);
        if (!$game) return $this->respond(['status' => 'error', 'message' => 'Partida no trobada'], 404);

        $moves = (new BotMoveModel())->where('bot_game_id', $id)
                                     ->orderBy('move_number', 'ASC')
                                     ->findAll();
        return $this->respond(['status' => 'success', 'data' => ['game' => $game, 'moves' => $moves]]);
    }

    public function move($id = null)
    {
        $userId = $_SERVER['JWT_USER']->sub;
        $game   = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId)
            return $this->respond(['status' => 'error', 'message' => 'Partida no valida'], 403);

        if ($game['status'] !== 'ongoing')
            return $this->respond(['status' => 'error', 'message' => 'La partida ha acabat'], 400);

        $moveSan  = $this->request->getVar('move_san');
        $moveUci  = $this->request->getVar('move_uci');
        $fenAfter = $this->request->getVar('fen_after');
        $timeSp   = $this->request->getVar('time_spent');

        if (!$moveSan || !$moveUci || !$fenAfter)
            return $this->respond(['status' => 'error', 'message' => 'Falten dades del moviment'], 422);

        $botMoveModel = new BotMoveModel();
        $lastMove     = $botMoveModel->where('bot_game_id', $id)->orderBy('move_number', 'DESC')->first();
        $moveNumber   = $lastMove ? $lastMove['move_number'] + 1 : 1;

        $botMoveModel->insert([
            'bot_game_id' => $id,
            'move_number' => $moveNumber,
            'is_bot'      => 0,
            'move_san'    => $moveSan,
            'move_uci'    => $moveUci,
            'fen_after'   => $fenAfter,
            'time_spent'  => $timeSp,
        ]);

        // Intenta obtenir moviment via API (Lichess → ChessDB)
        // Si cap API respon, retorna null i el frontend usa fallback local
        $botMove = $this->getEngineMove($fenAfter, (int)$game['bot_level']);

        if ($botMove) {
            $botMoveId = $botMoveModel->insert([
                'bot_game_id' => $id,
                'move_number' => $moveNumber + 1,
                'is_bot'      => 1,
                'move_san'    => $botMove['san'],
                'move_uci'    => $botMove['uci'],
                'fen_after'   => $fenAfter,
                'time_spent'  => null,
            ]);
            $botMove['move_id'] = $botMoveId;
        }

        return $this->respond(['status' => 'success', 'data' => ['bot_move' => $botMove]]);
    }

    public function updateBotFen($id = null)
    {
        $userId = $_SERVER['JWT_USER']->sub;
        $game   = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId)
            return $this->respond(['status' => 'error', 'message' => 'Partida no valida'], 403);

        $moveId   = $this->request->getVar('move_id');
        $fenAfter = $this->request->getVar('fen_after');

        if (!$moveId || !$fenAfter)
            return $this->respond(['status' => 'error', 'message' => 'Falten dades'], 422);

        $botMoveModel = new BotMoveModel();
        $move = $botMoveModel->where('id', $moveId)->where('bot_game_id', $id)->where('is_bot', 1)->first();

        if (!$move) return $this->respond(['status' => 'error', 'message' => 'Moviment no trobat'], 404);

        $botMoveModel->update($moveId, ['fen_after' => $fenAfter]);
        return $this->respond(['status' => 'success']);
    }

    public function resign($id = null)
    {
        $userId = $_SERVER['JWT_USER']->sub;
        $game   = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId)
            return $this->respond(['status' => 'error', 'message' => 'Partida no valida'], 403);

        (new BotGameModel())->update($id, [
            'status' => 'finished', 'result' => 'bot', 'end_reason' => 'resignation',
            'ended_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['status' => 'success', 'message' => 'Has abandonat la partida']);
    }

    public function finish($id = null)
    {
        $userId = $_SERVER['JWT_USER']->sub;
        $game   = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId)
            return $this->respond(['status' => 'error', 'message' => 'Partida no valida'], 403);

        if ($game['status'] !== 'ongoing')
            return $this->respond(['status' => 'error', 'message' => 'La partida ja ha acabat'], 400);

        $result    = $this->request->getVar('result');
        $endReason = $this->request->getVar('end_reason') ?? 'checkmate';
        $pgn       = $this->request->getVar('pgn');

        if (!\in_array($result, ['user', 'bot', 'draw']))
            return $this->respond(['status' => 'error', 'message' => 'Resultat no vàlid'], 422);

        (new BotGameModel())->update($id, [
            'status' => 'finished', 'result' => $result, 'end_reason' => $endReason,
            'pgn' => $pgn, 'ended_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['status' => 'success', 'message' => 'Partida finalitzada']);
    }

    /**
     * Intenta obtenir moviment del bot via APIs externes.
     * 1) Lichess Cloud Eval (obertures cacheades, molt ràpid)
     * 2) ChessDB (base de dades, cobreix mig joc)
     * Retorna null si cap API respon → el frontend usa fallback local.
     */
    private function getEngineMove(string $fen, int $level): ?array
    {
        // 1) Lichess Cloud Eval — selecció de línia per nivell
        $multiPv = $level <= 5 ? 5 : ($level <= 10 ? 3 : 1);
        $lichess = $this->callLichessCloudEval($fen, $multiPv);
        if ($lichess && !empty($lichess['pvs'])) {
            $pvs = $lichess['pvs'];
            if ($level <= 5)      $idx = count($pvs) - 1;
            elseif ($level <= 10) $idx = (int)(count($pvs) / 2);
            else                  $idx = 0;
            $idx = min($idx, count($pvs) - 1);
            $moves = explode(' ', trim($pvs[$idx]['moves'] ?? ''));
            $uci   = $moves[0] ?? null;
            if ($uci) {
                return [
                    'uci' => $uci, 'san' => $uci,
                    'eval' => isset($pvs[$idx]['cp']) ? round($pvs[$idx]['cp'] / 100, 2) : null,
                    'fen_after' => null,
                ];
            }
        }

        // 2) ChessDB — base de dades de posicions analitzades per Stockfish
        $chessdb = $this->callChessDB($fen, $level);
        if ($chessdb) return $chessdb;

        // Cap API ha respost → retornem null, el frontend farà fallback
        return null;
    }

    private function callLichessCloudEval(string $fen, int $multiPv): ?array
    {
        $url = 'https://lichess.org/api/cloud-eval?fen=' . urlencode($fen) . '&multiPv=' . $multiPv;
        $ch  = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            CURLOPT_TIMEOUT        => 5,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!$response || $httpCode !== 200) return null;
        return json_decode($response, true) ?: null;
    }

    private function callChessDB(string $fen, int $level): ?array
    {
        // querybest retorna el millor moviment de la base de dades
        $url = 'https://www.chessdb.cn/cdb.php?action=querybest&board=' . urlencode($fen) . '&json=1';
        $ch  = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_USERAGENT      => 'ChessHub/1.0',
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!$response || $httpCode !== 200) return null;
        $data = json_decode($response, true);
        if (empty($data['status']) || $data['status'] !== 'ok' || empty($data['move'])) return null;

        $uci = $data['move'];
        return ['uci' => $uci, 'san' => $uci, 'eval' => null, 'fen_after' => null];
    }
}
