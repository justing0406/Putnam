function renderAddProblem() {
  document.title = "Add problem · Putnam Journal";
  const view = document.querySelector("#view");
  view.innerHTML = `
    <section class="page-header narrow-header">
      <div><p class="eyebrow">New journal entry</p><h1>Add a Putnam problem</h1><p>Save the subject matter, your first attempt, and the problem-solving methods you want the system to learn from.</p></div>
    </section>
    <form id="add-problem-form" class="journal-form">
      <section class="form-section panel">
        <div class="form-section-number">01</div>
        <div class="form-section-content">
          <div class="section-heading compact"><div><h2>The problem</h2><p>Identify it and upload a clean image.</p></div></div>
          <div class="form-grid two">
            ${field("Title", `<input name="title" required maxlength="180" placeholder="e.g. 2019 Putnam A2" />`)}
            ${field("Source", `<input name="source" maxlength="300" placeholder="Contest year, book, chapter, or URL" />`)}
            ${field("Putnam & Beyond level", `<select name="level" required><option value="">Choose level</option>${LEVELS.map(option).join("")}</select>`)}
            ${field("Area", `<select name="area" required><option value="">Choose area</option>${AREAS.map(option).join("")}</select>`)}
          </div>
          ${field("Problem statement", `<textarea name="statement" rows="6" maxlength="20000" placeholder="Type or paste the statement. This is optional when the image is complete."></textarea>`)}
          <div class="form-grid two upload-grid">
            ${uploadField("Problem image", "problemImage", "Upload the problem screenshot or photo")}
            ${uploadField("Solution image", "solutionImage", "Upload the official or reference solution")}
          </div>
          ${field("Official solution text", `<textarea name="officialSolution" rows="7" maxlength="30000" placeholder="Optional typed solution or key steps"></textarea>`)}
        </div>
      </section>

      <section class="form-section panel">
        <div class="form-section-number">02</div>
        <div class="form-section-content">
          <div class="section-heading compact"><div><h2>Topic map</h2><p>Describe what mathematical content the problem is about, not how it is solved.</p></div></div>
          ${topicField("Problem topics", "topics", "e.g. Irrationality and rationality, Radical expressions", "Choose all subject-matter topics that meaningfully describe the problem")}
          <details class="technique-reference"><summary>Browse topic vocabulary</summary>${topicVocabulary()}</details>
        </div>
      </section>

      <section class="form-section panel">
        <div class="form-section-number">03</div>
        <div class="form-section-content">
          <div class="section-heading compact"><div><h2>Technique map</h2><p>Describe what you do to solve the problem. Separate what truly works from what you tried.</p></div></div>
          ${techniqueField("Techniques that successfully solve it", "successfulTechniques", "e.g. Contradiction, Radical isolation and squaring", "Canonical techniques from the final solution")}
          ${techniqueField("Techniques you tried", "triedTechniques", "e.g. Induction, Structured casework", "Include incorrect or abandoned approaches")}
          <details class="technique-reference"><summary>Browse technique vocabulary</summary>${techniqueVocabulary()}</details>
        </div>
      </section>

      <section class="form-section panel">
        <div class="form-section-number">04</div>
        <div class="form-section-content">
          <div class="section-heading compact"><div><h2>Your initial attempt</h2><p>This sets the first spaced-review date. Leave blank only when importing an unattempted problem.</p></div></div>
          <div class="outcome-choice-grid">
            ${outcomeChoice("solved", "Solved", "Returns in 21 days")}
            ${outcomeChoice("almost", "Almost solved", "Returns in 7 days")}
            ${outcomeChoice("not_close", "Not very close", "Returns tomorrow")}
            <label class="outcome-choice neutral"><input type="radio" name="initialOutcome" value="" checked /><span><strong>Not attempted</strong><small>Due immediately</small></span></label>
          </div>
          ${field("Your attempted solution", `<textarea name="selfSolution" rows="8" maxlength="30000" placeholder="Write the argument you produced, including incomplete steps."></textarea>`)}
          <div class="form-grid two">
            ${field("Where you got stuck", `<textarea name="whereStuck" rows="5" maxlength="10000" placeholder="Name the exact transition you could not justify."></textarea>`)}
            ${field("What went wrong", `<textarea name="errorAnalysis" rows="5" maxlength="10000" placeholder="Why did the attempted method fail or become inefficient?"></textarea>`)}
          </div>
          <div class="form-grid three">
            ${field("Minutes spent", `<input name="timeSpentMinutes" type="number" min="0" max="1440" inputmode="numeric" />`)}
            ${field("Hints used", `<input name="hintsUsed" type="number" min="0" max="100" value="0" inputmode="numeric" />`)}
            ${field("Confidence", `<select name="confidence"><option value="">Not recorded</option>${[1,2,3,4,5].map((number) => `<option value="${number}">${number} / 5</option>`).join("")}</select>`)}
          </div>
          <label class="checkbox-row"><input type="checkbox" name="solutionRevealed" value="true" /><span>I saw the official solution during this attempt</span></label>
          ${field("General notes", `<textarea name="notes" rows="4" maxlength="10000" placeholder="Anything else worth remembering about this problem"></textarea>`)}
        </div>
      </section>

      <div class="sticky-submit">
        <span id="add-status" class="form-status"></span>
        <button class="button primary large" type="submit">Save problem and schedule review</button>
      </div>
    </form>
    ${topicDatalist()}
    ${techniqueDatalist()}`;

  bindImagePreviews();
  document.querySelector("#add-problem-form").addEventListener("submit", submitNewProblem);
}

function field(label, control) {
  return `<label class="field"><span>${label}</span>${control}</label>`;
}

function topicField(label, name, placeholder, helper) {
  return `<label class="field"><span>${label}</span><input name="${name}" list="topic-list" placeholder="${placeholder}" /><small>${helper}. Separate multiple topics with commas.</small></label>`;
}

function techniqueField(label, name, placeholder, helper) {
  return `<label class="field"><span>${label}</span><input name="${name}" list="technique-list" placeholder="${placeholder}" /><small>${helper}. Separate multiple techniques with commas.</small></label>`;
}

function uploadField(label, name, helper) {
  return `<label class="upload-field"><span>${label}</span><input type="file" name="${name}" accept="image/jpeg,image/png,image/webp,image/gif" /><span class="upload-box"><strong>Choose image</strong><small>${helper} · maximum 10 MB</small><span class="preview-slot"></span></span></label>`;
}

function outcomeChoice(value, label, helper) {
  return `<label class="outcome-choice ${OUTCOMES[value].className}"><input type="radio" name="initialOutcome" value="${value}" /><span><strong>${label}</strong><small>${helper}</small></span></label>`;
}

function topicDatalist() {
  return `<datalist id="topic-list">${state.topics.map((topic) => `<option value="${escapeAttribute(topic.name)}">${escapeHtml(topic.area)}</option>`).join("")}</datalist>`;
}

function techniqueDatalist() {
  return `<datalist id="technique-list">${state.techniques.map((technique) => `<option value="${escapeAttribute(technique.name)}">${escapeHtml(technique.category)}</option>`).join("")}</datalist>`;
}

function topicVocabulary() {
  const groups = state.topics.reduce((result, topic) => {
    (result[topic.area] ||= []).push(topic);
    return result;
  }, {});
  return Object.entries(groups).map(([area, topics]) => `<div class="technique-group"><strong>${escapeHtml(area)}</strong><div class="tag-row">${topics.map((topic) => topicTag(topic.name)).join("")}</div></div>`).join("");
}

function techniqueVocabulary() {
  const groups = state.techniques.reduce((result, technique) => {
    (result[technique.category] ||= []).push(technique);
    return result;
  }, {});
  return Object.entries(groups).map(([category, techniques]) => `<div class="technique-group"><strong>${escapeHtml(category)}</strong><div class="tag-row">${techniques.map((technique) => techniqueTag(technique.name)).join("")}</div></div>`).join("");
}

function bindImagePreviews() {
  document.querySelectorAll(".upload-field input[type=file]").forEach((input) => {
    input.addEventListener("change", () => {
      const slot = input.closest(".upload-field").querySelector(".preview-slot");
      const file = input.files?.[0];
      if (!file) {
        slot.innerHTML = "";
        return;
      }
      const url = URL.createObjectURL(file);
      slot.innerHTML = `<img src="${escapeAttribute(url)}" alt="Selected upload preview" /><em>${escapeHtml(file.name)}</em>`;
    });
  });
}

async function submitNewProblem(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const status = document.querySelector("#add-status");
  button.disabled = true;
  button.textContent = "Saving…";
  status.textContent = "Uploading images and writing the first journal record…";
  try {
    const formData = new FormData(form);
    const result = await api("/api/problems", { method: "POST", body: formData });
    showToast("Problem saved and review scheduled.", "success");
    await navigate("attempt", { id: result.problem.id });
  } catch (caught) {
    status.textContent = caught.message;
    status.classList.add("error");
    showToast(caught.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Save problem and schedule review";
  }
}