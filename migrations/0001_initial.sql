PRAGMA foreign_keys = ON;

CREATE TABLE techniques (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  statement TEXT,
  source TEXT,
  level TEXT NOT NULL CHECK (level IN ('A0','A1','A2','A3','A4','A5','A6','B0','B1','B2','B3','B4','B5','B6')),
  area TEXT NOT NULL CHECK (area IN ('Algebra','Combinatorics','Geometry','Number Theory','Analysis','Mixed')),
  problem_image_key TEXT,
  solution_image_key TEXT,
  official_solution TEXT,
  notes TEXT,
  latest_outcome TEXT CHECK (latest_outcome IS NULL OR latest_outcome IN ('solved','almost','not_close')),
  next_review_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE problem_techniques (
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  technique_id TEXT NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
  PRIMARY KEY (problem_id, technique_id)
);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  attempted_at TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('solved','almost','not_close')),
  self_solution TEXT,
  where_stuck TEXT,
  error_analysis TEXT,
  time_spent_minutes INTEGER CHECK (time_spent_minutes IS NULL OR time_spent_minutes >= 0),
  hints_used INTEGER NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
  confidence INTEGER CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 5),
  solution_revealed INTEGER NOT NULL DEFAULT 0 CHECK (solution_revealed IN (0,1)),
  next_review_at TEXT NOT NULL
);

CREATE TABLE attempt_techniques (
  attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  technique_id TEXT NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('tried','successful')),
  notes TEXT,
  PRIMARY KEY (attempt_id, technique_id, relation)
);

CREATE TABLE notification_log (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  review_at TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  UNIQUE (problem_id, review_at, recipient)
);

CREATE INDEX idx_problems_next_review ON problems(next_review_at);
CREATE INDEX idx_attempts_problem_date ON attempts(problem_id, attempted_at DESC);
CREATE INDEX idx_attempt_techniques_technique ON attempt_techniques(technique_id, relation);
CREATE INDEX idx_problem_techniques_technique ON problem_techniques(technique_id);
