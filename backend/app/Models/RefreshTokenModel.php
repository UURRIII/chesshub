<?php

namespace App\Models;

use CodeIgniter\Model;

class RefreshTokenModel extends Model
{
    protected $table      = 'refresh_tokens';
    protected $primaryKey = 'id';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'user_id', 'token', 'expires_at', 'revoked',
    ];

    public function createToken(int $userId, string $token): void
    {
        $this->insert([
            'user_id'    => $userId,
            'token'      => hash('sha256', $token),
            'expires_at' => date('Y-m-d H:i:s', time() + 604800),
            'revoked'    => 0,
        ]);
    }

    public function isValid(string $token): ?array
    {
        return $this->where('token', hash('sha256', $token))
                    ->where('revoked', 0)
                    ->where('expires_at >', date('Y-m-d H:i:s'))
                    ->first();
    }

    public function revoke(string $token): void
    {
        $this->where('token', hash('sha256', $token))->set('revoked', 1)->update();
    }

    public function revokeAllForUser(int $userId): void
    {
        $this->where('user_id', $userId)->set('revoked', 1)->update();
    }
}
