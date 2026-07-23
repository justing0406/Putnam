const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");

const state = {
  authenticated: false,
  view: "dashboard",
  dashboard: null,
  problems: [],
  techniques: [],
  analytics: null,
  selectedProblem: null,
  solutionRevealed: false,
  search: "",
  levelFilter: "",
};

const LEVELS = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "B0", "B1", "B2", "B3", "B4", "B5", "B6"];
const AREAS = ["Algebra", "Combinatorics", "Geometry", "Number Theory", "Analysis", "Mixed"];
const OUTCOMES = {
  solved: { label: "Solved", interval: "3 weeks", className: "solved" },
  almost: { label: "Almost solved", interval: "1 week", className: "almost" },
  not_close: { label: "Not very close", interval: "tomorrow", className: "not-close" },
};


async function init() {
  try {
    const session = await api("/api/auth/session", { allowUnauthorized: true });
    state.authenticated = Boolean(session.authenticated);
  } catch {
    state.authenticated = false;
  }

  if (!state.authenticated) {
    renderLogin();
    return;
  }

  renderShell();
  await navigate("dashboard");
}

async function api(url, options = {}) {
  const { allowUnauthorized = false, ...fetchOptions } = options;
  const response = await fetch(url, {
    credentials: "same-origin",
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(fetchOptions.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({ ok: false, error: "The server returned an unreadable response." }));
  if (response.status === 401 && !allowUnauthorized) {
    state.authenticated = false;
    renderLogin();
    throw new Error("Your session has ended.");
  }
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function renderLogin() {
  document.title = "Sign in · Putnam Journal";
  app.innerHTML = `
    <main class="login-page">
      <section class="login-panel">
        <div class="brand-mark brand-mark-large">P</div>
        <p class="eyebrow">Private study workspace</p>
        <h1>Putnam Journal</h1>
        <p class="login-copy">Reattempt the right problem at the right time, then learn from the structure of your own mistakes.</p>
        <form id="login-form" class="stack-form">
          <label>
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required autofocus />
          </label>
          <button class="button primary wide" type="submit">Open journal</button>
          <p id="login-error" class="form-error" role="alert"></p>
        </form>
      </section>
      <aside class="login-art" aria-hidden="true">
        <div class="formula formula-one">∑</div>
        <div class="formula formula-two">∀ ε &gt; 0</div>
        <div class="formula formula-three">a³ + b³ + c³ − 3abc</div>
        <blockquote>“The real work is learning what to notice.”</blockquote>
      </aside>
    </main>`;

  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const errorElement = document.querySelector("#login-error");
    button.disabled = true;
    button.textContent = "Opening…";
    errorElement.textContent = "";
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password: new FormData(form).get("password") }),
        allowUnauthorized: true,
      });
      state.authenticated = true;
      renderShell();
      await navigate("dashboard");
    } catch (caught) {
      errorElement.textContent = caught.message;
    } finally {
      button.disabled = false;
      button.textContent = "Open journal";
    }
  });
}

function renderShell() {
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-row">
          <div class="brand-mark">P</div>
          <div><strong>Putnam</strong><span>Journal</span></div>
        </div>
        <nav class="main-nav" aria-label="Main navigation">
          ${navButton("dashboard", "Today", iconCalendar())}
          ${navButton("library", "Problem library", iconLibrary())}
          ${navButton("analytics", "Learning patterns", iconChart())}
          ${navButton("add", "Add problem", iconPlus())}
        </nav>
        <div class="sidebar-spacer"></div>
        <div class="review-legend">
          <p class="eyebrow">Review rhythm</p>
          <div><span class="legend-dot solved"></span>Solved <strong>21d</strong></div>
          <div><span class="legend-dot almost"></span>Almost <strong>7d</strong></div>
          <div><span class="legend-dot not-close"></span>Not close <strong>1d</strong></div>
        </div>
        <button class="nav-button logout-button" data-action="logout">${iconLogout()}<span>Sign out</span></button>
      </aside>
      <main class="main-content">
        <header class="mobile-header">
          <div class="brand-row"><div class="brand-mark">P</div><strong>Putnam Journal</strong></div>
          <button class="icon-button" data-action="toggle-nav" aria-label="Toggle navigation">☰</button>
        </header>
        <div id="view"></div>
      </main>
    </div>`;

  document.addEventListener("click", handleGlobalClick);
}

function navButton(view, label, icon) {
  return `<button class="nav-button" data-view="${view}">${icon}<span>${label}</span></button>`;
}

async function navigate(view, options = {}) {
  state.view = view;
  state.solutionRevealed = false;
  setActiveNavigation(view);
  const viewElement = document.querySelector("#view");
  if (!viewElement) return;
  viewElement.innerHTML = loadingState();

  try {
    if (view === "dashboard") {
      state.dashboard = await api("/api/dashboard");
      renderDashboard();
    } else if (view === "library") {
      await loadProblems();
      renderLibrary();
    } else if (view === "add") {
      await ensureTechniquesLoaded();
      renderAddProblem();
    } else if (view === "analytics") {
      state.analytics = await api("/api/analytics");
      renderAnalytics();
    } else if (view === "attempt") {
      state.selectedProblem = (await api(`/api/problems/${encodeURIComponent(options.id)}`)).problem;
      renderAttempt();
    }
  } catch (caught) {
    viewElement.innerHTML = errorState(caught.message);
  }
}

function setActiveNavigation(view) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelector(".sidebar")?.classList.remove("open");
}

async function handleGlobalClick(event) {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    await navigate(viewButton.dataset.view);
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;

  if (action === "logout") {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    state.authenticated = false;
    document.removeEventListener("click", handleGlobalClick);
    renderLogin();
  } else if (action === "toggle-nav") {
    document.querySelector(".sidebar")?.classList.toggle("open");
  } else if (action === "open-problem") {
    const id = event.target.closest("[data-problem-id]").dataset.problemId;
    await navigate("attempt", { id });
  } else if (action === "reveal-solution") {
    state.solutionRevealed = true;
    renderAttempt();
    showToast("Previous work is now visible. This attempt will be marked as solution-revealed.", "warning");
  } else if (action === "hide-solution") {
    state.solutionRevealed = false;
    renderAttempt();
  } else if (action === "refresh-dashboard") {
    await navigate("dashboard");
  }
}
