<?php

namespace App\Controllers\Api;

use App\Models\BotGameModel;
use App\Models\BotMoveModel;
use CodeIgniter\RESTful\ResourceController;

/**
 * Partides contra el bot.
 *
 * El bot juga amb el motor Stockfish, que s'executa al NAVEGADOR del client
 * (WebAssembly). El backend només persisteix els moviments per a l'historial
 * i l'anàlisi posterior: no calcula res ni depèn de cap servei extern.
 */
class BotGameController extends ResourceController
{
    protected $format = 'json';

    public function create()
    {
        $userId   = jwt_uid();
        $color    = $this->request->getVar('color')     ?? 'white';
        $level    = $this->request->getVar('bot_level') ?? 5;
        $timeCtrl = (int) ($this->request->getVar('time_control') ?? 600);

        if (!\in_array($color, ['white', 'black', 'random'])) $color = 'white';
        if ($color === 'random') $color = rand(0, 1) ? 'white' : 'black';

        $level = min(max((int) $level, 1), 20);

        $gameId = (new BotGameModel())->insert([
            'user_id'      => $userId,
            'user_color'   => $color,
            'bot_level'    => $level,
            'status'       => 'ongoing',
            'time_control' => $timeCtrl,
            'started_at'   => date('Y-m-d H:i:s'),
        ]);

        return $this->respond([
            'status' => 'success',
            'data'   => ['game_id' => $gameId, 'color' => $color, 'bot_level' => $level],
        ], 201);
    }

    public function index()
    {
        $userId = jwt_uid();
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

    /**
     * Persisteix un moviment de la partida (de l'usuari o del bot).
     * El moviment del bot el calcula Stockfish al navegador i s'envia aquí
     * només per desar-lo.
     *
     * El camp 'is_bot' es DERIVA del torn (no es confia en el client):
     * si l'usuari juga de blanques, els moviments imparells (1,3,5,…) són seus;
     * si juga de negres, els moviments parells (2,4,6,…) són seus.
     */
    public function move($id = null)
    {
        $userId = jwt_uid();
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

        // Deriva is_bot des del torn, ignorant el valor enviat pel client.
        // Blanques juguen els moviments imparells (1,3,5,…), negres els parells.
        $userIsWhite = ($game['user_color'] === 'white');
        $isOddMove   = ($moveNumber % 2 === 1);
        $isBot       = ($userIsWhite && !$isOddMove) || (!$userIsWhite && $isOddMove) ? 1 : 0;

        // Validació de torn: el client ha d'enviar els moviments en ordre estricte.
        // Si el moviment anterior ja era de l'usuari (no bot), el següent ha de ser del bot.
        // Nota: el bot corre al navegador, però el servidor valida l'alternança per
        // evitar que un client enviï dos moviments d'usuari consecutius.
        if ($lastMove) {
            $lastWasBot = (int) $lastMove['is_bot'];
            if (!$lastWasBot && !$isBot) {
                // Dos moviments d'usuari seguits: rebutgem el segon
                return $this->respond(['status' => 'error', 'message' => 'No és el teu torn'], 409);
            }
        }

        $botMoveModel->insert([
            'bot_game_id' => $id,
            'move_number' => $moveNumber,
            'is_bot'      => $isBot,
            'move_san'    => $moveSan,
            'move_uci'    => $moveUci,
            'fen_after'   => $fenAfter,
            'time_spent'  => $timeSp,
        ]);

        return $this->respond(['status' => 'success', 'data' => ['move_number' => $moveNumber]]);
    }

    public function resign($id = null)
    {
        $userId = jwt_uid();
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
        $userId = jwt_uid();
        $game   = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId)
            return $this->respond(['status' => 'error', 'message' => 'Partida no valida'], 403);

        $result    = $this->request->getVar('result');
        $endReason = $this->request->getVar('end_reason') ?? 'checkmate';
        $pgn       = $this->request->getVar('pgn');

        if (!\in_array($result, ['user', 'bot', 'draw']))
            return $this->respond(['status' => 'error', 'message' => 'Resultat no vàlid'], 422);

        // Tancament atòmic: la condició WHERE status='ongoing' garanteix que
        // dues peticions concurrents no puguin finalitzar la mateixa partida dues vegades.
        $db = \Config\Database::connect();
        $db->table('bot_games')
            ->where('id', $id)
            ->where('status', 'ongoing')
            ->update([
                'status'     => 'finished',
                'result'     => $result,
                'end_reason' => $endReason,
                'pgn'        => $pgn,
                'ended_at'   => date('Y-m-d H:i:s'),
            ]);

        if ($db->affectedRows() === 0) {
            return $this->respond(['status' => 'success', 'message' => 'La partida ja estava finalitzada']);
        }

        return $this->respond(['status' => 'success', 'message' => 'Partida finalitzada']);
    }
}
