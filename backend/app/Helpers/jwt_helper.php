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

/**
 * Retorna l'objecte JWT de l'usuari autenticat (injectat pel JwtFilter/AdminFilter).
 * Ús: $user = jwt_user();  $userId = $user->sub;  $role = $user->role;
 *
 * Centralitza l'accés a $_SERVER['JWT_USER'] i facilita els tests
 * (es pot sobreescriure injectant el valor directament).
 */
function jwt_user(): object
{
    if (!isset($_SERVER['JWT_USER'])) {
        throw new \RuntimeException('jwt_user() cridada fora d\'un context autenticat (JwtFilter no executat).');
    }
    return $_SERVER['JWT_USER'];
}

/**
 * Retorna l'ID de l'usuari autenticat com a enter.
 * Drecera per a (int) jwt_user()->sub
 */
function jwt_uid(): int
{
    return (int) jwt_user()->sub;
}
