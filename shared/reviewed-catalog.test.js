import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const ids = [
  "putnam_2025_a1", "putnam_2025_a2", "putnam_2025_a3", "putnam_2025_a4", "putnam_2025_a5", "putnam_2025_a6",
  "putnam_2025_b1", "putnam_2025_b2", "putnam_2025_b3", "putnam_2025_b4", "putnam_2025_b5", "putnam_2025_b6",
];

async function loadReviewedProblems() {
  const source = await readFile(new URL("../src/catalog-reviewed-2025.js", import.meta.url), "utf8");
  const context = {
    window: {
      PUTNAM_CATALOG: ids.map((id) => ({ id })),
    },
  };
  vm.runInNewContext(source, context);
  return context.window.PUTNAM_CATALOG;
}

test("all 2025 problems have solution-reviewed metadata", async () => {
  const problems = await loadReviewedProblems();
  assert.equal(problems.length, 12);
  for (const problem of problems) {
    assert.equal(problem.classification_status, "solution_reviewed_2025");
    assert.equal(problem.review_status, "solution_reviewed");
    assert.ok(problem.primary_techniques.length >= 2, `${problem.id} needs primary techniques`);
    assert.ok(problem.technique_evidence.length >= 2, `${problem.id} needs technique evidence`);
    assert.ok(problem.key_observation.length >= 80, `${problem.id} needs a substantive key observation`);
    assert.ok(problem.solution_architecture.length >= 100, `${problem.id} needs a substantive architecture`);
    assert.ok(problem.difficulty_confidence >= 0.9, `${problem.id} should have high reviewed confidence`);
  }
});

test("overall 2025 difficulty matches the documented calibration", async () => {
  const problems = await loadReviewedProblems();
  const positionPrior = { 1: 2.5, 2: 4, 3: 5.5, 4: 6.5, 5: 7.5, 6: 8.5 };

  for (const problem of problems) {
    const number = Number(problem.id.at(-1));
    const empirical = 1 + 9 * (1 - problem.score_stats.mean_score / 10);
    const expected = Math.round((0.65 * empirical + 0.35 * positionPrior[number]) * 10) / 10;
    assert.equal(problem.difficulty_overall, expected, `${problem.id} difficulty should match calibration`);
  }
});

test("review progress points to 2024 after completing 2025", async () => {
  const source = await readFile(new URL("../src/catalog-reviewed-2025.js", import.meta.url), "utf8");
  const context = { window: { PUTNAM_CATALOG: ids.map((id) => ({ id })) } };
  vm.runInNewContext(source, context);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.window.PUTNAM_REVIEW_PROGRESS)),
    { newest_completed_year: 2025, next_year: 2024, reviewed_problem_count: 12 },
  );
});
