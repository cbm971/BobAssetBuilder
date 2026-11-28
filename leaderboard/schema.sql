-- BOB's leaderboard (2026-11-28): every posted run, forever. See src/leaderboard.js for the rules
-- and leaderboard/worker.js for how a rank is worked out.
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,  -- also the tie-break: the same score posted earlier ranks higher
  board      TEXT    NOT NULL,                   -- "beta" for the two-floor Beta
  run        TEXT    NOT NULL,                   -- the run's token: one post per run
  name       TEXT    NOT NULL,
  score      INTEGER NOT NULL,
  look       TEXT    NOT NULL DEFAULT '',        -- who they played, the difficulty, the floor they got to
  difficulty TEXT    NOT NULL DEFAULT '',
  floor      TEXT    NOT NULL DEFAULT '',
  secs       INTEGER NOT NULL DEFAULT 0,
  at         INTEGER NOT NULL,                   -- ms since 1970
  who        TEXT    NOT NULL DEFAULT ''         -- a salted hash of the poster's IP, never the IP itself
);
CREATE UNIQUE INDEX IF NOT EXISTS scores_run ON scores (board, run);
CREATE INDEX IF NOT EXISTS scores_rank ON scores (board, score DESC, id);  -- the board order (score high to low, then earliest), read forwards or backwards

-- How many entries each score bucket (score / 100) holds, kept by the triggers below. A rank is the
-- entries in the buckets above yours plus the few above you inside your own, so working out where a
-- run stands reads a few hundred rows however many millions the board holds (a plain COUNT of every
-- better score would read them all, and D1 bills by rows read).
CREATE TABLE IF NOT EXISTS buckets (
  board TEXT    NOT NULL,
  b     INTEGER NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (board, b)
);
CREATE TRIGGER IF NOT EXISTS scores_in AFTER INSERT ON scores BEGIN
  INSERT OR IGNORE INTO buckets (board, b, n) VALUES (NEW.board, NEW.score / 100, 0);
  UPDATE buckets SET n = n + 1 WHERE board = NEW.board AND b = NEW.score / 100;
END;
CREATE TRIGGER IF NOT EXISTS scores_out AFTER DELETE ON scores BEGIN
  UPDATE buckets SET n = n - 1 WHERE board = OLD.board AND b = OLD.score / 100;
END;

-- The last post from each poster (hashed IP), for the one-post-per-10-seconds limit.
CREATE TABLE IF NOT EXISTS posters (
  who TEXT    PRIMARY KEY,
  at  INTEGER NOT NULL
);
