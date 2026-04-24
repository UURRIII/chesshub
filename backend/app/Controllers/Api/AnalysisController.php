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
        $moves     = (new MoveModel())->where('game_id', $id)->orderBy('move_number')->findAll();
        $analysis  = $this->runAnalysis($moves, $userColor);

        $existing = (new GameAnalysisModel())
            ->where('game_id', $id)->where('user_id', $userId)->first();

        if ($existing) {
            (new GameAnalysisModel())->update($existing['id'], $analysis);
        } else {
            (new GameAnalysisModel())->insert(array_merge($analysis, [
                'game_id' => $id,
                'user_id' => $userId,
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

        // Només els moviments de l'usuari (no el bot)
        $moves    = (new BotMoveModel())->where('bot_game_id', $id)
                                        ->where('is_bot', 0)
                                        ->orderBy('move_number')->findAll();
        $analysis = $this->runAnalysis($moves, $game['user_color']);

        $existing = (new GameAnalysisModel())
            ->where('bot_game_id', $id)->where('user_id', $userId)->first();

        if ($existing) {
            (new GameAnalysisModel())->update($existing['id'], $analysis);
        } else {
            (new GameAnalysisModel())->insert(array_merge($analysis, [
                'bot_game_id' => $id,
                'user_id'     => $userId,
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

    private function runAnalysis(array $moves, string $userColor): array
    {
        $brilliants  = $greats = $goods = $inaccuracies = $mistakes = $blunders = 0;
        $moveDetails = [];
        $moveCount   = 0;

        // FEN inicial
        $fenBefore = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

        foreach ($moves as $move) {
            $fenAfter = $move['fen_after'];

            // Evalua posició abans i després del moviment
            $evalBefore = $this->evalFen($fenBefore);
            $evalAfter  = $this->evalFen($fenAfter);

            if ($evalBefore !== null && $evalAfter !== null) {
                // winChance és des del punt de vista de les blanques
                // Si l'usuari juga amb negres, invertim
                $wcBefore = $evalBefore['winChance'] ?? 50;
                $wcAfter  = $evalAfter['winChance']  ?? 50;

                if ($userColor === 'black') {
                    $wcBefore = 100 - $wcBefore;
                    $wcAfter  = 100 - $wcAfter;
                }

                $delta = $wcBefore - $wcAfter; // positiu = pèrdua de winChance
                $classification = $this->classifyDelta($delta);
            } else {
                $classification = 'good';
            }

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
                'fen'            => $fenAfter,
            ];

            $fenBefore = $fenAfter;
            $moveCount++;
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

    private function evalFen(string $fen): ?array
    {
        $payload = json_encode([
            'fen'             => $fen,
            'depth'           => 12,
            'maxThinkingTime' => 50,
        ]);

        $ch = curl_init('https://chess-api.com/v1');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => 10,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!$response || $httpCode !== 200) return null;

        $data = json_decode($response, true);
        return $data ?: null;
    }

    private function classifyDelta(float $delta): string
    {
        // delta = pèrdua de winChance en punts percentuals
        if ($delta <= -5)  return 'brilliant'; // guanya winChance
        if ($delta <= 0)   return 'great';
        if ($delta <= 5)   return 'good';
        if ($delta <= 10)  return 'inaccuracy';
        if ($delta <= 20)  return 'mistake';
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
