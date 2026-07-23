export const OUTCOMES = Object.freeze({
  SOLVED: "solved",
  ALMOST: "almost",
  NOT_CLOSE: "not_close",
});

export const OUTCOME_LABELS = Object.freeze({
  [OUTCOMES.SOLVED]: "Solved",
  [OUTCOMES.ALMOST]: "Almost solved",
  [OUTCOMES.NOT_CLOSE]: "Not very close",
});

export const LEVELS = Object.freeze([
  "A0", "A1", "A2", "A3", "A4", "A5", "A6",
  "B0", "B1", "B2", "B3", "B4", "B5", "B6",
]);

export const AREAS = Object.freeze([
  "Algebra",
  "Combinatorics",
  "Geometry",
  "Number Theory",
  "Analysis",
  "Mixed",
]);
