<?php

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function jwt_encode(array $payload): string
{
    $key = getenv('app.secretKey') ?: 'chesshub_secret';
    return JWT::encode($payload, $key, 'HS256');
}

function jwt_decode(string $token): ?object
{
    try {
        $key = getenv('app.secretKey') ?: 'chesshub_secret';
        return JWT::decode($token, new Key($key, 'HS256'));
    } catch (\Exception $e) {
        return null;
    }
}

function jwt_generate(int $userId, string $role): array
{
    $now = time();
    $access = jwt_encode([
        'iss'  => 'chesshub',
        'iat'  => $now,
        'exp'  => $now + 3600,        // 1 hora
        'sub'  => $userId,
        'role' => $role,
    ]);
    $refresh = jwt_encode([
        'iss' => 'chesshub',
        'iat' => $now,
        'exp' => $now + 604800,       // 7 dies
        'sub' => $userId,
        'type' => 'refresh',
    ]);
    return ['access_token' => $access, 'refresh_token' => $refresh];
}
