const baseScoreCatalogProblem = scoreCatalogProblem;
const baseCatalogCard = catalogCard;
const baseCatalogClassificationLabel = catalogClassificationLabel;

scoreCatalogProblem = function scoreCatalogProblemWithReviewedSolutions(problem, query, reference) {
  const result = baseScoreCatalogProblem(problem, query, reference);
  if (!reference) return result;

  const structured = reviewedSimilarity(problem, reference);
  result.search_score += structured.score;
  result.similarity_percent = structured.percent;
  result.match_reasons = [...new Set([...structured.reasons, ...(result.match_reasons || [])])].slice(0, 4);
  result.similarity_components = structured.components;
  return result;
};

catalogClassificationLabel = function reviewedCatalogClassificationLabel(status) {
  if (status === "solution_reviewed_2025") return "Solution reviewed";
  return baseCatalogClassificationLabel(status);
};

catalogCard = function reviewedCatalogCard(problem) {
  if (problem.review_status !== "solution_reviewed") return baseCatalogCard(problem);

  const available = problem.statement_available !== false;
  const topicList = problem.topics || [];
  const primaryTechniques = problem.primary_techniques || [];
  const secondaryTechniques = problem.secondary_techniques || [];
  const stats = problem.score_stats || {};
  const classification = catalogClassificationLabel(problem.classification_status);
  const similarity = Number.isFinite(problem.similarity_percent)
    ? `<span class="reviewed-similarity-score">${problem.similarity_percent}% method match</span>`
    : "";

  return `<article class="catalog-card catalog-card-reviewed" data-catalog-id="${escapeAttribute(problem.id)}">
    <div class="catalog-card-top">
      <div>
        <div class="card-meta">
          <span class="level-pill">${escapeHtml(problem.session + problem.number)}</span>
          <span>${escapeHtml(problem.area)}</span>
          <span>${problem.year}</span>
          <span class="catalog-classification reviewed">${escapeHtml(classification)}</span>
          ${similarity}
        </div>
        <h2>${escapeHtml(problem.title)}</h2>
      </div>
      <div class="difficulty-badge"><strong>${formatCatalogDifficulty(problem.difficulty_overall)}</strong><span>/10</span></div>
    </div>

    <p class="catalog-statement">${escapeHtml(problem.statement)}</p>
    ${(problem.match_reasons || []).length ? `<div class="match-reasons">${problem.match_reasons.map((reason) => `<span>✓ ${escapeHtml(reason)}</span>`).join("")}</div>` : ""}

    <div class="catalog-taxonomy reviewed-taxonomy">
      <div><small>Topics</small><div class="tag-row">${topicList.slice(0, 6).map(topicTag).join("")}</div></div>
      <div><small>Primary solution techniques</small><div class="tag-row">${primaryTechniques.map(techniqueTag).join("")}</div></div>
    </div>

    <div class="reviewed-key-insight">
      <small>Key insight</small>
      <p>${escapeHtml(problem.key_observation || "")}</p>
    </div>

    <details class="reviewed-solution-map">
      <summary>Reviewed solution map and evidence</summary>
      <div class="reviewed-solution-content">
        <section>
          <h3>Solution architecture</h3>
          <p>${escapeHtml(problem.solution_architecture || "")}</p>
        </section>
        <section>
          <h3>Secondary techniques</h3>
          <div class="tag-row">${secondaryTechniques.length ? secondaryTechniques.map(techniqueTag).join("") : `<span class="muted">None recorded</span>`}</div>
        </section>
        <section>
          <h3>Why the technique labels apply</h3>
          <div class="technique-evidence-list">${(problem.technique_evidence || []).map((item) => `<article><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.role)}</span><p>${escapeHtml(item.evidence)}</p></article>`).join("")}</div>
        </section>
        <section>
          <h3>Common false starts</h3>
          <ul>${(problem.common_false_starts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
      </div>
    </details>

    <details class="difficulty-details reviewed-difficulty-details">
      <summary>Difficulty evidence and prerequisites</summary>
      <div class="difficulty-grid">
        ${catalogDifficultyMetric("Insight", problem.difficulty_insight)}
        ${catalogDifficultyMetric("Technical", problem.difficulty_technical)}
        ${catalogDifficultyMetric("Prerequisites", problem.difficulty_prerequisite)}
        ${catalogDifficultyMetric("Proof writing", problem.difficulty_proof)}
      </div>
      <p><strong>Prerequisites:</strong> ${escapeHtml((problem.prerequisites || []).join(", ") || "None listed")}</p>
      ${stats.cohort ? `<div class="score-evidence-grid">
        <span><strong>${stats.mean_score.toFixed(2)}</strong><small>mean /10 among top ${stats.cohort}</small></span>
        <span><strong>${stats.full_credit}</strong><small>full-credit solutions</small></span>
        <span><strong>${stats.submitted}</strong><small>submitted the problem</small></span>
        <span><strong>${Math.round(stats.nonzero / stats.cohort * 100)}%</strong><small>earned nonzero credit</small></span>
      </div>` : ""}
      <p class="difficulty-method-copy">Overall difficulty combines the official score distribution with the exam-position prior; the four component ratings are then reviewed against the official proof.</p>
    </details>

    <div class="catalog-actions">
      <a class="text-button official-solution-link" href="${escapeAttribute(problem.solution_source_url || "#")}" target="_blank" rel="noopener noreferrer">Official solution source ↗</a>
      <button class="button secondary" data-action="find-similar">Find similar</button>
      ${problem.imported
        ? `<button class="button primary" data-action="open-problem" data-problem-id="${escapeAttribute(problem.journal_problem_id)}">Open in journal</button>`
        : available
          ? `<button class="button primary" data-action="import-catalog">Add to journal</button>`
          : ""}
    </div>
  </article>`;
};

function reviewedSimilarity(problem, reference) {
  const primary = jaccardReviewed(problem.primary_techniques, reference.primary_techniques);
  const techniques = jaccardReviewed(problem.techniques, reference.techniques);
  const concepts = jaccardReviewed(problem.concepts, reference.concepts);
  const topics = jaccardReviewed(problem.topics, reference.topics);
  const architecture = tokenSimilarityReviewed(
    [problem.solution_archetypes, problem.solution_architecture, problem.key_observation].flat().join(" "),
    [reference.solution_archetypes, reference.solution_architecture, reference.key_observation].flat().join(" "),
  );
  const difficulty = difficultySimilarityReviewed(problem, reference);
  const sameArea = String(problem.area) === String(reference.area) ? 1 : 0;

  const components = {
    primary_techniques: primary,
    all_techniques: techniques,
    solution_architecture: architecture,
    concepts,
    topics,
    difficulty,
    same_area: sameArea,
  };
  const score = primary * 70
    + techniques * 40
    + architecture * 45
    + concepts * 20
    + topics * 15
    + difficulty * 25
    + sameArea * 5;
  const percent = Math.max(0, Math.min(99, Math.round(score / 220 * 100)));

  const reasons = [];
  const sharedPrimary = sharedReviewed(problem.primary_techniques, reference.primary_techniques);
  const sharedTechniques = sharedReviewed(problem.techniques, reference.techniques);
  const sharedArchetype = sharedReviewed(problem.solution_archetypes, reference.solution_archetypes);
  if (sharedPrimary.length) reasons.push(`Same primary technique: ${sharedPrimary[0]}`);
  else if (sharedTechniques.length) reasons.push(`Shared technique: ${sharedTechniques[0]}`);
  if (sharedArchetype.length) reasons.push(`Same proof architecture: ${sharedArchetype[0]}`);
  else if (architecture >= 0.25) reasons.push("Related solution architecture");
  if (difficulty >= 0.85) reasons.push("Very similar difficulty profile");
  else if (difficulty >= 0.65) reasons.push("Nearby difficulty profile");
  const sharedConcepts = sharedReviewed(problem.concepts, reference.concepts);
  if (sharedConcepts.length) reasons.push(`Shared concept: ${sharedConcepts[0]}`);

  return { score, percent, reasons, components };
}

function normalizeReviewed(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function reviewedValues(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function sharedReviewed(left, right) {
  const rightSet = new Set(reviewedValues(right).map(normalizeReviewed));
  return reviewedValues(left).filter((item) => rightSet.has(normalizeReviewed(item)));
}

function jaccardReviewed(left, right) {
  const a = new Set(reviewedValues(left).map(normalizeReviewed));
  const b = new Set(reviewedValues(right).map(normalizeReviewed));
  if (!a.size && !b.size) return 0;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return overlap / (a.size + b.size - overlap || 1);
}

function tokenSimilarityReviewed(left, right) {
  const stop = new Set(["a", "an", "and", "the", "to", "of", "in", "by", "for", "with", "then", "that", "is", "are", "from"]);
  const tokens = (value) => new Set(normalizeReviewed(value).split(/\s+/).filter((item) => item.length > 2 && !stop.has(item)));
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return overlap / Math.sqrt(a.size * b.size);
}

function difficultySimilarityReviewed(left, right) {
  const fields = ["difficulty_overall", "difficulty_insight", "difficulty_technical", "difficulty_prerequisite", "difficulty_proof"];
  const gaps = fields.map((field) => Math.abs(Number(left[field] || 0) - Number(right[field] || 0)));
  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  return Math.max(0, 1 - averageGap / 5);
}
