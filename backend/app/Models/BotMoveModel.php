<?php

namespace App\Models;

use CodeIgniter\Model;

class BotMoveModel extends Model
{
    protected $table      = 'bot_moves';
    protected $primaryKey = 'id';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'bot_game_id', 'move_number', 'is_bot',
        'move_san', 'move_uci', 'fen_after', 'time_spent',
    ];
}
