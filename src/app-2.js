function renderDashboard() {
  document.title = "Today · Putnam Journal";
  const data = state.dashboard;
  const due = data.due || [];
  const upcoming = data.upcoming || [];
  const summary = data.summary;
  const view = document.querySelector("#view");

  view.innerHTML = `
    <section class="page-header dashboard-header">
      <div>
        <p class="eyebrow">${formatLongDate(new Date())}</p>
        <h1>${due.length ? `${due.length} ${pluralize(due.length, "problem")} ready` : "You’re caught up"}</h1>
        <p>${due.length ? "Start clean. Your earlier work stays hidden until you choose to reveal it." : "No problem is due right now. You can add a new one or explore your learning patterns."}</p>
      </div>
      <button class="button secondary" data-action="refresh-dashboard">Refresh</button>
    </section>

    <section class="metric-grid">
      ${metricCard(summary.due_count, "Due now", "Reviews waiting today")}
      ${metricCard(summary.total_problems, "Problems", "In your journal")}
      ${metricCard(summary.total_attempts, "Attempts", "Full history preserved")}
      ${metricCard(summary.average_minutes ? `${summary.average_minutes}m` : "—", "Average attempt", "When time is recorded")}
    </section>

    <section class="section-block">
      <div class="section-heading">
        <div><p class="eyebrow">Review queue</p><h2>Due problems</h2></div>
        <button class="text-button" data-view="library">View all problems →</button>
      </div>
      ${due.length ? `<div class="problem-grid">${due.map(problemCard).join("")}</div>` : emptyQueue()}
    </section>

    <div class="two-column-layout">
      <section class="panel">
        <div class="section-heading compact"><div><p class="eyebrow">Coming up</p><h2>Next reviews</h2></div></div>
        ${upcoming.length ? `<div class="compact-list">${upcoming.map(upcomingRow).join("")}</div>` : `<p class="muted">No future reviews are scheduled yet.</p>`}
      </section>
      <section class="panel">
        <div class="section-heading compact"><div><p class="eyebrow">Momentum</p><h2>Recent attempts</h2></div></div>
        ${data.recent?.length ? `<div class="compact-list">${data.recent.map(recentAttemptRow).join("")}</div>` : `<p class="muted">Your attempts will appear here.</p>`}
      </section>
    </div>`;
}

function metricCard(value, label, helper) {
  return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(helper)}</small></article>`;
}

function problemCard(problem) {
  const dueText = relativeReview(problem.next_review_at);
  return `
    <article class="problem-card" data-problem-id="${escapeAttribute(problem.id)}">
      <div class="problem-card-image ${problem.problem_image_url ? "has-image" : ""}">
        ${problem.problem_image_url
          ? `<img src="${escapeAttribute(problem.problem_image_url)}" alt="Problem preview" loading="lazy" />`
          : `<span>${escapeHtml(problem.level)}</span>`}
      </div>
      <div class="problem-card-body">
        <div class="card-meta"><span class="level-pill">${escapeHtml(problem.level)}</span><span>${escapeHtml(problem.area)}</span></div>
        <h3>${escapeHtml(problem.title)}</h3>
        <p>${escapeHtml(truncate(problem.statement || problem.source || "No statement text saved.", 145))}</p>
        ${problem.topics?.length ? `<div class="tag-row">${problem.topics.slice(0, 3).map(topicTag).join("")}</div>` : ""}
        <div class="card-footer">
          <span class="due-label">${escapeHtml(dueText)}</span>
          <button class="button primary small" data-action="open-problem">Start attempt</button>
        </div>
      </div>
    </article>`;
}

function upcomingRow(problem) {
  return `<button class="compact-row clickable" data-action="open-problem" data-problem-id="${escapeAttribute(problem.id)}">
    <span class="level-square">${escapeHtml(problem.level)}</span>
    <span class="row-main"><strong>${escapeHtml(problem.title)}</strong><small>${escapeHtml(problem.topics?.[0] || problem.area)} · ${problem.attempt_count} ${pluralize(problem.attempt_count, "attempt")}</small></span>
    <time>${escapeHtml(formatShortDate(problem.next_review_at))}</time>
  </button>`;
}

function recentAttemptRow(attempt) {
  return `<button class="compact-row clickable" data-action="open-problem" data-problem-id="${escapeAttribute(attempt.problem_id)}">
    <span class="status-dot ${OUTCOMES[attempt.outcome]?.className || ""}"></span>
    <span class="row-main"><strong>${escapeHtml(attempt.title)}</strong><small>${escapeHtml(OUTCOMES[attempt.outcome]?.label || attempt.outcome)}</small></span>
    <time>${escapeHtml(formatShortDate(attempt.attempted_at))}</time>
  </button>`;
}

function emptyQueue() {
  return `<div class="empty-state"><div class="empty-icon">✓</div><h3>No reviews due</h3><p>Your spacing schedule is clear. Add a new problem or use the library to revisit one early.</p><button class="button primary" data-view="add">Add a problem</button></div>`;
}

async function loadProblems() {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.levelFilter) params.set("level", state.levelFilter);
  state.problems = (await api(`/api/problems?${params}`)).problems;
}

function renderLibrary() {
  document.title = "Problem library · Putnam Journal";
  const view = document.querySelector("#view");
  view.innerHTML = `
    <section class="page-header">
      <div><p class="eyebrow">Complete archive</p><h1>Problem library</h1><p>Every problem, attempt, review date, topic, and technique trail in one place.</p></div>
      <button class="button primary" data-view="add">+ Add problem</button>
    </section>
    <section class="toolbar panel">
      <label class="search-field">${iconSearch()}<input id="library-search" value="${escapeAttribute(state.search)}" placeholder="Search title, source, statement, or topic" /></label>
      <label class="filter-field"><span>Level</span><select id="level-filter"><option value="">All levels</option>${LEVELS.map((level) => `<option value="${level}" ${state.levelFilter === level ? "selected" : ""}>${level}</option>`).join("")}</select></label>
      <span class="result-count">${state.problems.length} ${pluralize(state.problems.length, "problem")}</span>
    </section>
    <section class="library-list">
      ${state.problems.length ? state.problems.map(libraryRow).join("") : `<div class="empty-state"><h3>No matching problems</h3><p>Try a different search or add the first problem in this category.</p></div>`}
    </section>`;

  const searchInput = document.querySelector("#library-search");
  let debounce;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      state.search = searchInput.value.trim();
      await loadProblems();
      renderLibrary();
    }, 300);
  });
  document.querySelector("#level-filter").addEventListener("change", async (event) => {
    state.levelFilter = event.target.value;
    await loadProblems();
    renderLibrary();
  });
}

function libraryRow(problem) {
  const status = problem.latest_outcome ? OUTCOMES[problem.latest_outcome] : null;
  return `<article class="library-row" data-problem-id="${escapeAttribute(problem.id)}">
    <button class="library-main" data-action="open-problem">
      <span class="level-square large">${escapeHtml(problem.level)}</span>
      <span class="library-copy">
        <span class="library-title-line"><strong>${escapeHtml(problem.title)}</strong>${status ? `<span class="outcome-badge ${status.className}">${escapeHtml(status.label)}</span>` : `<span class="outcome-badge new">New</span>`}</span>
        <small>${escapeHtml(problem.source || problem.area)} · ${problem.attempt_count} ${pluralize(problem.attempt_count, "attempt")}</small>
        <span class="tag-row">${problem.topics.slice(0, 5).map(topicTag).join("")}${problem.topics.length > 5 ? `<span class="tag">+${problem.topics.length - 5}</span>` : ""}</span>
      </span>
      <span class="library-review"><small>Next review</small><strong>${escapeHtml(relativeReview(problem.next_review_at))}</strong></span>
      <span class="arrow">→</span>
    </button>
  </article>`;
}

async function ensureVocabularyLoaded() {
  const requests = [];
  if (!state.topics.length) requests.push(api("/api/topics").then((data) => { state.topics = data.topics; }));
  if (!state.techniques.length) requests.push(api("/api/techniques").then((data) => { state.techniques = data.techniques; }));
  await Promise.all(requests);
}