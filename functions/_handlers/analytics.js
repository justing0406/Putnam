import { AREAS, LEVELS, OUTCOMES } from "../../shared/constants.js";
import { all } from "../_lib/db.js";
import { ok } from "../_lib/http.js";

export async function handleAnalytics(env) {
  const [problems, attempts, techniques, canonicalRows, attemptTechniqueRows] = await Promise.all([
    all(env.DB, "SELECT id, level, area, latest_outcome FROM problems"),
    all(env.DB, "SELECT id, problem_id, outcome, attempted_at, time_spent_minutes, hints_used FROM attempts ORDER BY attempted_at"),
    all(env.DB, "SELECT id, name, category FROM techniques"),
    all(env.DB, "SELECT problem_id, technique_id FROM problem_techniques"),
    all(env.DB, "SELECT attempt_id, technique_id, relation FROM attempt_techniques"),
  ]);

  const problemById = new Map(problems.map((problem) => [problem.id, problem]));
  const techniqueById = new Map(techniques.map((technique) => [technique.id, technique]));
  const canonicalByProblem = groupSets(canonicalRows, "problem_id", "technique_id");
  const triedByAttempt = groupSets(attemptTechniqueRows.filter((row) => row.relation === "tried"), "attempt_id", "technique_id");
  const successfulByAttempt = groupSets(attemptTechniqueRows.filter((row) => row.relation === "successful"), "attempt_id", "technique_id");

  const levelStats = new Map();
  const areaStats = new Map();
  const techniqueStats = new Map();
  const mismatchPairs = new Map();

  for (const attempt of attempts) {
    const problem = problemById.get(attempt.problem_id);
    if (!problem) continue;
    updateBucket(levelStats, problem.level, attempt);
    updateBucket(areaStats, problem.area, attempt);

    const canonical = canonicalByProblem.get(problem.id) || new Set();
    const tried = triedByAttempt.get(attempt.id) || new Set();
    const explicitlySuccessful = successfulByAttempt.get(attempt.id) || new Set();
    const expected = new Set([...canonical, ...explicitlySuccessful]);

    for (const techniqueId of new Set([...expected, ...tried])) {
      const stats = techniqueStats.get(techniqueId) || {
        technique_id: techniqueId,
        expected_attempts: 0,
        tried_attempts: 0,
        recognized_attempts: 0,
        wrong_applications: 0,
        solved_with_technique: 0,
      };
      if (expected.has(techniqueId)) stats.expected_attempts += 1;
      if (tried.has(techniqueId)) stats.tried_attempts += 1;
      if (expected.has(techniqueId) && tried.has(techniqueId)) {
        stats.recognized_attempts += 1;
        if (attempt.outcome === OUTCOMES.SOLVED) stats.solved_with_technique += 1;
      }
      if (tried.has(techniqueId) && !expected.has(techniqueId)) stats.wrong_applications += 1;
      techniqueStats.set(techniqueId, stats);
    }

    for (const triedId of tried) {
      if (expected.has(triedId)) continue;
      for (const expectedId of expected) {
        const key = `${triedId}::${expectedId}`;
        mismatchPairs.set(key, (mismatchPairs.get(key) || 0) + 1);
      }
    }
  }

  const techniquePerformance = [...techniqueStats.values()]
    .map((stats) => {
      const technique = techniqueById.get(stats.technique_id) || { name: "Unknown", category: "General" };
      const recognitionRate = percentage(stats.recognized_attempts, stats.expected_attempts);
      const executionRate = percentage(stats.solved_with_technique, stats.recognized_attempts);
      const wrongRate = percentage(stats.wrong_applications, stats.tried_attempts);
      const struggleScore = Math.round((100 - recognitionRate) * 0.55 + (100 - executionRate) * 0.35 + wrongRate * 0.1);
      return {
        ...stats,
        name: technique.name,
        category: technique.category,
        recognition_rate: recognitionRate,
        execution_rate: executionRate,
        wrong_application_rate: wrongRate,
        struggle_score: struggleScore,
      };
    })
    .filter((row) => row.expected_attempts + row.tried_attempts > 0)
    .sort((left, right) => right.struggle_score - left.struggle_score || right.expected_attempts - left.expected_attempts);

  const mismatches = [...mismatchPairs.entries()]
    .map(([key, count]) => {
      const [triedId, expectedId] = key.split("::");
      return {
        tried: techniqueById.get(triedId)?.name || "Unknown",
        should_have_used: techniqueById.get(expectedId)?.name || "Unknown",
        count,
      };
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);

  const solvedAttempts = attempts.filter((attempt) => attempt.outcome === OUTCOMES.SOLVED).length;
  const insights = buildInsights(techniquePerformance, mismatches, attempts.length);

  return ok({
    overview: {
      problems: problems.length,
      attempts: attempts.length,
      solved_attempts: solvedAttempts,
      solve_rate: percentage(solvedAttempts, attempts.length),
      average_attempts_per_problem: problems.length ? round(attempts.length / problems.length, 2) : 0,
      average_minutes: average(attempts.map((attempt) => attempt.time_spent_minutes).filter(Number.isFinite)),
      average_hints: average(attempts.map((attempt) => Number(attempt.hints_used || 0))),
    },
    by_level: serializeBuckets(levelStats, LEVELS),
    by_area: serializeBuckets(areaStats, AREAS),
    technique_performance: techniquePerformance,
    mismatches,
    insights,
  });
}

function groupSets(rows, groupKey, valueKey) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row[groupKey])) map.set(row[groupKey], new Set());
    map.get(row[groupKey]).add(row[valueKey]);
  }
  return map;
}

function updateBucket(map, key, attempt) {
  const bucket = map.get(key) || { key, attempts: 0, solved: 0, almost: 0, not_close: 0, minutes: [] };
  bucket.attempts += 1;
  bucket[attempt.outcome] += 1;
  if (Number.isFinite(attempt.time_spent_minutes)) bucket.minutes.push(Number(attempt.time_spent_minutes));
  map.set(key, bucket);
}

function serializeBuckets(map, preferredOrder) {
  return preferredOrder
    .map((key) => map.get(key))
    .filter(Boolean)
    .map((bucket) => ({
      key: bucket.key,
      attempts: bucket.attempts,
      solved: bucket.solved,
      almost: bucket.almost,
      not_close: bucket.not_close,
      solve_rate: percentage(bucket.solved, bucket.attempts),
      average_minutes: average(bucket.minutes),
    }));
}

function percentage(numerator, denominator) {
  return denominator ? Math.round((Number(numerator) / Number(denominator)) * 100) : 0;
}

function average(values) {
  return values.length ? round(values.reduce((sum, value) => sum + Number(value), 0) / values.length, 1) : 0;
}

function round(value, digits) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function buildInsights(techniques, mismatches, attemptCount) {
  if (attemptCount < 3) {
    return [{ type: "info", title: "Build your baseline", text: "Record at least three attempts before the pattern analysis becomes meaningful." }];
  }

  const insights = [];
  const recognitionWeakness = techniques.find((row) => row.expected_attempts >= 2 && row.recognition_rate < 50);
  if (recognitionWeakness) {
    insights.push({
      type: "recognition",
      title: `Recognition gap: ${recognitionWeakness.name}`,
      text: `You identified this technique in ${recognitionWeakness.recognition_rate}% of the attempts where it was useful. Practice recognizing its structural signals before working on execution speed.`,
    });
  }

  const executionWeakness = techniques.find((row) => row.recognized_attempts >= 2 && row.execution_rate < 50);
  if (executionWeakness) {
    insights.push({
      type: "execution",
      title: `Execution gap: ${executionWeakness.name}`,
      text: `You often choose this technique correctly, but convert it into a full solution only ${executionWeakness.execution_rate}% of the time. Review the exact step where the argument usually breaks.`,
    });
  }

  if (mismatches[0]?.count >= 2) {
    insights.push({
      type: "mismatch",
      title: `Recurring substitution: ${mismatches[0].tried}`,
      text: `You tried ${mismatches[0].tried} instead of ${mismatches[0].should_have_used} ${mismatches[0].count} times. Compare the trigger conditions for these two techniques.`,
    });
  }

  if (!insights.length) {
    insights.push({ type: "positive", title: "No repeated weakness yet", text: "Your current attempts do not show a repeated technique-selection or execution problem. Keep logging detailed attempts so subtler patterns can emerge." });
  }
  return insights.slice(0, 4);
}
