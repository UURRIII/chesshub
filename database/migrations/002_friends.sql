-- ============================================================
--  ChessHub - Migració 002
--  Sistema d'amics i missatgeria directa entre amics
--  Executar: mysql chesshub < 002_friends.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ── Sistema d'amics ──────────────────────────────────────────
--  requester_id envia la sol·licitud a addressee_id.
--  status: pending (esperant) | accepted (amics).
CREATE TABLE IF NOT EXISTS friendships (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    requester_id  INT UNSIGNED NOT NULL,
    addressee_id  INT UNSIGNED NOT NULL,
    status        ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_friendship (requester_id, addressee_id),
    KEY idx_requester (requester_id),
    KEY idx_addressee (addressee_id),
    CONSTRAINT fk_fr_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_fr_addressee FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Missatges directes entre amics ───────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sender_id   INT UNSIGNED NOT NULL,
    receiver_id INT UNSIGNED NOT NULL,
    body        VARCHAR(500) NOT NULL,
    is_read     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_conversation (sender_id, receiver_id, created_at),
    KEY idx_receiver (receiver_id, is_read),
    CONSTRAINT fk_dm_sender   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_dm_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
