import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const ids = [
  "putnam_2024_a1", "putnam_2024_a2", "putnam_2024_a3", "putnam_2024_a4", "putnam_2024_a5", "putnam_2024_a6",
  "putnam_2024_b1", "putnam_2024_b2", "putnam_2024_b3", "putnam_2024_b4", "putnam_2024_b5", "putnam_2024_b6",
];

async function loadReviewedProblems() {
  const source = await readFile(new URL("../src/catalog-reviewed-2024.js", import.meta.url), "utf8");
  const context = { window: { PUTNAM_CATALOG: ids.map((id) => ({ id })) } };
  vm.runInNewContext(source, context);
  return { problems: context.window.PUTNAM_CATALOG, progress: context.window.PUTNAM_REVIEW_PROGRESS };
}

test("all 2024 problems have manually solution-reviewed metadata", async () => {
  const { problems } = await loadReviewedProblems();
  assert.equal(problems.length, 12);
  for (const problem of problems) {
    assert.equal(problem.classification_status, "solution_reviewed_2024");
    assert.equal(problem.review_status, "solution_reviewed");
    assert.ok(problem.primary_techniques.length >= 2, `${problem.id} needs primary techniques`);
    assert.ok(problem.technique_evidence.length >= 2, `${problem.id} needs technique evidence`);
    assert.ok(problem.key_observation.length >= 80, `${problem.id} needs a substantive key observation`);
    assert.ok(problem.solution_architecture.length >= 100, `${problem.id} needs a substantive architecture`);
    assert.ok(problem.difficulty_confidence >= 0.9, `${problem.id} should have high reviewed confidence`);
  }
});

test("overall 2024 difficulty matches official-score calibration", async () => {
  const { problems } = await loadReviewedProblems();
  const positionPrior = { 1: 2.5, 2: 4, 3: 5.5, 4: 6.5, 5: 7.5, 6: 8.5 };
  for (const problem of problems) {
    const number = Number(problem.id.at(-1));
    const empirical = 1 + 9 * (1 - problem.score_stats.mean_score / 10);
    const expected = Math.round((0.65 * empirical + 0.35 * positionPrior[number]) * 10) / 10;
    assert.equal(problem.difficulty_overall, expected, `${problem.id} difficulty should match calibration`);
  }
});

test("review progress points to 2023 after completing 2024", async () => {
  const { progress } = await loadReviewedProblems();
  assert.deepEqual(
    JSON.parse(JSON.stringify(progress)),
    { newest_completed_year: 2024, next_year: 2023, reviewed_problem_count: 24 },
  );
});
