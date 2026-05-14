-- ============================================================
--  ChessHub - Puzzles addicionals (15 puzzles nous)
--  Executar: mysql chesshub < puzzles_extra.sql
-- ============================================================

INSERT INTO puzzles (title, fen, solution, difficulty, theme_tag, rating, created_by) VALUES

-- PRINCIPIANT
('Escac i Mat en 1 - Torre', '8/8/8/8/8/k7/8/KR6 b - - 0 1', 'a3b3', 'beginner', 'checkmate', 800, NULL),
('Peó promou', '8/P7/8/8/8/8/8/k1K5 w - - 0 1', 'a7a8q', 'beginner', 'promotion', 850, NULL),
('Forquilla de cavall', 'r3k3/8/8/8/8/8/8/R3KN2 w - - 0 1', 'f1e3', 'beginner', 'fork', 900, NULL),
('Guanya la dama', '8/8/8/3r4/8/8/Q7/K6k w - - 0 1', 'a2d5', 'beginner', 'tactic', 750, NULL),
('Mat amb alfil', '6k1/5ppp/8/8/8/8/8/6BK w - - 0 1', 'g1f2', 'beginner', 'checkmate', 820, NULL),

-- INTERMEDI
('Atac doble', 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'f3g5', 'intermediate', 'fork', 1200, NULL),
('Clavar peça', 'r1bqk2r/ppp2ppp/2nb1n2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6', 'c4b5', 'intermediate', 'pin', 1150, NULL),
('Desviació', '5rk1/pp4pp/2p5/2b2p2/2B5/P4qPP/1P3P2/2RQ1RK1 b - - 0 20', 'f3f2 f1f2 c5f2 g1f2', 'intermediate', 'deflection', 1300, NULL),
('Atac a l''enroc', 'r4rk1/ppp2ppp/2n5/3np3/2B5/2NP2bP/PPP2PP1/R1BQ1RK1 b - - 0 11', 'g3h2 g1h2 d5f4 h2g1 f4h3 g1h1 h3f2', 'intermediate', 'attack', 1350, NULL),
('Sacrifici posicional', '2r3k1/5ppp/p3pn2/1pqpN3/3P4/P4PP1/1P2Q1BP/5RK1 w - - 0 27', 'e5f7 g8f7 e2e6 f7f8 e6e8', 'intermediate', 'sacrifice', 1400, NULL),

-- AVANÇAT
('Mat de Bàckera', '6k1/5p2/6p1/7p/7P/6P1/5P1K/4q3 b - - 0 1', 'e1e2', 'advanced', 'checkmate', 1600, NULL),
('Combinació de torre i alfil', '2r1r1k1/pp1q1ppp/3p1n2/3Pb3/4N3/3QB3/PPP2PPP/2KR3R w - - 0 17', 'e4f6 g7f6 d5e6 d7e6 d3h7 g8h7 h1h6 h7g7 d1d7', 'advanced', 'combination', 1700, NULL),
('Dama sacrificada', '1k1r4/pp1b1r2/q1p1p2p/3p4/3P4/1PP1B3/P2Q1PPP/2R1R1K1 b - - 0 20', 'a6g6 g1h1 g6g2 h1g2 d7h3 g2h1 d8d2 e1e2 d2e2 e3f2 h3f1', 'advanced', 'queen_sacrifice', 1750, NULL),

-- EXPERT
('Maniobra de zugzwang', '8/8/p7/Pp6/1P1p4/3P4/8/2K3k1 w - - 0 1', 'c1b2 g1f2 b2a3 f2e3 a3a4 e3d4', 'expert', 'zugzwang', 1900, NULL),
('Final de peons', '8/5pk1/6p1/1P6/1KP5/8/8/8 w - - 0 1', 'b5b6 f7f6 c4c5 g7g5 b6b7 f6f5 b7b8q g5g4 b8b2', 'expert', 'endgame', 1950, NULL);
