<?php

namespace App\Controllers\Api;

use App\Models\UserModel;
use App\Models\ProfileModel;
use App\Models\RefreshTokenModel;
use CodeIgniter\RESTful\ResourceController;

class AuthController extends ResourceController
{
    protected $format = 'json';

    public function register()
    {
        helper(['jwt']);

        $throttler = \Config\Services::throttler();
        if ($throttler->check(md5('register_' . $this->request->getIPAddress()), 6, 60) === false) {
            return $this->respond(['status' => 'error', 'message' => 'Massa intents. Espera un minut.'], 429);
        }

        $rules = [
            'username' => 'required|min_length[3]|max_length[50]|is_unique[users.username]',
            'email'    => 'required|valid_email|is_unique[users.email]',
            'password' => 'required|min_length[8]',
        ];

        if (!$this->validate($rules)) {
            return $this->respond(['status' => 'error', 'errors' => $this->validator->getErrors()], 422);
        }

        $userModel = new UserModel();
        $userId = $userModel->insert([
            'username' => $this->request->getVar('username'),
            'email'    => $this->request->getVar('email'),
            'password' => password_hash($this->request->getVar('password'), PASSWORD_BCRYPT),
            'role'     => 'user',
        ]);

        // Crear perfil automàticament
        (new ProfileModel())->insert(['user_id' => $userId]);

        $user   = $userModel->find($userId);
        $tokens = jwt_generate($userId, $user['role']);
        (new RefreshTokenModel())->createToken($userId, $tokens['refresh_token']);

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'user'   => ['id' => $user['id'], 'username' => $user['username'], 'email' => $user['email'], 'role' => $user['role']],
                'tokens' => $tokens,
            ],
        ], 201);
    }

    public function login()
    {
        helper(['jwt']);

        $throttler = \Config\Services::throttler();
        if ($throttler->check(md5('login_' . $this->request->getIPAddress()), 12, 60) === false) {
            return $this->respond(['status' => 'error', 'message' => 'Massa intents de connexió. Espera un minut.'], 429);
        }

        $email    = $this->request->getVar('email');
        $password = $this->request->getVar('password');

        if (!$email || !$password) {
            return $this->respond(['status' => 'error', 'message' => 'Email i password requerits'], 422);
        }

        $userModel = new UserModel();
        $user = $userModel->findByEmail($email);

        if (!$user || !password_verify($password, $user['password'])) {
            return $this->respond(['status' => 'error', 'message' => 'Credencials incorrectes'], 401);
        }

        if (!$user['is_active']) {
            return $this->respond(['status' => 'error', 'message' => 'Compte desactivat'], 403);
        }

        $tokens = jwt_generate($user['id'], $user['role']);
        (new RefreshTokenModel())->createToken($user['id'], $tokens['refresh_token']);

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'user'   => ['id' => $user['id'], 'username' => $user['username'], 'email' => $user['email'], 'role' => $user['role']],
                'tokens' => $tokens,
            ],
        ]);
    }

    public function refresh()
    {
        helper(['jwt']);
        $token = $this->request->getVar('refresh_token');
        if (!$token) {
            return $this->respond(['status' => 'error', 'message' => 'Refresh token requerit'], 422);
        }

        $rtModel = new RefreshTokenModel();
        $stored  = $rtModel->isValid($token);

        if (!$stored) {
            return $this->respond(['status' => 'error', 'message' => 'Refresh token invàlid'], 401);
        }

        $decoded = jwt_decode($token);
        if (!$decoded) {
            return $this->respond(['status' => 'error', 'message' => 'Token expirat'], 401);
        }

        $rtModel->revoke($token);
        $user = (new UserModel())->find($decoded->sub);
        if (!$user || !$user['is_active']) {
            return $this->respond(['status' => 'error', 'message' => 'Compte desactivat'], 403);
        }
        $tokens = jwt_generate($user['id'], $user['role']);
        $rtModel->createToken($user['id'], $tokens['refresh_token']);

        return $this->respond(['status' => 'success', 'data' => ['tokens' => $tokens]]);
    }

    public function logout()
    {
        helper(['jwt']);
        $token = $this->request->getVar('refresh_token');
        if ($token) {
            (new RefreshTokenModel())->revoke($token);
        }
        return $this->respond(['status' => 'success', 'message' => 'Sessió tancada']);
    }
}
