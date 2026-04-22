<?php

namespace Config;

use CodeIgniter\Database\Config;

class Database extends Config
{
    public string $defaultGroup = 'default';

    public array $default = [
        'DSN'          => '',
        'hostname'     => '127.0.0.1',
        'username'     => 'chesshub',
        'password'     => 'chesshub1234',
        'database'     => 'chesshub',
        'DBDriver'     => 'MySQLi',
        'DBPrefix'     => '',
        'pConnect'     => false,
        'DBDebug'      => true,
        'charset'      => 'utf8mb4',
        'DBCollat'     => 'utf8mb4_unicode_ci',
        'swapPre'      => '',
        'encrypt'      => false,
        'compress'     => false,
        'strictOn'     => false,
        'failover'     => [],
        'port'         => 3307,
        'numberNative' => false,
        'foundRows'    => false,
    ];

    public array $tests = [
        'DSN'      => '',
        'hostname' => '127.0.0.1',
        'username' => 'chesshub',
        'password' => 'chesshub1234',
        'database' => 'chesshub_test',
        'DBDriver' => 'MySQLi',
        'DBPrefix' => 'tests_',
        'pConnect' => false,
        'DBDebug'  => true,
        'charset'  => 'utf8mb4',
        'DBCollat' => 'utf8mb4_unicode_ci',
        'swapPre'  => '',
        'encrypt'  => false,
        'compress' => false,
        'strictOn' => false,
        'failover' => [],
        'port'     => 3306,
    ];
}
