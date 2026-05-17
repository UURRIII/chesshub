<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

$routes->get("/", "Home::index");

$routes->group("api/v1", ["namespace" => "App\Controllers\Api"], function ($routes) {

    // Auth (public)
    $routes->post("auth/register", "AuthController::register");
    $routes->post("auth/login",    "AuthController::login");
    $routes->post("auth/refresh",  "AuthController::refresh");
    $routes->post("auth/logout",   "AuthController::logout");

    // Users (JWT required)
    $routes->group("users", ["filter" => "jwt"], function ($routes) {
        $routes->get("me",           "UserController::me");
        $routes->put("me",           "UserController::update");
        $routes->post("me/avatar",        "UserController::uploadAvatar");
        $routes->get("(:num)",            "UserController::profile/$1");
        $routes->get("(:num)/stats",      "UserController::stats/$1");
        $routes->post("(:num)/report",    "UserController::report/$1");
    });

    // Leaderboard (public)
    $routes->get("leaderboard", "UserController::leaderboard");

    // Friends (JWT required)
    $routes->group("friends", ["filter" => "jwt"], function ($routes) {
        $routes->get("",                  "FriendController::index");
        $routes->get("requests",          "FriendController::requests");
        $routes->get("search",            "FriendController::search");
        $routes->post("request/(:num)",   "FriendController::sendRequest/$1");
        $routes->post("(:num)/accept",    "FriendController::accept/$1");
        $routes->delete("(:num)",         "FriendController::remove/$1");
    });

    // Missatges directes entre amics (JWT required)
    $routes->group("messages", ["filter" => "jwt"], function ($routes) {
        $routes->get("unread",   "MessageController::unread");
        $routes->get("(:num)",   "MessageController::conversation/$1");
        $routes->post("(:num)",  "MessageController::send/$1");
    });

    // ELO history (public)
    $routes->get("users/(:num)/elo-history", "UserController::eloHistory/$1");

    // PvP Games (JWT required)
    $routes->group("games", ["filter" => "jwt"], function ($routes) {
        $routes->get("",                   "GameController::index");
        $routes->post("",                  "GameController::create");
        $routes->get("waiting",            "GameController::waiting");
        $routes->get("active",             "GameController::active");
        $routes->get("history",            "GameController::history");
        $routes->get("(:num)",             "GameController::show/$1");
        $routes->post("(:num)/move",       "GameController::move/$1");
        $routes->post("(:num)/resign",     "GameController::resign/$1");
        $routes->post("(:num)/finish",     "GameController::finish/$1");
        $routes->post("(:num)/join",       "GameController::join/$1");
    });

    // Bot Games (JWT required)
    $routes->group("bot-games", ["filter" => "jwt"], function ($routes) {
        $routes->get("",                        "BotGameController::index");
        $routes->post("",                       "BotGameController::create");
        $routes->get("(:num)",                  "BotGameController::show/$1");
        $routes->post("(:num)/move",            "BotGameController::move/$1");
        $routes->post("(:num)/resign",          "BotGameController::resign/$1");
        $routes->post("(:num)/finish",          "BotGameController::finish/$1");
        $routes->patch("(:num)/bot-fen",        "BotGameController::updateBotFen/$1");
    });

    // Puzzles (public listing, JWT for attempts)
    $routes->group("puzzles", function ($routes) {
        $routes->get("",       "PuzzleController::index");
        $routes->get("(:num)", "PuzzleController::show/$1");
        $routes->post("(:num)/attempt", "PuzzleController::attempt/$1", ["filter" => "jwt"]);
    });

    // Analysis (JWT required)
    $routes->group("analysis", ["filter" => "jwt"], function ($routes) {
        $routes->post("game/(:num)",     "AnalysisController::analyzeGame/$1");
        $routes->post("bot-game/(:num)", "AnalysisController::analyzeBotGame/$1");
        $routes->get("game/(:num)",      "AnalysisController::getGameAnalysis/$1");
    });

    // Admin (admin role required)
    $routes->group("admin", ["filter" => "admin"], function ($routes) {
        $routes->get("stats",               "AdminController::stats");
        // Users
        $routes->get("users",               "AdminController::users");
        $routes->put("users/(:num)",        "AdminController::updateUser/$1");
        $routes->delete("users/(:num)",     "AdminController::deleteUser/$1");
        // Puzzles
        $routes->get("puzzles",             "AdminController::puzzles");
        $routes->post("puzzles",            "AdminController::createPuzzle");
        $routes->put("puzzles/(:num)",      "AdminController::updatePuzzle/$1");
        $routes->delete("puzzles/(:num)",   "AdminController::deletePuzzle/$1");
        // Reports
        $routes->get("reports",             "AdminController::reports");
        $routes->put("reports/(:num)",      "AdminController::updateReport/$1");
        // Games overview
        $routes->get("games",               "AdminController::games");
    });
});
