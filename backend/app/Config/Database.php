<?php

namespace Config;

use CodeIgniter\Database\Config;

class Database extends Config
{
    public string $defaultGroup = 'default';

    public array $default = [
        'DSN'          => '',
        'hostname'     => '',
        'username'     => '',
        'password'     => '',
        'database'     => '',
        'DBDriver'     => 'MySQLi',
        'DBPrefix'     => '',
        'pConnect'     => false,
        'DBDebug'      => false,
        'charset'      => 'utf8mb4',
        'DBCollat'     => 'utf8mb4_unicode_ci',
        'swapPre'      => '',
        'encrypt'      => false,
        'compress'     => false,
        'strictOn'     => false,
        'failover'     => [],
        'port'         => 3306,
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

    public function __construct()
    {
        parent::__construct();

        $this->default['hostname'] = getenv('DB_HOSTNAME') ?: '127.0.0.1';
        $this->default['username'] = getenv('DB_USERNAME') ?: 'chesshub';
        $this->default['password'] = getenv('DB_PASSWORD') ?: 'chesshub1234';
        $this->default['database'] = getenv('DB_DATABASE') ?: 'chesshub';
        $this->default['port']     = (int)(getenv('DB_PORT') ?: 3307);
    }
}
