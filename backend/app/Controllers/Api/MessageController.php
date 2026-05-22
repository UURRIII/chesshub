<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class MessageController extends ResourceController
{
    protected $format = 'json';

    private function uid(): int
    {
        return (int) jwt_uid();
    }

    // GET /messages/(:num)?page=1&limit=50 — conversa amb l'usuari $id (paginada)
    public function conversation($id = null)
    {
        $userId = $this->uid();
        $other  = (int) $id;
        $db     = \Config\Database::connect();

        if (!$this->areFriends($db, $userId, $other)) {
            return $this->respond(['status' => 'error', 'message' => 'Només pots xatejar amb amics'], 403);
        }

        $page   = max(1, (int) ($this->request->getGet('page')  ?? 1));
        $limit  = min(100, max(1, (int) ($this->request->getGet('limit') ?? 50)));
        $offset = ($page - 1) * $limit;

        $msgs = $db->query(
            'SELECT * FROM direct_messages
             WHERE (sender_id = ? AND receiver_id = ?)
                OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at ASC
             LIMIT ? OFFSET ?',
            [$userId, $other, $other, $userId, $limit, $offset]
        )->getResultArray();

        // Marca com a llegits els missatges que m'ha enviat l'altre usuari
        $db->table('direct_messages')
           ->where('sender_id', $other)
           ->where('receiver_id', $userId)
           ->where('is_read', 0)
           ->update(['is_read' => 1]);

        $data = array_map(fn($m) => [
            'id'         => (int) $m['id'],
            'sender_id'  => (int) $m['sender_id'],
            'body'       => $m['body'],
            'created_at' => $m['created_at'],
        ], $msgs);

        return $this->respond(['status' => 'success', 'data' => $data]);
    }

    // POST /messages/(:num) — envia un missatge a l'usuari $id
    public function send($id = null)
    {
        $userId = $this->uid();
        $other  = (int) $id;
        $db     = \Config\Database::connect();

        if (!$this->areFriends($db, $userId, $other)) {
            return $this->respond(['status' => 'error', 'message' => 'Només pots xatejar amb amics'], 403);
        }

        $data = $this->request->getJSON(true) ?? [];
        $body = trim((string) ($data['body'] ?? ''));

        if ($body === '') {
            return $this->respond(['status' => 'error', 'message' => 'Missatge buit'], 422);
        }
        if (mb_strlen($body) > 500) {
            $body = mb_substr($body, 0, 500);
        }

        $db->table('direct_messages')->insert([
            'sender_id'   => $userId,
            'receiver_id' => $other,
            'body'        => $body,
        ]);

        return $this->respond([
            'status' => 'success',
            'data'   => ['id' => (int) $db->insertID(), 'body' => $body],
        ]);
    }

    // GET /messages/unread — nombre total de missatges no llegits
    public function unread()
    {
        $userId = $this->uid();
        $db     = \Config\Database::connect();
        $count  = $db->table('direct_messages')
            ->where('receiver_id', $userId)
            ->where('is_read', 0)
            ->countAllResults();

        return $this->respond(['status' => 'success', 'data' => ['count' => $count]]);
    }

    private function areFriends($db, int $a, int $b): bool
    {
        if ($a === $b) return false;
        return (bool) $db->table('friendships')
            ->where('status', 'accepted')
            ->groupStart()
                ->groupStart()->where('requester_id', $a)->where('addressee_id', $b)->groupEnd()
                ->orGroupStart()->where('requester_id', $b)->where('addressee_id', $a)->groupEnd()
            ->groupEnd()
            ->countAllResults();
    }
}
