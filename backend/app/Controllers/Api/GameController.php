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
        $userId = jwt_uid();
        $db     = \Config\Database::connect();

        $games = $db->table('games')
            ->where('player_white_id', $userId)
            ->orWhere('player_black_id', $userId)
            ->orderBy('created_at', 'DESC')
            ->limit(20)
            ->get()->getResultArray();

        return $this->respond(['status' => 'success', 'data' => $games]);
    }

    /**
     * Historial de partides acabades de l'usuari (PvP + bot),
     * normalitzat des de la seva perspectiva. Suporta paginació:
     * ?page=1&limit=50 (màx 200 per pàgina).
     * El filtratge per tipus/resultat es fa al frontend.
     */
    public function history()
    {
        $userId = jwt_uid();
        $page   = max(1, (int) ($this->request->getVar('page')  ?? 1));
        $limit  = min(200, max(1, (int) ($this->request->getVar('limit') ?? 100)));
        $db     = \Config\Database::connect();
        $games  = [];

        // Per paginar correctament sobre dues fonts fusionades (PvP + bot),
        // cal obtenir prou files de cadascuna per cobrir la pàgina sol·licitada.
        // Cap a 500 per font per evitar lectures massa costoses.
        $fetchLimit = min(500, $page * $limit);

        // ── Partides PvP ──────────────────────────────────────────────
        $pvp = $db->table('games g')
            ->select('g.id, g.result, g.end_reason, g.time_control, g.created_at, g.ended_at,
                      g.player_white_id, g.player_black_id,
                      uw.username AS white_username, ub.username AS black_username')
            ->join('users uw', 'uw.id = g.player_white_id', 'left')
            ->join('users ub', 'ub.id = g.player_black_id', 'left')
            ->where('g.status', 'finished')
            ->groupStart()
                ->where('g.player_white_id', $userId)
                ->orWhere('g.player_black_id', $userId)
            ->groupEnd()
            ->orderBy('g.ended_at', 'DESC')
            ->limit($fetchLimit)
            ->get()->getResultArray();

        foreach ($pvp as $g) {
            $isWhite = $g['player_white_id'] == $userId;
            if ($g['result'] === 'draw' || $g['result'] === null) {
                $myResult = 'draw';
            } else {
                $iWon     = ($g['result'] === 'white' && $isWhite) || ($g['result'] === 'black' && !$isWhite);
                $myResult = $iWon ? 'win' : 'loss';
            }
            $games[] = [
                'id'           => (int) $g['id'],
                'type'         => 'pvp',
                'opponent'     => $isWhite ? ($g['black_username'] ?? 'Oponent') : ($g['white_username'] ?? 'Oponent'),
                'color'        => $isWhite ? 'white' : 'black',
                'result'       => $myResult,
                'end_reason'   => $g['end_reason'],
                'time_control' => $g['time_control'] ? (int) $g['time_control'] : null,
                'date'         => $g['ended_at'] ?: $g['created_at'],
            ];
        }

        // ── Partides contra bot ───────────────────────────────────────
        $bot = $db->table('bot_games')
            ->where('user_id', $userId)
            ->where('status', 'finished')
            ->orderBy('ended_at', 'DESC')
            ->limit($fetchLimit)
            ->get()->getResultArray();

        foreach ($bot as $g) {
            $myResult = $g['result'] === 'draw'
                ? 'draw'
                : ($g['result'] === 'user' ? 'win' : 'loss');
            $games[] = [
                'id'           => (int) $g['id'],
                'type'         => 'bot',
                'opponent'     => 'Bot Niv. ' . $g['bot_level'],
                'color'        => $g['user_color'],
                'result'       => $myResult,
                'end_reason'   => $g['end_reason'],
                'time_control' => $g['time_control'] ? (int) $g['time_control'] : null,
                'date'         => $g['ended_at'] ?: $g['started_at'],
            ];
        }

        usort($games, fn($a, $b) => strcmp((string) $b['date'], (string) $a['date']));

        // Aplica la paginació sobre la llista fusionada i ordenada
        $paged = array_slice($games, ($page - 1) * $limit, $limit);

        return $this->respond([
            'status' => 'success',
            'data'   => $paged,
            'meta'   => ['page' => $page, 'limit' => $limit, 'total' => count($games)],
        ]);
    }

    public function waiting()
    {
        $userId = jwt_uid();
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
        $userId   = jwt_uid();
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
        $userId = jwt_uid();
        $game   = (new GameModel())->find($id);

        if (!$game || $game['status'] !== 'waiting') {
            return $this->respond(['status' => 'error', 'message' => 'Partida no disponible'], 400);
        }

        if ($game['player_white_id'] == $userId || $game['player_black_id'] == $userId) {
            return $this->respond(['status' => 'error', 'message' => "Ja ets jugador d'aquesta partida"], 400);
        }

        $slot  = $game['player_white_id'] === null ? 'player_white_id' : 'player_black_id';
        $color = $game['player_white_id'] === null ? 'white' : 'black';

        // Actualització atòmica: si dos jugadors entren alhora, només qui
        // realment ocupa l'espai lliure (status encara 'waiting') s'hi uneix.
        $db = \Config\Database::connect();
        $db->table('games')
           ->where('id', $id)
           ->where('status', 'waiting')
           ->where($slot, null)
           ->update([
               $slot        => $userId,
               'status'     => 'ongoing',
               'started_at' => date('Y-m-d H:i:s'),
           ]);

        if ($db->affectedRows() === 0) {
            return $this->respond(['status' => 'error', 'message' => 'Aquesta partida ja s\'ha omplert'], 409);
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
        $userId = jwt_uid();
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

        // Validació de torn: els moviments imparells són de les blanques
        $expectedWhite = ($moveNumber % 2 === 1);
        if (($expectedWhite && !$isWhite) || (!$expectedWhite && !$isBlack)) {
            return $this->respond(['status' => 'error', 'message' => 'No és el teu torn'], 409);
        }

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
        $userId = jwt_uid();
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

        // Tancament atòmic: evita doble aplicació d'ELO si la partida ja
        // s'ha tancat per una altra via (rendició + final per socket alhora).
        $db = \Config\Database::connect();
        $db->table('games')
           ->where('id', $id)
           ->where('status', 'ongoing')
           ->update([
               'status'     => 'finished',
               'result'     => $result,
               'end_reason' => 'resignation',
               'ended_at'   => date('Y-m-d H:i:s'),
           ]);

        if ($db->affectedRows() === 0) {
            return $this->respond(['status' => 'success', 'message' => 'La partida ja estava finalitzada']);
        }

        if ($winnerId) $this->updateElo($winnerId, $loserId, (int)$id);

        return $this->respond(['status' => 'success', 'message' => 'Has abandonat la partida']);
    }

    public function finish($id = null)
    {
        $userId = jwt_uid();
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

        // Validació de qui pot declarar cada tipus de final:
        // - Rendició: qui crida ha de ser el perdedor (ja tenia validació)
        // - Escac mat / stalemate: només el GUANYADOR pot declarar-ho
        //   (evita que un jugador reclami la victòria de l'adversari)
        // - Timeout / taules: qualsevol jugador pot reportar-ho
        if ($endReason === 'resignation') {
            $loserIsWhite = ($result === 'black');
            if ($loserIsWhite && !$isWhite) {
                return $this->respond(['status' => 'error', 'message' => 'Rendició no autoritzada'], 403);
            }
            if (!$loserIsWhite && !$isBlack) {
                return $this->respond(['status' => 'error', 'message' => 'Rendició no autoritzada'], 403);
            }
        } elseif (\in_array($endReason, ['checkmate', 'stalemate'])) {
            // Escac mat / stalemate: el guanyador declarat ha de ser qui fa la crida
            if ($result === 'white' && !$isWhite) {
                return $this->respond(['status' => 'error', 'message' => 'Només el guanyador pot declarar escac mat'], 403);
            }
            if ($result === 'black' && !$isBlack) {
                return $this->respond(['status' => 'error', 'message' => 'Només el guanyador pot declarar escac mat'], 403);
            }
        }

        if (!\in_array($result, ['white', 'black', 'draw'])) {
            return $this->respond(['status' => 'error', 'message' => 'Resultat no vàlid'], 422);
        }

        // Tancament atòmic: només la petició que realment passa la partida
        // d'"ongoing" a "finished" aplica l'ELO (evita doble aplicació quan
        // els dos clients reben el final de partida alhora, p. ex. per temps).
        $db = \Config\Database::connect();
        $db->table('games')
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

        if ($result !== 'draw') {
            $winnerId = $result === 'white' ? $game['player_white_id'] : $game['player_black_id'];
            $loserId  = $result === 'white' ? $game['player_black_id'] : $game['player_white_id'];
            if ($winnerId && $loserId) $this->updateElo($winnerId, $loserId, (int)$id);
        } else {
            $this->updateEloDraw($game['player_white_id'], $game['player_black_id'], (int)$id);
        }

        return $this->respond(['status' => 'success', 'message' => 'Partida finalitzada']);
    }

    /**
     * Aplica el resultat ELO d'una partida entre dos jugadors.
     * $score1 és el resultat del jugador 1: 1 (victòria), 0.5 (taules), 0 (derrota).
     * El delta del jugador 2 és l'invers exacte, de manera que l'ELO es conserva.
     *
     * Usa SELECT … FOR UPDATE dins d'una transacció per evitar la race condition
     * de lectura-modificació-escriptura quan dos jugadors acaben partides alhora.
     */
    private function applyEloResult(int $p1Id, int $p2Id, float $score1, ?int $gameId = null): void
    {
        $db = \Config\Database::connect();
        $db->transStart();

        // Bloqueja les files mentre calculem per evitar actualitzacions concurrents
        $p1 = $db->query('SELECT elo, wins, losses, draws FROM profiles WHERE user_id = ? FOR UPDATE', [$p1Id])->getRowArray();
        $p2 = $db->query('SELECT elo, wins, losses, draws FROM profiles WHERE user_id = ? FOR UPDATE', [$p2Id])->getRowArray();

        if (!$p1 || !$p2) {
            $db->transRollback();
            return;
        }

        $k         = 32;
        $expected1 = 1 / (1 + pow(10, ($p2['elo'] - $p1['elo']) / 400));
        $delta1    = (int) round($k * ($score1 - $expected1));
        $delta2    = -$delta1;

        $new1 = max(100, $p1['elo'] + $delta1);
        $new2 = max(100, $p2['elo'] + $delta2);

        $stat1 = $score1 == 1 ? 'wins'   : ($score1 == 0 ? 'losses' : 'draws');
        $stat2 = $score1 == 1 ? 'losses' : ($score1 == 0 ? 'wins'   : 'draws');

        $db->table('profiles')->where('user_id', $p1Id)
            ->set(['elo' => $new1, $stat1 => $p1[$stat1] + 1])->update();
        $db->table('profiles')->where('user_id', $p2Id)
            ->set(['elo' => $new2, $stat2 => $p2[$stat2] + 1])->update();

        $db->table('elo_history')->insertBatch([
            ['user_id' => $p1Id, 'elo_before' => $p1['elo'], 'elo_after' => $new1, 'delta' => $new1 - $p1['elo'], 'game_id' => $gameId],
            ['user_id' => $p2Id, 'elo_before' => $p2['elo'], 'elo_after' => $new2, 'delta' => $new2 - $p2['elo'], 'game_id' => $gameId],
        ]);

        $db->transComplete();
    }

    private function updateElo(int $winnerId, int $loserId, ?int $gameId = null): void
    {
        $this->applyEloResult($winnerId, $loserId, 1.0, $gameId);
    }

    private function updateEloDraw(int $userId1, int $userId2, ?int $gameId = null): void
    {
        $this->applyEloResult($userId1, $userId2, 0.5, $gameId);
    }
}
