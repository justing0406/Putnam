import { LEVELS } from "../../shared/constants.js";
import { all, first, getProblem } from "../_lib/db.js";
import { ok } from "../_lib/http.js";

export async function handleDashboard(env) {
  const now = new Date().toISOString();
  const [summary, outcomes, due, upcoming, recent] = await Promise.all([
    first(
      env.DB,
      `SELECT
        COUNT(*) AS total_problems,
        SUM(CASE WHEN next_review_at <= ?1 THEN 1 ELSE 0 END) AS due_count,
        SUM(CASE WHEN latest_outcome = 'solved' THEN 1 ELSE 0 END) AS currently_solved,
        (SELECT COUNT(*) FROM attempts) AS total_attempts,
        (SELECT ROUND(AVG(time_spent_minutes), 1) FROM attempts WHERE time_spent_minutes IS NOT NULL) AS average_minutes
       FROM problems`,
      now,
    ),
    all(env.DB, "SELECT outcome, COUNT(*) AS count FROM attempts GROUP BY outcome"),
    listProblemRows(env.DB, "WHERE p.next_review_at <= ?1", [now], 12, "p.next_review_at ASC"),
    listProblemRows(env.DB, "WHERE p.next_review_at > ?1", [now], 6, "p.next_review_at ASC"),
    all(
      env.DB,
      `SELECT a.id, a.problem_id, a.attempted_at, a.outcome, a.next_review_at, p.title, p.level
       FROM attempts a
       JOIN problems p ON p.id = a.problem_id
       ORDER BY a.attempted_at DESC
       LIMIT 8`,
    ),
  ]);

  return ok({
    summary: normalizeSummary(summary),
    outcomes: Object.fromEntries(outcomes.map((row) => [row.outcome, Number(row.count)])),
    due: due.map(decorateProblemRow),
    upcoming: upcoming.map(decorateProblemRow),
    recent,
    generated_at: now,
  });
}

export async function handleTechniques(env) {
  const techniques = await all(
    env.DB,
    `SELECT t.id, t.name, t.category, t.description,
      COUNT(DISTINCT pt.problem_id) AS problem_count,
      COUNT(DISTINCT at.attempt_id) AS attempt_count
     FROM techniques t
     LEFT JOIN problem_techniques pt ON pt.technique_id = t.id
     LEFT JOIN attempt_techniques at ON at.technique_id = t.id
     GROUP BY t.id
     ORDER BY t.category, t.name`,
  );
  return ok({ techniques });
}

export async function handleListProblems(env, url) {
  const filter = url.searchParams.get("filter") || "all";
  const search = (url.searchParams.get("search") || "").trim().slice(0, 100);
  const level = url.searchParams.get("level");
  const now = new Date().toISOString();
  const conditions = [];
  const bindings = [];

  if (filter === "due") {
    conditions.push(`p.next_review_at <= ?${bindings.length + 1}`);
    bindings.push(now);
  } else if (filter === "upcoming") {
    conditions.push(`p.next_review_at > ?${bindings.length + 1}`);
    bindings.push(now);
  }

  if (search) {
    conditions.push(`(p.title LIKE ?${bindings.length + 1} OR p.source LIKE ?${bindings.length + 1} OR p.statement LIKE ?${bindings.length + 1})`);
    bindings.push(`%${search}%`);
  }

  if (level && LEVELS.includes(level)) {
    conditions.push(`p.level = ?${bindings.length + 1}`);
    bindings.push(level);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await listProblemRows(env.DB, where, bindings, 250, "p.next_review_at ASC, p.created_at DESC");
  return ok({ problems: rows.map(decorateProblemRow), now });
}

export async function handleGetProblem(env, id) {
  return ok({ problem: decorateFullProblem(await getProblem(env.DB, id)) });
}

async function listProblemRows(db, where, bindings, limit, orderBy) {
  return all(
    db,
    `SELECT p.*,
      COUNT(DISTINCT a.id) AS attempt_count,
      COALESCE(GROUP_CONCAT(DISTINCT t.name), '') AS techniques
     FROM problems p
     LEFT JOIN attempts a ON a.problem_id = p.id
     LEFT JOIN problem_techniques pt ON pt.problem_id = p.id
     LEFT JOIN techniques t ON t.id = pt.technique_id
     ${where}
     GROUP BY p.id
     ORDER BY ${orderBy}
     LIMIT ${Number(limit)}`,
    ...bindings,
  );
}

function decorateProblemRow(problem) {
  return {
    ...problem,
    attempt_count: Number(problem.attempt_count || 0),
    techniques: String(problem.techniques || "").split(",").filter(Boolean),
    problem_image_url: imageUrl(problem.problem_image_key),
  };
}

export function decorateFullProblem(problem) {
  return {
    ...problem,
    problem_image_url: imageUrl(problem.problem_image_key),
    solution_image_url: imageUrl(problem.solution_image_key),
  };
}

function imageUrl(key) {
  if (!key) return null;
  return `/api/images/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function normalizeSummary(summary) {
  return {
    total_problems: Number(summary?.total_problems || 0),
    due_count: Number(summary?.due_count || 0),
    currently_solved: Number(summary?.currently_solved || 0),
    total_attempts: Number(summary?.total_attempts || 0),
    average_minutes: Number(summary?.average_minutes || 0),
  };
}
