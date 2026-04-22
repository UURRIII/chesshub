<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Cors extends BaseConfig
{
    public array $default = [
        'allowedOrigins'      => ['http://localhost:4200', 'http://grup4.infla.cat'],
        'allowedOriginsPatterns' => [],
        'supportsCredentials' => false,
        'allowedHeaders'      => ['Content-Type', 'Authorization', 'X-Requested-With'],
        'exposedHeaders'      => [],
        'allowedMethods'      => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'maxAge'              => 7200,
    ];
}
