<?php

namespace App\Controllers\Api;

use App\Models\GameModel;
use App\Models\BotGameModel;
use App\Models\MoveModel;
use App\Models\BotMoveModel;
use App\Models\GameAnalysisModel;
use CodeIgniter\RESTful\ResourceController;

class AnalysisController extends ResourceController
{
    protected $format = 'json';

    public function analyzeGame($id = null)
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $game   = (new GameModel())->find($id);

        if (!$game) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no trobada'], 404);
        }

        if ($game['player_white_id'] != $userId && $game['player_black_id'] != $userId) {
            return $this->respond(['status' => 'error', 'message' => 'Accés denegat'], 403);
        }

        $userColor = $game['player_white_id'] == $userId ? 'white' : 'black';
        $allMoves  = (new MoveModel())->where('game_id', $id)->orderBy('move_number')->findAll();
        $analysis  = $this->runAnalysis($allMoves, $userId, $userColor);

        $existing = (new GameAnalysisModel())
            ->where('game_id', $id)->where('user_id', $userId)->first();

        if ($existing) {
            (new GameAnalysisModel())->update($existing['id'], $analysis);
        } else {
            (new GameAnalysisModel())->insert(array_merge($analysis, [
                'game_id' => $id, 'user_id' => $userId,
            ]));
        }

        return $this->respond(['status' => 'success', 'data' => $analysis]);
    }

    public function analyzeBotGame($id = null)
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $game   = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId) {
            return $this->respond(['status' => 'error', 'message' => 'Accés denegat'], 403);
        }

        $allMoves = (new BotMoveModel())->where('bot_game_id', $id)->orderBy('move_number')->findAll();
        $analysis = $this->runAnalysis($allMoves, $userId, $game['user_color'], true);

        $existing = (new GameAnalysisModel())
            ->where('bot_game_id', $id)->where('user_id', $userId)->first();

        if ($existing) {
            (new GameAnalysisModel())->update($existing['id'], $analysis);
        } else {
            (new GameAnalysisModel())->insert(array_merge($analysis, [
                'bot_game_id' => $id, 'user_id' => $userId,
            ]));
        }

        return $this->respond(['status' => 'success', 'data' => $analysis]);
    }

    public function getGameAnalysis($id = null)
    {
        $userId   = $_SERVER["JWT_USER"]->sub;
        $analysis = (new GameAnalysisModel())
            ->where('game_id', $id)->where('user_id', $userId)->first();

        if (!$analysis) {
            return $this->respond(['status' => 'error', 'message' => 'Anàlisi no trobada'], 404);
        }

        return $this->respond(['status' => 'success', 'data' => $analysis]);
    }

    private function runAnalysis(array $allMoves, int $userId, string $userColor, bool $isBotGame = false): array
    {
        $brilliants  = $greats = $goods = $inaccuracies = $mistakes = $blunders = 0;
        $moveDetails = [];
        $moveCount   = 0;

        // Límit de temps per evitar timeouts (45 segons màxim)
        $timeLimit   = time() + 45;
        $timedOut    = false;

        // Eval de la posició anterior (portada endavant per evitar doble crida a l'API)
        $cpPrev      = null;
        $fenBefore   = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

        foreach ($allMoves as $move) {
            if (time() >= $timeLimit) {
                $timedOut = true;
                break;
            }

            $fenAfter   = $move['fen_after'];
            $isUserMove = $isBotGame
                ? ($move['is_bot'] == 0)
                : ($move['player_id'] == $userId);

            if ($isUserMove) {
                // cpPrev és l'eval de fenBefore (posició abans del moviment de l'usuari)
                // Si no el tenim (primera vegada o després d'un moviment oponent sense eval), el calculem
                $cpBefore = $cpPrev ?? $this->evalFen($fenBefore);
                $cpAfter  = $this->evalFen($fenAfter);

                if ($cpBefore !== null && $cpAfter !== null) {
                    $wcBefore = $this->cpToWinChance($cpBefore);
                    $wcAfter  = $this->cpToWinChance($cpAfter);

                    // Ajustem perspectiva: ChessDB retorna eval des de blanques
                    if ($userColor === 'black') {
                        $wcBefore = 100 - $wcBefore;
                        $wcAfter  = 100 - $wcAfter;
                    }

                    $delta          = $wcBefore - $wcAfter;
                    $classification = $this->classifyDelta($delta);

                    switch ($classification) {
                        case 'brilliant':  $brilliants++;   break;
                        case 'great':      $greats++;       break;
                        case 'good':       $goods++;        break;
                        case 'inaccuracy': $inaccuracies++; break;
                        case 'mistake':    $mistakes++;     break;
                        case 'blunder':    $blunders++;     break;
                    }

                    $moveDetails[] = [
                        'move'           => $move['move_san'] ?? $move['move_uci'],
                        'classification' => $classification,
                        'eval_before'    => round($cpBefore / 100, 2),
                        'eval_after'     => round($cpAfter  / 100, 2),
                    ];

                    $moveCount++;
                }
                // Si no tenim eval, no comptem el moviment (evita 100% precisió artificial)
                // Portem l'eval endavant: la posició després del moviment de l'usuari
                // serà la "before" per al proper moviment de l'usuari (passant per l'oponent)
                $cpPrev = $cpAfter;
            } else {
                // Moviment de l'oponent: avaluem la posició resultant
                // per tenir-la llesta com a "before" del proper moviment de l'usuari
                if (time() < $timeLimit) {
                    $cpPrev = $this->evalFen($fenAfter);
                } else {
                    $cpPrev = null;
                }
            }

            $fenBefore = $fenAfter;
        }

        $goodMoves = $brilliants + $greats + $goods;
        $accuracy  = $moveCount > 0 ? round(($goodMoves / $moveCount) * 100, 2) : 0;
        $score     = $this->calculateScore($accuracy, $blunders, $mistakes);

        return [
            'score'         => $score,
            'accuracy'      => $accuracy,
            'brilliants'    => $brilliants,
            'greats'        => $greats,
            'goods'         => $goods,
            'inaccuracies'  => $inaccuracies,
            'mistakes'      => $mistakes,
            'blunders'      => $blunders,
            'analysis_json' => json_encode($moveDetails),
        ];
    }

    /**
     * Avalua una posició FEN via ChessDB (queryall).
     * Retorna centipawns des de la perspectiva de blanques.
     * Retorna null si l'API no respon o la posició no és a la BD.
     */
    private function evalFen(string $fen): ?int
    {
        $url = 'https://www.chessdb.cn/cdb.php?action=queryall&board='
             . urlencode($fen) . '&json=1';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT      => 'ChessHub/1.0',
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            CURLOPT_TIMEOUT        => 8,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!$response || $httpCode !== 200) return null;

        $data = json_decode($response, true);
        if (empty($data['moves']) || !is_array($data['moves'])) return null;

        // El primer moviment té la millor puntuació (ChessDB retorna en ordre)
        $bestScore = (int)($data['moves'][0]['score'] ?? 0);

        // Convertim de perspectiva del torn actual a perspectiva de blanques
        $parts      = explode(' ', $fen);
        $sideToMove = $parts[1] ?? 'w';
        return $sideToMove === 'b' ? -$bestScore : $bestScore;
    }

    // Converteix centipawns a percentatge de victòria (0-100) — fórmula Lichess
    private function cpToWinChance(int $cp): float
    {
        $cp = max(-1000, min(1000, $cp));
        return round(50 + 50 * (2 / (1 + exp(-0.00368208 * $cp)) - 1), 2);
    }

    private function classifyDelta(float $delta): string
    {
        if ($delta <= -3)  return 'brilliant'; // millora la posició significativament
        if ($delta <= 0)   return 'great';
        if ($delta <= 3)   return 'good';
        if ($delta <= 8)   return 'inaccuracy';
        if ($delta <= 15)  return 'mistake';
        return 'blunder';
    }

    private function calculateScore(float $accuracy, int $blunders, int $mistakes): int
    {
        $score = $accuracy;
        $score -= $blunders * 5;
        $score -= $mistakes * 2;
        return (int) max(0, min(100, round($score)));
    }
}
