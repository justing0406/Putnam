const basePutnamParseCommand = PutnamLatexParser.prototype.parseCommand;

PutnamLatexParser.prototype.parseCommand = function parseExtendedPutnamCommand() {
  const commandStart = this.position;
  if (this.source[this.position] !== "\\") return basePutnamParseCommand.call(this);

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

  const fontVariants = {
    mathbb: "double-struck",
    mathcal: "script",
    mathscr: "script",
    mathfrak: "fraktur",
    mathrm: "normal",
   mathrm: "normal",
    mathbf: "bold",
   mathbf: "bold",
    boldsymbol: "bold",
  };
  if (fontVariants[command]) {
    return `<mstyle mathvariant="${fontVariants[command]}">${this.parseRequiredGroup()}</mstyle>`;
  }

  if (["tfrac", "dfrac"].includes(command)) {
    const numerator = this.parseRequiredGroup();
    const denominator = this.parseRequiredGroup();
    return `<mfrac>${numerator}${denominator}</mfrac>`;
  }

  if (command === "boxed") {
    return `<menclose notation="box">${this.parseRequiredGroup()}</menclose>`;
  }

  if (command === "pmod" || command === "mod") {
    const modulus = command === "pmod" ? this.parseRequiredGroup() : "";
    return `<mrow><mspace width=".35em"/><mo>(</mo><mi mathvariant="normal">mod</mi>${modulus}<mo>)</mo></mrow>`;
  }

  const namedFunctions = new Set([
    "sin", "cos", "tan", "cot", "sec", "csc", "sinh", "cosh", "tanh",
    "log", "ln", "exp", "det", "gcd", "lcm", "ker", "dim", "rank",
    "max", "min", "sup", "inf", "limsup", "liminf", "arg", "Pr",
  ]);
  if (namedFunctions.has(command)) return `<mi mathvariant="normal">${escapeMath(command)}</mi>`;

  const extendedSymbols = {
    lVert: "‖", rVert: "‖", Vert: "‖",
    lceil: "⌈", rceil: "⌉", lfloor: "⌊", rfloor: "⌋",
    ldots: "…", dots: "…", cdots: "⋯", vdots: "⋮", ddots: "⋱",
    circ: "∘", bullet: "•", star: "★",
    opulus: "⊕", oplus: "⊕", otimes: "⊗", odot: "⊙",
    partial: "∂", nabla: "∇", ell: "ℓ",
    varepsilon: "ε", vartheta: "ϑ", varphi: "ϕ", varrho: "ϱ", varsigma: "ς",
    Re: "ℜ", Im: "ℑ", aleph: "ℵ",
    colon: ":", sim: "∼", approx: "≈", equiv: "≡", propto: "∝",
    not: "¬", land: "∧", lor: "∨",
    uplus: "⊎", bigcup: "⋃", bigcap: "⋂",
  };
  if (extendedSymbols[command]) return `<mo>${escapeMath(extendedSymbols[command])}</mo>`;

  if (command === "{" || command === "}") return `<mo>${escapeMath(command)}</mo>`;

  if (command === "begin" || command === "end") {
    const environment = this.readRawGroup();
    const opening = command === "begin";
    if (environment === "cases") return opening ? "<mo>{</mo>" : "";
    if (environment === "bmatrix") return `<mo>${opening ? "[" : "]"}</mo>`;
    if (environment === "pmatrix") return `<mo>${opening ? "(" : ")"}</mo>`;
    if (environment === "Bmatrix") return `<mo>${opening ? "{" : "}"}</mo>`;
    if (environment === "vmatrix") return "<mo>|</mo>";
    if (environment === "Vmatrix") return "<mo>‖</mo>";
    return "";
  }

  if (command === "displaystyle" || command === "textstyle") return "";

  this.position = commandStart;
  return basePutnamParseCommand.call(this);
};
