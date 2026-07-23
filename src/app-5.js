function renderAnalytics() {
  document.title = "Learning patterns · Putnam Journal";
  const data = state.analytics;
  const view = document.querySelector("#view");
  view.innerHTML = `
    <section class="page-header">
      <div><p class="eyebrow">Evidence from your attempts</p><h1>Learning patterns</h1><p>Recognition and execution are measured separately so the dashboard can identify what kind of difficulty you are having.</p></div>
    </section>
    <section class="metric-grid">
      ${metricCard(data.overview.solve_rate + "%", "Attempt solve rate", `${data.overview.solved_attempts} solved attempts`)}
      ${metricCard(data.overview.average_attempts_per_problem, "Attempts per problem", "Across the full journal")}
      ${metricCard(data.overview.average_minutes ? data.overview.average_minutes + "m" : "—", "Average time", "Per recorded attempt")}
      ${metricCard(data.overview.average_hints, "Average hints", "Per attempt")}
    </section>

    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Pattern engine</p><h2>What deserves attention</h2></div></div>
      <div class="insight-grid">${data.insights.map(insightCard).join("")}</div>
    </section>

    <div class="analytics-layout">
      <section class="panel wide-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Technique diagnostics</p><h2>Recognition vs. execution</h2></div></div>
        <p class="panel-intro">Recognition asks whether you selected a technique when it was useful. Execution asks whether correct selection led to a solved attempt.</p>
        ${data.technique_performance.length ? techniqueTable(data.technique_performance) : `<div class="empty-state"><p>Record attempts and successful techniques to populate this analysis.</p></div>`}
      </section>
      <section class="panel side-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Wrong turns</p><h2>Technique substitutions</h2></div></div>
        ${data.mismatches.length ? `<div class="mismatch-list">${data.mismatches.map(mismatchRow).join("")}</div>` : `<p class="muted">No repeated technique mismatch has been detected.</p>`}
      </section>
    </div>

    <section class="panel section-block">
      <div class="section-heading compact"><div><p class="eyebrow">Difficulty map</p><h2>Performance by Putnam & Beyond level</h2></div></div>
      ${data.by_level.length ? levelTable(data.by_level) : `<p class="muted">Level statistics appear after your first attempts.</p>`}
    </section>`;
}

function insightCard(insight) {
  return `<article class="insight-card ${escapeAttribute(insight.type)}"><span>${insightIcon(insight.type)}</span><div><h3>${escapeHtml(insight.title)}</h3><p>${escapeHtml(insight.text)}</p></div></article>`;
}

function techniqueTable(rows) {
  return `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Technique</th><th>Evidence</th><th>Recognition</th><th>Execution</th><th>Wrong use</th></tr></thead><tbody>${rows.slice(0, 30).map((row) => `<tr>
    <td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.category)}</small></td>
    <td>${row.expected_attempts} expected · ${row.tried_attempts} tried</td>
    <td>${progressCell(row.recognition_rate)}</td>
    <td>${progressCell(row.execution_rate)}</td>
    <td>${progressCell(row.wrong_application_rate, true)}</td>
  </tr>`).join("")}</tbody></table></div>`;
}

function progressCell(value, inverse = false) {
  return `<div class="progress-cell"><span>${value}%</span><div class="progress-track ${inverse ? "inverse" : ""}"><i style="width:${Math.min(100, Math.max(0, value))}%"></i></div></div>`;
}

function mismatchRow(row) {
  return `<article class="mismatch-row"><span class="mismatch-count">${row.count}×</span><div><strong>${escapeHtml(row.tried)}</strong><span>instead of</span><strong>${escapeHtml(row.should_have_used)}</strong></div></article>`;
}

function levelTable(rows) {
  return `<div class="level-performance-grid">${rows.map((row) => `<article><div class="level-square large">${escapeHtml(row.key)}</div><div><strong>${row.solve_rate}% solved</strong><small>${row.attempts} attempts · ${row.average_minutes || "—"}${row.average_minutes ? " min avg" : ""}</small><div class="mini-outcomes"><i class="solved" style="width:${row.solve_rate}%"></i><i class="almost" style="width:${row.attempts ? Math.round(row.almost / row.attempts * 100) : 0}%"></i></div></div></article>`).join("")}</div>`;
}


function option(value) {
  return `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`;
}

function tag(value) {
  return `<span class="tag">${escapeHtml(value)}</span>`;
}

function loadingState() {
  return `<div class="loading-state"><span class="loader"></span><p>Loading your journal…</p></div>`;
}

function errorState(message) {
  return `<div class="empty-state error-state"><h2>Could not load this view</h2><p>${escapeHtml(message)}</p><button class="button secondary" data-view="dashboard">Return to today</button></div>`;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastRegion.append(toast);
  setTimeout(() => toast.remove(), 5000);
}

function splitTechniques(value) {
  return [...new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean))];
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function relativeReview(value) {
  const date = new Date(value);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((targetStart - dayStart) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatText(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function truncate(value, length) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function pluralize(count, singular) {
  return Number(count) === 1 ? singular : `${singular}s`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function iconCalendar() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v3M17 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>`; }
function iconLibrary() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V3Zm0 15a3 3 0 0 1 3-3h13M8 7h8M8 10h6"/></svg>`; }
function iconChart() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`; }
function iconPlus() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`; }
function iconLogout() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg>`; }
function iconSearch() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`; }
function insightIcon(type) { return type === "recognition" ? "◉" : type === "execution" ? "↗" : type === "mismatch" ? "⇄" : type === "positive" ? "✓" : "i"; }

init();
