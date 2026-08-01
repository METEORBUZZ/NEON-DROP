-- =============================================================================
-- NEON DROP — Leaderboard Schema (PostgreSQL)
-- =============================================================================
-- Run with:
--   createdb neon_drop
--   psql -d neon_drop -f schema.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS scores (
    id             SERIAL PRIMARY KEY,
    player_name    VARCHAR(20) NOT NULL,
    score          INTEGER     NOT NULL CHECK (score >= 0),
    level          INTEGER     NOT NULL DEFAULT 1 CHECK (level >= 0),
    lines_cleared  INTEGER     NOT NULL DEFAULT 0 CHECK (lines_cleared >= 0),
    created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Speeds up ORDER BY score DESC for the leaderboard query.
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);

-- Optional convenience view: always holds the current top 10.
CREATE OR REPLACE VIEW top_scores AS
    SELECT id, player_name, score, level, lines_cleared, created_at
    FROM scores
    ORDER BY score DESC
    LIMIT 10;

-- =============================================================================
-- MySQL-equivalent notes (schema is intentionally near-identical, in case the
-- project is ever ported off Postgres — kept here as comments only, not run):
-- =============================================================================
--
-- CREATE TABLE IF NOT EXISTS scores (
--     id             INT AUTO_INCREMENT PRIMARY KEY,
--     player_name    VARCHAR(20) NOT NULL,
--     score          INT NOT NULL CHECK (score >= 0),
--     level          INT NOT NULL DEFAULT 1 CHECK (level >= 0),
--     lines_cleared  INT NOT NULL DEFAULT 0 CHECK (lines_cleared >= 0),
--     created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );
--
-- CREATE INDEX idx_scores_score_desc ON scores (score DESC);
--
-- -- MySQL (until 8.0.19) does not support CHECK enforcement uniformly on
-- -- older versions, and has no native CREATE OR REPLACE VIEW LIMIT quirk —
-- -- the view below works the same way from MySQL 5.7+:
-- CREATE OR REPLACE VIEW top_scores AS
--     SELECT id, player_name, score, level, lines_cleared, created_at
--     FROM scores
--     ORDER BY score DESC
--     LIMIT 10;
--
-- Differences to remember when porting:
--   * SERIAL            -> INT AUTO_INCREMENT
--   * TIMESTAMP default  is supported the same way in both
--   * Both engines support the CHECK constraints shown above on modern
--     versions (Postgres always; MySQL 8.0.16+)
-- =============================================================================
