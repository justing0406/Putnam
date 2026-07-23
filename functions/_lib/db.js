import { HttpError } from "./http.js";

export async function all(db, sql, ...bindings) {
  const result = await db.prepare(sql).bind(...bindings).all();
  return result.results || [];
}

export async function first(db, sql, ...bindings) {
  return db.prepare(sql).bind(...bindings).first();
}

export async function run(db, sql, ...bindings) {
  return db.prepare(sql).bind(...bindings).run();
}

function normalizeNames(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [...new Set(values
    .map((item) => String(item).trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((item) => item.slice(0, 80)))];
}

export function normalizeTechniqueNames(value) {
  return normalizeNames(value);
}

export function normalizeTopicNames(value) {
  return normalizeNames(value);
}

export async function ensureTechniques(db, names, category = "General") {
  const normalized = normalizeTechniqueNames(names);
  const techniques = [];

  for (const name of normalized) {
    let technique = await first(db, "SELECT id, name, category FROM techniques WHERE name = ?1 COLLATE NOCASE", name);
    if (!technique) {
      const id = crypto.randomUUID();
      await run(
        db,
        "INSERT OR IGNORE INTO techniques (id, name, category, created_at) VALUES (?1, ?2, ?3, ?4)",
        id,
        name,
        category,
        new Date().toISOString(),
      );
      technique = await first(db, "SELECT id, name, category FROM techniques WHERE name = ?1 COLLATE NOCASE", name);
    }
    if (!technique) throw new HttpError(500, `Could not save technique: ${name}`);
    techniques.push(technique);
  }

  return techniques;
}

export async function ensureTopics(db, names, area = "Mixed") {
  const normalized = normalizeTopicNames(names);
  const topics = [];

  for (const name of normalized) {
    let topic = await first(db, "SELECT id, name, area FROM topics WHERE name = ?1 COLLATE NOCASE", name);
    if (!topic) {
      const id = crypto.randomUUID();
      await run(
        db,
        "INSERT OR IGNORE INTO topics (id, name, area, created_at) VALUES (?1, ?2, ?3, ?4)",
        id,
        name,
        area,
        new Date().toISOString(),
      );
      topic = await first(db, "SELECT id, name, area FROM topics WHERE name = ?1 COLLATE NOCASE", name);
    }
    if (!topic) throw new HttpError(500, `Could not save topic: ${name}`);
    topics.push(topic);
  }

  return topics;
}

export async function getProblem(db, id) {
  const problem = await first(db, "SELECT * FROM problems WHERE id = ?1", id);
  if (!problem) throw new HttpError(404, "Problem not found");

  const [topics, techniques, attempts] = await Promise.all([
    all(
      db,
      `SELECT t.id, t.name, t.area, t.description
       FROM topics t
       JOIN problem_topics pt ON pt.topic_id = t.id
       WHERE pt.problem_id = ?1
       ORDER BY t.area, t.name`,
      id,
    ),
    all(
      db,
      `SELECT t.id, t.name, t.category
       FROM techniques t
       JOIN problem_techniques pt ON pt.technique_id = t.id
       WHERE pt.problem_id = ?1
       ORDER BY t.category, t.name`,
      id,
    ),
    all(
      db,
      `SELECT a.*,
        COALESCE(GROUP_CONCAT(CASE WHEN at.relation = 'tried' THEN t.name END, '||'), '') AS tried_techniques,
        COALESCE(GROUP_CONCAT(CASE WHEN at.relation = 'successful' THEN t.name END, '||'), '') AS successful_techniques
       FROM attempts a
       LEFT JOIN attempt_techniques at ON at.attempt_id = a.id
       LEFT JOIN techniques t ON t.id = at.technique_id
       WHERE a.problem_id = ?1
       GROUP BY a.id
       ORDER BY a.attempted_at DESC`,
      id,
    ),
  ]);

  return {
    ...problem,
    topics,
    techniques,
    attempts: attempts.map((attempt) => ({
      ...attempt,
      tried_techniques: splitGrouped(attempt.tried_techniques),
      successful_techniques: splitGrouped(attempt.successful_techniques),
    })),
  };
}

function splitGrouped(value) {
  return [...new Set(String(value || "").split("||").filter(Boolean))];
}