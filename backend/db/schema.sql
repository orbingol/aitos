PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cv (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  text TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jd (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS report (
  id TEXT PRIMARY KEY,
  cvId TEXT NOT NULL,
  jdId TEXT NOT NULL,
  model TEXT NOT NULL,
  jsonReport TEXT NOT NULL,
  humanReport TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cvId) REFERENCES cv(id) ON DELETE CASCADE,
  FOREIGN KEY (jdId) REFERENCES jd(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_cv ON report(cvId);
CREATE INDEX IF NOT EXISTS idx_report_jd ON report(jdId);
