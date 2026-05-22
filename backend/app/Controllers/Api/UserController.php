<?php

namespace App\Controllers\Api;

use App\Models\UserModel;
use App\Models\ProfileModel;
use App\Models\GameModel;
use CodeIgniter\RESTful\ResourceController;

class UserController extends ResourceController
{
    protected $format = "json";

    public function me()
    {
        $userId  = jwt_uid();
        $user    = (new UserModel())->find($userId);

        if (!$user) {
            return $this->respond(["status" => "error", "message" => "Usuari no trobat"], 404);
        }

        $profile = (new ProfileModel())->findByUserId($userId);

        return $this->respond([
            "status" => "success",
            "data"   => ["user" => array_diff_key($user, ["password" => ""]), "profile" => $profile],
        ]);
    }

    public function update($id = null)
    {
        $userId = jwt_uid();
        $data   = $this->request->getJSON(true) ?? [];

        $allowed = ["bio", "theme_id"];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (isset($update["bio"]) && mb_strlen((string) $update["bio"]) > 300) {
            return $this->respond(["status" => "error", "message" => "La bio no pot superar els 300 caracters"], 422);
        }

        if (isset($data["password"]) && !empty($data["password"])) {
            if (strlen($data["password"]) < 8) {
                return $this->respond(["status" => "error", "message" => "La contrasenya ha de tenir almenys 8 caracters"], 422);
            }
            // [C1] Cal la contrasenya actual per evitar el segrest de compte si un
            // atacant roba un token JWT (8 h de vida). UserModel::$hidden oculta
            // 'password' a find(), per això llegim directament via query builder.
            $currentPassword = $data["current_password"] ?? null;
            if (!$currentPassword) {
                return $this->respond(["status" => "error", "message" => "Has d'introduir la contrasenya actual per canviar-la"], 422);
            }
            $stored = \Config\Database::connect()
                ->table('users')->select('password')->where('id', $userId)->get()->getRowArray();
            if (!$stored || !password_verify($currentPassword, $stored['password'])) {
                return $this->respond(["status" => "error", "message" => "La contrasenya actual és incorrecta"], 401);
            }
            (new UserModel())->update($userId, ["password" => password_hash($data["password"], PASSWORD_BCRYPT)]);
            // En canviar la contrasenya, invalidem les sessions obertes (refresh tokens)
            (new \App\Models\RefreshTokenModel())->revokeAllForUser((int) $userId);
        }

        if (!empty($update)) {
            (new ProfileModel())->where("user_id", $userId)->set($update)->update();
        }

        if (isset($data["username"]) && $data["username"] !== '') {
            $newUsername = (string) $data["username"];
            if (mb_strlen($newUsername) < 3 || mb_strlen($newUsername) > 50) {
                return $this->respond(["status" => "error", "message" => "El nom d'usuari ha de tenir entre 3 i 50 caràcters"], 422);
            }
            if (!preg_match('/^[\w\-\.]+$/u', $newUsername)) {
                return $this->respond(["status" => "error", "message" => "El nom d'usuari només pot contenir lletres, números, guions i punts"], 422);
            }
            $userModel = new UserModel();
            $existing  = $userModel->where("username", $newUsername)
                                   ->where("id !=", $userId)->first();
            if ($existing) {
                return $this->respond(["status" => "error", "message" => "Username ja en us"], 409);
            }
            $userModel->update($userId, ["username" => $newUsername]);
        }

        return $this->respond(["status" => "success", "message" => "Perfil actualitzat"]);
    }

    public function uploadAvatar()
    {
        $userId = jwt_uid();
        $file   = $this->request->getFile('avatar');

        if (!$file || !$file->isValid()) {
            return $this->respond(["status" => "error", "message" => "Fitxer no vàlid"], 422);
        }

        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowed)) {
            return $this->respond(["status" => "error", "message" => "Format no permès (jpeg/png/webp/gif)"], 422);
        }

        if ($file->getSize() > 5 * 1024 * 1024) {
            return $this->respond(["status" => "error", "message" => "Fitxer massa gran (màx 5MB)"], 422);
        }

        $mime = $file->getMimeType();
        $path = $file->getTempName();

        $src = match($mime) {
            'image/jpeg' => imagecreatefromjpeg($path),
            'image/png'  => imagecreatefrompng($path),
            'image/webp' => imagecreatefromwebp($path),
            'image/gif'  => imagecreatefromgif($path),
            default      => null,
        };

        if (!$src) {
            return $this->respond(["status" => "error", "message" => "No s'ha pogut llegir la imatge"], 422);
        }

        $origW = imagesx($src);
        $origH = imagesy($src);
        $maxDim = 256;

        if ($origW > $maxDim || $origH > $maxDim) {
            $ratio = min($maxDim / $origW, $maxDim / $origH);
            $newW  = (int) round($origW * $ratio);
            $newH  = (int) round($origH * $ratio);
            $dst   = imagecreatetruecolor($newW, $newH);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
            imagedestroy($src);
            $src = $dst;
        }

        ob_start();
        imagejpeg($src, null, 85);
        $jpeg = ob_get_clean();
        imagedestroy($src);

        $dataUri = 'data:image/jpeg;base64,' . base64_encode($jpeg);

        if (strlen($dataUri) > 200000) {
            return $this->respond(["status" => "error", "message" => "Imatge resultant massa gran"], 422);
        }

        (new ProfileModel())->where('user_id', $userId)->set(['avatar' => $dataUri])->update();

        return $this->respond(["status" => "success", "data" => ["avatar" => $dataUri]]);
    }

    public function profile($id)
    {
        $user = (new UserModel())->find($id);
        // [A1] Retornem 404 tant si l'usuari no existeix com si està desactivat,
        // per no filtrar informació sobre comptes suspesos.
        if (!$user || !(int) $user['is_active']) {
            return $this->respond(["status" => "error", "message" => "Usuari no trobat"], 404);
        }
        $profile = (new ProfileModel())->findByUserId($id);

        // [A1] Construïm l'objecte user explícitament: únicament camps públics.
        // array_diff_key() eliminava només 'password' però deixava email, role,
        // is_active i created_at visibles a qualsevol usuari autenticat.
        return $this->respond([
            "status" => "success",
            "data"   => [
                "user"    => [
                    "id"       => (int) $user['id'],
                    "username" => $user['username'],
                ],
                "profile" => $profile,
            ],
        ]);
    }

    public function stats($id)
    {
        $profile = (new ProfileModel())->findByUserId($id);
        if (!$profile) {
            return $this->respond(["status" => "error", "message" => "Usuari no trobat"], 404);
        }

        $total   = $profile["wins"] + $profile["losses"] + $profile["draws"];
        $winRate = $total > 0 ? round(($profile["wins"] / $total) * 100, 1) : 0;

        return $this->respond([
            "status" => "success",
            "data"   => [
                "elo"      => $profile["elo"],
                "wins"     => $profile["wins"],
                "losses"   => $profile["losses"],
                "draws"    => $profile["draws"],
                "total"    => $total,
                "win_rate" => $winRate,
            ],
        ]);
    }

    public function eloHistory($id)
    {
        $db = \Config\Database::connect();
        $history = $db->table('elo_history')
            ->where('user_id', $id)
            ->orderBy('recorded_at', 'ASC')
            ->limit(100)
            ->get()->getResultArray();
        return $this->respond(["status" => "success", "data" => $history]);
    }

    public function report($id)
    {
        $reporterId = jwt_uid();

        if ($reporterId == $id) {
            return $this->respond(["status" => "error", "message" => "No pots denunciar-te a tu mateix"], 400);
        }

        $data        = $this->request->getJSON(true) ?? [];
        $reason      = $data['reason'] ?? null;
        $description = $data['description'] ?? null;
        $gameId      = $data['game_id'] ?? null;

        $validReasons = ['cheating', 'harassment', 'inappropriate', 'other'];
        if (!in_array($reason, $validReasons)) {
            return $this->respond(["status" => "error", "message" => "Raó no vàlida"], 422);
        }

        $db = \Config\Database::connect();
        $db->table('reports')->insert([
            'reporter_id'      => $reporterId,
            'reported_user_id' => $id,
            'game_id'          => $gameId,
            'reason'           => $reason,
            'description'      => $description,
            'status'           => 'pending',
        ]);

        return $this->respond(["status" => "success", "message" => "Denúncia enviada correctament"]);
    }

    public function leaderboard()
    {
        $limit = (int) ($this->request->getVar("limit") ?? 20);
        $db = \Config\Database::connect();

        $players = $db->table("profiles p")
            ->select("u.id, u.username, p.elo, p.wins, p.losses, p.draws, p.avatar")
            ->join("users u", "u.id = p.user_id")
            ->where("u.is_active", 1)
            ->orderBy("p.elo", "DESC")
            ->limit(min($limit, 100))
            ->get()->getResultArray();

        return $this->respond(["status" => "success", "data" => $players]);
    }
}
