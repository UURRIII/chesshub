<?php

namespace App\Models;

use CodeIgniter\Model;

class BotGameModel extends Model
{
    protected $table      = 'bot_games';
    protected $primaryKey = 'id';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'user_id', 'user_color', 'bot_level', 'status',
        'result', 'end_reason', 'time_control',
        'pgn', 'fen_final', 'started_at', 'ended_at',
    ];
}
