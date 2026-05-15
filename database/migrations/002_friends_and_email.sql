-- ============================================================
--  ChessHub - Migració 002
--  Sistema d'amics + verificació d'email i recuperació de contrasenya
--  Executar: mysql chesshub < 002_friends_and_email.sql
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

-- ── Verificació d'email i recuperació de contrasenya ─────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified     TINYINT(1)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS verification_token  VARCHAR(64) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS reset_token         VARCHAR(64) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS reset_expires       DATETIME    DEFAULT NULL;

-- Els comptes ja existents es marquen com a verificats
-- (no els podem obligar a verificar retroactivament).
UPDATE users SET email_verified = 1 WHERE email_verified = 0;

SET FOREIGN_KEY_CHECKS = 1;
