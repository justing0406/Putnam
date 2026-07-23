function renderAttempt() {
  document.title = `${state.selectedProblem.title} · Putnam Journal`;
  const problem = state.selectedProblem;
  const view = document.querySelector("#view");
  view.innerHTML = `
    <section class="attempt-header">
      <button class="back-button" data-view="dashboard">← Today</button>
      <div class="attempt-title-row">
        <div><p class="eyebrow">Clean reattempt</p><h1>${escapeHtml(problem.title)}</h1></div>
        <div class="card-meta"><span class="level-pill large">${escapeHtml(problem.level)}</span><span>${escapeHtml(problem.area)}</span></div>
      </div>
      <p>${escapeHtml(problem.source || "No source recorded")}</p>
      ${problem.topics?.length ? `<div class="tag-row large-tags">${problem.topics.map((topic) => topicTag(topic.name)).join("")}</div>` : ""}
    </section>

    <div class="attempt-layout">
      <section class="problem-stage panel">
        ${problem.problem_image_url ? `<img class="full-problem-image" src="${escapeAttribute(problem.problem_image_url)}" alt="${escapeAttribute(problem.title)} problem" />` : ""}
        ${problem.statement ? `<div class="problem-statement"><p class="eyebrow">Statement</p><div>${formatText(problem.statement)}</div></div>` : ""}
        ${!problem.problem_image_url && !problem.statement ? `<div class="empty-state"><p>No problem image or statement was saved.</p></div>` : ""}
      </section>

      <aside class="attempt-form-panel panel">
        <p class="eyebrow">Record this attempt</p>
        <h2>How close did you get?</h2>
        <form id="attempt-form" class="stack-form">
          <div class="outcome-choice-grid single-column">
            ${outcomeChoice("solved", "Solved", "Next review in 21 days")}
            ${outcomeChoice("almost", "Almost solved", "Next review in 7 days")}
            ${outcomeChoice("not_close", "Not very close", "Next review tomorrow")}
          </div>
          ${field("Your solution or progress", `<textarea name="selfSolution" rows="8" maxlength="30000" placeholder="Capture the full line of reasoning while it is fresh."></textarea>`)}
          ${techniqueField("Techniques you tried", "triedTechniques", "Induction, Parity, Extremal principle", "Include failed approaches")}
          ${techniqueField("Techniques that worked", "successfulTechniques", "Contradiction, Radical isolation and squaring", "Add newly discovered successful techniques")}
          ${field("Where you got stuck", `<textarea name="whereStuck" rows="4" maxlength="10000"></textarea>`)}
          ${field("Why the approach failed", `<textarea name="errorAnalysis" rows="4" maxlength="10000"></textarea>`)}
          <div class="form-grid three">
            ${field("Minutes", `<input name="timeSpentMinutes" type="number" min="0" max="1440" />`)}
            ${field("Hints", `<input name="hintsUsed" type="number" min="0" max="100" value="0" />`)}
            ${field("Confidence", `<select name="confidence"><option value="">—</option>${[1,2,3,4,5].map((number) => `<option value="${number}">${number}/5</option>`).join("")}</select>`)}
          </div>
          <input type="hidden" name="solutionRevealed" value="${state.solutionRevealed ? "true" : "false"}" />
          <button class="button primary wide large" type="submit">Save attempt</button>
          <p id="attempt-status" class="form-status"></p>
        </form>
      </aside>
    </div>

    <section class="solution-vault panel ${state.solutionRevealed ? "revealed" : ""}">
      ${state.solutionRevealed ? revealedSolution(problem) : hiddenSolution(problem)}
    </section>
    ${techniqueDatalist()}`;

  document.querySelector("#attempt-form").addEventListener("submit", submitAttempt);
}

function hiddenSolution(problem) {
  return `<div class="vault-lock"><div class="lock-icon">⌁</div><div><p class="eyebrow">Solution vault</p><h2>Previous work is hidden</h2><p>Reveal only when you are finished with the clean attempt. The journal will record that the solution was seen.</p></div><button class="button secondary" data-action="reveal-solution">Reveal solution and history</button></div>`;
}

function revealedSolution(problem) {
  return `<div class="section-heading"><div><p class="eyebrow">Solution vault</p><h2>Reference solution and history</h2></div><button class="text-button" data-action="hide-solution">Hide again</button></div>
    <div class="solution-grid">
      <div>
        <h3>Problem topics</h3>
        <div class="tag-row large-tags">${problem.topics?.length ? problem.topics.map((topic) => topicTag(topic.name)).join("") : `<span class="muted">No topics recorded yet.</span>`}</div>
        <h3>Successful techniques</h3>
        <div class="tag-row large-tags">${problem.techniques.length ? problem.techniques.map((technique) => techniqueTag(technique.name)).join("") : `<span class="muted">No techniques recorded yet.</span>`}</div>
        ${problem.solution_image_url ? `<img class="solution-image" src="${escapeAttribute(problem.solution_image_url)}" alt="Reference solution" />` : ""}
        ${problem.official_solution ? `<div class="solution-text">${formatText(problem.official_solution)}</div>` : ""}
        ${!problem.solution_image_url && !problem.official_solution ? `<p class="muted">No reference solution was saved.</p>` : ""}
      </div>
      <div>
        <h3>Attempt history</h3>
        ${problem.attempts.length ? `<div class="timeline">${problem.attempts.map(attemptHistory).join("")}</div>` : `<p class="muted">No earlier attempts.</p>`}
      </div>
    </div>`;
}

function attemptHistory(attempt) {
  const outcome = OUTCOMES[attempt.outcome];
  return `<article class="timeline-item">
    <span class="timeline-dot ${outcome?.className || ""}"></span>
    <div class="timeline-content">
      <div class="timeline-heading"><strong>${escapeHtml(outcome?.label || attempt.outcome)}</strong><time>${escapeHtml(formatLongDate(attempt.attempted_at))}</time></div>
      <div class="tag-row">${attempt.tried_techniques.map((name) => techniqueTag(`Tried: ${name}`)).join("")}</div>
      ${attempt.self_solution ? `<details><summary>Attempted solution</summary><div class="history-text">${formatText(attempt.self_solution)}</div></details>` : ""}
      ${attempt.where_stuck ? `<p><strong>Stuck:</strong> ${escapeHtml(attempt.where_stuck)}</p>` : ""}
      ${attempt.error_analysis ? `<p><strong>Analysis:</strong> ${escapeHtml(attempt.error_analysis)}</p>` : ""}
      <small>Next review set for ${escapeHtml(formatLongDate(attempt.next_review_at))}${attempt.solution_revealed ? " · solution revealed" : ""}</small>
    </div>
  </article>`;
}

async function submitAttempt(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const status = document.querySelector("#attempt-status");
  const formData = new FormData(form);
  const outcome = formData.get("initialOutcome");
  if (!outcome) {
    status.textContent = "Choose solved, almost solved, or not very close.";
    status.classList.add("error");
    return;
  }

  button.disabled = true;
  button.textContent = "Saving…";
  status.textContent = "";
  try {
    const payload = {
      outcome,
      selfSolution: formData.get("selfSolution"),
      triedTechniques: splitTechniques(formData.get("triedTechniques")),
      successfulTechniques: splitTechniques(formData.get("successfulTechniques")),
      whereStuck: formData.get("whereStuck"),
      errorAnalysis: formData.get("errorAnalysis"),
      timeSpentMinutes: numberOrNull(formData.get("timeSpentMinutes")),
      hintsUsed: numberOrNull(formData.get("hintsUsed")) ?? 0,
      confidence: numberOrNull(formData.get("confidence")),
      solutionRevealed: formData.get("solutionRevealed") === "true",
    };
    const result = await api(`/api/problems/${encodeURIComponent(state.selectedProblem.id)}/attempts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showToast(`Attempt saved. Next review ${formatLongDate(result.next_review_at)}.`, "success");
    state.selectedProblem = result.problem;
    state.solutionRevealed = true;
    renderAttempt();
  } catch (caught) {
    status.textContent = caught.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.textContent = "Save attempt";
  }
}