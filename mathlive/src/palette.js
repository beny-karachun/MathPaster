import { state } from './state.js';
import { mf, palette } from './dom.js';
import { PALETTE_DATA } from './palette-data.js';
import { openTabEditor } from './tab-editor.js';
import { showMatrixSelector } from './matrix.js';

/* ── Custom tabs (Premium) ── */
const CUSTOM_TABS_KEY = "mathpaster_custom_tabs";

// Single chokepoint for the premium gate. A real licensing check slots in here later.
// TODO: wire to licensing — return the user's entitlement instead of always true.
export function hasPremium() { return true; }

state.customTabs = loadCustomTabs();

export function loadCustomTabs() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_TABS_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return [];
}

export function saveCustomTabs() {
  try { localStorage.setItem(CUSTOM_TABS_KEY, JSON.stringify(state.customTabs)); } catch (e) {}
}

// Resolve the symbol list for a tab key (built-in category name OR custom tab id).
export function getCategoryItems(key) {
  const custom = state.customTabs.find(t => t.id === key);
  if (custom) return custom.symbols;
  return PALETTE_DATA[key] || [];
}

// Turn a raw LaTeX command (with placeholders) into clean markup for a button face.
export function renderSymbolFace(latex) {
  const preview = String(latex || "").replace(/#(\?|@|\d+)/g, "\\placeholder{}");
  try {
    const ML = window.MathLive || (window.MathfieldElement && window.MathfieldElement);
    if (ML && typeof ML.convertLatexToMarkup === "function") {
      const markup = ML.convertLatexToMarkup(preview);
      if (markup) return markup;
    }
  } catch (e) {}
  // Fallback: show the raw command text.
  const span = document.createElement("span");
  span.textContent = latex;
  return span.outerHTML;
}

/* ── Populate palette & tabs ── */
const categoryTabs = document.getElementById("category-tabs");

export function renderPalette(categoryName) {
  palette.innerHTML = "";
  const isCustom = state.customTabs.some(t => t.id === categoryName);
  const items = getCategoryItems(categoryName);
  for (const item of items) {
    const btn = document.createElement("button");
    btn.className = "pal-btn";
    btn.innerHTML = isCustom ? renderSymbolFace(item.latex) : item.label;
    btn.title = item.latex;
    btn.addEventListener("mousedown", e => e.preventDefault()); // don't steal focus
    btn.addEventListener("click", e => {
      e.preventDefault();
      if (!state.mfReady) return;
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

state.activeCategory = Object.keys(PALETTE_DATA)[0];

// Build the category tab bar from built-in categories + user custom tabs, plus a "New Tab" chip.
export function renderTabs() {
  categoryTabs.innerHTML = "";

  const addTab = (label, key, opts = {}) => {
    const tab = document.createElement("button");
    tab.className = "cat-tab" + (key === state.activeCategory ? " active" : "");
    if (opts.custom) tab.classList.add("custom-tab");
    tab.dataset.key = key;
    tab.addEventListener("mousedown", e => e.preventDefault()); // don't steal focus

    const labelSpan = document.createElement("span");
    labelSpan.className = "cat-tab-label";
    labelSpan.textContent = label;
    tab.appendChild(labelSpan);

    if (opts.custom) {
      const edit = document.createElement("span");
      edit.className = "cat-tab-edit";
      edit.title = "Edit tab";
      edit.textContent = "✎";
      edit.addEventListener("mousedown", e => e.preventDefault());
      edit.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        openTabEditor(key);
      });
      tab.appendChild(edit);
    }

    tab.addEventListener("click", () => {
      state.activeCategory = key;
      document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderPalette(key);
    });
    categoryTabs.appendChild(tab);
  };

  for (const cat of Object.keys(PALETTE_DATA)) addTab(cat, cat);
  for (const t of state.customTabs) addTab(t.name, t.id, { custom: true });

  // "New Tab" chip (premium)
  const newChip = document.createElement("button");
  newChip.className = "cat-tab new-tab-chip";
  newChip.title = "Create a custom tab";
  newChip.innerHTML = '<span class="cat-tab-label">+ New Tab</span><span class="pro-badge">PRO</span>';
  newChip.addEventListener("mousedown", e => e.preventDefault());
  newChip.addEventListener("click", () => openTabEditor(null));
  categoryTabs.appendChild(newChip);
}
