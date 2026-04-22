<?php

namespace App\Models;

use CodeIgniter\Model;

class MoveModel extends Model
{
    protected $table      = 'moves';
    protected $primaryKey = 'id';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'game_id', 'move_number', 'player_id',
        'move_san', 'move_uci', 'fen_after', 'time_spent',
    ];
}
