const STATIC_PUTNAM_CATALOG = Array.isArray(window.PUTNAM_CATALOG) ? window.PUTNAM_CATALOG : [];
const PUTNAM_CATALOG_META = window.PUTNAM_CATALOG_META || {};
const CATALOG_PAGE_SIZE = 48;
const CATALOG_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "find", "for", "from", "give", "in", "is", "it",
  "me", "of", "on", "or", "problem", "problems", "show", "similar", "that", "the", "to", "use", "using", "with",
]);
const CATALOG_SYNONYMS = new Map([
  ["invariant", ["invariant", "preserved quantity", "monovariant"]],
  ["descent", ["descent", "minimal counterexample", "smaller solution"]],
  ["extremal", ["extremal", "smallest", "largest", "minimum", "maximum"]],
  ["counting", ["double counting", "bijection", "counting", "inclusion-exclusion"]],
  ["recurrence", ["recurrence", "recursive", "recursion"]],
  ["probability", ["probability", "expectation", "random", "symmetry"]],
  ["number theory", ["number theory", "divisibility", "modular arithmetic", "congruences", "primes"]],
  ["calculus", ["calculus", "derivative", "integral", "continuity", "limit"]],
  ["linear algebra", ["linear algebra", "matrix", "determinant", "vectors"]],
]);

Object.assign(state, {
  catalog: [],
  catalogTotalMatches: 0,
  catalogReference: null,
  catalogReferenceData: null,
  catalogSearch: "",
  catalogArea: "",
  catalogYear: "",
  catalogMinDifficulty: "",
  catalogMaxDifficulty: "",
  catalogJournalMap: null,
  catalogLimit: CATALOG_PAGE_SIZE,
});

const baseRenderShell = renderShell;
renderShell = function renderShellWithCatalog() {
  baseRenderShell();
  const navigation = document.querySelector(".main-nav");
  const analyticsButton = navigation?.querySelector('[data-view="analytics"]');
  if (navigation && analyticsButton && !navigation.querySelector('[data-view="catalog"]')) {
    analyticsButton.insertAdjacentHTML("beforebegin", navButton("catalog", "Problem finder", iconSearch()));
  }
};

const baseNavigate = navigate;
navigate = async function navigateWithCatalog(view, options = {}) {
  if (view !== "catalog") return baseNavigate(view, options);
  state.view = view;
  state.solutionRevealed = false;
  setActiveNavigation(view);
  const viewElement = document.querySelector("#view");
  if (!viewElement) return;
  viewElement.innerHTML = loadingState();
  try {
    await loadCatalog();
    renderCatalog();
  } catch (caught) {
    viewElement.innerHTML = errorState(caught.message);
  }
};

const baseHandleGlobalClick = handleGlobalClick;
handleGlobalClick = async function handleGlobalClickWithCatalog(event) {
  const actionElement = event.target.closest("[data-action]");
  const action = actionElement?.dataset.action;

  if (action === "import-catalog") {
    event.preventDefault();
    const id = actionElement.closest("[data-catalog-id]")?.dataset.catalogId;
    const problem = STATIC_PUTNAM_CATALOG.find((item) => item.id === id);
    if (!problem || problem.statement_available === false) return;

    const existingId = findJournalProblemId(problem);
    if (existingId) {
      await navigate("attempt", { id: existingId });
      return;
    }

    actionElement.disabled = true;
    actionElement.textContent = "Adding…";
    try {
      const formData = new FormData();
      formData.append("title", problem.title);
      formData.append("source", problem.source);
      formData.append("level", `${problem.session}${problem.number}`);
      formData.append("area", problem.area);
      formData.append("statement", problem.statement);
      formData.append("topics", JSON.stringify(problem.topics || []));
      formData.append("successfulTechniques", JSON.stringify(problem.techniques || []));
      formData.append("notes", `Imported from Problem Finder · estimated difficulty ${problem.difficulty_overall}/10 · ${problem.classification_status}`);
      formData.append("initialOutcome", "");
      const result = await api("/api/problems", { method: "POST", body: formData });
      rememberJournalProblem(problem, result.problem.id);
      showToast("Problem added to your journal.", "success");
      await navigate("attempt", { id: result.problem.id });
    } catch (caught) {
      actionElement.disabled = false;
      actionElement.textContent = "Add to journal";
      showToast(caught.message, "error");
    }
    return;
  }

  if (action === "find-similar") {
    event.preventDefault();
    state.catalogReference = actionElement.closest("[data-catalog-id]")?.dataset.catalogId || null;
    state.catalogSearch = "";
    state.catalogLimit = CATALOG_PAGE_SIZE;
    await navigate("catalog");
    return;
  }

  if (action === "clear-catalog-similarity") {
    event.preventDefault();
    state.catalogReference = null;
    state.catalogReferenceData = null;
    state.catalogLimit = CATALOG_PAGE_SIZE;
    await navigate("catalog");
    return;
  }

  if (action === "load-more-catalog") {
    event.preventDefault();
    state.catalogLimit += CATALOG_PAGE_SIZE;
    renderCatalog();
    return;
  }

  return baseHandleGlobalClick(event);
};

function rememberJournalProblem(problem, id) {
  state.catalogJournalMap ||= new Map();
  state.catalogJournalMap.set(problem.source.toLowerCase(), id);
  state.catalogJournalMap.set(problem.title.toLowerCase(), id);
}

function findJournalProblemId(problem) {
  return state.catalogJournalMap?.get(problem.source.toLowerCase())
    || state.catalogJournalMap?.get(problem.title.toLowerCase())
    || null;
}

async function ensureCatalogJournalMap() {
  if (state.catalogJournalMap) return;
  state.catalogJournalMap = new Map();
  try {
    const journal = await api("/api/problems");
    for (const problem of journal.problems || []) {
      if (problem.source) state.catalogJournalMap.set(problem.source.toLowerCase(), problem.id);
      if (problem.title) state.catalogJournalMap.set(problem.title.toLowerCase(), problem.id);
    }
  } catch {
    // The catalog remains searchable even if journal duplicate detection is unavailable.
  }
}

async function loadCatalog() {
  await ensureCatalogJournalMap();
  const reference = state.catalogReference
    ? STATIC_PUTNAM_CATALOG.find((problem) => problem.id === state.catalogReference)
    : null;
  state.catalogReferenceData = reference ? {
    id: reference.id,
    title: reference.title,
    difficulty_overall: reference.difficulty_overall,
    topics: reference.topics || [],
    techniques: reference.techniques || [],
  } : null;

  const ranked = rankCatalogProblems(STATIC_PUTNAM_CATALOG, reference);
  state.catalogTotalMatches = ranked.length;
  state.catalog = ranked.map((problem) => {
    const journalProblemId = findJournalProblemId(problem);
    return { ...problem, imported: Boolean(journalProblemId), journal_problem_id: journalProblemId };
  });
}

function interpretCatalogSearch(value) {
  const normalized = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = [...new Set(normalized
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !CATALOG_STOP_WORDS.has(token)))];
  const phrases = [];
  for (const [canonical, variants] of CATALOG_SYNONYMS) {
    if (variants.some((variant) => normalized.includes(variant))) phrases.push(canonical);
  }
  return { normalized, tokens, phrases };
}

function rankCatalogProblems(problems, reference) {
  const query = interpretCatalogSearch(state.catalogSearch);
  const min = state.catalogMinDifficulty === "" ? null : Number(state.catalogMinDifficulty);
  const max = state.catalogMaxDifficulty === "" ? null : Number(state.catalogMaxDifficulty);
  const area = state.catalogArea.toLowerCase();
  const year = state.catalogYear === "" ? null : Number(state.catalogYear);

  return problems
    .filter((problem) => !area || problem.area.toLowerCase() === area)
    .filter((problem) => year === null || Number(problem.year) === year)
    .filter((problem) => min === null || Number(problem.difficulty_overall) >= min)
    .filter((problem) => max === null || Number(problem.difficulty_overall) <= max)
    .filter((problem) => !reference || problem.id !== reference.id)
    .map((problem) => scoreCatalogProblem(problem, query, reference))
    .filter((problem) => !query.normalized || problem.search_score > 0 || reference)
    .sort((left, right) => {
      if (query.normalized || reference) {
        const scoreDifference = right.search_score - left.search_score;
        if (scoreDifference) return scoreDifference;
      }
      return right.year - left.year
        || left.session.localeCompare(right.session)
        || left.number - right.number;
    });
}

function scoreCatalogProblem(problem, query, reference) {
  const techniques = problem.techniques || [];
  const topics = problem.topics || [];
  const concepts = problem.concepts || [];
  const techniqueText = techniques.join(" ").toLowerCase();
  const topicText = topics.join(" ").toLowerCase();
  const conceptText = concepts.join(" ").toLowerCase();
  const fullText = [
    problem.title,
    problem.source,
    problem.statement,
    problem.area,
    topicText,
    techniqueText,
    conceptText,
    problem.solution_architecture,
    problem.key_observation,
  ].join(" ").toLowerCase();

  let score = 0;
  const reasons = [];

  for (const token of query.tokens) {
    if (fullText.includes(token)) score += 4;
    if (techniqueText.includes(token)) score += 10;
    if (topicText.includes(token)) score += 7;
    if (conceptText.includes(token)) score += 6;
    if (String(problem.year) === token) score += 25;
  }

  for (const phrase of query.phrases) {
    const variants = CATALOG_SYNONYMS.get(phrase) || [phrase];
    if (variants.some((variant) => techniqueText.includes(variant) || fullText.includes(variant))) {
      score += 18;
      reasons.push(`Uses ${phrase}`);
    }
  }

  if (reference) {
    const sharedTechniques = techniques.filter((item) => (reference.techniques || []).includes(item));
    const sharedTopics = topics.filter((item) => (reference.topics || []).includes(item));
    const difficultyGap = Math.abs(Number(problem.difficulty_overall) - Number(reference.difficulty_overall));
    score += sharedTechniques.length * 38 + sharedTopics.length * 22 + Math.max(0, 22 - difficultyGap * 4);
    if (sharedTechniques.length) reasons.push(`Shared technique: ${sharedTechniques[0]}`);
    if (sharedTopics.length) reasons.push(`Shared topic: ${sharedTopics[0]}`);
    if (difficultyGap <= 1) reasons.push("Very similar difficulty");
    else if (difficultyGap <= 2) reasons.push("Nearby difficulty");
  } else if (query.tokens.length) {
    const technique = techniques.find((item) => query.tokens.some((token) => item.toLowerCase().includes(token)));
    const topic = topics.find((item) => query.tokens.some((token) => item.toLowerCase().includes(token)));
    if (technique) reasons.push(`Technique: ${technique}`);
    if (topic) reasons.push(`Topic: ${topic}`);
  } else {
    score = 1;
  }

  return { ...problem, search_score: score, match_reasons: [...new Set(reasons)].slice(0, 3) };
}

function renderCatalog() {
  document.title = "Problem Finder · Putnam Journal";
  const view = document.querySelector("#view");
  const reference = state.catalogReferenceData;
  const visibleProblems = state.catalog.slice(0, state.catalogLimit);
  const remaining = Math.max(0, state.catalog.length - visibleProblems.length);
  const years = [...new Set(STATIC_PUTNAM_CATALOG.map((problem) => Number(problem.year)))].sort((a, b) => b - a);
  const total = Number(PUTNAM_CATALOG_META.total || STATIC_PUTNAM_CATALOG.length);
  const statements = Number(PUTNAM_CATALOG_META.full_statement_count || STATIC_PUTNAM_CATALOG.filter((problem) => problem.statement_available !== false).length);
  const pending = Number(PUTNAM_CATALOG_META.indexed_statement_pending_count || Math.max(0, total - statements));

  view.innerHTML = `
    <section class="page-header catalog-header">
      <div>
        <p class="eyebrow">${escapeHtml(`${PUTNAM_CATALOG_META.first_year || 1962}–${PUTNAM_CATALOG_META.last_year || 2025} archive`)}</p>
        <h1>Problem Finder</h1>
        <p>Search ${total} indexed Putnam problems by statement, topic, technique, mathematical structure, year, and difficulty. Newer years are shown first and receive classification priority.</p>
        <p class="catalog-source-note">${statements} full statements · ${pending} indexed statements pending · detailed classification prioritized from ${PUTNAM_CATALOG_META.recent_priority_start_year || 2017} onward</p>
      </div>
      <div class="catalog-count"><strong>${state.catalogTotalMatches}</strong><span>matches</span></div>
    </section>

    ${reference ? `<section class="similarity-banner panel"><div><p class="eyebrow">Similarity search</p><strong>Finding problems like ${escapeHtml(reference.title)}</strong><span>Difficulty ${formatCatalogDifficulty(reference.difficulty_overall)} · ${(reference.techniques || []).slice(0, 2).map(escapeHtml).join(" · ")}</span></div><button class="button secondary small" data-action="clear-catalog-similarity">Clear</button></section>` : ""}

    <section class="catalog-search-panel panel">
      <label class="catalog-query">${iconSearch()}<input id="catalog-search" value="${escapeAttribute(state.catalogSearch)}" placeholder="e.g. recent number theory using descent or invariants" /></label>
      <div class="catalog-filter-grid catalog-filter-grid-expanded">
        <label class="filter-field"><span>Area</span><select id="catalog-area"><option value="">All areas</option>${AREAS.map((item) => `<option value="${escapeAttribute(item)}" ${state.catalogArea === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></label>
        <label class="filter-field"><span>Year</span><select id="catalog-year"><option value="">All years · newest first</option>${years.map((item) => `<option value="${item}" ${String(item) === state.catalogYear ? "selected" : ""}>${item}</option>`).join("")}</select></label>
        <label class="filter-field"><span>Minimum difficulty</span><input id="catalog-min" type="number" min="1" max="10" step="0.5" value="${escapeAttribute(state.catalogMinDifficulty)}" placeholder="Any" /></label>
        <label class="filter-field"><span>Maximum difficulty</span><input id="catalog-max" type="number" min="1" max="10" step="0.5" value="${escapeAttribute(state.catalogMaxDifficulty)}" placeholder="Any" /></label>
      </div>
    </section>

    <section class="catalog-results">
      ${visibleProblems.length ? visibleProblems.map(catalogCard).join("") : `<div class="empty-state"><h3>No matching problems</h3><p>Broaden the search, area, year, or difficulty range.</p></div>`}
    </section>
    ${remaining ? `<div class="catalog-load-more"><button class="button secondary large" data-action="load-more-catalog">Load ${Math.min(CATALOG_PAGE_SIZE, remaining)} more <span>(${remaining} remaining)</span></button></div>` : ""}`;

  const searchInput = document.querySelector("#catalog-search");
  let debounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      state.catalogSearch = searchInput.value.trim();
      state.catalogReference = null;
      state.catalogLimit = CATALOG_PAGE_SIZE;
      await loadCatalog();
      renderCatalog();
    }, 300);
  });

  for (const [selector, key] of [
    ["#catalog-area", "catalogArea"],
    ["#catalog-year", "catalogYear"],
    ["#catalog-min", "catalogMinDifficulty"],
    ["#catalog-max", "catalogMaxDifficulty"],
  ]) {
    document.querySelector(selector).addEventListener("change", async (event) => {
      state[key] = event.target.value;
      state.catalogLimit = CATALOG_PAGE_SIZE;
      await loadCatalog();
      renderCatalog();
    });
  }
}

function catalogCard(problem) {
  const classification = catalogClassificationLabel(problem.classification_status);
  const available = problem.statement_available !== false;
  const topicList = problem.topics || [];
  const techniqueList = problem.techniques || [];
  return `<article class="catalog-card ${available ? "" : "catalog-card-pending"}" data-catalog-id="${escapeAttribute(problem.id)}">
    <div class="catalog-card-top">
      <div>
        <div class="card-meta"><span class="level-pill">${escapeHtml(problem.session + problem.number)}</span><span>${escapeHtml(problem.area)}</span><span>${problem.year}</span><span class="catalog-classification">${escapeHtml(classification)}</span></div>
        <h2>${escapeHtml(problem.title)}</h2>
      </div>
      <div class="difficulty-badge"><strong>${formatCatalogDifficulty(problem.difficulty_overall)}</strong><span>/10</span></div>
    </div>
    <p class="catalog-statement">${escapeHtml(problem.statement)}</p>
    ${(problem.match_reasons || []).length ? `<div class="match-reasons">${problem.match_reasons.map((reason) => `<span>✓ ${escapeHtml(reason)}</span>`).join("")}</div>` : ""}
    <div class="catalog-taxonomy">
      <div><small>Topics</small><div class="tag-row">${topicList.length ? topicList.slice(0, 5).map(topicTag).join("") : `<span class="muted">Classification pending</span>`}</div></div>
      <div><small>Solution techniques</small><div class="tag-row">${techniqueList.length ? techniqueList.slice(0, 5).map(techniqueTag).join("") : `<span class="muted">Classification pending</span>`}</div></div>
    </div>
    <details class="difficulty-details"><summary>Difficulty breakdown and prerequisites</summary><div class="difficulty-grid">${catalogDifficultyMetric("Insight", problem.difficulty_insight)}${catalogDifficultyMetric("Technical", problem.difficulty_technical)}${catalogDifficultyMetric("Prerequisites", problem.difficulty_prerequisite)}${catalogDifficultyMetric("Proof writing", problem.difficulty_proof)}</div><p><strong>Prerequisites:</strong> ${escapeHtml((problem.prerequisites || []).join(", ") || "Not yet classified")}</p></details>
    <div class="catalog-actions">
      ${available ? `<button class="button secondary" data-action="find-similar">Find similar</button>` : ""}
      ${problem.imported
        ? `<button class="button primary" data-action="open-problem" data-problem-id="${escapeAttribute(problem.journal_problem_id)}">Open in journal</button>`
        : available
          ? `<button class="button primary" data-action="import-catalog">Add to journal</button>`
          : `<a class="button secondary" href="${escapeAttribute(problem.source_url)}" target="_blank" rel="noopener noreferrer">Open archive source</a>`}
    </div>
  </article>`;
}

function catalogClassificationLabel(status) {
  if (status === "recent_priority_machine_classified") return "Recent priority";
  if (status === "indexed_statement_pending") return "Statement pending";
  if (status === "reviewed_seed") return "Reviewed";
  return "Initial classification";
}

function catalogDifficultyMetric(label, value) {
  const width = Math.max(0, Math.min(100, Number(value || 0) * 10));
  return `<div class="difficulty-metric"><span><strong>${escapeHtml(label)}</strong><em>${formatCatalogDifficulty(value)}</em></span><i><b style="width:${width}%"></b></i></div>`;
}

function formatCatalogDifficulty(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(number % 1 ? 1 : 0) : "—";
}
