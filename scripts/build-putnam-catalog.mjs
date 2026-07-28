import { readFile, writeFile } from "node:fs/promises";

const [, , inputPath = "/tmp/putnam.json", outputPath = "src/catalog-data.js"] = process.argv;
const rawProblems = JSON.parse(await readFile(inputPath, "utf8"));

const FIRST_YEAR = 1962;
const LAST_YEAR = 2025;
const RECENT_PRIORITY_YEAR = 2017;
const difficultyByNumber = { 1: 2.5, 2: 4, 3: 5.5, 4: 6.5, 5: 7.5, 6: 8.5 };

const tagLabels = {
  algebra: "Algebra",
  abstract_algebra: "Abstract algebra",
  analysis: "Analysis",
  combinatorics: "Combinatorics",
  geometry: "Geometry",
  linear_algebra: "Linear algebra",
  number_theory: "Number theory",
  probability: "Probability",
  set_theory: "Set theory",
};

const tagAreas = {
  algebra: "Algebra",
  abstract_algebra: "Algebra",
  analysis: "Analysis",
  combinatorics: "Combinatorics",
  geometry: "Geometry",
  linear_algebra: "Algebra",
  number_theory: "Number Theory",
  probability: "Combinatorics",
  set_theory: "Mixed",
};

const techniqueRules = [
  [/invariant|preserved quantity/i, "Invariant"],
  [/monovariant|strictly (?:increase|decrease)/i, "Monovariant"],
  [/pigeonhole/i, "Pigeonhole principle"],
  [/double count|count(?:ed|ing)? in two ways/i, "Double counting"],
  [/bijection|one-to-one correspondence/i, "Bijection"],
  [/inclusion.exclusion/i, "Inclusion-exclusion"],
  [/generating function|coefficient of/i, "Generating functions"],
  [/recurrence|recursive|defined by .*_{n\+1}/i, "Recurrence relation"],
  [/induction/i, "Induction"],
  [/minimal counterexample|infinite descent|smaller solution/i, "Descent or minimal counterexample"],
  [/extremal|smallest|largest|minimal|maximal|minimum|maximum/i, "Extremal principle"],
  [/contradiction|impossible/i, "Contradiction"],
  [/symmetr|without loss of generality/i, "Symmetry"],
  [/construct|there exist|existence/i, "Auxiliary construction"],
  [/color(?:ed|ing)|red or blue|red or green/i, "Coloring argument"],
  [/game|winning strategy|Alice and Bob/i, "Game strategy"],
  [/modulo|congruen|divisib|relatively prime|prime number|gcd|greatest common divisor/i, "Modular arithmetic and divisibility"],
  [/valuation|power of a prime|highest power/i, "Prime valuations"],
  [/polynomial|roots? of/i, "Polynomial structure"],
  [/determinant|matrix|eigenvalue|rank of/i, "Linear algebra"],
  [/expected value|expectation/i, "Linearity of expectation"],
  [/uniformly at random|probability|random variable/i, "Probabilistic modeling"],
  [/continuous|differentiable|derivative|integral|lim(?:it)?/i, "Calculus and estimation"],
  [/convex|concave|Jensen/i, "Convexity"],
  [/Cauchy|Schwarz/i, "Cauchy-Schwarz inequality"],
  [/AM.GM|arithmetic.geometric/i, "AM-GM inequality"],
  [/telescop/i, "Telescoping"],
  [/coordinate|origin \(|plane|circle|triangle|polygon/i, "Geometric construction or coordinates"],
];

const conceptRules = [
  [/polynomial/i, "Polynomials"],
  [/prime|divisib|congruen|modulo|relatively prime/i, "Divisibility and congruences"],
  [/functional equation/i, "Functional equations"],
  [/sequence|recurrence/i, "Sequences and recurrences"],
  [/matrix|determinant|vector|eigenvalue/i, "Matrices and vectors"],
  [/probability|random|expected value|expectation/i, "Probability and expectation"],
  [/integral|derivative|differentiable|continuous|limit/i, "Calculus and analysis"],
  [/graph|vertices|edges/i, "Graph theory"],
  [/permutation|bijection|arrangement/i, "Permutations"],
  [/subset|set of all|family of sets/i, "Set systems"],
  [/circle|triangle|polygon|plane|sphere|convex/i, "Euclidean and convex geometry"],
  [/inequal|upper bound|lower bound|maximal|minimal/i, "Inequalities and optimization"],
  [/base [0-9]|binary|digits?/i, "Number representations"],
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseId(problemName) {
  const match = /^putnam_(\d{4})_([ab])(\d)$/i.exec(String(problemName || ""));
  if (!match) return null;
  return { year: Number(match[1]), session: match[2].toUpperCase(), number: Number(match[3]) };
}

function formatTopic(tag) {
  return tagLabels[tag] || String(tag).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function chooseArea(tags) {
  const areas = unique(tags.map((tag) => tagAreas[tag]).filter(Boolean));
  return areas.length === 1 ? areas[0] : areas.length ? "Mixed" : "Mixed";
}

function normalizeLatex(text) {
  let value = String(text || "").trim();
  value = value.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => `\\[ ${math.trim()} \\]`);
  value = value.replace(/\$([^$\n]+?)\$/g, (_, math) => `\\(${math.trim()}\\)`);
  value = value.replace(/\\tfrac|\\dfrac/g, "\\frac");
  value = value.replace(/\\mbox\{/g, "\\text{");
  value = value.replace(/\{([^{}]+)\\choose\s*([^{}]+)\}/g, "\\binom{$1}{$2}");
  value = value.replace(/\\begin\{enumerate\}|\\end\{enumerate\}/g, "");
  value = value.replace(/\\item\[\((.*?)\)\]/g, "\n$1 ");
  value = value.replace(/\\item\b/g, "\n• ");
  value = value.replace(/\\begin\{align\*?\}|\\end\{align\*?\}/g, "");
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function inferMetadata(problem, parsed) {
  const statement = String(problem.informal_statement || "");
  const solution = problem.informal_solution === "None." ? "" : String(problem.informal_solution || "");
  const evidence = `${statement}\n${solution}`;
  const sourceTags = Array.isArray(problem.tags) ? problem.tags.map(String) : [];
  const recent = parsed.year >= RECENT_PRIORITY_YEAR;

  const techniques = unique(techniqueRules.filter(([pattern]) => pattern.test(evidence)).map(([, label]) => label));
  const concepts = unique(conceptRules.filter(([pattern]) => pattern.test(statement)).map(([, label]) => label));

  if (!techniques.length) {
    const fallback = {
      Algebra: "Algebraic manipulation and structure",
      Analysis: "Analytic estimation",
      Combinatorics: "Combinatorial construction or counting",
      Geometry: "Geometric construction",
      "Number Theory": "Divisibility and congruences",
      Mixed: "Auxiliary construction",
    }[chooseArea(sourceTags)];
    techniques.push(fallback);
  }

  return {
    topics: unique(sourceTags.map(formatTopic)),
    concepts: recent ? concepts.slice(0, 6) : concepts.slice(0, 3),
    techniques: recent ? techniques.slice(0, 6) : techniques.slice(0, 3),
    classification_status: recent ? "recent_priority_machine_classified" : "historical_machine_classified",
    difficulty_confidence: recent ? 0.58 : 0.35,
  };
}

function createRecord(problem) {
  const parsed = parseId(problem.problem_name);
  if (!parsed || parsed.year < FIRST_YEAR || parsed.year > LAST_YEAR) return null;
  const tags = Array.isArray(problem.tags) ? problem.tags.map(String) : [];
  const metadata = inferMetadata(problem, parsed);
  const difficulty = difficultyByNumber[parsed.number];

  return {
    id: `putnam_${parsed.year}_${parsed.session.toLowerCase()}${parsed.number}`,
    title: `${parsed.year} Putnam ${parsed.session}${parsed.number}`,
    source: `${parsed.year} William Lowell Putnam Mathematical Competition ${parsed.session}${parsed.number}`,
    source_url: `https://kskedlaya.org/putnam-archive/${parsed.year}.tex`,
    statement: normalizeLatex(problem.informal_statement),
    statement_available: true,
    year: parsed.year,
    session: parsed.session,
    number: parsed.number,
    area: chooseArea(tags),
    topics: metadata.topics,
    concepts: metadata.concepts,
    techniques: metadata.techniques,
    prerequisites: [],
    difficulty_overall: difficulty,
    difficulty_insight: Math.min(10, difficulty + 0.5),
    difficulty_technical: Math.max(1, difficulty - 0.5),
    difficulty_prerequisite: Math.max(1, difficulty - 1),
    difficulty_proof: difficulty,
    difficulty_confidence: metadata.difficulty_confidence,
    key_observation: "",
    solution_architecture: "",
    common_false_starts: [],
    classification_status: metadata.classification_status,
    metadata_priority: LAST_YEAR - parsed.year,
  };
}

function createPlaceholder(year, session, number) {
  const difficulty = difficultyByNumber[number];
  return {
    id: `putnam_${year}_${session.toLowerCase()}${number}`,
    title: `${year} Putnam ${session}${number}`,
    source: `${year} William Lowell Putnam Mathematical Competition ${session}${number}`,
    source_url: `https://kskedlaya.org/putnam-archive/${year}.tex`,
    statement: "This problem is indexed, but its statement is not yet present in the permitted PutnamBench source corpus.",
    statement_available: false,
    year,
    session,
    number,
    area: "Mixed",
    topics: ["Unclassified"],
    concepts: [],
    techniques: [],
    prerequisites: [],
    difficulty_overall: difficulty,
    difficulty_insight: difficulty,
    difficulty_technical: difficulty,
    difficulty_prerequisite: Math.max(1, difficulty - 1),
    difficulty_proof: difficulty,
    difficulty_confidence: 0.15,
    key_observation: "",
    solution_architecture: "",
    common_false_starts: [],
    classification_status: "indexed_statement_pending",
    metadata_priority: LAST_YEAR - year,
  };
}

const recordsById = new Map();
for (const problem of rawProblems) {
  const record = createRecord(problem);
  if (record) recordsById.set(record.id, record);
}

for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
  for (const session of ["A", "B"]) {
    for (let number = 1; number <= 6; number += 1) {
      const id = `putnam_${year}_${session.toLowerCase()}${number}`;
      if (!recordsById.has(id)) recordsById.set(id, createPlaceholder(year, session, number));
    }
  }
}

const records = [...recordsById.values()].sort((left, right) =>
  right.year - left.year
  || left.session.localeCompare(right.session)
  || left.number - right.number,
);

const fullStatementCount = records.filter((problem) => problem.statement_available).length;
const recentClassifiedCount = records.filter((problem) => problem.classification_status === "recent_priority_machine_classified").length;
const metadata = {
  first_year: FIRST_YEAR,
  last_year: LAST_YEAR,
  total: records.length,
  full_statement_count: fullStatementCount,
  indexed_statement_pending_count: records.length - fullStatementCount,
  recent_priority_start_year: RECENT_PRIORITY_YEAR,
  recent_priority_classified_count: recentClassifiedCount,
  source: "PutnamBench informal statements, used with MAA permission",
};

const output = `// Generated by scripts/build-putnam-catalog.mjs. Do not edit by hand.\nwindow.PUTNAM_CATALOG_META = ${JSON.stringify(metadata)};\nwindow.PUTNAM_CATALOG = ${JSON.stringify(records)};\n`;
await writeFile(outputPath, output, "utf8");
console.log(`Wrote ${records.length} indexed problems (${fullStatementCount} with statements) to ${outputPath}.`);
