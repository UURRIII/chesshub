<?php

namespace App\Controllers\Api;

use App\Models\PuzzleModel;
use App\Models\PuzzleAttemptModel;
use CodeIgniter\RESTful\ResourceController;

class PuzzleController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $difficulty = $this->request->getVar('difficulty');
        $limit      = $this->request->getVar('limit') ?? 10;

        $model = new PuzzleModel();
        if ($difficulty) {
            $model->where('difficulty', $difficulty);
        }

        $puzzles = $model->orderBy('RAND()')->limit((int)$limit)->findAll();

        return $this->respond(['status' => 'success', 'data' => $puzzles]);
    }

    public function show($id = null)
    {
        $puzzle = (new PuzzleModel())->find($id);
        if (!$puzzle) {
            return $this->respond(['status' => 'error', 'message' => 'Puzzle no trobat'], 404);
        }

        // No retornem la solució directament
        unset($puzzle['solution']);

        return $this->respond(['status' => 'success', 'data' => $puzzle]);
    }

    public function attempt($id = null)
    {
        $userId = $this->request->user->sub;
        $puzzle = (new PuzzleModel())->find($id);

        if (!$puzzle) {
            return $this->respond(['status' => 'error', 'message' => 'Puzzle no trobat'], 404);
        }

        $userMoves = $this->request->getVar('moves');
        $timeSp    = $this->request->getVar('time_spent');

        $solved = trim($userMoves) === trim($puzzle['solution']);

        (new PuzzleAttemptModel())->insert([
            'puzzle_id'    => $id,
            'user_id'      => $userId,
            'solved'       => $solved ? 1 : 0,
            'time_spent'   => $timeSp,
            'attempted_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'solved'   => $solved,
                'solution' => $solved ? null : $puzzle['solution'],
            ],
        ]);
    }
}
