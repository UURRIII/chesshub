<?php

namespace App\Models;

use CodeIgniter\Model;

class GameAnalysisModel extends Model
{
    protected $table      = 'game_analysis';
    protected $primaryKey = 'id';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'user_id', 'game_id', 'bot_game_id', 'score', 'accuracy',
        'brilliants', 'greats', 'goods', 'inaccuracies',
        'mistakes', 'blunders', 'analysis_json',
    ];
}
