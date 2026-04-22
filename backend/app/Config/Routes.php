<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

$routes->get('/', 'Home::index');

$routes->group('api/v1', ['namespace' => 'App\Controllers\Api'], function ($routes) {

    $routes->post('auth/register', 'AuthController::register');
    $routes->post('auth/login',    'AuthController::login');
    $routes->post('auth/refresh',  'AuthController::refresh');
    $routes->post('auth/logout',   'AuthController::logout');

    $routes->group('users', ['filter' => 'jwt'], function ($routes) {
        $routes->get('me',           'UserController::me');
        $routes->put('me',           'UserController::update');
        $routes->get('(:num)',       'UserController::profile/$1');
        $routes->get('(:num)/stats', 'UserController::stats/$1');
    });

    $routes->group('games', ['filter' => 'jwt'], function ($routes) {
        $routes->get('',                  'GameController::index');
        $routes->post('',                 'GameController::create');
        $routes->get('(:num)',            'GameController::show/$1');
        $routes->post('(:num)/move',      'GameController::move/$1');
        $routes->post('(:num)/resign',    'GameController::resign/$1');
    });

    $routes->group('bot-games', ['filter' => 'jwt'], function ($routes) {
        $routes->post('',                 'BotGameController::create');
        $routes->get('(:num)',            'BotGameController::show/$1');
        $routes->post('(:num)/move',      'BotGameController::move/$1');
        $routes->post('(:num)/resign',    'BotGameController::resign/$1');
    });

    $routes->group('puzzles', function ($routes) {
        $routes->get('',       'PuzzleController::index');
        $routes->get('(:num)', 'PuzzleController::show/$1');
        $routes->post('(:num)/attempt', 'PuzzleController::attempt/$1', ['filter' => 'jwt']);
    });

    $routes->group('analysis', ['filter' => 'jwt'], function ($routes) {
        $routes->post('game/(:num)',     'AnalysisController::analyzeGame/$1');
        $routes->post('bot-game/(:num)', 'AnalysisController::analyzeBotGame/$1');
        $routes->get('game/(:num)',      'AnalysisController::getGameAnalysis/$1');
    });
});
