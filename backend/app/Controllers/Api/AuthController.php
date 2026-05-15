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
        helper(['jwt', 'email']);
        $rules = [
            'username' => 'required|min_length[3]|max_length[50]|is_unique[users.username]',
            'email'    => 'required|valid_email|is_unique[users.email]',
            'password' => 'required|min_length[8]',
        ];

        if (!$this->validate($rules)) {
            return $this->respond(['status' => 'error', 'errors' => $this->validator->getErrors()], 422);
        }

        $verificationToken = bin2hex(random_bytes(16));

        $userModel = new UserModel();
        $userId = $userModel->insert([
            'username'           => $this->request->getVar('username'),
            'email'              => $this->request->getVar('email'),
            'password'           => password_hash($this->request->getVar('password'), PASSWORD_BCRYPT),
            'role'               => 'user',
            'email_verified'     => 0,
            'verification_token' => $verificationToken,
        ]);

        // Crear perfil automàticament
        (new ProfileModel())->insert(['user_id' => $userId]);

        $user = $userModel->find($userId);

        // Enviar email de verificació (no bloqueja el registre si falla)
        $this->sendVerificationEmail($user['email'], $user['username'], $verificationToken);

        $tokens = jwt_generate($userId, $user['role']);
        (new RefreshTokenModel())->createToken($userId, $tokens['refresh_token']);

        return $this->respond([
            'status' => 'success',
            'data'   => [
                'user'   => [
                    'id'             => $user['id'],
                    'username'       => $user['username'],
                    'email'          => $user['email'],
                    'role'           => $user['role'],
                    'email_verified' => 0,
                ],
                'tokens' => $tokens,
            ],
        ], 201);
    }

    public function login()
    {
        helper(['jwt']);
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
                'user'   => [
                    'id'             => $user['id'],
                    'username'       => $user['username'],
                    'email'          => $user['email'],
                    'role'           => $user['role'],
                    'email_verified' => (int) ($user['email_verified'] ?? 1),
                ],
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

    // ── Verificació d'email ──────────────────────────────────────────────────

    public function verifyEmail()
    {
        $token = $this->request->getGet('token');
        if (!$token) {
            return $this->respond(['status' => 'error', 'message' => 'Token requerit'], 422);
        }

        $userModel = new UserModel();
        $user = $userModel->where('verification_token', $token)->first();

        if (!$user) {
            return $this->respond(['status' => 'error', 'message' => 'Token invàlid o ja utilitzat'], 404);
        }

        $userModel->update($user['id'], [
            'email_verified'     => 1,
            'verification_token' => null,
        ]);

        return $this->respond(['status' => 'success', 'message' => 'Email verificat correctament']);
    }

    // ── Recuperació de contrasenya ───────────────────────────────────────────

    public function forgotPassword()
    {
        helper('email');
        $email = $this->request->getVar('email');
        if (!$email) {
            return $this->respond(['status' => 'error', 'message' => 'Email requerit'], 422);
        }

        $userModel = new UserModel();
        $user = $userModel->where('email', $email)->first();

        if ($user) {
            $token = bin2hex(random_bytes(16));
            $userModel->update($user['id'], [
                'reset_token'   => $token,
                'reset_expires' => date('Y-m-d H:i:s', time() + 3600), // 1 hora
            ]);
            $this->sendResetEmail($user['email'], $user['username'], $token);
        }

        // Resposta sempre igual: no revelem si l'email existeix
        return $this->respond([
            'status'  => 'success',
            'message' => 'Si l\'email està registrat, rebràs un enllaç per restablir la contrasenya.',
        ]);
    }

    public function resetPassword()
    {
        $data     = $this->request->getJSON(true) ?? [];
        $token    = $data['token']    ?? null;
        $password = $data['password'] ?? null;

        if (!$token || !$password) {
            return $this->respond(['status' => 'error', 'message' => 'Token i contrasenya requerits'], 422);
        }
        if (strlen($password) < 8) {
            return $this->respond(['status' => 'error', 'message' => 'La contrasenya ha de tenir almenys 8 caràcters'], 422);
        }

        $userModel = new UserModel();
        $user = $userModel->where('reset_token', $token)
                          ->where('reset_expires >', date('Y-m-d H:i:s'))
                          ->first();

        if (!$user) {
            return $this->respond(['status' => 'error', 'message' => 'Token invàlid o caducat'], 400);
        }

        $userModel->update($user['id'], [
            'password'      => password_hash($password, PASSWORD_BCRYPT),
            'reset_token'   => null,
            'reset_expires' => null,
        ]);

        return $this->respond(['status' => 'success', 'message' => 'Contrasenya actualitzada correctament']);
    }

    // ── Helpers privats ──────────────────────────────────────────────────────

    private function frontendUrl(): string
    {
        return rtrim(getenv('FRONTEND_URL') ?: 'http://grup4.infla.cat', '/');
    }

    private function sendVerificationEmail(string $email, string $username, string $token): void
    {
        $link = $this->frontendUrl() . '/verify-email?token=' . $token;
        $body = email_layout(
            'Confirma el teu correu',
            '<p style="color:#c8d0d8;line-height:1.6">Hola <strong>' . esc($username) . '</strong>,</p>'
            . '<p style="color:#c8d0d8;line-height:1.6">Gràcies per registrar-te a ChessHub! '
            . 'Confirma la teva adreça de correu per activar totes les funcions del teu compte.</p>'
            . email_button($link, 'Verificar el correu')
        );
        send_email($email, $username, 'Verifica el teu correu — ChessHub', $body);
    }

    private function sendResetEmail(string $email, string $username, string $token): void
    {
        $link = $this->frontendUrl() . '/reset-password?token=' . $token;
        $body = email_layout(
            'Restableix la contrasenya',
            '<p style="color:#c8d0d8;line-height:1.6">Hola <strong>' . esc($username) . '</strong>,</p>'
            . '<p style="color:#c8d0d8;line-height:1.6">Has demanat restablir la contrasenya del teu compte. '
            . 'Aquest enllaç caduca d\'aquí a 1 hora. Si no has estat tu, ignora aquest correu.</p>'
            . email_button($link, 'Restablir la contrasenya')
        );
        send_email($email, $username, 'Restableix la contrasenya — ChessHub', $body);
    }
}
