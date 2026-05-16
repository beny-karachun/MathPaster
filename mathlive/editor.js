/* ── State ── */
let insertMode = "inline";
let mfReady = false;

const mf       = document.getElementById("mf");
const latexEl  = document.getElementById("latex-code");
const palette  = document.getElementById("palette");
const loading  = document.getElementById("loading");

/* ── Live preview & Caching ── */
function updatePreview() {
  const raw = mf.value || "";
  localStorage.setItem("mathpaster_draft", raw);
  if (!raw) { latexEl.textContent = ""; return; }
  latexEl.textContent = insertMode === "block" ? `$$${raw}$$` : `$${raw}$`;
}

/* ── Register <math-field> custom element from UMD build ── */
function initMathField() {
  try {
    const MFE = window.MathLive?.MathfieldElement || window.MathfieldElement;

    if (!MFE) {
      loading.textContent = "Failed to load math engine: MathfieldElement is undefined.";
      return;
    }

    // Configure fonts
    try {
      MFE.fontsDirectory = "./lib/fonts/";
      MFE.soundsDirectory = null;
    } catch (e) {
      console.warn("Could not set fontsDirectory:", e);
    }

    if (!customElements.get("math-field")) {
      customElements.define("math-field", MFE);
    }

    customElements.whenDefined("math-field").then(() => {
      mfReady = true;
      loading.classList.add("hidden");
      mf.style.display = "block";
      mf.addEventListener("input", updatePreview);
      window.parent.postMessage({ mathpaster: "ready" }, "*");
    }).catch(err => {
      loading.textContent = "Error defining math-field: " + err.message;
    });

  } catch (err) {
    loading.textContent = "Init Error: " + err.message;
  }
}

// Initialize
initMathField();

/* ── Palette data ── */
const PALETTE_DATA = {
  "Common": [
    { label: "α",   latex: "\\alpha" },
    { label: "β",   latex: "\\beta" },
    { label: "γ",   latex: "\\gamma" },
    { label: "θ",   latex: "\\theta" },
    { label: "π",   latex: "\\pi" },
    { label: "σ",   latex: "\\sigma" },
    { label: "Σ",   latex: "\\sum" },
    { label: "√",   latex: "\\sqrt{#0}" },
    { label: "x²",  latex: "#0^{2}" },
    { label: "<div style='display:flex;flex-direction:column;font-size:11.5px;line-height:1;align-items:center;'><span style='border-bottom:1px solid currentColor;padding:0 3px 1px 3px;'>⬚</span><span style='padding-top:2px;'>⬚</span></div>", latex: "\\frac{#0}{#1}" },
    { label: "±",   latex: "\\pm" },
    { label: "≠",   latex: "\\neq" },
    { label: "≤",   latex: "\\leq" },
    { label: "≥",   latex: "\\geq" },
    { label: "→",   latex: "\\to" },
    { label: "∞",   latex: "\\infty" },
  ],
  "Calculus": [
    { label: "∫",   latex: "\\int" },
    { label: "<div style='display:flex;align-items:center;'><span style='font-size:25px;'>∫</span><div style='display:flex;flex-direction:column;font-size:11.5px;line-height:1;margin-left:2px;'><span>b</span><span style='margin-top:7px;'>a</span></div></div>", latex: "\\int_{#0}^{#1}" },
    { label: "∬",  latex: "\\iint" },
    { label: "∬<sub style='font-size:11.5px;margin-left:-2px;margin-top:9px;'>D</sub>", latex: "\\iint_{#0}^{#1}" },
    { label: "∭",  latex: "\\iiint" },
    { label: "∭<sub style='font-size:11.5px;margin-left:-2px;margin-top:9px;'>V</sub>", latex: "\\iiint_{#0}^{#1}" },
    { label: "∮",  latex: "\\oint" },
    { label: "∮<sub style='font-size:11.5px;margin-left:-2px;margin-top:9px;'>C</sub>", latex: "\\oint_{#0}^{#1}" },
    { label: "lim",  latex: "\\lim_{#0}" },
    { label: "∂",   latex: "\\partial" },
    { label: "∇",   latex: "\\nabla" },
    { label: "<div style='display:flex;flex-direction:column;font-size:12.5px;line-height:1.1;align-items:center;'><span style='border-bottom:1px solid currentColor;padding:0 2px;'>d</span><span>dx</span></div>", latex: "\\frac{d}{dx}" },
    { label: "∑",   latex: "\\sum" },
    { label: "<div style='display:flex;align-items:center;'><span style='font-size:21px;'>∑</span><div style='display:flex;flex-direction:column;font-size:10.5px;line-height:1.1;margin-left:2px;'><span>n</span><span style='margin-top:5px;'>i</span></div></div>", latex: "\\sum_{#0}^{#1}" },
    { label: "∏",   latex: "\\prod" },
    { label: "<div style='display:flex;align-items:center;'><span style='font-size:21px;'>∏</span><div style='display:flex;flex-direction:column;font-size:10.5px;line-height:1.1;margin-left:2px;'><span>n</span><span style='margin-top:5px;'>i</span></div></div>", latex: "\\prod_{#0}^{#1}" },
    { label: "<span style='font-size:16px;'>prime ( ' )</span>", latex: "'" },
  ],
  "Linear Algebra": [
    { label: "[ ]",  latex: "\\begin{bmatrix} #0 \\end{bmatrix}" },
    { label: "( )",  latex: "\\begin{pmatrix} #0 \\end{pmatrix}" },
    { label: "| |",  latex: "\\begin{vmatrix} #0 \\end{vmatrix}" },
    { label: "det",  latex: "\\det" },
    { label: "Tr",   latex: "\\operatorname{Tr}" },
    { label: "dim",  latex: "\\dim" },
    { label: "ker",  latex: "\\ker" },
    { label: "⊗",   latex: "\\otimes" },
    { label: "⊕",   latex: "\\oplus" },
    { label: "⋅",   latex: "\\cdot" },
    { label: "×",   latex: "\\times" },
  ],
  "Statistics": [
    { label: "μ", latex: "\\mu" },
    { label: "σ", latex: "\\sigma" },
    { label: "σ²", latex: "\\sigma^2" },
    { label: "ρ", latex: "\\rho" },
    { label: "E[X]", latex: "\\mathbb{E}[X]" },
    { label: "Var", latex: "\\operatorname{Var}" },
    { label: "Cov", latex: "\\operatorname{Cov}" },
    { label: "P(A)", latex: "\\mathbb{P}(A)" },
    { label: "∼", latex: "\\sim" },
    { label: "≈", latex: "\\approx" },
    { label: "∝", latex: "\\propto" },
    { label: "binom", latex: "\\binom{#0}{#1}" },
  ],
  "Groups": [
    { label: "ℝ", latex: "\\mathbb{R}" },
    { label: "ℂ", latex: "\\mathbb{C}" },
    { label: "ℤ", latex: "\\mathbb{Z}" },
    { label: "ℕ", latex: "\\mathbb{N}" },
    { label: "ℚ", latex: "\\mathbb{Q}" },
    { label: "∈", latex: "\\in" },
    { label: "∉", latex: "\\notin" },
    { label: "⊂", latex: "\\subset" },
    { label: "⊆", latex: "\\subseteq" },
    { label: "∪", latex: "\\cup" },
    { label: "∩", latex: "\\cap" },
    { label: "∅", latex: "\\emptyset" },
    { label: "∖", latex: "\\setminus" },
  ],
  "Logic": [
    { label: "∀", latex: "\\forall" },
    { label: "∃", latex: "\\exists" },
    { label: "∄", latex: "\\nexists" },
    { label: "⇒", latex: "\\implies" },
    { label: "⇔", latex: "\\iff" },
    { label: "∧", latex: "\\land" },
    { label: "∨", latex: "\\lor" },
    { label: "¬", latex: "\\neg" },
    { label: "∴", latex: "\\therefore" },
    { label: "∵", latex: "\\because" },
    { label: "≡", latex: "\\equiv" },
    { label: "⊤", latex: "\\top" },
    { label: "⊥", latex: "\\bot" },
  ],
  "Greek": [
    { label: "α", latex: "\\alpha" },
    { label: "β", latex: "\\beta" },
    { label: "γ", latex: "\\gamma" },
    { label: "δ", latex: "\\delta" },
    { label: "ϵ", latex: "\\epsilon" },
    { label: "ε", latex: "\\varepsilon" },
    { label: "ζ", latex: "\\zeta" },
    { label: "η", latex: "\\eta" },
    { label: "θ", latex: "\\theta" },
    { label: "ϑ", latex: "\\vartheta" },
    { label: "ι", latex: "\\iota" },
    { label: "κ", latex: "\\kappa" },
    { label: "ϰ", latex: "\\varkappa" },
    { label: "λ", latex: "\\lambda" },
    { label: "μ", latex: "\\mu" },
    { label: "ν", latex: "\\nu" },
    { label: "ξ", latex: "\\xi" },
    { label: "ο", latex: "o" },
    { label: "π", latex: "\\pi" },
    { label: "ϖ", latex: "\\varpi" },
    { label: "ρ", latex: "\\rho" },
    { label: "ϱ", latex: "\\varrho" },
    { label: "σ", latex: "\\sigma" },
    { label: "ς", latex: "\\varsigma" },
    { label: "τ", latex: "\\tau" },
    { label: "υ", latex: "\\upsilon" },
    { label: "ϕ", latex: "\\phi" },
    { label: "φ", latex: "\\varphi" },
    { label: "χ", latex: "\\chi" },
    { label: "ψ", latex: "\\psi" },
    { label: "ω", latex: "\\omega" },
    { label: "Γ", latex: "\\Gamma" },
    { label: "Δ", latex: "\\Delta" },
    { label: "Θ", latex: "\\Theta" },
    { label: "Λ", latex: "\\Lambda" },
    { label: "Ξ", latex: "\\Xi" },
    { label: "Π", latex: "\\Pi" },
    { label: "Σ", latex: "\\Sigma" },
    { label: "Υ", latex: "\\Upsilon" },
    { label: "Φ", latex: "\\Phi" },
    { label: "Ψ", latex: "\\Psi" },
    { label: "Ω", latex: "\\Omega" }
  ]
};

/* ── Populate palette & tabs ── */
const categoryTabs = document.getElementById("category-tabs");

function renderPalette(categoryName) {
  palette.innerHTML = "";
  const items = PALETTE_DATA[categoryName] || [];
  for (const item of items) {
    const btn = document.createElement("button");
    btn.className = "pal-btn";
    btn.innerHTML = item.label;
    btn.title = item.latex;
    btn.addEventListener("mousedown", e => e.preventDefault()); // don't steal focus
    btn.addEventListener("click", e => {
      e.preventDefault();
      if (!mfReady) return;
      mf.executeCommand(["insert", item.latex]);
      mf.focus();
    });
    palette.appendChild(btn);
  }
}

let activeCategory = Object.keys(PALETTE_DATA)[0];

for (const cat of Object.keys(PALETTE_DATA)) {
  const tab = document.createElement("button");
  tab.className = "cat-tab" + (cat === activeCategory ? " active" : "");
  tab.textContent = cat;
  tab.addEventListener("click", () => {
    document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderPalette(cat);
  });
  categoryTabs.appendChild(tab);
}

// Initial render
renderPalette(activeCategory);

/* ── Mode toggle ── */
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    insertMode = btn.dataset.mode;
    localStorage.setItem("mathpaster_mode", insertMode);
    updatePreview();
    if (mfReady) mf.focus();
  });
});

/* ── Close ── */
document.getElementById("close-btn").addEventListener("click", () => {
  window.parent.postMessage({ mathpaster: "close" }, "*");
});

/* ── Insert ── */
function doInsert() {
  const raw = (mf.value || "").trim();
  if (!raw) return;
  const wrap = insertMode === "block" ? `$$${raw}$$` : `$${raw}$`;
  localStorage.removeItem("mathpaster_draft");
  window.parent.postMessage({ mathpaster: "insert", latex: wrap }, "*");
}
document.getElementById("insert-btn").addEventListener("click", doInsert);

/* ── Copy ── */
document.getElementById("copy-btn").addEventListener("click", () => {
  const raw = (mf.value || "").trim();
  if (!raw) return;
  const wrap = insertMode === "block" ? `$$${raw}$$` : `$${raw}$`;
  navigator.clipboard.writeText(wrap).then(() => {
    window.parent.postMessage({ mathpaster: "toast", text: "Copied to clipboard!" }, "*");
  }).catch(() => {
    // Fallback: select the code element so user can Ctrl+C
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(latexEl);
    sel.removeAllRanges();
    sel.addRange(range);
  });
});

/* ── Keyboard shortcuts ── */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ mathpaster: "close" }, "*");
    return;
  }
  // Ctrl+Enter → insert
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    e.stopPropagation();
    doInsert();
    return;
  }
  // Ctrl+M inside iframe → toggle (close)
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "m" || e.code === "KeyM")) {
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ mathpaster: "toggle" }, "*");
    return;
  }
}, true);

/* ── Messages from content script ── */
window.addEventListener("message", e => {
  if (e.data?.mathpaster === "reset") {
    if (mfReady) {
      const draft = localStorage.getItem("mathpaster_draft") || "";
      mf.value = draft;
      
      insertMode = localStorage.getItem("mathpaster_mode") || "inline";
      document.querySelectorAll(".mode-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.mode === insertMode);
      });
      
      updatePreview();
      setTimeout(() => { try { mf.focus(); } catch {} }, 100);
    }
  }
});
