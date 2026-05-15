<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class FriendController extends ResourceController
{
    protected $format = 'json';

    private function uid(): int
    {
        return (int) $_SERVER['JWT_USER']->sub;
    }

    // GET /friends — llista d'amics acceptats
    public function index()
    {
        $userId = $this->uid();
        $db     = \Config\Database::connect();

        $rows = $db->table('friendships')
            ->where('status', 'accepted')
            ->groupStart()
                ->where('requester_id', $userId)
                ->orWhere('addressee_id', $userId)
            ->groupEnd()
            ->get()->getResultArray();

        $friends = [];
        foreach ($rows as $r) {
            $friendId = $r['requester_id'] == $userId
                ? (int) $r['addressee_id']
                : (int) $r['requester_id'];
            $info = $this->userInfo($db, $friendId);
            if ($info) {
                $info['since'] = $r['created_at'];
                $friends[] = $info;
            }
        }
        usort($friends, fn($a, $b) => strcasecmp($a['username'], $b['username']));

        return $this->respond(['status' => 'success', 'data' => $friends]);
    }

    // GET /friends/requests — sol·licituds rebudes pendents + enviades pendents
    public function requests()
    {
        $userId = $this->uid();
        $db     = \Config\Database::connect();

        $received = [];
        foreach ($db->table('friendships')->where('status', 'pending')
                    ->where('addressee_id', $userId)->get()->getResultArray() as $r) {
            $info = $this->userInfo($db, (int) $r['requester_id']);
            if ($info) $received[] = $info;
        }

        $sent = [];
        foreach ($db->table('friendships')->where('status', 'pending')
                    ->where('requester_id', $userId)->get()->getResultArray() as $r) {
            $info = $this->userInfo($db, (int) $r['addressee_id']);
            if ($info) $sent[] = $info;
        }

        return $this->respond([
            'status' => 'success',
            'data'   => ['received' => $received, 'sent' => $sent],
        ]);
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

    private function userInfo($db, int $id): ?array
    {
        $u = $db->table('users')->select('id, username')->where('id', $id)->get()->getRowArray();
        if (!$u) return null;
        $p = $db->table('profiles')->select('avatar, elo')->where('user_id', $id)->get()->getRowArray();
        return [
            'id'       => (int) $u['id'],
            'username' => $u['username'],
            'avatar'   => $p['avatar'] ?? null,
            'elo'      => isset($p['elo']) ? (int) $p['elo'] : 1200,
        ];
    }
}
