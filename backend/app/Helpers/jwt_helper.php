<?php

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Retorna el secret per signar/verificar JWT.
 * No hi ha cap valor per defecte: si no està configurat, l'aplicació
 * ha de fallar de seguida en lloc d'usar un secret feble i conegut.
 */
function jwt_secret(): string
{
    $key = getenv('JWT_SECRET') ?: getenv('app.secretKey') ?: '';
    if ($key === '') {
        throw new \RuntimeException('JWT_SECRET no configurat: cal definir-lo a les variables d\'entorn.');
    }
    return $key;
}

function jwt_encode(array $payload): string
{
    return JWT::encode($payload, jwt_secret(), 'HS256');
}

function jwt_decode(string $token): ?object
{
    try {
        return JWT::decode($token, new Key(jwt_secret(), 'HS256'));
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
        'exp'  => $now + 28800,
        'sub'  => $userId,
        'role' => $role,
    ]);
    $refresh = jwt_encode([
        'iss'  => 'chesshub',
        'iat'  => $now,
        'exp'  => $now + 604800,
        'sub'  => $userId,
        'type' => 'refresh',
    ]);
    return ['access_token' => $access, 'refresh_token' => $refresh];
}
