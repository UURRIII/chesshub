<?php

namespace App\Models;

use CodeIgniter\Model;

class PuzzleAttemptModel extends Model
{
    protected $table      = 'puzzle_attempts';
    protected $primaryKey = 'id';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'puzzle_id', 'user_id', 'solved', 'time_spent', 'attempted_at',
    ];
}
