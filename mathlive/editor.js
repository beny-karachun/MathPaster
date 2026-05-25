/* ── State ── */
let insertMode = "inline";
let mfReady = false;
let defaultShortcuts = null;

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
      if (window.mathVirtualKeyboard) {
        window.mathVirtualKeyboard.container = document.getElementById("keyboard-container");
      }
    } catch (e) {
      console.warn("Could not set MathfieldElement properties:", e);
    }

    if (!customElements.get("math-field")) {
      customElements.define("math-field", MFE);
    }

    customElements.whenDefined("math-field").then(() => {
      mfReady = true;
      
      // Prevent virtual keyboard from automatically popping up on focus
      mf.mathVirtualKeyboardPolicy = "manual";
      mf.setAttribute("math-virtual-keyboard-policy", "manual");
      
      defaultShortcuts = mf.getOption ? mf.getOption("inlineShortcuts") : mf.inlineShortcuts;
      
      const savedAuto = localStorage.getItem("mathpaster_autosymbols");
      if (savedAuto === "false") {
        document.getElementById("auto-symbol-switch").checked = false;
        document.querySelector("#auto-symbol-selector .mode-label").classList.remove("active");
        if (mf.setOptions) mf.setOptions({ inlineShortcuts: {}, mathModeSpace: "\\:" });
        else { mf.inlineShortcuts = {}; mf.mathModeSpace = "\\:"; }
      } else {
        if (mf.setOptions) mf.setOptions({ mathModeSpace: "\\:" });
        else mf.mathModeSpace = "\\:";
      }

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

// Guarantee the iframe window claims focus on ANY click before MathLive can preventDefault
window.addEventListener("mousedown", () => {
  window.focus();
}, true);

// Enforce focus when clicking anywhere inside the editor wrap or the empty space of the math field
document.getElementById("mf-wrap").addEventListener("mousedown", (e) => {
  if (e.target === document.getElementById("mf-wrap") || e.target === mf) {
    e.preventDefault();
    if (mfReady && mf) {
      window.focus();
      mf.focus();
      try { mf.executeCommand("moveToMathFieldEnd"); } catch(err) {}
      try { mf.executeCommand("moveToRightEnd"); } catch(err) {}
    }
  }
});

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
    { label: "[ ]",  matrixType: "bmatrix" },
    { label: "( )",  matrixType: "pmatrix" },
    { label: "| |",  matrixType: "vmatrix" },
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
      if (item.matrixType) {
        showMatrixSelector(btn, item.matrixType);
      } else {
        mf.executeCommand(["insert", item.latex]);
        window.focus();
        mf.focus();
      }
    });
    palette.appendChild(btn);
  }
}

let activeCategory = Object.keys(PALETTE_DATA)[0];

for (const cat of Object.keys(PALETTE_DATA)) {
  const tab = document.createElement("button");
  tab.className = "cat-tab" + (cat === activeCategory ? " active" : "");
  tab.textContent = cat;
  tab.addEventListener("mousedown", e => e.preventDefault()); // don't steal focus
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
const modeSwitch = document.getElementById("mode-switch");
const modeLabels = document.querySelectorAll(".mode-label");

function updateModeUI(mode) {
  insertMode = mode;
  modeSwitch.checked = (mode === "block");
  modeLabels.forEach(l => l.classList.toggle("active", l.dataset.mode === mode));
  localStorage.setItem("mathpaster_mode", insertMode);
  updatePreview();
  if (mfReady) { window.focus(); mf.focus(); }
}

modeSwitch.addEventListener("change", e => {
  updateModeUI(e.target.checked ? "block" : "inline");
});

modeLabels.forEach(l => {
  l.addEventListener("click", () => updateModeUI(l.dataset.mode));
});

/* ── Auto-Symbols toggle ── */
const autoSymbolSwitch = document.getElementById("auto-symbol-switch");
const autoSymbolLabel = document.querySelector("#auto-symbol-selector .mode-label");

if (autoSymbolLabel) {
  autoSymbolLabel.addEventListener("click", () => {
    autoSymbolSwitch.checked = !autoSymbolSwitch.checked;
    autoSymbolSwitch.dispatchEvent(new Event("change"));
  });
}

autoSymbolSwitch.addEventListener("change", e => {
  const isAuto = e.target.checked;
  if (isAuto) {
    autoSymbolLabel.classList.add("active");
    if (mfReady && mf) {
      if (mf.setOptions) mf.setOptions({ inlineShortcuts: defaultShortcuts || {} });
      else mf.inlineShortcuts = defaultShortcuts || {};
    }
  } else {
    autoSymbolLabel.classList.remove("active");
    if (mfReady && mf) {
      if (mf.setOptions) mf.setOptions({ inlineShortcuts: {} });
      else mf.inlineShortcuts = {};
    }
  }
  localStorage.setItem("mathpaster_autosymbols", isAuto ? "true" : "false");
  if (mfReady) { window.focus(); mf.focus(); }
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
document.getElementById("insert-btn").addEventListener("mousedown", e => e.preventDefault());
document.getElementById("insert-btn").addEventListener("click", doInsert);

/* ── Copy ── */
document.getElementById("copy-btn").addEventListener("mousedown", e => e.preventDefault());
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
  // Ctrl+Backspace inside mathfield -> delete word backward
  if (e.key === "Backspace" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    e.stopPropagation();
    if (mfReady && mf) {
      mf.executeCommand("deletePreviousWord");
    }
    return;
  }
  // Enter key when autocomplete popover is open → select & commit suggestion
  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    const popover = document.getElementById("mathlive-suggestion-popover");
    if (popover && popover.classList.contains("is-visible")) {
      const activeItem = popover.querySelector(".ML__popover__current");
      if (activeItem) {
        e.preventDefault();
        e.stopPropagation();
        activeItem.click();
        return;
      }
    }
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
  // Alt+K inside iframe → toggle virtual keyboard
  if (e.altKey && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
    e.preventDefault();
    e.stopPropagation();
    if (window.mathVirtualKeyboard) {
      if (window.mathVirtualKeyboard.visible) {
        window.mathVirtualKeyboard.hide();
      } else {
        window.mathVirtualKeyboard.show();
        setTimeout(() => { if (mfReady && mf) mf.focus(); }, 50);
      }
    }
    return;
  }
}, true);

/* ── Messages from content script ── */
window.addEventListener("message", e => {
  if (e.data?.mathpaster === "reset") {
    if (mfReady) {
      let draft = "";
      
      if (e.data.initialMath) {
        draft = e.data.initialMath.text;
        insertMode = e.data.initialMath.mode;
        // Also update local storage so it persists if they reload or toggle again without inserting
        localStorage.setItem("mathpaster_draft", draft);
        localStorage.setItem("mathpaster_mode", insertMode);
      } else {
        draft = localStorage.getItem("mathpaster_draft") || "";
        insertMode = localStorage.getItem("mathpaster_mode") || "inline";
      }

      mf.value = draft;
      
      document.getElementById("mode-switch").checked = (insertMode === "block");
      document.querySelectorAll(".mode-label").forEach(l => {
        l.classList.toggle("active", l.dataset.mode === insertMode);
      });
      
      updatePreview();
      setTimeout(() => { try { window.focus(); mf.focus(); } catch {} }, 100);
    }
  }
});

/* ── Matrix Selector Logic ── */
let currentMatrixType = null;
const matrixSelector = document.getElementById("matrix-selector");

function buildMatrixSelectorUI() {
  if (!matrixSelector) return;
  matrixSelector.innerHTML = "";
  
  const gridContainer = document.createElement("div");
  gridContainer.style.display = "flex";
  gridContainer.style.flexDirection = "column";
  gridContainer.style.gap = "6px";
  
  for (let r = 1; r <= 5; r++) {
    const row = document.createElement("div");
    row.className = "matrix-row";
    for (let c = 1; c <= 5; c++) {
      const cell = document.createElement("div");
      cell.className = "matrix-cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener("mouseenter", () => highlightGrid(r, c));
      cell.addEventListener("click", () => {
        insertMatrix(currentMatrixType, r, c);
        hideMatrixSelector();
      });
      row.appendChild(cell);
    }
    gridContainer.appendChild(row);
  }
  
  const label = document.createElement("div");
  label.id = "matrix-label";
  label.textContent = "1 x 1";
  
  matrixSelector.appendChild(gridContainer);
  matrixSelector.appendChild(label);
}

function highlightGrid(rows, cols) {
  const cells = document.querySelectorAll(".matrix-cell");
  cells.forEach(cell => {
    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);
    if (r <= rows && c <= cols) {
      cell.classList.add("highlight");
    } else {
      cell.classList.remove("highlight");
    }
  });
  const label = document.getElementById("matrix-label");
  if(label) label.textContent = `${rows} x ${cols}`;
}

function showMatrixSelector(anchorBtn, type) {
  currentMatrixType = type;
  const rect = anchorBtn.getBoundingClientRect();
  
  let leftPos = rect.left;
  if (leftPos + 180 > window.innerWidth) {
    leftPos = window.innerWidth - 180;
  }
  matrixSelector.style.left = `${Math.max(10, leftPos)}px`;
  
  // Try placing it below the button
  let topPos = rect.bottom + 6;
  // If it goes past bottom screen (approx 500px), place it above
  if (topPos + 180 > window.innerHeight) {
    topPos = rect.top - 180 - 6;
  }
  matrixSelector.style.top = `${topPos}px`;
  
  matrixSelector.classList.add("visible");
  highlightGrid(1, 1);
}

function hideMatrixSelector() {
  if(matrixSelector) matrixSelector.classList.remove("visible");
}

function insertMatrix(type, rows, cols) {
  if (!mfReady) return;
  // generate latex
  let inner = "";
  for (let r = 0; r < rows; r++) {
    let rowContent = [];
    for (let c = 0; c < cols; c++) {
      rowContent.push("#?");
    }
    inner += rowContent.join(" & ") + (r < rows - 1 ? " \\\\ " : "");
  }
  const latex = `\\begin{${type}}${inner}\\end{${type}}`;
  mf.executeCommand(["insert", latex]);
  window.focus();
  mf.focus();
}

document.addEventListener("click", e => {
  if (matrixSelector && matrixSelector.classList.contains("visible")) {
    if (!matrixSelector.contains(e.target) && !e.target.closest('.pal-btn')) {
      hideMatrixSelector();
    }
  }
});
document.addEventListener("mousedown", e => {
  if (
    !e.target.closest("#editor-window") && 
    !e.target.closest("#settings-panel") && 
    !e.target.closest("#matrix-selector") &&
    !e.target.closest("mathlive-virtual-keyboard") &&
    !e.target.closest(".MLK__container") &&
    !e.target.closest(".ML__keyboard")
  ) {
    window.parent.postMessage({ mathpaster: "close" }, "*");
  }
});

buildMatrixSelectorUI();

/* ── Settings Logic ── */
const defaultSettings = {
  popupWidth: 760,
  popupHeight: 550,
  gapSize: 8,
  symbolGridWidth: 52,
  symbolHeight: 46,
  symbolFontSize: 22,
  borderRadiusBtn: 11,
  tabPaddingH: 19,
  tabPaddingV: 10,
  tabFontSize: 12,
  borderRadiusTab: 30,
  actionBtnPaddingX: 28,
  actionBtnPaddingY: 12,
  actionBtnFontSize: 16,
  actionBtnRoundness: 14,
  primaryHue: 250,
  primarySat: 80,
  primaryLight: 65,
  bgHue: 236,
  bgSat: 30,
  bgLight: 12,
  showLatexBar: false,
  blurBackground: false
};

let currentSettings = { ...defaultSettings };

function applySettings(settings) {
  let scaleFactor = Math.min((window.innerWidth * 0.94) / settings.popupWidth, (window.innerHeight * 0.90) / settings.popupHeight);
  
  if (window.innerWidth <= 600 && window.frameElement) {
    scaleFactor = (window.innerWidth * 0.94) / settings.popupWidth;
    const scaledHeight = settings.popupHeight * scaleFactor;
    window.frameElement.style.setProperty('height', (scaledHeight + 40) + 'px', 'important');
  }

  let styleEl = document.getElementById('dynamic-theme');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-theme';
    document.head.appendChild(styleEl);
  }
  
  styleEl.innerHTML = `
    :root {
      --primary-hue: ${settings.primaryHue};
      --primary-sat: ${settings.primarySat}%;
      --primary-light: ${settings.primaryLight}%;
    }
    #editor-window {
      width: ${settings.popupWidth}px !important;
      height: ${settings.popupHeight}px !important;
      background: linear-gradient(145deg, 
        hsl(${settings.bgHue}, ${settings.bgSat}%, ${settings.bgLight + 6}%) 0%, 
        hsl(${settings.bgHue}, ${settings.bgSat}%, ${settings.bgLight}%) 50%, 
        hsl(${settings.bgHue}, ${settings.bgSat}%, ${Math.max(0, settings.bgLight - 5)}%) 100%) !important;
    }
    #latex-preview { display: ${settings.showLatexBar ? 'flex' : 'none'} !important; }
    #body { gap: ${settings.gapSize}px !important; }
    #category-tabs {
      gap: ${settings.gapSize}px !important;
      padding: 20px 24px 10px 24px !important;
      margin: -20px -24px 0 -24px !important;
    }
    #palette { grid-template-columns: repeat(auto-fill, minmax(${settings.symbolGridWidth}px, 1fr)) !important; gap: ${settings.gapSize}px !important; }
    #footer { gap: ${settings.gapSize}px !important; }
    .action-group { gap: ${settings.gapSize}px !important; }
    
    .pal-btn { height: ${settings.symbolHeight}px !important; font-size: ${settings.symbolFontSize}px !important; border-radius: ${settings.borderRadiusBtn}px !important; }
    
    .cat-tab { padding: ${settings.tabPaddingV}px ${settings.tabPaddingH}px !important; font-size: ${settings.tabFontSize}px !important; border-radius: ${settings.borderRadiusTab}px !important; }
    
    .icon, .header-btn, #close-btn, #settings-btn, .matrix-cell { border-radius: ${settings.borderRadiusBtn}px !important; }
    
    .btn {
      padding: ${settings.actionBtnPaddingY}px ${settings.actionBtnPaddingX}px !important;
      font-size: ${settings.actionBtnFontSize}px !important;
      border-radius: ${settings.actionBtnRoundness}px !important;
    }
    
    /* Dynamic Mobile Proportionate Scaling */
    @media (max-width: 600px) {
      body {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
        height: 100vh !important;
        width: 100vw !important;
        overflow: hidden !important;
        padding: 0 !important;
        padding-top: 20px !important;
        margin: 0 !important;
        background: transparent !important;
      }
      #editor-window {
        width: ${settings.popupWidth}px !important;
        height: ${settings.popupHeight}px !important;
        max-width: none !important;
        max-height: none !important;
        transform-origin: top center !important;
        transform: scale(${scaleFactor}) !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6) !important;
        border-radius: 20px !important;
        animation: none !important;
        position: relative !important;
        margin: 0 !important;
      }
      #drag-hint {
        display: none !important;
      }
    }

    .cat-tab.active {
      background: linear-gradient(135deg, hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.8) 0%, hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%, 0.8) 100%) !important;
      border-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight + 10}%) !important;
      box-shadow: 0 0 24px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 5)}%, 0.5), inset 0 2px 4px rgba(255,255,255,0.3) !important;
    }
    
    .btn.primary {
      background: linear-gradient(135deg, hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%) 0%, hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 20)}%) 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%, 0.5) !important;
    }
    .btn.primary:hover {
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 20px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%, 0.6) !important;
    }
    
    .btn.secondary {
      color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.min(100, settings.primaryLight + 20)}%) !important;
      background: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.1) !important;
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
    }
    
    .icon {
      background: linear-gradient(135deg, hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.15) 0%, hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%, 0.15) 100%) !important;
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.2) !important;
    }
    
    #latex-preview {
      border-left-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%) !important;
    }
    
    .matrix-selector-btn {
      background: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.1) !important;
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.2) !important;
    }
    .icon svg { stroke: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.min(100, settings.primaryLight + 15)}%) !important; }
    
    #mf-wrap:focus-within {
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.5) !important;
      box-shadow: 0 0 0 3px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.12), 0 4px 16px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.08) !important;
    }
    .matrix-cell.highlight {
      background: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.6) !important;
      border-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%) !important;
    }
    .switch input:checked + .slider {
      background-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.2) !important;
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.4) !important;
    }
    .switch input:checked + .slider:before {
      background-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%) !important;
    }
    .mode-label.active {
      color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.min(100, settings.primaryLight + 20)}%) !important;
      text-shadow: 0 0 8px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
    }
    math-field, #mf {
      --caret-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%) !important;
      --selection-background-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
      --contains-highlight-background-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.12) !important;
      --smart-fence-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.5) !important;
    }
  `;
  
  // Update toggle state labels
  const labelLatex = document.getElementById("label-showLatexBar");
  if (labelLatex) labelLatex.classList.toggle("active", !!settings.showLatexBar);
  const labelBlur = document.getElementById("label-blurBackground");
  if (labelBlur) labelBlur.classList.toggle("active", !!settings.blurBackground);
  
  // Make sure the checkboxes match
  const inputLatex = document.getElementById("set-showLatexBar");
  if (inputLatex) inputLatex.checked = !!settings.showLatexBar;
  const inputBlur = document.getElementById("set-blurBackground");
  if (inputBlur) inputBlur.checked = !!settings.blurBackground;

  window.parent.postMessage({ mathpaster: "update-blur", blur: settings.blurBackground }, "*");
  localStorage.setItem('mathpaster_settings', JSON.stringify(settings));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('mathpaster_settings'));
    if (saved) currentSettings = { ...defaultSettings, ...saved };
  } catch (e) {}
  applySettings(currentSettings);
}

const settingsKeys = Object.keys(defaultSettings);

document.getElementById('settings-btn').addEventListener('click', () => {
  settingsKeys.forEach(k => {
    const input = document.getElementById('set-' + k);
    const valDisp = document.getElementById('val-' + k);
    if (input) {
      if (input.type === "checkbox") {
        input.checked = currentSettings[k];
      } else {
        input.value = currentSettings[k];
        if (valDisp) valDisp.textContent = currentSettings[k];
      }
    }
  });
  document.getElementById('settings-overlay').classList.add('visible');
});

settingsKeys.forEach(k => {
  const input = document.getElementById('set-' + k);
  const valDisp = document.getElementById('val-' + k);
  if (input) {
    const handleEvent = e => {
      if (input.type === "checkbox") {
        currentSettings[k] = e.target.checked;
      } else {
        currentSettings[k] = parseInt(e.target.value, 10);
        if (valDisp) valDisp.textContent = currentSettings[k];
      }
      applySettings(currentSettings);
    };
    input.addEventListener('input', handleEvent);
    if (input.type === "checkbox") {
      input.addEventListener('change', handleEvent);
    }
  }
});

// Relocated settings label click listeners
const labelLatex = document.getElementById("label-showLatexBar");
if (labelLatex) {
  labelLatex.addEventListener("click", () => {
    const input = document.getElementById("set-showLatexBar");
    if (input) {
      input.checked = !input.checked;
      currentSettings.showLatexBar = input.checked;
      applySettings(currentSettings);
    }
  });
}
const labelBlur = document.getElementById("label-blurBackground");
if (labelBlur) {
  labelBlur.addEventListener("click", () => {
    const input = document.getElementById("set-blurBackground");
    if (input) {
      input.checked = !input.checked;
      currentSettings.blurBackground = input.checked;
      applySettings(currentSettings);
    }
  });
}

document.getElementById('close-settings-btn').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.remove('visible');
});

document.getElementById('reset-settings-btn').addEventListener('click', () => {
  currentSettings = { ...defaultSettings };
  settingsKeys.forEach(k => {
    const input = document.getElementById('set-' + k);
    const valDisp = document.getElementById('val-' + k);
    if (input) {
      if (input.type === "checkbox") {
        input.checked = currentSettings[k];
      } else {
        input.value = currentSettings[k];
        if (valDisp) valDisp.textContent = currentSettings[k];
      }
    }
  });
  applySettings(currentSettings);
});

// Positioning state & helper to keep window fully visible within the viewport
const editorWindow = document.getElementById("editor-window");
let currentX = 0, currentY = 0;
let baseX = 0, baseY = 0;

function clampPositionToBounds() {
  const width = currentSettings.popupWidth;
  const height = currentSettings.popupHeight;
  
  const maxXOffset = Math.max(0, (window.innerWidth - width) / 2);
  currentX = Math.max(-maxXOffset, Math.min(currentX, maxXOffset));
  baseX = currentX;
  
  const defaultYBottom = 0.025 * window.innerHeight; // 2.5vh
  const T_default = window.innerHeight - height - defaultYBottom;
  const minYOffset = -T_default;
  const maxYOffset = defaultYBottom;
  currentY = Math.max(minYOffset, Math.min(currentY, maxYOffset));
  baseY = currentY;
  
  editorWindow.style.left = `${currentX}px`;
  editorWindow.style.top = `${currentY}px`;
}

// Load persisted settings and clamp to screen borders on initialization
loadSettings();
clampPositionToBounds();

/* ── Dragging & Resizing logic ── */
const header = document.getElementById("header");
let isDragging = false;
let isResizing = false;
let resizeHandleType = null;

let startX, startY;
let startMouseX, startMouseY;
let startWidth, startHeight;
let startBaseX, startBaseY;

// Header drag setup
header.style.cursor = "grab";
header.addEventListener("mousedown", e => {
  if (e.target.closest(".header-btn") || e.target.tagName === "INPUT") return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  header.style.cursor = "grabbing";
});

// Resizer handles setup
document.querySelectorAll(".resize-handle").forEach(handle => {
  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeHandleType = handle.dataset.handle;
    startWidth = currentSettings.popupWidth;
    startHeight = currentSettings.popupHeight;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startBaseX = baseX;
    startBaseY = baseY;
    
    const handleCursor = window.getComputedStyle(handle).cursor;
    document.body.style.cursor = handleCursor;
  });
});

/* ── Keyboard Window State & Events ── */
const kbdWindow = document.getElementById("keyboard-window");
const kbdHeader = document.getElementById("keyboard-header");

let kbdDragging = false;
let kbdResizing = false;
let kbdResizeHandle = null;

let kbdStartX, kbdStartY;
let kbdStartMouseX, kbdStartMouseY;
let kbdStartWidth, kbdStartHeight;
let kbdStartLeft, kbdStartTop;

let kbdLeft = 0, kbdTop = 0;

function clampKeyboardPosition() {
  const width = parseFloat(kbdWindow.style.width) || 680;
  const height = parseFloat(kbdWindow.style.height) || 280;
  
  kbdLeft = Math.max(0, Math.min(kbdLeft, window.innerWidth - width));
  kbdTop = Math.max(0, Math.min(kbdTop, window.innerHeight - height));
  
  kbdWindow.style.left = `${kbdLeft}px`;
  kbdWindow.style.top = `${kbdTop}px`;
}

function positionKeyboardDefault() {
  const editorRect = editorWindow.getBoundingClientRect();
  const kbdWidth = 680;
  const kbdHeight = 280;
  
  kbdLeft = Math.max(10, (window.innerWidth - kbdWidth) / 2);
  kbdTop = Math.max(10, editorRect.top - kbdHeight - 20);
  
  kbdWindow.style.width = `${kbdWidth}px`;
  kbdWindow.style.height = `${kbdHeight}px`;
  kbdWindow.style.left = `${kbdLeft}px`;
  kbdWindow.style.top = `${kbdTop}px`;
}

// Keyboard Header Drag setup
kbdHeader.style.cursor = "grab";
kbdHeader.addEventListener("mousedown", e => {
  if (e.target.closest(".header-btn")) return;
  kbdDragging = true;
  kbdStartX = e.clientX;
  kbdStartY = e.clientY;
  kbdStartLeft = kbdLeft;
  kbdStartTop = kbdTop;
  kbdHeader.style.cursor = "grabbing";
});

// Keyboard Resize handles setup
document.querySelectorAll(".kbd-resize-handle").forEach(handle => {
  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    e.stopPropagation();
    kbdResizing = true;
    kbdResizeHandle = handle.dataset.handle;
    kbdStartWidth = parseFloat(kbdWindow.style.width) || 680;
    kbdStartHeight = parseFloat(kbdWindow.style.height) || 280;
    kbdStartLeft = kbdLeft;
    kbdStartTop = kbdTop;
    kbdStartMouseX = e.clientX;
    kbdStartMouseY = e.clientY;
    
    const handleCursor = window.getComputedStyle(handle).cursor;
    document.body.style.cursor = handleCursor;
  });
});

// Keyboard close button setup
document.getElementById("close-keyboard-btn").addEventListener("click", () => {
  if (window.mathVirtualKeyboard) {
    window.mathVirtualKeyboard.hide();
  }
});

// Virtual keyboard show/hide event listener
if (window.mathVirtualKeyboard) {
  window.mathVirtualKeyboard.addEventListener("virtual-keyboard-toggle", () => {
    if (window.mathVirtualKeyboard.visible) {
      kbdWindow.style.display = "flex";
      if (!kbdWindow.style.left) {
        positionKeyboardDefault();
      }
    } else {
      kbdWindow.style.display = "none";
    }
  });
}

document.addEventListener("mousemove", e => {
  if (isDragging) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let proposedX = baseX + dx;
    let proposedY = baseY + dy;
    
    const width = currentSettings.popupWidth;
    const height = currentSettings.popupHeight;
    
    const maxXOffset = Math.max(0, (window.innerWidth - width) / 2);
    proposedX = Math.max(-maxXOffset, Math.min(proposedX, maxXOffset));
    
    const defaultYBottom = 0.025 * window.innerHeight;
    const T_default = window.innerHeight - height - defaultYBottom;
    const minYOffset = -T_default;
    const maxYOffset = defaultYBottom;
    proposedY = Math.max(minYOffset, Math.min(proposedY, maxYOffset));
    
    currentX = proposedX;
    currentY = proposedY;
    editorWindow.style.left = `${currentX}px`;
    editorWindow.style.top = `${currentY}px`;
  } else if (isResizing) {
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    if (resizeHandleType === "tl" || resizeHandleType === "bl") {
      newWidth = startWidth - dx;
    } else if (resizeHandleType === "tr" || resizeHandleType === "br") {
      newWidth = startWidth + dx;
    }
    
    if (resizeHandleType === "tl" || resizeHandleType === "tr") {
      newHeight = startHeight - dy;
    } else if (resizeHandleType === "bl" || resizeHandleType === "br") {
      newHeight = startHeight + dy;
    }
    
    const minWidth = 400;
    const minHeight = 300;
    if (newWidth < minWidth) newWidth = minWidth;
    if (newHeight < minHeight) newHeight = minHeight;
    
    const startLeft = (window.innerWidth - startWidth) / 2 + startBaseX;
    const startRight = startLeft + startWidth;
    
    const defaultYBottom = 0.025 * window.innerHeight;
    const T_default = window.innerHeight - startHeight - defaultYBottom;
    const startTop = T_default + startBaseY;
    const startBottom = startTop + startHeight;
    
    if (resizeHandleType === "tr" || resizeHandleType === "br") {
      newWidth = Math.min(newWidth, Math.max(minWidth, window.innerWidth - startLeft));
    } else {
      newWidth = Math.min(newWidth, Math.max(minWidth, startRight));
    }
    
    if (resizeHandleType === "tl" || resizeHandleType === "tr") {
      newHeight = Math.min(newHeight, Math.max(minHeight, startBottom));
    } else {
      newHeight = Math.min(newHeight, Math.max(minHeight, window.innerHeight - startTop));
    }
    
    if (newWidth > 1600) newWidth = 1600;
    if (newHeight > 1200) newHeight = 1200;
    
    const dw = newWidth - startWidth;
    let newBaseX = startBaseX;
    if (resizeHandleType === "tr" || resizeHandleType === "br") {
      newBaseX = startBaseX + dw / 2;
    } else {
      newBaseX = startBaseX - dw / 2;
    }
    
    let newBaseY = startBaseY;
    if (resizeHandleType === "bl" || resizeHandleType === "br") {
      newBaseY = startBaseY + (newHeight - startHeight);
    }
    
    currentX = newBaseX;
    currentY = newBaseY;
    editorWindow.style.left = `${currentX}px`;
    editorWindow.style.top = `${currentY}px`;
    
    currentSettings.popupWidth = newWidth;
    currentSettings.popupHeight = newHeight;
    applySettings(currentSettings);
  } else if (kbdDragging) {
    const dx = e.clientX - kbdStartX;
    const dy = e.clientY - kbdStartY;
    kbdLeft = kbdStartLeft + dx;
    kbdTop = kbdStartTop + dy;
    clampKeyboardPosition();
  } else if (kbdResizing) {
    const dx = e.clientX - kbdStartMouseX;
    const dy = e.clientY - kbdStartMouseY;
    
    let newWidth = kbdStartWidth;
    let newHeight = kbdStartHeight;
    let newLeft = kbdStartLeft;
    let newTop = kbdStartTop;
    
    if (kbdResizeHandle === "tl" || kbdResizeHandle === "bl") {
      newWidth = kbdStartWidth - dx;
    } else {
      newWidth = kbdStartWidth + dx;
    }
    
    if (kbdResizeHandle === "tl" || kbdResizeHandle === "tr") {
      newHeight = kbdStartHeight - dy;
    } else {
      newHeight = kbdStartHeight + dy;
    }
    
    const minWidth = 400;
    const minHeight = 150;
    
    if (kbdResizeHandle === "tl" || kbdResizeHandle === "bl") {
      const maxLeftWidth = kbdStartLeft + kbdStartWidth;
      newWidth = Math.min(newWidth, maxLeftWidth);
      if (newWidth < minWidth) newWidth = minWidth;
      newLeft = kbdStartLeft + (kbdStartWidth - newWidth);
    } else {
      newWidth = Math.min(newWidth, window.innerWidth - kbdStartLeft);
      if (newWidth < minWidth) newWidth = minWidth;
    }
    
    if (kbdResizeHandle === "tl" || kbdResizeHandle === "tr") {
      const maxTopHeight = kbdStartTop + kbdStartHeight;
      newHeight = Math.min(newHeight, maxTopHeight);
      if (newHeight < minHeight) newHeight = minHeight;
      newTop = kbdStartTop + (kbdStartHeight - newHeight);
    } else {
      newHeight = Math.min(newHeight, window.innerHeight - kbdStartTop);
      if (newHeight < minHeight) newHeight = minHeight;
    }
    
    kbdLeft = newLeft;
    kbdTop = newTop;
    kbdWindow.style.width = `${newWidth}px`;
    kbdWindow.style.height = `${newHeight}px`;
    kbdWindow.style.left = `${kbdLeft}px`;
    kbdWindow.style.top = `${kbdTop}px`;
  }
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    header.style.cursor = "grab";
    baseX = currentX;
    baseY = currentY;
  } else if (isResizing) {
    isResizing = false;
    document.body.style.cursor = "";
    baseX = currentX;
    baseY = currentY;
    
    localStorage.setItem('mathpaster_settings', JSON.stringify(currentSettings));
    
    settingsKeys.forEach(k => {
      const input = document.getElementById('set-' + k);
      const valDisp = document.getElementById('val-' + k);
      if (input && (k === 'popupWidth' || k === 'popupHeight')) {
        input.value = currentSettings[k];
        if (valDisp) valDisp.textContent = currentSettings[k];
      }
    });
  } else if (kbdDragging) {
    kbdDragging = false;
    kbdHeader.style.cursor = "grab";
  } else if (kbdResizing) {
    kbdResizing = false;
    document.body.style.cursor = "";
  }
});

// Re-apply scaled settings or clamp positions on window resize
window.addEventListener("resize", () => {
  if (window.innerWidth <= 600) {
    applySettings(currentSettings);
  } else {
    clampPositionToBounds();
    if (kbdWindow.style.display !== "none") {
      clampKeyboardPosition();
    }
  }
});

// Prevent viewport scroll shifting when focusing inputs or opening the virtual keyboard
window.addEventListener("scroll", () => {
  window.scrollTo(0, 0);
});
