const STATIC_PUTNAM_CATALOG = [{"id":"putnam_1962_a1","title":"1962 Putnam A1","source":"1962 William Lowell Putnam Mathematical Competition A1","statement":"Given five points in a plane, no three of which lie on a straight line, show that some four of these points form the vertices of a convex quadrilateral.","year":1962,"session":"A","number":1,"area":"Geometry","topics":["Geometry","Combinatorial geometry"],"concepts":["Convex hull","Convex quadrilateral","General position"],"techniques":["Extremal principle","Case analysis","Geometric construction"],"prerequisites":["Elementary Euclidean geometry","Convexity basics"],"difficulty_overall":2.5,"difficulty_insight":3.0,"difficulty_technical":1.5,"difficulty_prerequisite":1.5,"difficulty_proof":2.5,"difficulty_confidence":0.65,"key_observation":"Either one point lies inside the quadrilateral formed by four others, or four points appear as vertices of the convex hull.","solution_architecture":"Pass to the convex hull of the five points, split by the number of hull vertices, and select four suitable vertices.","common_false_starts":["Trying to order the points by coordinates","Assuming all five points are already in convex position"],"classification_status":"reviewed_seed"},{"id":"putnam_1962_a2","title":"1962 Putnam A2","source":"1962 William Lowell Putnam Mathematical Competition A2","statement":"Find every real-valued function f whose domain is an interval I (finite or infinite) having 0 as a left-hand endpoint, such that for every positive x in I the average of f over [0,x] equals the geometric mean of f(0) and f(x).","year":1962,"session":"A","number":2,"area":"Analysis","topics":["Real analysis","Functional equations","Differential equations"],"concepts":["Integral averages","Differentiation under an identity","Separable differential equation"],"techniques":["Differentiate a functional identity","Normalize constants","Solve an induced ODE"],"prerequisites":["Fundamental theorem of calculus","Ordinary differential equations","Continuity"],"difficulty_overall":5.0,"difficulty_insight":5.5,"difficulty_technical":4.5,"difficulty_prerequisite":4.0,"difficulty_proof":4.5,"difficulty_confidence":0.65,"key_observation":"After naming the integral F(x), the condition relates F(x)/x to f(x), and differentiating converts the problem into an ODE.","solution_architecture":"Rewrite with an accumulated integral, differentiate, solve the resulting differential equation, and verify the domain and positivity conditions.","common_false_starts":["Guessing only constant solutions","Squaring without checking signs or positivity"],"classification_status":"reviewed_seed"},{"id":"putnam_1962_a3","title":"1962 Putnam A3","source":"1962 William Lowell Putnam Mathematical Competition A3","statement":"Let ABC be a triangle, with P,Q,R on BC,CA,AB respectively such that AQ/QC = BR/RA = CP/PB = k>0. If UVW is the triangle formed by the three cevians AP,BQ,CR, prove that [UVW]/[ABC] = (k-1)^2/(k^2+k+1).","year":1962,"session":"A","number":3,"area":"Geometry","topics":["Geometry","Affine geometry"],"concepts":["Cevians","Area ratios","Barycentric coordinates","Routh-type formula"],"techniques":["Affine normalization","Coordinate geometry","Determinant computation"],"prerequisites":["Triangle area formulas","Solving linear equations","Determinants"],"difficulty_overall":5.5,"difficulty_insight":5.0,"difficulty_technical":6.0,"difficulty_prerequisite":3.5,"difficulty_proof":5.0,"difficulty_confidence":0.6,"key_observation":"Area ratios are invariant under affine transformations, so the triangle may be placed at convenient coordinates.","solution_architecture":"Normalize ABC to a coordinate triangle, compute the three cevian intersections, then take a determinant ratio.","common_false_starts":["Using angle chasing in a purely affine problem","Computing many lengths instead of areas"],"classification_status":"reviewed_seed"},{"id":"putnam_1962_a4","title":"1962 Putnam A4","source":"1962 William Lowell Putnam Mathematical Competition A4","statement":"Assume |f(x)|<=1 and |f''(x)|<=1 for all x on an interval of length at least 2. Show that |f'(x)|<=2 on the interval.","year":1962,"session":"A","number":4,"area":"Analysis","topics":["Real analysis","Inequalities"],"concepts":["Derivative bounds","Taylor theorem","Mean value theorem"],"techniques":["Choose a favorable nearby point","Taylor expansion with remainder","Contradiction by growth"],"prerequisites":["Differentiation","Taylor theorem or mean value theorem"],"difficulty_overall":5.5,"difficulty_insight":6.0,"difficulty_technical":3.5,"difficulty_prerequisite":3.0,"difficulty_proof":4.5,"difficulty_confidence":0.7,"key_observation":"If the derivative were too large, bounded curvature would keep it large long enough to force f to change by more than 2.","solution_architecture":"Select a point one unit away on the available side, apply Taylor's theorem, and combine the bounds on f and f''.","common_false_starts":["Applying the mean value theorem only once","Trying to maximize f' without using the interval-length condition"],"classification_status":"reviewed_seed"},{"id":"putnam_1962_a5","title":"1962 Putnam A5","source":"1962 William Lowell Putnam Mathematical Competition A5","statement":"Evaluate in closed form sum_{k=1}^n binom(n,k) k^2.","year":1962,"session":"A","number":5,"area":"Combinatorics","topics":["Combinatorics","Algebra"],"concepts":["Binomial coefficients","Binomial moments","Generating functions"],"techniques":["Differentiate a generating function","Rewrite k^2 as k(k-1)+k","Double counting"],"prerequisites":["Binomial theorem","Basic differentiation"],"difficulty_overall":3.0,"difficulty_insight":3.5,"difficulty_technical":2.0,"difficulty_prerequisite":2.0,"difficulty_proof":2.5,"difficulty_confidence":0.75,"key_observation":"The factors k and k(k-1) arise from the first and second derivatives of (1+x)^n.","solution_architecture":"Split k^2, evaluate the two standard differentiated binomial sums at x=1, and simplify.","common_false_starts":["Expanding individual binomial coefficients","Attempting induction before looking for a generating function"],"classification_status":"reviewed_seed"}];

Object.assign(state, {
  catalog: [],
  catalogReference: null,
  catalogReferenceData: null,
  catalogSearch: "",
  catalogArea: "",
  catalogMinDifficulty: "",
  catalogMaxDifficulty: "",
  catalogJournalMap: null,
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
    if (!problem) return;
    actionElement.disabled = true;
    actionElement.textContent = "Adding…";
    try {
      const formData = new FormData();
      formData.append("title", problem.title);
      formData.append("source", problem.source);
      formData.append("level", `${problem.session}${problem.number}`);
      formData.append("area", problem.area);
      formData.append("statement", problem.statement);
      formData.append("topics", JSON.stringify(problem.topics));
      formData.append("successfulTechniques", JSON.stringify(problem.techniques));
      formData.append("notes", `Imported from Problem Finder · estimated difficulty ${problem.difficulty_overall}/10`);
      formData.append("initialOutcome", "");
      const result = await api("/api/problems", { method: "POST", body: formData });
      state.catalogJournalMap ||= new Map();
      state.catalogJournalMap.set(problem.source.toLowerCase(), result.problem.id);
      state.catalogJournalMap.set(problem.title.toLowerCase(), result.problem.id);
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
    await navigate("catalog");
    return;
  }

  if (action === "clear-catalog-similarity") {
    event.preventDefault();
    state.catalogReference = null;
    state.catalogReferenceData = null;
    await navigate("catalog");
    return;
  }

  return baseHandleGlobalClick(event);
};

async function loadCatalog() {
  if (!state.catalogJournalMap) {
    state.catalogJournalMap = new Map();
    try {
      const journal = await api("/api/problems");
      for (const problem of journal.problems || []) {
        if (problem.source) state.catalogJournalMap.set(problem.source.toLowerCase(), problem.id);
        if (problem.title) state.catalogJournalMap.set(problem.title.toLowerCase(), problem.id);
      }
    } catch {}
  }

  const reference = state.catalogReference
    ? STATIC_PUTNAM_CATALOG.find((problem) => problem.id === state.catalogReference)
    : null;
  state.catalogReferenceData = reference ? {
    id: reference.id,
    title: reference.title,
    difficulty_overall: reference.difficulty_overall,
    topics: reference.topics,
    techniques: reference.techniques,
  } : null;

  state.catalog = rankCatalogProblems(STATIC_PUTNAM_CATALOG, reference).map((problem) => {
    const journalProblemId = state.catalogJournalMap.get(problem.source.toLowerCase())
      || state.catalogJournalMap.get(problem.title.toLowerCase())
      || null;
    return { ...problem, imported: Boolean(journalProblemId), journal_problem_id: journalProblemId };
  });
}

function rankCatalogProblems(problems, reference) {
  const query = state.catalogSearch.toLowerCase().trim();
  const tokens = query.split(/[^a-z0-9]+/).filter((token) => token.length > 1);
  const min = state.catalogMinDifficulty === "" ? null : Number(state.catalogMinDifficulty);
  const max = state.catalogMaxDifficulty === "" ? null : Number(state.catalogMaxDifficulty);
  const area = state.catalogArea.toLowerCase();

  return problems
    .filter((problem) => !area || problem.area.toLowerCase() === area)
    .filter((problem) => min === null || problem.difficulty_overall >= min)
    .filter((problem) => max === null || problem.difficulty_overall <= max)
    .filter((problem) => !reference || problem.id !== reference.id)
    .map((problem) => {
      const techniqueText = problem.techniques.join(" ").toLowerCase();
      const topicText = problem.topics.join(" ").toLowerCase();
      const fullText = [problem.title, problem.statement, topicText, techniqueText, problem.concepts.join(" "), problem.solution_architecture].join(" ").toLowerCase();
      let score = tokens.reduce((total, token) => total + (fullText.includes(token) ? 5 : 0) + (techniqueText.includes(token) ? 8 : 0) + (topicText.includes(token) ? 5 : 0), 0);
      const reasons = [];
      if (reference) {
        const sharedTechniques = problem.techniques.filter((item) => reference.techniques.includes(item));
        const sharedTopics = problem.topics.filter((item) => reference.topics.includes(item));
        const gap = Math.abs(problem.difficulty_overall - reference.difficulty_overall);
        score += sharedTechniques.length * 35 + sharedTopics.length * 20 + Math.max(0, 20 - gap * 4);
        if (sharedTechniques.length) reasons.push(`Shared technique: ${sharedTechniques[0]}`);
        if (sharedTopics.length) reasons.push(`Shared topic: ${sharedTopics[0]}`);
        if (gap <= 1) reasons.push("Very similar difficulty");
      } else if (tokens.length) {
        const technique = problem.techniques.find((item) => tokens.some((token) => item.toLowerCase().includes(token)));
        const topic = problem.topics.find((item) => tokens.some((token) => item.toLowerCase().includes(token)));
        if (technique) reasons.push(`Technique: ${technique}`);
        if (topic) reasons.push(`Topic: ${topic}`);
      } else {
        score = 1 + problem.difficulty_overall / 100;
      }
      return { ...problem, search_score: score, match_reasons: reasons.slice(0, 3) };
    })
    .filter((problem) => !query || problem.search_score > 0 || reference)
    .sort((a, b) => b.search_score - a.search_score || b.year - a.year || a.number - b.number);
}

function renderCatalog() {
  document.title = "Problem Finder · Putnam Journal";
  const view = document.querySelector("#view");
  const reference = state.catalogReferenceData;
  view.innerHTML = `
    <section class="page-header catalog-header">
      <div><p class="eyebrow">Search by mathematical idea</p><h1>Problem Finder</h1><p>Describe the kind of problem you want. Search considers topics, techniques, structure, and difficulty.</p></div>
      <div class="catalog-count"><strong>${state.catalog.length}</strong><span>matches</span></div>
    </section>
    ${reference ? `<section class="similarity-banner panel"><div><p class="eyebrow">Similarity search</p><strong>Finding problems like ${escapeHtml(reference.title)}</strong><span>Difficulty ${formatCatalogDifficulty(reference.difficulty_overall)} · ${reference.techniques.slice(0, 2).map(escapeHtml).join(" · ")}</span></div><button class="button secondary small" data-action="clear-catalog-similarity">Clear</button></section>` : ""}
    <section class="catalog-search-panel panel">
      <label class="catalog-query">${iconSearch()}<input id="catalog-search" value="${escapeAttribute(state.catalogSearch)}" placeholder="e.g. geometry using an extremal idea" /></label>
      <div class="catalog-filter-grid">
        <label class="filter-field"><span>Area</span><select id="catalog-area"><option value="">All areas</option>${AREAS.map((item) => `<option value="${escapeAttribute(item)}" ${state.catalogArea === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></label>
        <label class="filter-field"><span>Minimum difficulty</span><input id="catalog-min" type="number" min="1" max="10" step="0.5" value="${escapeAttribute(state.catalogMinDifficulty)}" placeholder="Any" /></label>
        <label class="filter-field"><span>Maximum difficulty</span><input id="catalog-max" type="number" min="1" max="10" step="0.5" value="${escapeAttribute(state.catalogMaxDifficulty)}" placeholder="Any" /></label>
      </div>
    </section>
    <section class="catalog-results">${state.catalog.length ? state.catalog.map(catalogCard).join("") : `<div class="empty-state"><h3>No matching problems</h3><p>Broaden the search or difficulty range.</p></div>`}</section>`;

  const searchInput = document.querySelector("#catalog-search");
  let debounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      state.catalogSearch = searchInput.value.trim();
      state.catalogReference = null;
      await loadCatalog();
      renderCatalog();
    }, 300);
  });
  for (const [selector, key] of [["#catalog-area", "catalogArea"], ["#catalog-min", "catalogMinDifficulty"], ["#catalog-max", "catalogMaxDifficulty"]]) {
    document.querySelector(selector).addEventListener("change", async (event) => {
      state[key] = event.target.value;
      await loadCatalog();
      renderCatalog();
    });
  }
}

function catalogCard(problem) {
  return `<article class="catalog-card" data-catalog-id="${escapeAttribute(problem.id)}">
    <div class="catalog-card-top"><div><div class="card-meta"><span class="level-pill">${escapeHtml(problem.session + problem.number)}</span><span>${escapeHtml(problem.area)}</span><span>${problem.year}</span></div><h2>${escapeHtml(problem.title)}</h2></div><div class="difficulty-badge"><strong>${formatCatalogDifficulty(problem.difficulty_overall)}</strong><span>/10</span></div></div>
    <p class="catalog-statement">${escapeHtml(problem.statement)}</p>
    ${problem.match_reasons.length ? `<div class="match-reasons">${problem.match_reasons.map((reason) => `<span>✓ ${escapeHtml(reason)}</span>`).join("")}</div>` : ""}
    <div class="catalog-taxonomy"><div><small>Topics</small><div class="tag-row">${problem.topics.slice(0, 4).map(topicTag).join("")}</div></div><div><small>Solution techniques</small><div class="tag-row">${problem.techniques.slice(0, 4).map(techniqueTag).join("")}</div></div></div>
    <details class="difficulty-details"><summary>Difficulty breakdown and prerequisites</summary><div class="difficulty-grid">${catalogDifficultyMetric("Insight", problem.difficulty_insight)}${catalogDifficultyMetric("Technical", problem.difficulty_technical)}${catalogDifficultyMetric("Prerequisites", problem.difficulty_prerequisite)}${catalogDifficultyMetric("Proof writing", problem.difficulty_proof)}</div><p><strong>Prerequisites:</strong> ${escapeHtml(problem.prerequisites.join(", "))}</p></details>
    <div class="catalog-actions"><button class="button secondary" data-action="find-similar">Find similar</button>${problem.imported ? `<button class="button primary" data-action="open-problem" data-problem-id="${escapeAttribute(problem.journal_problem_id)}">Open in journal</button>` : `<button class="button primary" data-action="import-catalog">Add to journal</button>`}</div>
  </article>`;
}

function catalogDifficultyMetric(label, value) {
  const width = Math.max(0, Math.min(100, Number(value || 0) * 10));
  return `<div class="difficulty-metric"><span><strong>${escapeHtml(label)}</strong><em>${formatCatalogDifficulty(value)}</em></span><i><b style="width:${width}%"></b></i></div>`;
}

function formatCatalogDifficulty(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(number % 1 ? 1 : 0) : "—";
}
