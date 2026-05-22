<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Cors extends BaseConfig
{
    public array $default;

    public function __construct()
    {
        parent::__construct();

        // Orígens permesos llegits des de variable d'entorn.
        // En producció (K8s): ALLOWED_ORIGINS=http://grup4.infla.cat
        // En local:           ALLOWED_ORIGINS=http://localhost:4200
        $raw = getenv('ALLOWED_ORIGINS') ?: (ENVIRONMENT === 'development' ? 'http://localhost:4200' : '');
        $origins = $raw !== ''
            ? array_values(array_filter(array_map('trim', explode(',', $raw))))
            : [];

        $this->default = [
            'allowedOrigins'         => $origins,
            'allowedOriginsPatterns' => [],
            'supportsCredentials'    => false,
            'allowedHeaders'         => ['Content-Type', 'Authorization', 'X-Requested-With'],
            'exposedHeaders'         => [],
            'allowedMethods'         => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'maxAge'                 => 7200,
        ];
    }
}
