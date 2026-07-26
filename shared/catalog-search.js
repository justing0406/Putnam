const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "find", "for", "from",
  "give", "has", "have", "i", "in", "is", "it", "me", "of", "on", "or", "other", "problem", "problems",
  "show", "similar", "some", "than", "that", "the", "to", "use", "using", "want", "with",
]);

const SYNONYMS = new Map([
  ["contradiction", ["proof by contradiction", "contradiction", "assume the opposite"]],
  ["descent", ["descent", "infinite descent", "minimal counterexample"]],
  ["invariant", ["invariant", "monovariant", "preserved quantity"]],
  ["extremal", ["extremal principle", "largest", "smallest", "maximum", "minimum"]],
  ["double counting", ["double counting", "count two ways"]],
  ["pigeonhole", ["pigeonhole principle", "pigeonhole"]],
  ["telescoping", ["telescoping", "potential function"]],
  ["recurrence", ["recurrence", "recursive", "recursion"]],
  ["symmetry", ["symmetry", "symmetric", "without loss of generality"]],
  ["construction", ["construction", "construct", "auxiliary object"]],
  ["bounding", ["bounding", "estimate", "inequality", "upper bound", "lower bound"]],
  ["modular", ["modular arithmetic", "congruence", "modulo"]],
  ["generating function", ["generating function", "coefficient extraction"]],
]);

export function interpretCatalogQuery(query) {
  const normalized = normalize(query);
  const tokens = tokenize(normalized);
  const phrases = [];

  for (const [canonical, variants] of SYNONYMS) {
    if (variants.some((variant) => normalized.includes(variant))) phrases.push(canonical);
  }

  let inferredMin = null;
  let inferredMax = null;
  if (/\b(easy|easier|beginner|introductory)\b/.test(normalized)) inferredMax = 3.5;
  if (/\b(medium|moderate|middle)\b/.test(normalized)) {
    inferredMin = 3.5;
    inferredMax = 6.5;
  }
  if (/\b(hard|harder|challenging|difficult|advanced)\b/.test(normalized)) inferredMin = 6.5;

  return { normalized, tokens, phrases: [...new Set(phrases)], inferredMin, inferredMax };
}

export function rankCatalogProblems(problems, options = {}) {
  const query = interpretCatalogQuery(options.query || "");
  const minDifficulty = numberOrNull(options.minDifficulty) ?? query.inferredMin;
  const maxDifficulty = numberOrNull(options.maxDifficulty) ?? query.inferredMax;
  const area = String(options.area || "").trim().toLowerCase();
  const reference = options.reference || null;

  return problems
    .filter((problem) => !area || String(problem.area).toLowerCase() === area)
    .filter((problem) => minDifficulty === null || Number(problem.difficulty_overall) >= minDifficulty)
    .filter((problem) => maxDifficulty === null || Number(problem.difficulty_overall) <= maxDifficulty)
    .filter((problem) => !reference || problem.id !== reference.id)
    .map((problem) => scoreProblem(problem, query, reference))
    .filter((problem) => !query.normalized || problem.search_score > 0 || reference)
    .sort((a, b) => b.search_score - a.search_score || b.year - a.year || a.session.localeCompare(b.session) || a.number - b.number);
}

function scoreProblem(problem, query, reference) {
  const weightedFields = [
    [problem.title, 5],
    [problem.source, 3],
    [problem.statement, 1.5],
    [problem.topics, 6],
    [problem.concepts, 5],
    [problem.techniques, 8],
    [problem.prerequisites, 2],
    [problem.solution_architecture, 5],
    [problem.key_observation, 3],
  ];

  let score = 0;
  const reasons = [];
  const matched = new Set();

  for (const phrase of query.phrases) {
    const techniqueMatch = values(problem.techniques).some((value) => normalize(value).includes(phrase));
    const architectureMatch = normalize(problem.solution_architecture).includes(phrase);
    if (techniqueMatch || architectureMatch) {
      score += techniqueMatch ? 18 : 10;
      reasons.push(`Uses ${phrase}`);
      matched.add(phrase);
    }
  }

  for (const token of query.tokens) {
    let tokenScore = 0;
    for (const [field, weight] of weightedFields) {
      const text = normalize(Array.isArray(field) ? field.join(" ") : field);
      if (text.includes(token)) tokenScore += weight;
    }
    if (tokenScore) {
      score += tokenScore;
      matched.add(token);
    }
  }

  if (query.normalized && normalize(problem.title).includes(query.normalized)) score += 25;
  if (query.normalized && normalize(problem.statement).includes(query.normalized)) score += 12;

  if (matched.size) {
    const technique = values(problem.techniques).find((item) => [...matched].some((term) => normalize(item).includes(term)));
    const topic = values(problem.topics).find((item) => [...matched].some((term) => normalize(item).includes(term)));
    const concept = values(problem.concepts).find((item) => [...matched].some((term) => normalize(item).includes(term)));
    if (technique && !reasons.some((reason) => reason.includes(technique))) reasons.push(`Technique: ${technique}`);
    if (topic) reasons.push(`Topic: ${topic}`);
    else if (concept) reasons.push(`Concept: ${concept}`);
  }

  if (reference) {
    const similarity = similarityScore(problem, reference);
    score += similarity.total;
    reasons.unshift(...similarity.reasons);
  }

  if (!query.normalized && !reference) score = 1 + Number(problem.difficulty_overall || 0) / 100;

  return {
    ...problem,
    search_score: Number(score.toFixed(3)),
    match_reasons: [...new Set(reasons)].slice(0, 3),
  };
}

function similarityScore(problem, reference) {
  const topicOverlap = jaccard(problem.topics, reference.topics);
  const techniqueOverlap = jaccard(problem.techniques, reference.techniques);
  const conceptOverlap = jaccard(problem.concepts, reference.concepts);
  const difficultyGap = Math.abs(Number(problem.difficulty_overall) - Number(reference.difficulty_overall));
  const difficultySimilarity = Math.max(0, 1 - difficultyGap / 5);
  const total = topicOverlap * 24 + techniqueOverlap * 38 + conceptOverlap * 18 + difficultySimilarity * 20;
  const reasons = [];

  const sharedTechniques = intersection(problem.techniques, reference.techniques);
  const sharedTopics = intersection(problem.topics, reference.topics);
  if (sharedTechniques.length) reasons.push(`Shared technique: ${sharedTechniques[0]}`);
  if (sharedTopics.length) reasons.push(`Shared topic: ${sharedTopics[0]}`);
  if (difficultyGap <= 1) reasons.push("Very similar difficulty");
  else if (difficultyGap <= 2) reasons.push("Nearby difficulty");

  return { total, reasons };
}

function tokenize(value) {
  return [...new Set(String(value)
    .replace(/[^a-z0-9+.-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token)))];
}

function jaccard(left, right) {
  const a = new Set(values(left).map(normalize));
  const b = new Set(values(right).map(normalize));
  if (!a.size && !b.size) return 0;
  let overlap = 0;
  for (const value of a) if (b.has(value)) overlap += 1;
  return overlap / (a.size + b.size - overlap || 1);
}

function intersection(left, right) {
  const rightMap = new Map(values(right).map((item) => [normalize(item), item]));
  return values(left).filter((item) => rightMap.has(normalize(item)));
}

function values(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
