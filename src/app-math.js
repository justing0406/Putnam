const CATALOG_LATEX_STATEMENTS = {
  putnam_1962_a1: "Given five points in a plane, no three of which lie on a straight line, show that some four of these points form the vertices of a convex quadrilateral.",
  putnam_1962_a2: "Find every real-valued function \\(f\\) whose domain is an interval \\(I\\), finite or infinite, having \\(0\\) as a left-hand endpoint, such that for every positive \\(x\\in I\\), \\[ \\frac{1}{x}\\int_0^x f(t)\\,dt = \\sqrt{f(0)f(x)}. \\]",
  putnam_1962_a3: "Let \\(ABC\\) be a triangle, with \\(P,Q,R\\) on \\(BC,CA,AB\\), respectively, such that \\[ \\frac{AQ}{QC}=\\frac{BR}{RA}=\\frac{CP}{PB}=k>0. \\] If \\(UVW\\) is the triangle formed by the three cevians \\(AP,BQ,CR\\), prove that \\[ \\frac{[UVW]}{[ABC]}=\\frac{(k-1)^2}{k^2+k+1}. \\]",
  putnam_1962_a4: "Assume that \\(|f(x)|\\le 1\\) and \\(|f''(x)|\\le 1\\) for every \\(x\\) on an interval of length at least \\(2\\). Show that \\(|f'(x)|\\le 2\\) throughout the interval.",
  putnam_1962_a5: "Evaluate in closed form \\[ \\sum_{k=1}^{n} \\binom{n}{k}k^2. \\]",
};

const LEGACY_STATEMENT_LATEX = new Map([
  [
    "Find every real-valued function f whose domain is an interval I (finite or infinite) having 0 as a left-hand endpoint, such that for every positive x in I the average of f over [0,x] equals the geometric mean of f(0) and f(x).",
    CATALOG_LATEX_STATEMENTS.putnam_1962_a2,
  ],
  [
    "Let ABC be a triangle, with P,Q,R on BC,CA,AB respectively such that AQ/QC = BR/RA = CP/PB = k>0. If UVW is the triangle formed by the three cevians AP,BQ,CR, prove that [UVW]/[ABC] = (k-1)^2/(k^2+k+1).",
    CATALOG_LATEX_STATEMENTS.putnam_1962_a3,
  ],
  [
    "Assume |f(x)|<=1 and |f''(x)|<=1 for all x on an interval of length at least 2. Show that |f'(x)|<=2 on the interval.",
    CATALOG_LATEX_STATEMENTS.putnam_1962_a4,
  ],
  [
    "Evaluate in closed form sum_{k=1}^n binom(n,k) k^2.",
    CATALOG_LATEX_STATEMENTS.putnam_1962_a5,
  ],
]);

for (const problem of STATIC_PUTNAM_CATALOG) {
  if (CATALOG_LATEX_STATEMENTS[problem.id]) problem.statement = CATALOG_LATEX_STATEMENTS[problem.id];
}

const MATHML_NS = "http://www.w3.org/1998/Math/MathML";
const MATH_COMMANDS = new Map([
  ["le", "≤"], ["leq", "≤"], ["ge", "≥"], ["geq", "≥"], ["ne", "≠"], ["neq", "≠"],
  ["in", "∈"], ["notin", "∉"], ["subset", "⊂"], ["subseteq", "⊆"], ["supset", "⊃"], ["supseteq", "⊇"],
  ["to", "→"], ["rightarrow", "→"], ["leftarrow", "←"], ["mapsto", "↦"], ["iff", "⇔"], ["implies", "⇒"],
  ["cdot", "·"], ["times", "×"], ["pm", "±"], ["mp", "∓"], ["div", "÷"],
  ["cup", "∪"], ["cap", "∩"], ["setminus", "∖"], ["emptyset", "∅"],
  ["forall", "∀"], ["exists", "∃"], ["nexists", "∄"], ["infty", "∞"],
  ["lvert", "|"], ["rvert", "|"], ["vert", "|"], ["mid", "∣"],
  ["angle", "∠"], ["triangle", "△"], ["parallel", "∥"], ["perp", "⊥"],
  ["alpha", "α"], ["beta", "β"], ["gamma", "γ"], ["delta", "δ"], ["epsilon", "ε"],
  ["theta", "θ"], ["lambda", "λ"], ["mu", "μ"], ["pi", "π"], ["rho", "ρ"],
  ["sigma", "σ"], ["tau", "τ"], ["phi", "φ"], ["omega", "ω"],
]);

class PutnamLatexParser {
  constructor(source) {
    this.source = String(source || "");
    this.position = 0;
  }

  parse() {
    return `<mrow>${this.parseExpression()}</mrow>`;
  }

  parseExpression(stopCharacter = null) {
    const nodes = [];
    while (this.position < this.source.length) {
      if (stopCharacter && this.source[this.position] === stopCharacter) break;
      if (/\s/.test(this.source[this.position])) {
        this.position += 1;
        continue;
      }

      let atom = this.parseAtom();
      if (!atom) continue;

      let subscript = null;
      let superscript = null;
      this.skipSpaces();
      while (this.source[this.position] === "_" || this.source[this.position] === "^") {
        const marker = this.source[this.position++];
        const argument = this.parseScriptArgument();
        if (marker === "_") subscript = argument;
        else superscript = argument;
        this.skipSpaces();
      }

      if (subscript && superscript) atom = `<msubsup>${atom}${subscript}${superscript}</msubsup>`;
      else if (subscript) atom = `<msub>${atom}${subscript}</msub>`;
      else if (superscript) atom = `<msup>${atom}${superscript}</msup>`;
      nodes.push(atom);
    }
    return nodes.join("");
  }

  parseAtom() {
    const character = this.source[this.position];
    if (!character) return "";

    if (character === "{") return this.parseGroup();
    if (character === "\\") return this.parseCommand();

    if (/\d/.test(character)) {
      const start = this.position;
      while (/[\d.]/.test(this.source[this.position] || "")) this.position += 1;
      return `<mn>${escapeMath(this.source.slice(start, this.position))}</mn>`;
    }

    if (/[A-Za-z]/.test(character)) {
      this.position += 1;
      return `<mi>${escapeMath(character)}</mi>`;
    }

    this.position += 1;
    const operators = {
      "+": "+", "-": "−", "=": "=", "<": "<", ">": ">", "/": "/", "*": "∗",
      "(": "(", ")": ")", "[": "[", "]": "]", "|": "|", ",": ",", ".": ".", ":": ":", ";": ";",
      "'": "′", "!": "!",
    };
    return operators[character]
      ? `<mo>${escapeMath(operators[character])}</mo>`
      : `<mtext>${escapeMath(character)}</mtext>`;
  }

  parseCommand() {
    this.position += 1;
    let command = "";
    if (/[A-Za-z]/.test(this.source[this.position] || "")) {
      const start = this.position;
      while (/[A-Za-z]/.test(this.source[this.position] || "")) this.position += 1;
      command = this.source.slice(start, this.position);
    } else {
      command = this.source[this.position] || "";
      this.position += 1;
    }

    if (command === "frac") {
      const numerator = this.parseRequiredGroup();
      const denominator = this.parseRequiredGroup();
      return `<mfrac>${numerator}${denominator}</mfrac>`;
    }

    if (command === "sqrt") return `<msqrt>${this.parseRequiredGroup()}</msqrt>`;

    if (command === "binom") {
      const top = this.parseRequiredGroup();
      const bottom = this.parseRequiredGroup();
      return `<mrow><mo>(</mo><mfrac linethickness="0">${top}${bottom}</mfrac><mo>)</mo></mrow>`;
    }

    if (command === "overline") return `<mover>${this.parseRequiredGroup()}<mo>¯</mo></mover>`;
    if (command === "underline") return `<munder>${this.parseRequiredGroup()}<mo>_</mo></munder>`;

    if (command === "text" || command === "operatorname") {
      const text = this.readRawGroup();
      return command === "operatorname"
        ? `<mi mathvariant="normal">${escapeMath(text)}</mi>`
        : `<mtext>${escapeMath(text)}</mtext>`;
    }

    if (command === "int") return "<mo>∫</mo>";
    if (command === "sum") return "<mo>∑</mo>";
    if (command === "prod") return "<mo>∏</mo>";
    if (command === "lim") return '<mi mathvariant="normal">lim</mi>';

    if (command === "left" || command === "right") {
      this.skipSpaces();
      return this.parseAtom();
    }

    if ([",", ";", ":", "quad", "qquad"].includes(command)) {
      const widths = { ",": ".18em", ";": ".3em", ":": ".22em", quad: "1em", qquad: "2em" };
      return `<mspace width="${widths[command]}"/>`;
    }
    if (command === "!") return '<mspace width="-.15em"/>';
    if (command === "\\") return '<mspace linebreak="newline"/>';

    if (MATH_COMMANDS.has(command)) return `<mo>${escapeMath(MATH_COMMANDS.get(command))}</mo>`;
    return `<mi>${escapeMath(command)}</mi>`;
  }

  parseGroup() {
    if (this.source[this.position] !== "{") return "<mrow></mrow>";
    this.position += 1;
    const content = this.parseExpression("}");
    if (this.source[this.position] === "}") this.position += 1;
    return `<mrow>${content}</mrow>`;
  }

  parseRequiredGroup() {
    this.skipSpaces();
    if (this.source[this.position] === "{") return this.parseGroup();
    return `<mrow>${this.parseAtom()}</mrow>`;
  }

  parseScriptArgument() {
    this.skipSpaces();
    if (this.source[this.position] === "{") return this.parseGroup();
    return `<mrow>${this.parseAtom()}</mrow>`;
  }

  readRawGroup() {
    this.skipSpaces();
    if (this.source[this.position] !== "{") return "";
    this.position += 1;
    const start = this.position;
    let depth = 1;
    while (this.position < this.source.length && depth > 0) {
      if (this.source[this.position] === "{") depth += 1;
      else if (this.source[this.position] === "}") depth -= 1;
      this.position += 1;
    }
    return this.source.slice(start, Math.max(start, this.position - 1));
  }

  skipSpaces() {
    while (/\s/.test(this.source[this.position] || "")) this.position += 1;
  }
}

function escapeMath(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createMathElement(latex, displayMode) {
  const wrapper = document.createElement("span");
  wrapper.className = displayMode ? "putnam-math-display" : "putnam-math-inline";
  wrapper.dataset.putnamMath = "true";

  try {
    const markup = new PutnamLatexParser(latex).parse();
    wrapper.innerHTML = `<math xmlns="${MATHML_NS}" display="${displayMode ? "block" : "inline"}">${markup}</math>`;
  } catch (error) {
    console.error("Math rendering failed", error);
    wrapper.textContent = latex;
    wrapper.classList.add("putnam-math-fallback");
  }
  return wrapper;
}

function normalizeStatementText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function upgradeLegacyStatementMarkup(root) {
  root.querySelectorAll(".problem-statement > div, .catalog-statement").forEach((container) => {
    if (container.querySelector("[data-putnam-math]")) return;
    const replacement = LEGACY_STATEMENT_LATEX.get(normalizeStatementText(container.textContent));
    if (replacement) container.textContent = replacement;
  });
}

function renderMathInContainer(container) {
  if (container.querySelector("[data-putnam-math]")) return;
  const source = container.textContent || "";
  const pattern = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  if (!pattern.test(source)) return;
  pattern.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  let match;
  while ((match = pattern.exec(source))) {
    if (match.index > cursor) fragment.append(document.createTextNode(source.slice(cursor, match.index)));
    const displayMode = match[1] !== undefined;
    fragment.append(createMathElement(displayMode ? match[1] : match[2], displayMode));
    cursor = pattern.lastIndex;
  }
  if (cursor < source.length) fragment.append(document.createTextNode(source.slice(cursor)));
  container.replaceChildren(fragment);
}

let mathRenderScheduled = false;
let mathRenderRunning = false;

function renderAllMath() {
  if (mathRenderRunning) return;
  const target = document.querySelector("#view") || document.querySelector("#app");
  if (!target) return;

  mathRenderRunning = true;
  try {
    upgradeLegacyStatementMarkup(target);
    target.querySelectorAll(".catalog-statement, .problem-statement > div, .solution-text, .history-text").forEach(renderMathInContainer);
  } finally {
    mathRenderRunning = false;
  }
}

function scheduleMathRendering() {
  if (mathRenderScheduled) return;
  mathRenderScheduled = true;
  requestAnimationFrame(() => {
    mathRenderScheduled = false;
    renderAllMath();
  });
}

const mathObserver = new MutationObserver(() => {
  if (!mathRenderRunning) scheduleMathRendering();
});

mathObserver.observe(document.querySelector("#app"), { childList: true, subtree: true });
window.addEventListener("load", scheduleMathRendering);
scheduleMathRendering();
