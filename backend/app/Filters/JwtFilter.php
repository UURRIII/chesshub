<?php

namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;

class JwtFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        helper('jwt');
        $header = $request->getHeaderLine('Authorization');

        if (!$header || !str_starts_with($header, 'Bearer ')) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Token requerit']);
        }

        $token   = substr($header, 7);
        $decoded = jwt_decode($token);

        if (!$decoded) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['status' => 'error', 'message' => 'Token invàlid o expirat']);
        }

        // PHP 8.4 compatible - store in session/globals
        $_SERVER['JWT_USER'] = $decoded;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null) {}
}
