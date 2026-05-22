<?php

namespace App\Models;

use CodeIgniter\Model;

class ProfileModel extends Model
{
    protected $table      = 'profiles';
    protected $primaryKey = 'id';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'user_id', 'avatar', 'bio', 'elo', 'wins', 'losses', 'draws', 'theme_id',
    ];

    public function findByUserId(int $userId): ?array
    {
        return $this->where('user_id', $userId)->first();
    }
}
