import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const [, , yearArgument, problemPath, solutionPath, outputPath] = process.argv;
const year = Number(yearArgument);
if (!Number.isInteger(year) || year < 1962 || year > 2023) {
  throw new Error("Usage: node scripts/review-putnam-year-v2.mjs YEAR PROBLEMS.tex SOLUTIONS.tex OUTPUT.json");
}
if (!problemPath || !solutionPath || !outputPath) throw new Error("Problem, solution, and output paths are required.");

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required for GitHub Models inference.");
const model = process.env.PUTNAM_REVIEW_MODEL || "openai/gpt-4.1";
const catalog = await loadCatalog();
const [problemSource, solutionSource] = await Promise.all([
  readFile(problemPath, "utf8"),
  readFile(solutionPath, "utf8"),
]);
const problemChunks = parseLabeledChunks(problemSource, "problem");
const solutionChunks = parseLabeledChunks(solutionSource, "solution");
const labels = ["a1", "a2", "a3", "a4", "a5", "a6", "b1", "b2", "b3", "b4", "b5", "b6"];
const missingSolutions = labels.filter((label) => !solutionChunks.has(label));
if (missingSolutions.length) {
  throw new Error(`Could not locate solution sections for ${missingSolutions.join(", ")}. Found: ${[...solutionChunks.keys()].join(", ")}`);
}

const analyzed = [];
for (const label of labels) {
  const id = `putnam_${year}_${label}`;
  const catalogProblem = catalog.find((item) => item.id === id) || {};
  const archiveStatement = problemChunks.get(label) ? normalizeStatement(problemChunks.get(label)) : "";
  const statement = catalogProblem.statement_available === false || !catalogProblem.statement
    ? archiveStatement
    : catalogProblem.statement;
  if (!statement) {
    console.log(`Skipping ${id}: no usable statement.`);
    continue;
  }

  const effectiveProblem = {
    ...catalogProblem,
    id,
    year,
    session: label[0].toUpperCase(),
    number: Number(label[1]),
    area: catalogProblem.area || "Mixed",
    statement,
  };
  const solutionText = solutionChunks.get(label).slice(0, 42000);
  console.log(`Analyzing ${id} with ${model} (${solutionText.length} solution characters)...`);
  const analysis = await callModel({ problem: effectiveProblem, solutionText, model, token });
  const record = finalizeRecord({ problem: effectiveProblem, solutionText, analysis, model });
  if (catalogProblem.statement_available === false && archiveStatement) {
    record.statement = archiveStatement;
    record.statement_available = true;
    record.statement_source_url = `https://kskedlaya.org/putnam-archive/${year}.tex`;
  }
  validateRecord(record, id);
  analyzed.push(record);
  await sleep(1200);
}

if (!analyzed.length) throw new Error(`No records were analyzed for ${year}.`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  year,
  problem_source_url: `https://kskedlaya.org/putnam-archive/${year}.tex`,
  solution_source_url: `https://kskedlaya.org/putnam-archive/${year}s.tex`,
  problem_source_sha256: createHash("sha256").update(problemSource).digest("hex"),
  solution_source_sha256: createHash("sha256").update(solutionSource).digest("hex"),
  model,
  generated_at: new Date().toISOString(),
  problems: analyzed,
}, null, 2)}\n`, "utf8");
console.log(`Wrote ${analyzed.length} solution-analyzed records to ${outputPath}.`);

async function loadCatalog() {
  const text = await readFile(new URL("../src/catalog-data.js", import.meta.url), "utf8");
  const context = { window: {} };
  vm.runInNewContext(text, context);
  return Array.isArray(context.window.PUTNAM_CATALOG) ? context.window.PUTNAM_CATALOG : [];
}

function parseLabeledChunks(tex, kind) {
  const normalized = String(tex || "").replaceAll("\r\n", "\n");
  const patterns = [
    /(?:^|\n)\s*\\item\s*\[\s*(?:\\textbf\{\s*)?([AB][1-6])\s*\}?\s*\.?\s*\]/gim,
    /(?:^|\n)\s*\\(?:section|subsection|subsubsection|paragraph)\*?\{\s*(?:Problem\s+)?([AB][1-6])\s*\.?\s*\}/gim,
    /(?:^|\n)\s*\\noindent\s*\\textbf\{\s*(?:Problem\s+)?([AB][1-6])\s*\.?\s*\}/gim,
    /(?:^|\n)\s*\{\s*\\bf\s+(?:Problem\s+)?([AB][1-6])\s*\.?\s*\}/gim,
    /(?:^|\n)\s*(?:Problem\s+)?([AB][1-6])\s*[.:]\s+/gim,
  ];
  let matches = [];
  for (const pattern of patterns) {
    const candidate = [...normalized.matchAll(pattern)].map((match) => ({
      label: match[1].toLowerCase(), index: match.index, end: match.index + match[0].length,
    }));
    if (new Set(candidate.map((item) => item.label)).size > new Set(matches.map((item) => item.label)).size) matches = candidate;
  }
  matches.sort((left, right) => left.index - right.index);
  const chunks = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const end = matches[index + 1]?.index ?? normalized.length;
    const raw = normalized.slice(current.end, end);
    const chunk = kind === "problem" ? cleanProblemTex(raw) : cleanSolutionTex(raw);
    if (!chunks.has(current.label) || chunk.length > chunks.get(current.label).length) chunks.set(current.label, chunk);
  }
  return chunks;
}

function cleanProblemTex(value) {
  return String(value || "")
    .replace(/%.*$/gm, "")
    .replace(/\\(?:begin|end)\{(?:enumerate|itemize|problems?)\}/g, "")
    .replace(/\\item\b/g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanSolutionTex(value) {
  return String(value || "")
    .replace(/%.*$/gm, "")
    .replace(/\\(?:begin|end)\{(?:solution|proof|enumerate|itemize)\}/g, "")
    .replace(/\\item\b/g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeStatement(text) {
  let value = String(text || "").trim();
  value = value.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => `\\[ ${math.trim()} \\]`);
  value = value.replace(/\$([^$\n]+?)\$/g, (_, math) => `\\(${math.trim()}\\)`);
  value = value.replace(/\\tfrac|\\dfrac/g, "\\frac");
  value = value.replace(/\\mbox\{/g, "\\text{");
  value = value.replace(/\\begin\{enumerate\}|\\end\{enumerate\}/g, "");
  value = value.replace(/\\item\[\((.*?)\)\]/g, "\n$1 ");
  value = value.replace(/\\item\b/g, "\n• ");
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

async function callModel({ problem, solutionText, model, token }) {
  const body = {
    model,
    temperature: 0.1,
    max_tokens: 3000,
    response_format: {
      type: "json_schema",
      json_schema: { name: "putnam_solution_analysis", strict: true, schema: reviewSchema() },
    },
    messages: [
      {
        role: "system",
        content: "Classify a Putnam solution for a searchable training database. Base every label on the supplied solution, not merely the statement. Paraphrase rather than reproducing the proof. Distinguish reusable problem-solving actions from subject topics. Be precise, evidence-backed, and conservative.",
      },
      {
        role: "user",
        content: `PROBLEM ID: ${problem.id}\nAREA: ${problem.area}\nSTATEMENT:\n${problem.statement}\n\nREFERENCE SOLUTION TEXT:\n${solutionText}\n\nProduce structured metadata. Primary techniques must drive the proof. The architecture should describe the abstract sequence of reasoning. Evidence should identify supporting proof steps without quoting the source. Rate each difficulty dimension from 1 to 10 for a prepared Putnam contestant.`,
      },
    ],
  };

  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-github-api-version": "2026-03-10",
      },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error(`GitHub Models returned no content for ${problem.id}.`);
      return JSON.parse(content);
    }
    const detail = await response.text();
    lastError = new Error(`GitHub Models ${response.status}: ${detail.slice(0, 500)}`);
    if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw lastError;
    await sleep(2500 * 2 ** attempt);
  }
  throw lastError;
}

function finalizeRecord({ problem, solutionText, analysis, model }) {
  const prior = { 1: 2.5, 2: 4, 3: 5.5, 4: 6.5, 5: 7.5, 6: 8.5 }[Number(problem.number)];
  const proofBased = 0.45 * analysis.difficulty_insight
    + 0.20 * analysis.difficulty_technical
    + 0.15 * analysis.difficulty_prerequisite
    + 0.20 * analysis.difficulty_proof;
  const primary = unique(analysis.primary_techniques);
  const secondary = unique(analysis.secondary_techniques);
  return {
    id: problem.id,
    topics: unique(analysis.topics),
    concepts: unique(analysis.concepts),
    primary_techniques: primary,
    secondary_techniques: secondary,
    techniques: unique([...primary, ...secondary]),
    solution_archetypes: unique(analysis.solution_archetypes),
    prerequisites: unique(analysis.prerequisites),
    key_observation: analysis.key_observation.trim(),
    solution_architecture: analysis.solution_architecture.trim(),
    technique_evidence: analysis.technique_evidence.map((item) => ({ name: item.name.trim(), role: item.role, evidence: item.evidence.trim() })),
    common_false_starts: unique(analysis.common_false_starts),
    difficulty_overall: round1(0.65 * proofBased + 0.35 * prior),
    difficulty_insight: round1(analysis.difficulty_insight),
    difficulty_technical: round1(analysis.difficulty_technical),
    difficulty_prerequisite: round1(analysis.difficulty_prerequisite),
    difficulty_proof: round1(analysis.difficulty_proof),
    difficulty_confidence: round2(Math.min(0.84, Math.max(0.62, analysis.confidence))),
    classification_status: `solution_analyzed_${year}`,
    review_status: "solution_analyzed",
    review_year: year,
    solution_source_url: `https://kskedlaya.org/putnam-archive/${year}s.tex`,
    difficulty_method: "solution_analysis_plus_exam_position_prior",
    analysis_model: model,
    solution_source_sha256: createHash("sha256").update(solutionText).digest("hex"),
  };
}

function reviewSchema() {
  const stringArray = (minimum, maximum) => ({ type: "array", minItems: minimum, maxItems: maximum, items: { type: "string", minLength: 2, maxLength: 140 } });
  const rating = { type: "number", minimum: 1, maximum: 10 };
  return {
    type: "object", additionalProperties: false,
    required: ["topics", "concepts", "primary_techniques", "secondary_techniques", "solution_archetypes", "prerequisites", "key_observation", "solution_architecture", "technique_evidence", "common_false_starts", "difficulty_insight", "difficulty_technical", "difficulty_prerequisite", "difficulty_proof", "confidence"],
    properties: {
      topics: stringArray(1, 6), concepts: stringArray(2, 8), primary_techniques: stringArray(2, 5), secondary_techniques: stringArray(1, 6), solution_archetypes: stringArray(1, 3), prerequisites: stringArray(1, 7),
      key_observation: { type: "string", minLength: 80, maxLength: 700 },
      solution_architecture: { type: "string", minLength: 120, maxLength: 1000 },
      technique_evidence: {
        type: "array", minItems: 2, maxItems: 6,
        items: {
          type: "object", additionalProperties: false, required: ["name", "role", "evidence"],
          properties: { name: { type: "string", minLength: 2, maxLength: 140 }, role: { type: "string", enum: ["primary", "secondary"] }, evidence: { type: "string", minLength: 40, maxLength: 500 } },
        },
      },
      common_false_starts: stringArray(2, 5),
      difficulty_insight: rating, difficulty_technical: rating, difficulty_prerequisite: rating, difficulty_proof: rating,
      confidence: { type: "number", minimum: 0.5, maximum: 0.95 },
    },
  };
}

function validateRecord(record, id) {
  if (record.id !== id) throw new Error(`Mismatched record id: expected ${id}.`);
  for (const key of ["topics", "concepts", "primary_techniques", "secondary_techniques", "techniques", "solution_archetypes", "prerequisites", "technique_evidence", "common_false_starts"]) {
    if (!Array.isArray(record[key]) || !record[key].length) throw new Error(`${id} has invalid ${key}.`);
  }
  if (record.primary_techniques.length < 2 || record.technique_evidence.length < 2) throw new Error(`${id} lacks technique evidence.`);
  if (record.key_observation.length < 80 || record.solution_architecture.length < 120) throw new Error(`${id} lacks substantive solution metadata.`);
  for (const key of ["difficulty_overall", "difficulty_insight", "difficulty_technical", "difficulty_prerequisite", "difficulty_proof"]) {
    if (!Number.isFinite(record[key]) || record[key] < 1 || record[key] > 10) throw new Error(`${id} has invalid ${key}.`);
  }
}

function unique(values) { return [...new Set((Array.isArray(values) ? values : []).map((item) => String(item).trim()).filter(Boolean))]; }
function round1(value) { return Math.round(Number(value) * 10) / 10; }
function round2(value) { return Math.round(Number(value) * 100) / 100; }
function sleep(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
