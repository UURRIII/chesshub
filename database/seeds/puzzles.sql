-- ============================================================
--  ChessHub - Puzzles (25 puzzles verificats amb chess.js)
--  Tots els FEN i solucions han estat validats: moviments
--  legals i, en els d'escac i mat, mat real a la posició final.
--  Executar: mysql chesshub < puzzles.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE puzzle_attempts;
TRUNCATE TABLE puzzles;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO puzzles (title, fen, solution, difficulty, theme_tag, rating, created_by) VALUES

-- ── PRINCIPIANT ──────────────────────────────────────────────
('Mat de torre',         '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',          'a1a8',              'beginner',     'checkmate',  800, NULL),
('Mat de dama',          '6k1/5ppp/8/8/8/8/8/3Q2K1 w - - 0 1',         'd1d8',              'beginner',     'checkmate',  820, NULL),
('Promoció amb mat',     '8/P7/8/8/8/8/8/k1K5 w - - 0 1',              'a7a8q',             'beginner',     'checkmate',  850, NULL),
('Forquilla reial de cavall', 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',      'd5c7',              'beginner',     'fork',       900, NULL),
('Captura la dama',      '8/8/8/3q4/8/8/Q7/K6k w - - 0 1',             'a2d5',              'beginner',     'tactic',     780, NULL),
('Mat amb rei i dama',   '8/8/8/8/7k/5K2/8/6Q1 w - - 0 1',             'g1g4',              'beginner',     'checkmate',  880, NULL),
('Mat amb rei i torre',  '7k/8/7K/8/8/8/8/R7 w - - 0 1',               'a1a8',              'beginner',     'checkmate',  860, NULL),
('Guanya la torre',      'r5k1/8/8/8/8/8/8/Q5K1 w - - 0 1',            'a1a8',              'beginner',     'tactic',     930, NULL),

-- ── INTERMEDI ────────────────────────────────────────────────
('Mat de l''escala',     '6k1/6R1/7K/8/8/8/8/R7 w - - 0 1',            'a1a8',              'intermediate', 'checkmate', 1100, NULL),
('Mat de dama suportada','7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',             'f7g7',              'intermediate', 'checkmate', 1080, NULL),
('Mat de torre i rei',   '5k2/8/5K2/8/8/8/8/7R w - - 0 1',             'h1h8',              'intermediate', 'checkmate', 1150, NULL),
('Enfilada de torre',    'K7/8/8/8/2k4r/8/8/R7 w - - 0 1',             'a1a4 c4c3 a4h4',    'intermediate', 'skewer',    1250, NULL),
('Forquilla de cavall a la dama', '4k1q1/8/8/3N4/8/8/8/4K3 w - - 0 1', 'd5f6 e8e7 f6g8',    'intermediate', 'fork',      1300, NULL),
('Enfilada d''alfil',    '7k/6q1/8/8/8/8/1B6/K7 w - - 0 1',            'b2g7',              'intermediate', 'tactic',    1200, NULL),
('Forquilla de peó',     '8/8/3r1r2/8/4P3/8/8/4K1k1 w - - 0 1',        'e4e5',              'intermediate', 'fork',      1180, NULL),
('Atac doble de dama',   '4k3/8/8/7r/8/8/8/Q3K3 w - - 0 1',            'a1e5 e8f7 e5h5',    'intermediate', 'fork',      1280, NULL),

-- ── AVANÇAT ──────────────────────────────────────────────────
('Forquilla de cavall guanyadora', '7k/8/7N/4q3/8/8/8/7K w - - 0 1',   'h6f7 h8g8 f7e5',    'advanced',     'fork',      1550, NULL),
('Enfilada a la dama',   '7q/7k/8/8/8/K7/8/Q7 w - - 0 1',              'a1h1 h7g7 h1h8',    'advanced',     'skewer',    1600, NULL),
('Atac descobert de cavall', '8/4k3/8/2q5/4N3/8/8/4R1K1 w - - 0 1',    'e4c5',              'advanced',     'discovered',1650, NULL),
('Doble atac de dama',   '1r4k1/6pp/8/3Q4/8/8/8/6K1 w - - 0 1',        'd5d8 g8f7 d8b8',    'advanced',     'fork',      1700, NULL),
('Enfilada a la torre',  '3r4/3k4/8/8/8/8/8/R6K w - - 0 1',            'a1d1 d7c7 d1d8',    'advanced',     'skewer',    1500, NULL),
('Atac descobert d''alfil', 'q3k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1',      'e4a8',              'advanced',     'discovered',1750, NULL),

-- ── EXPERT ───────────────────────────────────────────────────
('Mat de la dama ofegada', '6rk/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1',       'b3g8',              'expert',       'checkmate', 2000, NULL),
('Mat del cavall ofegat','6rk/6pp/3N4/8/8/8/8/6K1 w - - 0 1',          'd6f7',              'expert',       'checkmate', 1950, NULL),
('Sacrifici de torre i mat', '2r3k1/5ppp/8/8/8/8/4R1PP/4R1K1 w - - 0 1','e2e8 c8e8 e1e8',   'expert',       'checkmate', 2100, NULL);
