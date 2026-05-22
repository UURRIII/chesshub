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
        $limit      = min(50, max(1, (int) ($this->request->getVar('limit') ?? 10)));

        $db = \Config\Database::connect();

        // Evitem ORDER BY RAND() (O(n) full scan) usant un offset aleatori sobre l'índex primari.
        // Si hi ha filtrat per dificultat usem un subquery de min/max per l'offset.
        if ($difficulty) {
            $ids = $db->query(
                'SELECT MIN(id) AS mn, MAX(id) AS mx FROM puzzles WHERE difficulty = ?',
                [$difficulty]
            )->getRowArray();
        } else {
            $ids = $db->query('SELECT MIN(id) AS mn, MAX(id) AS mx FROM puzzles')->getRowArray();
        }

        $puzzles = [];
        if ($ids && $ids['mx'] !== null) {
            $offset  = rand((int) $ids['mn'], max((int) $ids['mn'], (int) $ids['mx'] - $limit));
            $builder = $db->table('puzzles')->where('id >=', $offset)->limit($limit);
            if ($difficulty) $builder->where('difficulty', $difficulty);
            $puzzles = $builder->get()->getResultArray();

            // Si l'offset no retorna prou resultats (forat a la taula), completem des del principi
            if (count($puzzles) < $limit) {
                $need    = $limit - count($puzzles);
                $already = array_column($puzzles, 'id');
                $builder2 = $db->table('puzzles')->limit($need);
                if ($difficulty) $builder2->where('difficulty', $difficulty);
                if ($already)    $builder2->whereNotIn('id', $already);
                $puzzles = array_merge($puzzles, $builder2->get()->getResultArray());
            }
            shuffle($puzzles);
        }

        // Amaguem la solució a la llista (igual que en show())
        $puzzles = array_map(function ($p) { unset($p['solution']); return $p; }, $puzzles);

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
        $userId = jwt_uid();
        $puzzle = (new PuzzleModel())->find($id);

        if (!$puzzle) {
            return $this->respond(['status' => 'error', 'message' => 'Puzzle no trobat'], 404);
        }

        $data   = $this->request->getJSON(true) ?? [];
        $timeSp = isset($data['time_spent']) ? (int) $data['time_spent'] : 0;

        // [A4] Valida els moviments al servidor en lloc de confiar en el camp
        // 'solved' enviat pel client. El frontend envia 'moves' com a cadena UCI
        // separada per espais (tots els moviments: jugador + respostes automàtiques).
        // Si 'moves' no arriba (compatibilitat enrere), recorrem al camp 'solved'.
        if (isset($data['moves'])) {
            $normalize = fn(string $s) => preg_replace('/\s+/', ' ', strtolower(trim($s)));
            $submitted = $normalize((string) $data['moves']);
            $expected  = $normalize((string) ($puzzle['solution'] ?? ''));
            $solved    = ($submitted !== '' && $submitted === $expected);
        } else {
            $solved = !empty($data['solved']);
        }

        (new PuzzleAttemptModel())->insert([
            'puzzle_id'    => $id,
            'user_id'      => $userId,
            'solved'       => $solved ? 1 : 0,
            'time_spent'   => $timeSp,
            'attempted_at' => date('Y-m-d H:i:s'),
        ]);

        // La solució NO es retorna mai: evita que l'usuari faci un intent fallat
        // intencionadament per obtenir la solució sense resoldre el puzzle.
        return $this->respond([
            'status' => 'success',
            'data'   => ['solved' => $solved],
        ]);
    }
}
