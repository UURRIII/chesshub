-- ============================================================
--  ChessHub - Esquema de Base de Dades
--  Projecte Síntesi DAW 2025-2026
--  Autor: Oriol Torra - Grup 4
--  Versió: 1.0  |  Data: 2026-04-22
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ============================================================
--  1. USERS
--  Dades d'autenticació. Un usuari, un registre.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)      NOT NULL,
    email         VARCHAR(100)     NOT NULL,
    password      VARCHAR(255)     NOT NULL,        -- bcrypt hash
    role          ENUM('user','admin') NOT NULL DEFAULT 'user',
    is_active     TINYINT(1)       NOT NULL DEFAULT 1,
    created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email    (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  2. REFRESH_TOKENS
--  Gestió de JWT refresh tokens (rotació segura).
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    user_id       INT UNSIGNED     NOT NULL,
    token         VARCHAR(512)     NOT NULL,        -- hash del token
    expires_at    TIMESTAMP        NOT NULL,
    revoked       TINYINT(1)       NOT NULL DEFAULT 0,
    created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_token (token),
    KEY idx_rt_user_id (user_id),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  3. THEMES
--  Temes visuals del tauler (gestionats per l'admin).
--  Cal inserir almenys un tema per defecte.
-- ============================================================
CREATE TABLE IF NOT EXISTS themes (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name                VARCHAR(50)  NOT NULL,
    board_color_light   CHAR(7)      NOT NULL DEFAULT '#F0D9B5',
    board_color_dark    CHAR(7)      NOT NULL DEFAULT '#B58863',
    pieces_set          VARCHAR(50)  NOT NULL DEFAULT 'classic',
    is_default          TINYINT(1)   NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tema per defecte
INSERT INTO themes (name, board_color_light, board_color_dark, pieces_set, is_default)
VALUES ('Classic', '#F0D9B5', '#B58863', 'classic', 1);


-- ============================================================
--  4. PROFILES
--  Info pública, ELO i estadístiques. 1-a-1 amb users.
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    avatar      VARCHAR(255)         DEFAULT NULL,
    bio         TEXT                 DEFAULT NULL,
    elo         INT          NOT NULL DEFAULT 1200,
    wins        INT          NOT NULL DEFAULT 0,
    losses      INT          NOT NULL DEFAULT 0,
    draws       INT          NOT NULL DEFAULT 0,
    theme_id    INT UNSIGNED         DEFAULT 1,     -- tema seleccionat
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_profiles_user (user_id),
    KEY idx_profiles_elo (elo),
    CONSTRAINT fk_profiles_user  FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE,
    CONSTRAINT fk_profiles_theme FOREIGN KEY (theme_id) REFERENCES themes(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  5. ELO_HISTORY
--  Registre de cada canvi d'ELO (útil per gràfiques).
-- ============================================================
CREATE TABLE IF NOT EXISTS elo_history (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    elo_before  INT          NOT NULL,
    elo_after   INT          NOT NULL,
    delta       INT          NOT NULL,              -- positiu o negatiu
    game_id     INT UNSIGNED         DEFAULT NULL,  -- partida que va provocar el canvi
    recorded_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_eh_user (user_id),
    CONSTRAINT fk_eh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  6. GAMES  (PvP)
--  Partides entre dos usuaris humans.
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
    id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    player_white_id   INT UNSIGNED  NOT NULL,
    player_black_id   INT UNSIGNED  NOT NULL,
    status            ENUM('waiting','ongoing','finished','abandoned')
                                    NOT NULL DEFAULT 'waiting',
    result            ENUM('white','black','draw')   DEFAULT NULL,
    end_reason        ENUM('checkmate','resignation','timeout',
                           'stalemate','agreement','repetition','insufficient')
                                                     DEFAULT NULL,
    time_control      SMALLINT UNSIGNED              DEFAULT NULL, -- segons per jugador
    pgn               TEXT                           DEFAULT NULL,
    fen_final         VARCHAR(100)                   DEFAULT NULL,
    started_at        TIMESTAMP                      DEFAULT NULL,
    ended_at          TIMESTAMP                      DEFAULT NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_games_white  (player_white_id),
    KEY idx_games_black  (player_black_id),
    KEY idx_games_status (status),
    CONSTRAINT fk_games_white FOREIGN KEY (player_white_id) REFERENCES users(id),
    CONSTRAINT fk_games_black FOREIGN KEY (player_black_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FK diferida d'elo_history cap a games
ALTER TABLE elo_history
    ADD CONSTRAINT fk_eh_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL;


-- ============================================================
--  7. MOVES  (moviments de partides PvP)
-- ============================================================
CREATE TABLE IF NOT EXISTS moves (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    game_id     INT UNSIGNED NOT NULL,
    move_number SMALLINT     NOT NULL,             -- número de torn (1, 2, 3…)
    player_id   INT UNSIGNED NOT NULL,
    move_san    VARCHAR(20)  NOT NULL,             -- ex: Nf3, O-O, e8=Q
    move_uci    VARCHAR(10)  NOT NULL,             -- ex: e2e4, e7e8q
    fen_after   VARCHAR(100) NOT NULL,
    time_spent  INT          DEFAULT NULL,         -- ms que ha trigat el jugador
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_moves_game (game_id),
    CONSTRAINT fk_moves_game   FOREIGN KEY (game_id)   REFERENCES games(id) ON DELETE CASCADE,
    CONSTRAINT fk_moves_player FOREIGN KEY (player_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  8. BOT_GAMES  (partides contra Stockfish)
-- ============================================================
CREATE TABLE IF NOT EXISTS bot_games (
    id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    user_id       INT UNSIGNED  NOT NULL,
    user_color    ENUM('white','black') NOT NULL,
    bot_level     TINYINT       NOT NULL DEFAULT 5, -- nivell Stockfish 1-20
    status        ENUM('ongoing','finished','abandoned') NOT NULL DEFAULT 'ongoing',
    result        ENUM('user','bot','draw')            DEFAULT NULL,
    end_reason    ENUM('checkmate','resignation','timeout',
                       'stalemate','agreement','repetition','insufficient')
                                                       DEFAULT NULL,
    time_control  SMALLINT UNSIGNED                    DEFAULT NULL,
    pgn           TEXT                                 DEFAULT NULL,
    fen_final     VARCHAR(100)                         DEFAULT NULL,
    started_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at      TIMESTAMP                            DEFAULT NULL,

    PRIMARY KEY (id),
    KEY idx_bg_user   (user_id),
    KEY idx_bg_status (status),
    CONSTRAINT fk_bg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  9. BOT_MOVES  (moviments de partides contra bot)
-- ============================================================
CREATE TABLE IF NOT EXISTS bot_moves (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    bot_game_id   INT UNSIGNED NOT NULL,
    move_number   SMALLINT     NOT NULL,
    is_bot        TINYINT(1)   NOT NULL DEFAULT 0,  -- 0 = usuari, 1 = Stockfish
    move_san      VARCHAR(20)  NOT NULL,
    move_uci      VARCHAR(10)  NOT NULL,
    fen_after     VARCHAR(100) NOT NULL,
    time_spent    INT          DEFAULT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_bm_game (bot_game_id),
    CONSTRAINT fk_bm_game FOREIGN KEY (bot_game_id) REFERENCES bot_games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  10. GAME_ANALYSIS
--  Resultats de l'anàlisi postpartida amb Stockfish.
--  Pot analitzar tant una partida PvP com contra bot.
-- ============================================================
CREATE TABLE IF NOT EXISTS game_analysis (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id       INT UNSIGNED    NOT NULL,
    game_id       INT UNSIGNED            DEFAULT NULL,     -- si és PvP
    bot_game_id   INT UNSIGNED            DEFAULT NULL,     -- si és vs bot
    score         TINYINT UNSIGNED NOT NULL DEFAULT 0,      -- puntuació 0-100
    accuracy      DECIMAL(5,2)    NOT NULL DEFAULT 0.00,    -- % precisió
    brilliants    SMALLINT        NOT NULL DEFAULT 0,
    greats        SMALLINT        NOT NULL DEFAULT 0,
    goods         SMALLINT        NOT NULL DEFAULT 0,
    inaccuracies  SMALLINT        NOT NULL DEFAULT 0,
    mistakes      SMALLINT        NOT NULL DEFAULT 0,
    blunders      SMALLINT        NOT NULL DEFAULT 0,
    analysis_json JSON                    DEFAULT NULL,     -- anàlisi moviment a moviment
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_ga_user       (user_id),
    KEY idx_ga_game       (game_id),
    KEY idx_ga_bot_game   (bot_game_id),
    CONSTRAINT fk_ga_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    CONSTRAINT fk_ga_game     FOREIGN KEY (game_id)     REFERENCES games(id)     ON DELETE CASCADE,
    CONSTRAINT fk_ga_bot_game FOREIGN KEY (bot_game_id) REFERENCES bot_games(id) ON DELETE CASCADE,
    -- Restricció: exactament un dels dos game_id ha de ser NOT NULL
    CONSTRAINT chk_ga_source CHECK (
        (game_id IS NOT NULL AND bot_game_id IS NULL) OR
        (game_id IS NULL AND bot_game_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  11. PUZZLES
--  Problemes/puzzles d'escacs gestionats per l'admin.
-- ============================================================
CREATE TABLE IF NOT EXISTS puzzles (
    id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    title       VARCHAR(100)          DEFAULT NULL,
    fen         VARCHAR(100)  NOT NULL,              -- posició inicial
    solution    VARCHAR(255)  NOT NULL,              -- moviments UCI separats per espai
    difficulty  ENUM('beginner','intermediate','advanced','expert')
                              NOT NULL DEFAULT 'intermediate',
    theme_tag   VARCHAR(50)           DEFAULT NULL,  -- fork, pin, checkmate…
    rating      INT           NOT NULL DEFAULT 1200,
    created_by  INT UNSIGNED          DEFAULT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_puzzles_difficulty (difficulty),
    KEY idx_puzzles_rating     (rating),
    CONSTRAINT fk_puzzles_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  12. PUZZLE_ATTEMPTS
--  Cada intent d'un usuari a un puzzle.
-- ============================================================
CREATE TABLE IF NOT EXISTS puzzle_attempts (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    puzzle_id     INT UNSIGNED NOT NULL,
    user_id       INT UNSIGNED NOT NULL,
    solved        TINYINT(1)   NOT NULL DEFAULT 0,
    time_spent    INT                   DEFAULT NULL, -- ms
    attempted_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_pa_puzzle (puzzle_id),
    KEY idx_pa_user   (user_id),
    CONSTRAINT fk_pa_puzzle FOREIGN KEY (puzzle_id) REFERENCES puzzles(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  13. REPORTS
--  Denúncies d'usuaris (gestionades des del panell d'admin).
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    reporter_id       INT UNSIGNED NOT NULL,
    reported_user_id  INT UNSIGNED NOT NULL,
    game_id           INT UNSIGNED         DEFAULT NULL,
    reason            ENUM('cheating','harassment','inappropriate','other')
                                   NOT NULL,
    description       TEXT                 DEFAULT NULL,
    status            ENUM('pending','reviewed','resolved','dismissed')
                                   NOT NULL DEFAULT 'pending',
    reviewed_by       INT UNSIGNED         DEFAULT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_reports_status      (status),
    KEY idx_reports_reporter    (reporter_id),
    KEY idx_reports_reported    (reported_user_id),
    CONSTRAINT fk_reports_reporter    FOREIGN KEY (reporter_id)      REFERENCES users(id),
    CONSTRAINT fk_reports_reported    FOREIGN KEY (reported_user_id) REFERENCES users(id),
    CONSTRAINT fk_reports_game        FOREIGN KEY (game_id)          REFERENCES games(id)  ON DELETE SET NULL,
    CONSTRAINT fk_reports_reviewer    FOREIGN KEY (reviewed_by)      REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  RESUM DE TAULES
-- ============================================================
--  users            → autenticació i rols
--  refresh_tokens   → gestió JWT segura
--  themes           → temes visuals del tauler
--  profiles         → perfil públic + ELO + estadístiques
--  elo_history      → evolució de l'ELO per gràfiques
--  games            → partides PvP
--  moves            → moviments de partides PvP
--  bot_games        → partides contra Stockfish
--  bot_moves        → moviments de partides contra bot
--  game_analysis    → anàlisi postpartida (PvP o bot)
--  puzzles          → problemes d'escacs
--  puzzle_attempts  → intents de resolució de puzzles
--  reports          → denúncies d'usuaris
-- ============================================================
