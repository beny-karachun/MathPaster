/* ── State ── */
let insertMode = "inline";
let mfReady = false;

const mf       = document.getElementById("mf");
const latexEl  = document.getElementById("latex-code");
const palette  = document.getElementById("palette");
const loading  = document.getElementById("loading");

/* ── Live preview ── */
function updatePreview() {
  const raw = mf.value || "";
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
const PALETTE = [
  { label: "α",   latex: "\\alpha" },
  { label: "β",   latex: "\\beta" },
  { label: "γ",   latex: "\\gamma" },
  { label: "θ",   latex: "\\theta" },
  { label: "π",   latex: "\\pi" },
  { label: "σ",   latex: "\\sigma" },
  { label: "Σ",   latex: "\\sum" },
  { label: "∫",   latex: "\\int" },
  { label: "∞",   latex: "\\infty" },
  { label: "√",   latex: "\\sqrt{#0}" },
  { label: "x²",  latex: "#0^{2}" },
  { label: "frac", latex: "\\frac{#0}{#1}" },
  { label: "lim",  latex: "\\lim_{#0}" },
  { label: "→",   latex: "\\to" },
  { label: "≠",   latex: "\\neq" },
  { label: "≤",   latex: "\\leq" },
  { label: "≥",   latex: "\\geq" },
  { label: "±",   latex: "\\pm" },
  { label: "∂",   latex: "\\partial" },
  { label: "∇",   latex: "\\nabla" },
  { label: "[ ]",  latex: "\\begin{bmatrix} #0 \\end{bmatrix}" },
];

/* ── Populate palette ── */
for (const item of PALETTE) {
  const btn = document.createElement("button");
  btn.className = "pal-btn";
  btn.textContent = item.label;
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

/* ── Mode toggle ── */
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    insertMode = btn.dataset.mode;
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
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
      mf.value = "";
      latexEl.textContent = "";
      // Reset mode to inline
      insertMode = "inline";
      document.querySelectorAll(".mode-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.mode === "inline");
      });
      setTimeout(() => { try { mf.focus(); } catch {} }, 100);
    }
  }
});
