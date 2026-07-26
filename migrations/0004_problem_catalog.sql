PRAGMA foreign_keys = ON;

ALTER TABLE problems ADD COLUMN source_catalog_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_problems_source_catalog ON problems(source_catalog_id) WHERE source_catalog_id IS NOT NULL;

CREATE TABLE catalog_problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  statement TEXT NOT NULL,
  year INTEGER NOT NULL,
  session TEXT NOT NULL CHECK (session IN ('A','B')),
  number INTEGER NOT NULL CHECK (number BETWEEN 1 AND 6),
  area TEXT NOT NULL,
  topics_json TEXT NOT NULL DEFAULT '[]',
  concepts_json TEXT NOT NULL DEFAULT '[]',
  techniques_json TEXT NOT NULL DEFAULT '[]',
  prerequisites_json TEXT NOT NULL DEFAULT '[]',
  difficulty_overall REAL NOT NULL,
  difficulty_insight REAL NOT NULL,
  difficulty_technical REAL NOT NULL,
  difficulty_prerequisite REAL NOT NULL,
  difficulty_proof REAL NOT NULL,
  difficulty_confidence REAL,
  key_observation TEXT,
  solution_architecture TEXT,
  common_false_starts_json TEXT NOT NULL DEFAULT '[]',
  classification_status TEXT NOT NULL DEFAULT 'reviewed_seed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_catalog_area_difficulty ON catalog_problems(area, difficulty_overall);
CREATE INDEX idx_catalog_year_problem ON catalog_problems(year, session, number);
