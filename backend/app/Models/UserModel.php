<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table      = 'users';
    protected $primaryKey = 'id';
    protected $useTimestamps = true;

    protected $allowedFields = [
        'username', 'email', 'password', 'role', 'is_active',
        'email_verified', 'verification_token', 'reset_token', 'reset_expires',
    ];

    protected $hidden = ['password', 'verification_token', 'reset_token', 'reset_expires'];

    protected $validationRules = [
        'username' => 'required|min_length[3]|max_length[50]|is_unique[users.username]',
        'email'    => 'required|valid_email|is_unique[users.email]',
        'password' => 'required|min_length[8]',
    ];

    public function findByEmail(string $email): ?array
    {
        return $this->where('email', $email)->first();
    }

    public function findByUsername(string $username): ?array
    {
        return $this->where('username', $username)->first();
    }
}
