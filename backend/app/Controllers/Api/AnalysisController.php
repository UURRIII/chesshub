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
        $userId = $this->request->user->sub;
        $game   = (new GameModel())->find($id);

        if (!$game) {
            return $this->respond(['status' => 'error', 'message' => 'Partida no trobada'], 404);
        }

        if ($game['player_white_id'] != $userId && $game['player_black_id'] != $userId) {
            return $this->respond(['status' => 'error', 'message' => 'Accés denegat'], 403);
        }

        $moves    = (new MoveModel())->where('game_id', $id)->orderBy('move_number')->findAll();
        $analysis = $this->runAnalysis($moves, $userId);

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
        $userId  = $this->request->user->sub;
        $game    = (new BotGameModel())->find($id);

        if (!$game || $game['user_id'] != $userId) {
            return $this->respond(['status' => 'error', 'message' => 'Accés denegat'], 403);
        }

        $moves    = (new BotMoveModel())->where('bot_game_id', $id)
                                        ->where('is_bot', 0)
                                        ->orderBy('move_number')->findAll();
        $analysis = $this->runAnalysis($moves, $userId);

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
        $userId   = $this->request->user->sub;
        $analysis = (new GameAnalysisModel())
            ->where('game_id', $id)->where('user_id', $userId)->first();

        if (!$analysis) {
            return $this->respond(['status' => 'error', 'message' => 'Anàlisi no trobada'], 404);
        }

        return $this->respond(['status' => 'success', 'data' => $analysis]);
    }

    private function runAnalysis(array $moves, int $userId): array
    {
        $stockfishPath = env('STOCKFISH_PATH', '/usr/games/stockfish');
        $brilliants = $greats = $goods = $inaccuracies = $mistakes = $blunders = 0;
        $moveDetails = [];
        $totalCentipawns = 0;
        $moveCount = 0;

        foreach ($moves as $move) {
            if (file_exists($stockfishPath)) {
                $evalBefore = $this->evaluate($move['fen_after'], $stockfishPath);
                $classification = $this->classifyMove($evalBefore);
            } else {
                $classification = 'good';
            }

            switch ($classification) {
                case 'brilliant':   $brilliants++;   break;
                case 'great':       $greats++;       break;
                case 'good':        $goods++;        break;
                case 'inaccuracy':  $inaccuracies++; break;
                case 'mistake':     $mistakes++;     break;
                case 'blunder':     $blunders++;     break;
            }

            $moveDetails[] = [
                'move'           => $move['move_san'] ?? $move['move_uci'],
                'classification' => $classification,
            ];
            $moveCount++;
        }

        $goodMoves   = $brilliants + $greats + $goods;
        $accuracy    = $moveCount > 0 ? round(($goodMoves / $moveCount) * 100, 2) : 0;
        $score       = $this->calculateScore($accuracy, $blunders, $mistakes);

        return [
            'score'        => $score,
            'accuracy'     => $accuracy,
            'brilliants'   => $brilliants,
            'greats'       => $greats,
            'goods'        => $goods,
            'inaccuracies' => $inaccuracies,
            'mistakes'     => $mistakes,
            'blunders'     => $blunders,
            'analysis_json' => json_encode($moveDetails),
        ];
    }

    private function evaluate(string $fen, string $path): int
    {
        $cmd    = "echo -e 'position fen {$fen}\ngo depth 10' | {$path} 2>/dev/null";
        $output = shell_exec($cmd) ?? '';
        preg_match('/score cp (-?\d+)/', $output, $matches);
        return isset($matches[1]) ? (int)$matches[1] : 0;
    }

    private function classifyMove(int $centipawns): string
    {
        $abs = abs($centipawns);
        if ($abs <= 20)  return 'brilliant';
        if ($abs <= 50)  return 'great';
        if ($abs <= 100) return 'good';
        if ($abs <= 200) return 'inaccuracy';
        if ($abs <= 400) return 'mistake';
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
