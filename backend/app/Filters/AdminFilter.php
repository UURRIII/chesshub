<?php

namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;

class AdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        helper("jwt");
        $header = $request->getHeaderLine("Authorization");

        if (!$header || !str_starts_with($header, "Bearer ")) {
            return service("response")
                ->setStatusCode(401)
                ->setJSON(["status" => "error", "message" => "Token requerit"]);
        }

        $token   = substr($header, 7);
        $decoded = jwt_decode($token);

        if (!$decoded) {
            return service("response")
                ->setStatusCode(401)
                ->setJSON(["status" => "error", "message" => "Token invalid o expirat"]);
        }

        // Verificar rol i estat des de la BD, NO del payload del JWT.
        // Si es confiés en el JWT, un admin degradat conservaria l'accés
        // durant les 8 h de vida del token.
        $user = (new \App\Models\UserModel())->find($decoded->sub);

        if (!$user || !(int) $user['is_active']) {
            return service("response")
                ->setStatusCode(401)
                ->setJSON(["status" => "error", "message" => "Compte desactivat"]);
        }

        if ($user['role'] !== 'admin') {
            return service("response")
                ->setStatusCode(403)
                ->setJSON(["status" => "error", "message" => "Acces restringit a administradors"]);
        }

        $_SERVER["JWT_USER"] = $decoded;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null) {}
}
