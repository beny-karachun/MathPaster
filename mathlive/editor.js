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
      if (window.mathVirtualKeyboard) {
        window.mathVirtualKeyboard.container = document.body;
      }
    } catch (e) {
      console.warn("Could not set MathfieldElement properties:", e);
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
  if (mfReady) mf.focus();
}

modeSwitch.addEventListener("change", e => {
  updateModeUI(e.target.checked ? "block" : "inline");
});

modeLabels.forEach(l => {
  l.addEventListener("click", () => updateModeUI(l.dataset.mode));
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
      setTimeout(() => { try { mf.focus(); } catch {} }, 100);
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
  if (!e.target.closest("#editor-window") && !e.target.closest("#settings-panel") && !e.target.closest("#matrix-selector")) {
    window.parent.postMessage({ mathpaster: "close" }, "*");
  }
});

buildMatrixSelectorUI();

/* ── Settings Logic ── */
const defaultSettings = {
  popupWidth: 1000,
  popupHeight: 700,
  gapSize: 16,
  symbolGridWidth: 70,
  symbolHeight: 56,
  symbolFontSize: 22,
  borderRadiusBtn: 12,
  tabPaddingH: 32,
  tabPaddingV: 14,
  tabFontSize: 15,
  borderRadiusTab: 30,
  primaryHue: 250, // purple-ish
  showLatexBar: true
};

let currentSettings = { ...defaultSettings };

function applySettings(settings) {
  let styleEl = document.getElementById('dynamic-theme');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-theme';
    document.head.appendChild(styleEl);
  }
  
  styleEl.innerHTML = `
    #editor-window { width: ${settings.popupWidth}px !important; height: ${settings.popupHeight}px !important; }
    #latex-preview { display: ${settings.showLatexBar ? 'flex' : 'none'} !important; }
    #body { gap: ${settings.gapSize}px !important; }
    #category-tabs { gap: ${settings.gapSize}px !important; padding-bottom: ${settings.gapSize}px !important; }
    #palette { grid-template-columns: repeat(auto-fill, minmax(${settings.symbolGridWidth}px, 1fr)) !important; gap: ${settings.gapSize}px !important; }
    #footer { gap: ${settings.gapSize}px !important; }
    .action-group { gap: ${settings.gapSize}px !important; }
    
    .pal-btn { height: ${settings.symbolHeight}px !important; font-size: ${settings.symbolFontSize}px !important; border-radius: ${settings.borderRadiusBtn}px !important; }
    
    .cat-tab { padding: ${settings.tabPaddingV}px ${settings.tabPaddingH}px !important; font-size: ${settings.tabFontSize}px !important; border-radius: ${settings.borderRadiusTab}px !important; }
    
    .btn, .icon, .header-btn, #close-btn, #settings-btn, .matrix-cell { border-radius: ${settings.borderRadiusBtn}px !important; }
    
    .cat-tab.active {
      background: linear-gradient(135deg, hsla(${settings.primaryHue}, 80%, 65%, 0.8) 0%, hsla(${settings.primaryHue}, 80%, 55%, 0.8) 100%) !important;
      border-color: hsl(${settings.primaryHue}, 90%, 75%) !important;
      box-shadow: 0 0 24px hsla(${settings.primaryHue}, 80%, 60%, 0.5), inset 0 2px 4px rgba(255,255,255,0.3) !important;
    }
    
    .btn.primary {
      background: linear-gradient(135deg, hsl(${settings.primaryHue}, 80%, 55%) 0%, hsl(${settings.primaryHue}, 75%, 45%) 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px hsla(${settings.primaryHue}, 80%, 55%, 0.5) !important;
    }
    .btn.primary:hover {
      background: linear-gradient(135deg, hsl(${settings.primaryHue}, 85%, 60%) 0%, hsl(${settings.primaryHue}, 80%, 50%) 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 16px hsla(${settings.primaryHue}, 85%, 60%, 0.5) !important;
    }
    
    .icon {
      background: linear-gradient(135deg, hsla(${settings.primaryHue}, 80%, 65%, 0.15) 0%, hsla(${settings.primaryHue}, 80%, 55%, 0.15) 100%) !important;
      border-color: hsla(${settings.primaryHue}, 80%, 65%, 0.3) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px hsla(${settings.primaryHue}, 80%, 65%, 0.2) !important;
    }
    .icon svg { stroke: hsl(${settings.primaryHue}, 90%, 75%) !important; }
  `;
  
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
      input.value = currentSettings[k];
      if (valDisp) valDisp.textContent = currentSettings[k];
    }
  });
  document.getElementById('settings-overlay').classList.add('visible');
});

settingsKeys.forEach(k => {
  const input = document.getElementById('set-' + k);
  const valDisp = document.getElementById('val-' + k);
  if (input) {
    input.addEventListener('input', e => {
      if (input.type === "checkbox") {
        currentSettings[k] = e.target.checked;
      } else {
        currentSettings[k] = parseInt(e.target.value, 10);
        if (valDisp) valDisp.textContent = currentSettings[k];
      }
      applySettings(currentSettings);
    });
  }
});

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

loadSettings();
