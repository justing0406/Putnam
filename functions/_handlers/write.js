import { AREAS, LEVELS, OUTCOMES } from "../../shared/constants.js";
import { getNextReviewDate } from "../../shared/scheduling.js";
import { ensureTechniques, ensureTopics, first, getProblem, normalizeTechniqueNames, normalizeTopicNames } from "../_lib/db.js";
import { HttpError, ok, readJson } from "../_lib/http.js";
import { decorateFullProblem } from "./read.js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function handleCreateProblem(request, env) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    throw new HttpError(415, "Expected multipart/form-data");
  }

  const form = await request.formData();
  const title = requiredText(form, "title", 180);
  const level = requiredEnum(form, "level", LEVELS);
  const area = requiredEnum(form, "area", AREAS);
  const now = new Date();
  const id = crypto.randomUUID();
  const initialOutcome = optionalEnum(form.get("initialOutcome"), Object.values(OUTCOMES));
  const nextReviewAt = initialOutcome ? getNextReviewDate(initialOutcome, now).toISOString() : now.toISOString();
  const topicNames = parseNameField(form.get("topics"), normalizeTopicNames);
  const successfulNames = parseNameField(form.get("successfulTechniques"), normalizeTechniqueNames);
  const triedNames = parseNameField(form.get("triedTechniques"), normalizeTechniqueNames);
  const storedKeys = [];

  try {
    const [problemImageKey, solutionImageKey] = await Promise.all([
      storeImage(env.IMAGES, form.get("problemImage"), id, "problem", storedKeys),
      storeImage(env.IMAGES, form.get("solutionImage"), id, "solution", storedKeys),
    ]);

    const [topics, successfulTechniques, triedTechniques] = await Promise.all([
      ensureTopics(env.DB, topicNames, area),
      ensureTechniques(env.DB, successfulNames),
      ensureTechniques(env.DB, triedNames),
    ]);

    const statements = [
      env.DB.prepare(
        `INSERT INTO problems (
          id, title, statement, source, level, area, problem_image_key, solution_image_key,
          official_solution, notes, latest_outcome, next_review_at, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
      ).bind(
        id,
        title,
        optionalText(form, "statement", 20000),
        optionalText(form, "source", 300),
        level,
        area,
        problemImageKey,
        solutionImageKey,
        optionalText(form, "officialSolution", 30000),
        optionalText(form, "notes", 10000),
        initialOutcome,
        nextReviewAt,
        now.toISOString(),
        now.toISOString(),
      ),
      ...topics.map((topic) => env.DB.prepare(
        "INSERT OR IGNORE INTO problem_topics (problem_id, topic_id) VALUES (?1, ?2)",
      ).bind(id, topic.id)),
      ...successfulTechniques.map((technique) => env.DB.prepare(
        "INSERT OR IGNORE INTO problem_techniques (problem_id, technique_id) VALUES (?1, ?2)",
      ).bind(id, technique.id)),
    ];

    if (initialOutcome) {
      const attemptId = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          `INSERT INTO attempts (
            id, problem_id, attempted_at, outcome, self_solution, where_stuck, error_analysis,
            time_spent_minutes, hints_used, confidence, solution_revealed, next_review_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
        ).bind(
          attemptId,
          id,
          now.toISOString(),
          initialOutcome,
          optionalText(form, "selfSolution", 30000),
          optionalText(form, "whereStuck", 10000),
          optionalText(form, "errorAnalysis", 10000),
          optionalInteger(form.get("timeSpentMinutes"), 0, 1440),
          optionalInteger(form.get("hintsUsed"), 0, 100) ?? 0,
          optionalInteger(form.get("confidence"), 1, 5),
          form.get("solutionRevealed") === "true" ? 1 : 0,
          nextReviewAt,
        ),
        ...triedTechniques.map((technique) => env.DB.prepare(
          "INSERT OR IGNORE INTO attempt_techniques (attempt_id, technique_id, relation) VALUES (?1, ?2, 'tried')",
        ).bind(attemptId, technique.id)),
        ...successfulTechniques.map((technique) => env.DB.prepare(
          "INSERT OR IGNORE INTO attempt_techniques (attempt_id, technique_id, relation) VALUES (?1, ?2, 'successful')",
        ).bind(attemptId, technique.id)),
      );
    }

    await env.DB.batch(statements);
    return ok({ problem: decorateFullProblem(await getProblem(env.DB, id)) }, { status: 201 });
  } catch (caught) {
    await Promise.allSettled(storedKeys.map((key) => env.IMAGES.delete(key)));
    throw caught;
  }
}

export async function handleCreateAttempt(request, env, problemId) {
  const body = await readJson(request);
  const problem = await first(env.DB, "SELECT id FROM problems WHERE id = ?1", problemId);
  if (!problem) throw new HttpError(404, "Problem not found");

  const outcome = requiredBodyEnum(body, "outcome", Object.values(OUTCOMES));
  const now = new Date();
  const nextReviewAt = getNextReviewDate(outcome, now).toISOString();
  const attemptId = crypto.randomUUID();
  const successfulTechniques = await ensureTechniques(env.DB, body.successfulTechniques || []);
  const triedTechniques = await ensureTechniques(env.DB, body.triedTechniques || []);

  const statements = [
    env.DB.prepare(
      `INSERT INTO attempts (
        id, problem_id, attempted_at, outcome, self_solution, where_stuck, error_analysis,
        time_spent_minutes, hints_used, confidence, solution_revealed, next_review_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    ).bind(
      attemptId,
      problemId,
      now.toISOString(),
      outcome,
      cleanText(body.selfSolution, 30000),
      cleanText(body.whereStuck, 10000),
      cleanText(body.errorAnalysis, 10000),
      boundedInteger(body.timeSpentMinutes, 0, 1440),
      boundedInteger(body.hintsUsed, 0, 100) ?? 0,
      boundedInteger(body.confidence, 1, 5),
      body.solutionRevealed ? 1 : 0,
      nextReviewAt,
    ),
    env.DB.prepare(
      "UPDATE problems SET latest_outcome = ?1, next_review_at = ?2, updated_at = ?3 WHERE id = ?4",
    ).bind(outcome, nextReviewAt, now.toISOString(), problemId),
    ...successfulTechniques.map((technique) => env.DB.prepare(
      "INSERT OR IGNORE INTO problem_techniques (problem_id, technique_id) VALUES (?1, ?2)",
    ).bind(problemId, technique.id)),
    ...triedTechniques.map((technique) => env.DB.prepare(
      "INSERT OR IGNORE INTO attempt_techniques (attempt_id, technique_id, relation) VALUES (?1, ?2, 'tried')",
    ).bind(attemptId, technique.id)),
    ...successfulTechniques.map((technique) => env.DB.prepare(
      "INSERT OR IGNORE INTO attempt_techniques (attempt_id, technique_id, relation) VALUES (?1, ?2, 'successful')",
    ).bind(attemptId, technique.id)),
  ];

  await env.DB.batch(statements);
  return ok({
    attempt_id: attemptId,
    next_review_at: nextReviewAt,
    problem: decorateFullProblem(await getProblem(env.DB, problemId)),
  }, { status: 201 });
}

export async function handleImage(path, env) {
  const encodedKey = path.slice("/api/images/".length);
  const key = encodedKey.split("/").map(decodeURIComponent).join("/");
  if (!key || key.includes("..")) throw new HttpError(400, "Invalid image key");
  const object = await env.IMAGES.get(key);
  if (!object) throw new HttpError(404, "Image not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=3600");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}

async function storeImage(bucket, value, problemId, kind, storedKeys) {
  if (!value || typeof value === "string" || !value.size) return null;
  if (!IMAGE_TYPES.has(value.type)) throw new HttpError(400, `${kind} image must be JPEG, PNG, WebP, or GIF`);
  if (value.size > MAX_IMAGE_BYTES) throw new HttpError(413, `${kind} image must be 10 MB or smaller`);

  const key = `problems/${problemId}/${kind}-${crypto.randomUUID()}.${IMAGE_TYPES.get(value.type)}`;
  await bucket.put(key, await value.arrayBuffer(), {
    httpMetadata: { contentType: value.type },
    customMetadata: { originalName: String(value.name || "upload").slice(0, 200), kind },
  });
  storedKeys.push(key);
  return key;
}

function requiredText(form, name, maxLength) {
  const value = optionalText(form, name, maxLength);
  if (!value) throw new HttpError(400, `${name} is required`);
  return value;
}

function optionalText(form, name, maxLength) {
  return cleanText(form.get(name), maxLength);
}

function cleanText(value, maxLength) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

function requiredEnum(form, name, values) {
  const value = String(form.get(name) || "");
  if (!values.includes(value)) throw new HttpError(400, `${name} is invalid`);
  return value;
}

function optionalEnum(value, values) {
  if (value === null || value === undefined || value === "") return null;
  if (!values.includes(String(value))) throw new HttpError(400, "Invalid outcome");
  return String(value);
}

function requiredBodyEnum(body, name, values) {
  const value = String(body[name] || "");
  if (!values.includes(value)) throw new HttpError(400, `${name} is invalid`);
  return value;
}

function optionalInteger(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  return boundedInteger(value, min, max);
}

function boundedInteger(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new HttpError(400, `Expected an integer from ${min} to ${max}`);
  }
  return number;
}

function parseNameField(value, normalizer) {
  if (!value) return [];
  try {
    return normalizer(JSON.parse(String(value)));
  } catch {
    return normalizer(String(value));
  }
}