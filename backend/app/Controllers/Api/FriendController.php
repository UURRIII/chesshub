<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class FriendController extends ResourceController
{
    protected $format = 'json';

    private function uid(): int
    {
        return (int) jwt_uid();
    }

    // GET /friends — llista d'amics acceptats (1 consulta amb JOIN)
    public function index()
    {
        $userId = $this->uid();
        $db     = \Config\Database::connect();

        // Una sola consulta: amic pot ser requester o addressee → UNION dels dos casos
        $rows = $db->query(
            "SELECT u.id, u.username, p.avatar, p.elo,
                    f.created_at AS since
             FROM friendships f
             JOIN users   u ON u.id = IF(f.requester_id = ?, f.addressee_id, f.requester_id)
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE f.status = 'accepted'
               AND (f.requester_id = ? OR f.addressee_id = ?)
             ORDER BY u.username ASC",
            [$userId, $userId, $userId]
        )->getResultArray();

        $friends = array_map(fn($r) => [
            'id'       => (int) $r['id'],
            'username' => $r['username'],
            'avatar'   => $r['avatar'] ?? null,
            'elo'      => isset($r['elo']) ? (int) $r['elo'] : 1200,
            'since'    => $r['since'],
        ], $rows);

        return $this->respond(['status' => 'success', 'data' => $friends]);
    }

    // GET /friends/requests — sol·licituds rebudes + enviades pendents (1 consulta cada grup)
    public function requests()
    {
        $userId = $this->uid();
        $db     = \Config\Database::connect();

        // Rebudes: JOIN directe amb l'usuari que va enviar la sol·licitud
        $received = $db->query(
            "SELECT u.id, u.username, p.avatar, p.elo
             FROM friendships f
             JOIN users   u ON u.id = f.requester_id
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE f.status = 'pending' AND f.addressee_id = ?",
            [$userId]
        )->getResultArray();

        // Enviades: JOIN directe amb l'usuari destinatari
        $sent = $db->query(
            "SELECT u.id, u.username, p.avatar, p.elo
             FROM friendships f
             JOIN users   u ON u.id = f.addressee_id
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE f.status = 'pending' AND f.requester_id = ?",
            [$userId]
        )->getResultArray();

        $fmt = fn($r) => [
            'id'       => (int) $r['id'],
            'username' => $r['username'],
            'avatar'   => $r['avatar'] ?? null,
            'elo'      => isset($r['elo']) ? (int) $r['elo'] : 1200,
        ];

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'received' => array_map($fmt, $received),
                'sent'     => array_map($fmt, $sent),
            ],
        ]);
    }

    // GET /friends/search?q=... — cerca usuaris per nom amb estat d'amistat (1+1 consultes)
    public function search()
    {
        $userId = $this->uid();
        $q      = trim((string) $this->request->getGet('q'));

        if (mb_strlen($q) < 2) {
            return $this->respond(['status' => 'success', 'data' => []]);
        }

        $db = \Config\Database::connect();

        // Usuaris que encaixen + el seu estat d'amistat en una sola consulta via LEFT JOIN
        $rows = $db->query(
            "SELECT u.id, u.username, p.avatar, p.elo,
                    f.status AS friendship_status,
                    f.requester_id AS friendship_requester
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             LEFT JOIN friendships f
                ON f.status IN ('pending','accepted')
               AND ((f.requester_id = ? AND f.addressee_id = u.id)
                 OR (f.requester_id = u.id AND f.addressee_id = ?))
             WHERE u.username LIKE ? AND u.id != ? AND u.is_active = 1
             ORDER BY u.username ASC
             LIMIT 15",
            [$userId, $userId, '%' . $q . '%', $userId]
        )->getResultArray();

        $out = [];
        foreach ($rows as $r) {
            $status = 'none';
            if ($r['friendship_status'] === 'accepted') {
                $status = 'friends';
            } elseif ($r['friendship_status'] === 'pending') {
                $status = ($r['friendship_requester'] == $userId) ? 'sent' : 'received';
            }

            $out[] = [
                'id'       => (int) $r['id'],
                'username' => $r['username'],
                'avatar'   => $r['avatar'] ?? null,
                'elo'      => isset($r['elo']) ? (int) $r['elo'] : 1200,
                'status'   => $status,
            ];
        }

        return $this->respond(['status' => 'success', 'data' => $out]);
    }

    // POST /friends/request/(:num) — envia una sol·licitud d'amistat
    public function sendRequest($id = null)
    {
        $userId = $this->uid();
        $target = (int) $id;

        if ($target === $userId) {
            return $this->respond(['status' => 'error', 'message' => 'No et pots afegir a tu mateix'], 400);
        }

        $db = \Config\Database::connect();
        if (!$db->table('users')->where('id', $target)->countAllResults()) {
            return $this->respond(['status' => 'error', 'message' => 'Usuari no trobat'], 404);
        }

        $existing = $db->table('friendships')
            ->groupStart()
                ->groupStart()
                    ->where('requester_id', $userId)->where('addressee_id', $target)
                ->groupEnd()
                ->orGroupStart()
                    ->where('requester_id', $target)->where('addressee_id', $userId)
                ->groupEnd()
            ->groupEnd()
            ->get()->getRowArray();

        if ($existing) {
            if ($existing['status'] === 'accepted') {
                return $this->respond(['status' => 'error', 'message' => 'Ja sou amics'], 409);
            }
            // L'altre usuari ja ens havia enviat sol·licitud → l'acceptem
            if ($existing['addressee_id'] == $userId) {
                $db->table('friendships')->where('id', $existing['id'])
                   ->update(['status' => 'accepted']);
                return $this->respond(['status' => 'success', 'message' => 'Sol·licitud acceptada']);
            }
            return $this->respond(['status' => 'error', 'message' => 'Sol·licitud ja enviada'], 409);
        }

        $db->table('friendships')->insert([
            'requester_id' => $userId,
            'addressee_id' => $target,
            'status'       => 'pending',
        ]);

        return $this->respond(['status' => 'success', 'message' => 'Sol·licitud enviada']);
    }

    // POST /friends/(:num)/accept — accepta la sol·licitud rebuda de l'usuari $id
    public function accept($id = null)
    {
        $userId = $this->uid();
        $other  = (int) $id;
        $db     = \Config\Database::connect();

        $row = $db->table('friendships')
            ->where('requester_id', $other)
            ->where('addressee_id', $userId)
            ->where('status', 'pending')
            ->get()->getRowArray();

        if (!$row) {
            return $this->respond(['status' => 'error', 'message' => 'Sol·licitud no trobada'], 404);
        }

        $db->table('friendships')->where('id', $row['id'])
           ->update(['status' => 'accepted']);

        return $this->respond(['status' => 'success', 'message' => 'Ara sou amics']);
    }

    // DELETE /friends/(:num) — elimina amistat / rebutja / cancel·la (qualsevol estat o direcció)
    public function remove($id = null)
    {
        $userId = $this->uid();
        $other  = (int) $id;
        $db     = \Config\Database::connect();

        $db->table('friendships')
            ->groupStart()
                ->groupStart()
                    ->where('requester_id', $userId)->where('addressee_id', $other)
                ->groupEnd()
                ->orGroupStart()
                    ->where('requester_id', $other)->where('addressee_id', $userId)
                ->groupEnd()
            ->groupEnd()
            ->delete();

        return $this->respond(['status' => 'success', 'message' => 'Relació eliminada']);
    }

}
