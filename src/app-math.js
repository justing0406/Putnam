const CATALOG_LATEX_STATEMENTS = {
  putnam_1962_a1: "Given five points in a plane, no three of which lie on a straight line, show that some four of these points form the vertices of a convex quadrilateral.",
  putnam_1962_a2: "Find every real-valued function \\(f\\) whose domain is an interval \\(I\\), finite or infinite, having \\(0\\) as a left-hand endpoint, such that for every positive \\(x\\in I\\), \\[ \\frac{1}{x}\\int_0^x f(t)\\,dt = \\sqrt{f(0)f(x)}. \\]",
  putnam_1962_a3: "Let \\(ABC\\) be a triangle, with \\(P,Q,R\\) on \\(BC,CA,AB\\), respectively, such that \\[ \\frac{AQ}{QC}=\\frac{BR}{RA}=\\frac{CP}{PB}=k>0. \\] If \\(UVW\\) is the triangle formed by the three cevians \\(AP,BQ,CR\\), prove that \\[ \\frac{[UVW]}{[ABC]}=\\frac{(k-1)^2}{k^2+k+1}. \\]",
  putnam_1962_a4: "Assume that \\(|f(x)|\\le 1\\) and \\(|f''(x)|\\le 1\\) for every \\(x\\) on an interval of length at least \\(2\\). Show that \\(|f'(x)|\\le 2\\) throughout the interval.",
  putnam_1962_a5: "Evaluate in closed form \\[ \\sum_{k=1}^{n} \\binom{n}{k}k^2. \\]",
};

for (const problem of STATIC_PUTNAM_CATALOG) {
  if (CATALOG_LATEX_STATEMENTS[problem.id]) {
    problem.statement = CATALOG_LATEX_STATEMENTS[problem.id];
  }
}

let mathRenderTimer = null;
let mathRenderRunning = false;
let mathRenderChain = Promise.resolve();

function scheduleMathRendering(attempt = 0) {
  clearTimeout(mathRenderTimer);
  mathRenderTimer = setTimeout(() => {
    const target = document.querySelector("#view") || document.querySelector("#app");
    if (!target || mathRenderRunning) return;

    if (!window.MathJax?.typesetPromise) {
      if (attempt < 40) scheduleMathRendering(attempt + 1);
      return;
    }

    mathRenderChain = mathRenderChain
      .then(async () => {
        mathRenderRunning = true;
        await window.MathJax.typesetPromise([target]);
      })
      .catch((error) => console.error("Math rendering failed", error))
      .finally(() => {
        mathRenderRunning = false;
      });
  }, attempt ? 100 : 0);
}

const mathObserver = new MutationObserver(() => {
  if (!mathRenderRunning) scheduleMathRendering();
});

mathObserver.observe(document.querySelector("#app"), {
  childList: true,
  subtree: true,
});

window.addEventListener("load", () => scheduleMathRendering());
scheduleMathRendering();
