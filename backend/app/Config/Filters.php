<?php

namespace Config;

use App\Filters\JwtFilter;
use App\Filters\AdminFilter;
use CodeIgniter\Config\BaseConfig;
use CodeIgniter\Filters\CSRF;
use CodeIgniter\Filters\DebugToolbar;
use CodeIgniter\Filters\Honeypot;
use CodeIgniter\Filters\InvalidChars;
use CodeIgniter\Filters\SecureHeaders;

class Filters extends BaseConfig
{
    public array $aliases = [
        "csrf"          => CSRF::class,
        "toolbar"       => DebugToolbar::class,
        "honeypot"      => Honeypot::class,
        "invalidchars"  => InvalidChars::class,
        "secureheaders" => SecureHeaders::class,
        "jwt"           => JwtFilter::class,
        "admin"         => AdminFilter::class,
    ];

    public array $globals = [
        "before" => [],
        // La toolbar de debug només s'activa en mode development; en producció
        // CodeIgniter la desactiva, però la treiem dels globals per ser explícits.
        "after"  => ENVIRONMENT === 'development' ? ["toolbar"] : [],
    ];

    public array $methods = [];
    public array $filters = [];
}
