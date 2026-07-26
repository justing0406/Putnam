import { rankCatalogProblems } from "../../shared/catalog-search.js";
import { all, ensureTechniques, ensureTopics, first, getProblem } from "../_lib/db.js";
import { HttpError, ok } from "../_lib/http.js";

export async function handleCatalogSearch(env, url) {
  const rows = await all(
    env.DB,
    `SELECT cp.*,
      CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS imported,
      p.id AS journal_problem_id
     FROM catalog_problems cp
     LEFT JOIN problems p ON p.source_catalog_id = cp.id
     ORDER BY cp.year DESC, cp.session, cp.number`,
  );
  const problems = rows.map(decodeCatalogProblem);
  const referenceId = url.searchParams.get("similarTo");
  const reference = referenceId ? problems.find((problem) => problem.id === referenceId) : null;
  if (referenceId && !reference) throw new HttpError(404, "Reference problem not found");

  const results = rankCatalogProblems(problems, {
    query: (url.searchParams.get("q") || "").slice(0, 300),
    area: url.searchParams.get("area") || "",
    minDifficulty: url.searchParams.get("minDifficulty"),
    maxDifficulty: url.searchParams.get("maxDifficulty"),
    reference,
  }).slice(0, 100);

  return ok({
    problems: results,
    reference: reference ? compactReference(reference) : null,
    total: results.length,
  });
}

export async function handleGetCatalogProblem(env, id) {
  const row = await first(
    env.DB,
    `SELECT cp.*,
      CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS imported,
      p.id AS journal_problem_id
     FROM catalog_problems cp
     LEFT JOIN problems p ON p.source_catalog_id = cp.id
     WHERE cp.id = ?1`,
    id,
  );
  if (!row) throw new HttpError(404, "Catalog problem not found");
  return ok({ problem: decodeCatalogProblem(row) });
}

export async function handleImportCatalogProblem(env, id) {
  const catalogRow = await first(env.DB, "SELECT * FROM catalog_problems WHERE id = ?1", id);
  if (!catalogRow) throw new HttpError(404, "Catalog problem not found");
  const catalog = decodeCatalogProblem(catalogRow);

  const existing = await first(env.DB, "SELECT id FROM problems WHERE source_catalog_id = ?1", id);
  if (existing) return ok({ problem: await getProblem(env.DB, existing.id), already_imported: true });

  const now = new Date().toISOString();
  const problemId = crypto.randomUUID();
  const level = `${catalog.session}${catalog.number}`;
  const [topics, techniques] = await Promise.all([
    ensureTopics(env.DB, catalog.topics, catalog.area),
    ensureTechniques(env.DB, catalog.techniques, "Catalog classification"),
  ]);

  const statements = [
    env.DB.prepare(
      `INSERT INTO problems (
        id, title, statement, source, level, area, official_solution, notes,
        latest_outcome, next_review_at, created_at, updated_at, source_catalog_id
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, NULL, ?8, ?8, ?8, ?9)`,
    ).bind(
      problemId,
      catalog.title,
      catalog.statement,
      catalog.source,
      level,
      catalog.area,
      `Imported from Problem Finder · estimated difficulty ${catalog.difficulty_overall}/10`,
      now,
      catalog.id,
    ),
    ...topics.map((topic) => env.DB.prepare(
      "INSERT OR IGNORE INTO problem_topics (problem_id, topic_id) VALUES (?1, ?2)",
    ).bind(problemId, topic.id)),
    ...techniques.map((technique) => env.DB.prepare(
      "INSERT OR IGNORE INTO problem_techniques (problem_id, technique_id) VALUES (?1, ?2)",
    ).bind(problemId, technique.id)),
  ];

  await env.DB.batch(statements);
  return ok({ problem: await getProblem(env.DB, problemId), already_imported: false }, { status: 201 });
}

function decodeCatalogProblem(row) {
  return {
    ...row,
    imported: Boolean(Number(row.imported || 0)),
    topics: parseList(row.topics_json),
    concepts: parseList(row.concepts_json),
    techniques: parseList(row.techniques_json),
    prerequisites: parseList(row.prerequisites_json),
    common_false_starts: parseList(row.common_false_starts_json),
    difficulty_overall: Number(row.difficulty_overall),
    difficulty_insight: Number(row.difficulty_insight),
    difficulty_technical: Number(row.difficulty_technical),
    difficulty_prerequisite: Number(row.difficulty_prerequisite),
    difficulty_proof: Number(row.difficulty_proof),
    difficulty_confidence: row.difficulty_confidence == null ? null : Number(row.difficulty_confidence),
  };
}

function parseList(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function compactReference(problem) {
  return {
    id: problem.id,
    title: problem.title,
    difficulty_overall: problem.difficulty_overall,
    topics: problem.topics,
    techniques: problem.techniques,
  };
}
