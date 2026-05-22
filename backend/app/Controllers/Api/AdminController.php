<?php

namespace App\Controllers\Api;

use App\Models\UserModel;
use App\Models\ProfileModel;
use App\Models\GameModel;
use App\Models\BotGameModel;
use App\Models\PuzzleModel;
use CodeIgniter\RESTful\ResourceController;

class AdminController extends ResourceController
{
    protected $format = 'json';

    // ── STATS ────────────────────────────────────────────────
    public function stats()
    {
        $db = \Config\Database::connect();

        $totalUsers    = (new UserModel())->countAll();
        $totalGames    = $db->table('games')->countAll();
        $totalBotGames = $db->table('bot_games')->countAll();
        $totalPuzzles  = (new PuzzleModel())->countAll();
        $pendingReports = $db->table('reports')->where('status', 'pending')->countAllResults();

        $activeUsers = $db->table('users')->where('is_active', 1)->countAllResults();

        $recentGames = $db->table('games')
            ->orderBy('created_at', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'total_users'     => $totalUsers,
                'active_users'    => $activeUsers,
                'total_games'     => $totalGames,
                'total_bot_games' => $totalBotGames,
                'total_puzzles'   => $totalPuzzles,
                'pending_reports' => $pendingReports,
                'recent_games'    => $recentGames,
            ],
        ]);
    }

    // ── USERS ────────────────────────────────────────────────
    public function users()
    {
        $page  = (int) ($this->request->getVar('page')  ?? 1);
        $limit = min(100, max(1, (int) ($this->request->getVar('limit') ?? 20)));
        $search = $this->request->getVar('search');

        $db = \Config\Database::connect();
        $builder = $db->table('users u')
            ->select('u.id, u.username, u.email, u.role, u.is_active, u.created_at, p.elo, p.wins, p.losses, p.draws')
            ->join('profiles p', 'p.user_id = u.id', 'left')
            ->orderBy('u.created_at', 'DESC');

        if ($search) {
            $builder->groupStart()
                ->like('u.username', $search)
                ->orLike('u.email', $search)
            ->groupEnd();
        }

        $total = $builder->countAllResults(false);
        $users = $builder->limit($limit, ($page - 1) * $limit)->get()->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'users' => $users,
                'total' => $total,
                'page'  => $page,
                'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function updateUser($id = null)
    {
        $data   = $this->request->getJSON(true) ?? [];
        $userModel = new UserModel();
        $user = $userModel->find($id);

        if (!$user) {
            return $this->respond(['status' => 'error', 'message' => 'Usuari no trobat'], 404);
        }

        $allowed = ['is_active', 'role'];
        $update  = array_intersect_key($data, array_flip($allowed));

        // Protecció: un administrador no es pot degradar ni desactivar a si mateix
        $selfId = jwt_uid();
        if ((int) $id === $selfId) {
            if ((isset($update['role']) && $update['role'] !== 'admin')
                || (isset($update['is_active']) && !$update['is_active'])) {
                return $this->respond(['status' => 'error', 'message' => 'No et pots degradar ni desactivar a tu mateix'], 400);
            }
        }

        if (!empty($update)) {
            if (isset($update['role']) && !\in_array($update['role'], ['user', 'admin'])) {
                return $this->respond(['status' => 'error', 'message' => 'Rol no vàlid'], 422);
            }
            $userModel->update($id, $update);
        }

        return $this->respond(['status' => 'success', 'message' => 'Usuari actualitzat']);
    }

    public function deleteUser($id = null)
    {
        $adminId = jwt_uid();
        if ($id == $adminId) {
            return $this->respond(['status' => 'error', 'message' => 'No et pots eliminar a tu mateix'], 400);
        }

        $user = (new UserModel())->find($id);
        if (!$user) {
            return $this->respond(['status' => 'error', 'message' => 'Usuari no trobat'], 404);
        }

        (new UserModel())->delete($id);
        return $this->respond(['status' => 'success', 'message' => 'Usuari eliminat']);
    }

    // ── PUZZLES ──────────────────────────────────────────────
    public function puzzles()
    {
        $page       = (int) ($this->request->getVar('page')       ?? 1);
        $limit      = (int) ($this->request->getVar('limit')      ?? 20);
        $difficulty = $this->request->getVar('difficulty');

        $model = new PuzzleModel();
        if ($difficulty) $model->where('difficulty', $difficulty);

        $total   = $model->countAllResults(false);
        $puzzles = $model->orderBy('created_at', 'DESC')
                          ->limit($limit, ($page - 1) * $limit)
                          ->findAll();

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'puzzles' => $puzzles,
                'total'   => $total,
                'page'    => $page,
                'pages'   => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function createPuzzle()
    {
        $adminId = jwt_uid();
        $data    = $this->request->getJSON(true) ?? [];

        $rules = [
            'fen'        => 'required',
            'solution'   => 'required',
            'difficulty' => 'required|in_list[beginner,intermediate,advanced,expert]',
        ];

        if (!$this->validate($rules, $data)) {
            return $this->respond(['status' => 'error', 'errors' => $this->validator->getErrors()], 422);
        }

        $id = (new PuzzleModel())->insert([
            'title'      => $data['title']     ?? null,
            'fen'        => $data['fen'],
            'solution'   => $data['solution'],
            'difficulty' => $data['difficulty'],
            'theme_tag'  => $data['theme_tag'] ?? null,
            'rating'     => (int) ($data['rating'] ?? 1200),
            'created_by' => $adminId,
        ]);

        return $this->respond(['status' => 'success', 'data' => ['id' => $id]], 201);
    }

    public function updatePuzzle($id = null)
    {
        $puzzle = (new PuzzleModel())->find($id);
        if (!$puzzle) {
            return $this->respond(['status' => 'error', 'message' => 'Puzzle no trobat'], 404);
        }

        $data    = $this->request->getJSON(true) ?? [];
        $allowed = ['title', 'fen', 'solution', 'difficulty', 'theme_tag', 'rating'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (!empty($update)) {
            (new PuzzleModel())->update($id, $update);
        }

        return $this->respond(['status' => 'success', 'message' => 'Puzzle actualitzat']);
    }

    public function deletePuzzle($id = null)
    {
        $puzzle = (new PuzzleModel())->find($id);
        if (!$puzzle) {
            return $this->respond(['status' => 'error', 'message' => 'Puzzle no trobat'], 404);
        }

        (new PuzzleModel())->delete($id);
        return $this->respond(['status' => 'success', 'message' => 'Puzzle eliminat']);
    }

    // ── REPORTS ──────────────────────────────────────────────
    public function reports()
    {
        $page   = (int) ($this->request->getVar('page')   ?? 1);
        $limit  = (int) ($this->request->getVar('limit')  ?? 20);
        $status = $this->request->getVar('status');

        $db = \Config\Database::connect();
        $builder = $db->table('reports r')
            ->select('r.*, u1.username as reporter_username, u2.username as reported_username')
            ->join('users u1', 'u1.id = r.reporter_id', 'left')
            ->join('users u2', 'u2.id = r.reported_user_id', 'left')
            ->orderBy('r.created_at', 'DESC');

        if ($status) $builder->where('r.status', $status);

        $total   = $builder->countAllResults(false);
        $reports = $builder->limit($limit, ($page - 1) * $limit)->get()->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'reports' => $reports,
                'total'   => $total,
                'page'    => $page,
                'pages'   => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function updateReport($id = null)
    {
        $adminId = jwt_uid();
        $data    = $this->request->getJSON(true) ?? [];
        $db      = \Config\Database::connect();

        $report = $db->table('reports')->where('id', $id)->get()->getRowArray();
        if (!$report) {
            return $this->respond(['status' => 'error', 'message' => 'Report no trobat'], 404);
        }

        $newStatus = $data['status'] ?? null;
        if (!\in_array($newStatus, ['reviewed', 'resolved', 'dismissed'])) {
            return $this->respond(['status' => 'error', 'message' => 'Estat no vàlid'], 422);
        }

        $db->table('reports')->where('id', $id)->update([
            'status'      => $newStatus,
            'reviewed_by' => $adminId,
            'updated_at'  => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['status' => 'success', 'message' => 'Report actualitzat']);
    }

    // ── GAMES ────────────────────────────────────────────────
    public function games()
    {
        $page  = (int) ($this->request->getVar('page')  ?? 1);
        $limit = min(100, max(1, (int) ($this->request->getVar('limit') ?? 20)));

        $db = \Config\Database::connect();
        $builder = $db->table('games g')
            ->select('g.*, u1.username as white_username, u2.username as black_username')
            ->join('users u1', 'u1.id = g.player_white_id', 'left')
            ->join('users u2', 'u2.id = g.player_black_id', 'left')
            ->orderBy('g.created_at', 'DESC');

        $total = $builder->countAllResults(false);
        $games = $builder->limit($limit, ($page - 1) * $limit)->get()->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'games' => $games,
                'total' => $total,
                'page'  => $page,
                'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }
}
