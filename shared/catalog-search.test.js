import test from "node:test";
import assert from "node:assert/strict";
import { interpretCatalogQuery, rankCatalogProblems } from "./catalog-search.js";

const sample = [
  {
    id: "invariant",
    title: "Invariant problem",
    source: "Putnam A2",
    statement: "A process changes integers.",
    area: "Combinatorics",
    year: 2020,
    session: "A",
    number: 2,
    topics: ["Algorithms and processes"],
    concepts: ["Parity"],
    techniques: ["Invariant"],
    prerequisites: [],
    solution_architecture: "Identify a preserved quantity.",
    key_observation: "Parity never changes.",
    difficulty_overall: 4,
  },
  {
    id: "calculus",
    title: "Integral problem",
    source: "Putnam B4",
    statement: "Evaluate an integral.",
    area: "Analysis",
    year: 2021,
    session: "B",
    number: 4,
    topics: ["Integration"],
    concepts: ["Substitution"],
    techniques: ["Change of variables"],
    prerequisites: [],
    solution_architecture: "Substitute and simplify.",
    key_observation: "The endpoints exchange.",
    difficulty_overall: 7,
  },
];

test("interprets natural difficulty language", () => {
  const query = interpretCatalogQuery("hard invariant problems");
  assert.equal(query.inferredMin, 6.5);
  assert.ok(query.phrases.includes("invariant"));
});

test("ranks technique matches above unrelated problems", () => {
  const results = rankCatalogProblems(sample, { query: "use an invariant" });
  assert.equal(results[0].id, "invariant");
  assert.ok(results[0].search_score > 0);
});

test("applies area and difficulty filters", () => {
  const results = rankCatalogProblems(sample, { area: "Analysis", minDifficulty: 6 });
  assert.deepEqual(results.map((problem) => problem.id), ["calculus"]);
});
