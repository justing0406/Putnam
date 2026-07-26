Object.assign(state, {
  catalog: [],
  catalogReference: null,
  catalogReferenceData: null,
  catalogSearch: "",
  catalogArea: "",
  catalogMinDifficulty: "",
  catalogMaxDifficulty: "",
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
    if (!id) return;
    actionElement.disabled = true;
    actionElement.textContent = "Adding…";
    try {
      const result = await api(`/api/catalog/${encodeURIComponent(id)}/import`, { method: "POST", body: "{}" });
      showToast(result.already_imported ? "Problem is already in your journal." : "Problem added to your journal.", "success");
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
  const params = new URLSearchParams();
  if (state.catalogSearch) params.set("q", state.catalogSearch);
  if (state.catalogArea) params.set("area", state.catalogArea);
  if (state.catalogMinDifficulty) params.set("minDifficulty", state.catalogMinDifficulty);
  if (state.catalogMaxDifficulty) params.set("maxDifficulty", state.catalogMaxDifficulty);
  if (state.catalogReference) params.set("similarTo", state.catalogReference);
  const data = await api(`/api/catalog?${params}`);
  state.catalog = data.problems;
  state.catalogReference = data.reference?.id || state.catalogReference;
  state.catalogReferenceData = data.reference || null;
}

function renderCatalog() {
  document.title = "Problem Finder · Putnam Journal";
  const view = document.querySelector("#view");
  const reference = state.catalogReferenceData;
  view.innerHTML = `
    <section class="page-header catalog-header">
      <div>
        <p class="eyebrow">Search by mathematical idea</p>
        <h1>Problem Finder</h1>
        <p>Describe the kind of problem you want in ordinary language. Search uses topics, concepts, solution techniques, structure, and difficulty—not just words in the statement.</p>
      </div>
      <div class="catalog-count"><strong>${state.catalog.length}</strong><span>matches</span></div>
    </section>

    ${reference ? `<section class="similarity-banner panel"><div><p class="eyebrow">Similarity search</p><strong>Finding problems like ${escapeHtml(reference.title)}</strong><span>Difficulty ${formatCatalogDifficulty(reference.difficulty_overall)} · ${reference.techniques.slice(0, 2).map(escapeHtml).join(" · ")}</span></div><button class="button secondary small" data-action="clear-catalog-similarity">Clear</button></section>` : ""}

    <section class="catalog-search-panel panel">
      <label class="catalog-query">${iconSearch()}<input id="catalog-search" value="${escapeAttribute(state.catalogSearch)}" placeholder="e.g. slightly hard combinatorics problems using invariants or descent" /></label>
      <div class="catalog-filter-grid">
        <label class="filter-field"><span>Area</span><select id="catalog-area"><option value="">All areas</option>${AREAS.map((area) => `<option value="${escapeAttribute(area)}" ${state.catalogArea === area ? "selected" : ""}>${escapeHtml(area)}</option>`).join("")}</select></label>
        <label class="filter-field"><span>Minimum difficulty</span><input id="catalog-min" type="number" min="1" max="10" step="0.5" value="${escapeAttribute(state.catalogMinDifficulty)}" placeholder="Any" /></label>
        <label class="filter-field"><span>Maximum difficulty</span><input id="catalog-max" type="number" min="1" max="10" step="0.5" value="${escapeAttribute(state.catalogMaxDifficulty)}" placeholder="Any" /></label>
      </div>
      <p class="catalog-search-help">Try “same technique, different subject,” “easy geometry with an extremal idea,” or “functional equations around difficulty 5.”</p>
    </section>

    <section class="catalog-results">
      ${state.catalog.length ? state.catalog.map(catalogCard).join("") : `<div class="empty-state"><h3>No matching problems</h3><p>Broaden the difficulty range or describe the technique with different words.</p></div>`}
    </section>`;

  const searchInput = document.querySelector("#catalog-search");
  let debounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      state.catalogSearch = searchInput.value.trim();
      state.catalogReference = null;
      await loadCatalog();
      renderCatalog();
    }, 350);
  });

  for (const [selector, stateKey] of [["#catalog-area", "catalogArea"], ["#catalog-min", "catalogMinDifficulty"], ["#catalog-max", "catalogMaxDifficulty"]]) {
    document.querySelector(selector).addEventListener("change", async (event) => {
      state[stateKey] = event.target.value;
      await loadCatalog();
      renderCatalog();
    });
  }
}

function catalogCard(problem) {
  const reasons = problem.match_reasons || [];
  return `<article class="catalog-card" data-catalog-id="${escapeAttribute(problem.id)}">
    <div class="catalog-card-top">
      <div>
        <div class="card-meta"><span class="level-pill">${escapeHtml(problem.session + problem.number)}</span><span>${escapeHtml(problem.area)}</span><span>${problem.year}</span></div>
        <h2>${escapeHtml(problem.title)}</h2>
      </div>
      <div class="difficulty-badge"><strong>${formatCatalogDifficulty(problem.difficulty_overall)}</strong><span>/10</span></div>
    </div>
    <p class="catalog-statement">${escapeHtml(problem.statement)}</p>
    ${reasons.length ? `<div class="match-reasons">${reasons.map((reason) => `<span>✓ ${escapeHtml(reason)}</span>`).join("")}</div>` : ""}
    <div class="catalog-taxonomy">
      <div><small>Topics</small><div class="tag-row">${problem.topics.slice(0, 4).map(topicTag).join("")}</div></div>
      <div><small>Solution techniques</small><div class="tag-row">${problem.techniques.slice(0, 4).map(techniqueTag).join("")}</div></div>
    </div>
    <details class="difficulty-details">
      <summary>Difficulty breakdown and prerequisites</summary>
      <div class="difficulty-grid">
        ${catalogDifficultyMetric("Insight", problem.difficulty_insight)}
        ${catalogDifficultyMetric("Technical", problem.difficulty_technical)}
        ${catalogDifficultyMetric("Prerequisites", problem.difficulty_prerequisite)}
        ${catalogDifficultyMetric("Proof writing", problem.difficulty_proof)}
      </div>
      <p><strong>Prerequisites:</strong> ${escapeHtml(problem.prerequisites.join(", ") || "None listed")}</p>
    </details>
    <div class="catalog-actions">
      <button class="button secondary" data-action="find-similar">Find similar</button>
      ${problem.imported
        ? `<button class="button primary" data-action="open-problem" data-problem-id="${escapeAttribute(problem.journal_problem_id)}">Open in journal</button>`
        : `<button class="button primary" data-action="import-catalog">Add to journal</button>`}
    </div>
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
