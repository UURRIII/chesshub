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
        $userId  = $_SERVER["JWT_USER"]->sub;
        $user    = (new UserModel())->find($userId);
        $profile = (new ProfileModel())->findByUserId($userId);

        return $this->respond([
            "status" => "success",
            "data"   => ["user" => array_diff_key($user, ["password" => ""]), "profile" => $profile],
        ]);
    }

    public function update($id = null)
    {
        $userId = $_SERVER["JWT_USER"]->sub;
        $data   = $this->request->getJSON(true) ?? [];

        $allowed = ["bio", "theme_id", "avatar"];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (isset($data["password"]) && !empty($data["password"])) {
            if (strlen($data["password"]) < 8) {
                return $this->respond(["status" => "error", "message" => "La contrasenya ha de tenir almenys 8 caracters"], 422);
            }
            (new UserModel())->update($userId, ["password" => password_hash($data["password"], PASSWORD_BCRYPT)]);
        }

        if (!empty($update)) {
            (new ProfileModel())->where("user_id", $userId)->set($update)->update();
        }

        if (isset($data["username"]) && !empty($data["username"])) {
            $userModel = new UserModel();
            $existing  = $userModel->where("username", $data["username"])
                                   ->where("id !=", $userId)->first();
            if ($existing) {
                return $this->respond(["status" => "error", "message" => "Username ja en us"], 409);
            }
            $userModel->update($userId, ["username" => $data["username"]]);
        }

        return $this->respond(["status" => "success", "message" => "Perfil actualitzat"]);
    }

    public function profile($id)
    {
        $user = (new UserModel())->find($id);
        if (!$user) {
            return $this->respond(["status" => "error", "message" => "Usuari no trobat"], 404);
        }
        $profile = (new ProfileModel())->findByUserId($id);

        return $this->respond([
            "status" => "success",
            "data"   => ["user" => array_diff_key($user, ["password" => ""]), "profile" => $profile]
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
