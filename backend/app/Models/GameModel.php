<?php

namespace App\Models;

use CodeIgniter\Model;

class GameModel extends Model
{
    protected $table      = 'games';
    protected $primaryKey = 'id';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'player_white_id', 'player_black_id', 'status', 'result',
        'end_reason', 'time_control', 'pgn', 'fen_final',
        'started_at', 'ended_at',
    ];
}
