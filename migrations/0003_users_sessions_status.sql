-- Migration 0003 — users, sessions, user_departments, dossier_status

CREATE TABLE IF NOT EXISTS users (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  email                  TEXT NOT NULL UNIQUE,
  name                   TEXT NOT NULL,
  role                   TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active              INTEGER NOT NULL DEFAULT 1,
  password_hash          TEXT NOT NULL,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  last_login             TEXT,
  failed_login_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until           TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  last_seen   TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address  TEXT,
  is_revoked  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_departments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  departement  TEXT NOT NULL,
  UNIQUE(user_id, departement)
);
CREATE INDEX IF NOT EXISTS idx_user_depts_user ON user_departments(user_id);

CREATE TABLE IF NOT EXISTS dossier_status (
  dossier_code           TEXT PRIMARY KEY,
  formulaire_rempli      INTEGER NOT NULL DEFAULT 0,
  justificatifs_envoyes  INTEGER NOT NULL DEFAULT 0,
  commentaire            TEXT NOT NULL DEFAULT '',
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by             INTEGER REFERENCES users(id) ON DELETE SET NULL
);
