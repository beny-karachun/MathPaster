import { state } from './state.js';
import { SYMBOL_CATALOG } from './symbol-catalog.js';
import { hasPremium, renderSymbolFace, saveCustomTabs, renderTabs, renderPalette, moveTabToFront,
         isBuiltinKey, getEditableSymbols, saveDefaultOverride, removeDefaultTab, firstVisibleKey } from './palette.js';
import { openUpgradeModal } from './license.js';

/* ── Tab editor modal (custom tabs + editing/removing built-in tabs) ── */
let editingKey = null;            // null while creating a new tab; else custom id OR built-in key
let editingIsBuiltin = false;     // true when editing one of the shipped default tabs
let workingSymbols = [];          // [{ latex } | { matrixType, label }] being assembled
let tabMf = null;
let tabMfConfigured = false;

const tabOverlay     = document.getElementById("tab-overlay");
const tabNameInput   = document.getElementById("tab-name-input");
const tabSymbolList  = document.getElementById("tab-symbol-list");
const tabEditorTitle = document.getElementById("tab-editor-title");
const tabDeleteBtn   = document.getElementById("tab-delete-btn");
const tabError       = document.getElementById("tab-error");

function configureTabMf() {
  tabMf = document.getElementById("tab-mf");
  if (!tabMf || tabMfConfigured) return;
  try {
    tabMf.mathVirtualKeyboardPolicy = "manual";
    tabMf.setAttribute("math-virtual-keyboard-policy", "manual");
    if (tabMf.setOptions) tabMf.setOptions({ inlineShortcuts: state.defaultShortcuts || {}, mathModeSpace: "\\:" });
    else { tabMf.inlineShortcuts = state.defaultShortcuts || {}; tabMf.mathModeSpace = "\\:"; }
  } catch (e) {}

  // MathLive's own mouse-focus path leaves this nested mini field unable to capture
  // keystrokes (programmatic focus works reliably). Intercept the pointer focus and
  // drive it ourselves so clicking the field always lets the user type.
  tabMf.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (document.activeElement !== tabMf) {
      try { tabMf.focus(); } catch (_) {}
    }
  });

  // Enter in the mini field commits a suggestion (handled globally) or adds the symbol.
  tabMf.addEventListener("keydown", e => {
    if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const popover = document.getElementById("mathlive-suggestion-popover");
    if (popover && popover.classList.contains("is-visible")) return; // let the global handler commit it
    e.preventDefault();
    e.stopPropagation();
    addWorkingSymbol();
  });
  tabMfConfigured = true;
}

function renderWorkingSymbols() {
  tabSymbolList.innerHTML = "";
  if (!workingSymbols.length) {
    const empty = document.createElement("div");
    empty.className = "tab-symbol-empty";
    empty.textContent = "No symbols yet — type a command above and press Add.";
    tabSymbolList.appendChild(empty);
    refreshPickerSelection();
    return;
  }
  workingSymbols.forEach((sym, idx) => {
    const chip = document.createElement("div");
    chip.className = "tab-symbol-chip";
    chip.title = sym.matrixType ? (sym.label || sym.matrixType) : sym.latex;

    const face = document.createElement("span");
    face.className = "tab-symbol-face";
    // Matrix inserters carry no LaTeX (they pop the size picker), so show their glyph label.
    face.innerHTML = sym.matrixType ? (sym.label || "▦") : renderSymbolFace(sym.latex);
    chip.appendChild(face);

    const rm = document.createElement("button");
    rm.className = "tab-symbol-remove";
    rm.title = "Remove";
    rm.textContent = "×";
    rm.addEventListener("mousedown", e => e.preventDefault());
    rm.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      workingSymbols.splice(idx, 1);
      renderWorkingSymbols();
    });
    chip.appendChild(rm);

    tabSymbolList.appendChild(chip);
  });
  refreshPickerSelection();
}

function addWorkingSymbol() {
  if (!tabMf) return;
  // If an autocomplete suggestion is open, commit it first so the typed command is captured.
  const popover = document.getElementById("mathlive-suggestion-popover");
  if (popover && popover.classList.contains("is-visible")) {
    const cur = popover.querySelector(".ML__popover__current");
    if (cur) cur.click();
  }
  const latex = (tabMf.value || "").trim();
  if (!latex) { if (tabError) tabError.textContent = "Type a \\command, then Add."; return; }
  workingSymbols.push({ latex });
  tabMf.value = "";
  if (tabError) tabError.textContent = "";
  renderWorkingSymbols();
  window.focus();
  try { tabMf.focus(); } catch (e) {}
}

/* ── "Browse symbols" picker — categorized, render-safe catalog ── */
const browseToggle   = document.getElementById("tab-browse-toggle");
const symbolPicker   = document.getElementById("tab-symbol-picker");
const symbolSearch   = document.getElementById("symbol-search");
const symbolCatNav   = document.getElementById("symbol-cat-nav");
const symbolGrid     = document.getElementById("symbol-grid");
const symbolNoResults= document.getElementById("symbol-noresults");

let pickerBuilt = false;
let pickerCat = "All";
const pickerCells = [];      // { el, latex, name }
const pickerSections = [];   // { el, cat, cells:[...] }

// Build the grid + category nav once (lazily, on first open). 374 faces is a one-time cost.
function buildSymbolPicker() {
  if (pickerBuilt || !symbolGrid) return;
  const cats = Object.keys(SYMBOL_CATALOG);

  symbolCatNav.innerHTML = "";
  ["All", ...cats].forEach(cat => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "symbol-cat-chip" + (cat === pickerCat ? " active" : "");
    chip.textContent = cat;
    chip.addEventListener("mousedown", e => e.preventDefault());
    chip.addEventListener("click", e => {
      e.preventDefault();
      pickerCat = cat;
      symbolCatNav.querySelectorAll(".symbol-cat-chip").forEach(c => c.classList.toggle("active", c.textContent === cat));
      applyPickerFilter();
      symbolGrid.scrollTop = 0;
    });
    symbolCatNav.appendChild(chip);
  });

  symbolGrid.innerHTML = "";
  for (const cat of cats) {
    const section = document.createElement("div");
    section.className = "symbol-section";

    const title = document.createElement("div");
    title.className = "symbol-section-title";
    title.textContent = cat;
    section.appendChild(title);

    const cellsWrap = document.createElement("div");
    cellsWrap.className = "symbol-section-cells";

    const cells = [];
    for (const sym of SYMBOL_CATALOG[cat]) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "symbol-cell";
      cell.title = sym.latex;
      cell.innerHTML = renderSymbolFace(sym.latex);
      cell.addEventListener("mousedown", e => e.preventDefault()); // never steal focus from the modal
      cell.addEventListener("click", e => { e.preventDefault(); toggleSymbol(sym.latex); });
      cellsWrap.appendChild(cell);
      const rec = { el: cell, latex: sym.latex, name: (sym.name || "").toLowerCase() };
      cells.push(rec);
      pickerCells.push(rec);
    }
    section.appendChild(cellsWrap);
    symbolGrid.appendChild(section);
    pickerSections.push({ el: section, cat, cells });
  }

  pickerBuilt = true;
  refreshPickerSelection();
}

// Add the symbol if absent, remove all copies if already present (toggle membership).
function toggleSymbol(latex) {
  const present = workingSymbols.some(s => s.latex === latex);
  if (present) workingSymbols = workingSymbols.filter(s => s.latex !== latex);
  else workingSymbols.push({ latex });
  if (tabError) tabError.textContent = "";
  renderWorkingSymbols();   // also calls refreshPickerSelection()
}

// Mark grid cells whose symbol is already in the working set.
function refreshPickerSelection() {
  if (!pickerBuilt) return;
  const chosen = new Set(workingSymbols.map(s => s.latex));
  for (const c of pickerCells) c.el.classList.toggle("selected", chosen.has(c.latex));
}

// Show/hide cells + sections per the active category and search query.
function applyPickerFilter() {
  if (!pickerBuilt) return;
  const q = (symbolSearch.value || "").trim().toLowerCase();
  let anyVisible = false;
  for (const sec of pickerSections) {
    const catOk = pickerCat === "All" || sec.cat === pickerCat;
    let secVisible = false;
    for (const c of sec.cells) {
      const hit = catOk && (!q || c.name.includes(q) || c.latex.toLowerCase().includes(q));
      c.el.hidden = !hit;
      if (hit) secVisible = true;
    }
    sec.el.hidden = !secVisible;
    if (secVisible) anyVisible = true;
  }
  if (symbolNoResults) symbolNoResults.hidden = anyVisible;
}

function openSymbolPicker() {
  buildSymbolPicker();
  symbolPicker.hidden = false;
  browseToggle.setAttribute("aria-expanded", "true");
  browseToggle.classList.add("open");
  applyPickerFilter();
  requestAnimationFrame(() => { try { symbolSearch.focus(); } catch (e) {} });
}

function closeSymbolPicker() {
  if (!symbolPicker) return;
  symbolPicker.hidden = true;
  if (browseToggle) { browseToggle.setAttribute("aria-expanded", "false"); browseToggle.classList.remove("open"); }
}

// Collapse + clear the picker back to its default state (called when the editor opens).
function resetSymbolPicker() {
  if (symbolSearch) symbolSearch.value = "";
  pickerCat = "All";
  if (pickerBuilt) {
    symbolCatNav.querySelectorAll(".symbol-cat-chip").forEach(c => c.classList.toggle("active", c.textContent === "All"));
    applyPickerFilter();
  }
  closeSymbolPicker();
}

if (browseToggle) {
  browseToggle.addEventListener("mousedown", e => e.preventDefault());
  browseToggle.addEventListener("click", e => {
    e.preventDefault();
    if (symbolPicker.hidden) openSymbolPicker(); else closeSymbolPicker();
  });
}
if (symbolSearch) {
  symbolSearch.addEventListener("input", applyPickerFilter);
  symbolSearch.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); } });
}

export function openTabEditor(key) {
  if (!hasPremium()) { openUpgradeModal("Editing tabs is part of MathPaster Pro."); return; }
  configureTabMf();
  editingKey = key;
  editingIsBuiltin = key != null && isBuiltinKey(key);
  if (tabError) tabError.textContent = "";

  if (key == null) {
    // Creating a brand-new custom tab.
    tabNameInput.value = "";
    workingSymbols = [];
    tabEditorTitle.textContent = "New Custom Tab";
    tabDeleteBtn.style.display = "none";
  } else if (editingIsBuiltin) {
    // Editing a shipped default tab (add/remove symbols, or remove the tab entirely).
    const ov = state.defaultOverrides[key];
    tabNameInput.value = ov && ov.name ? ov.name : key;
    workingSymbols = getEditableSymbols(key);
    tabEditorTitle.textContent = "Edit Tab";
    tabDeleteBtn.style.display = "";
    tabDeleteBtn.textContent = "Remove Tab";
  } else {
    // Editing an existing custom tab.
    const tab = state.customTabs.find(t => t.id === key);
    tabNameInput.value = tab ? tab.name : "";
    workingSymbols = tab ? tab.symbols.map(s => ({ latex: s.latex })) : [];
    tabEditorTitle.textContent = "Edit Tab";
    tabDeleteBtn.style.display = "";
    tabDeleteBtn.textContent = "Delete Tab";
  }

  if (tabMf) tabMf.value = "";
  renderWorkingSymbols();
  resetSymbolPicker();
  tabOverlay.classList.add("visible");
  // Focus the name field on open — immediately and on the next frame for reliability —
  // but never steal focus once the user has clicked into the modal (e.g. the math input).
  // A previous deferred focus could fire after a fast click and yank typing into the name box.
  focusNameInputIfIdle();
  requestAnimationFrame(focusNameInputIfIdle);
}

function focusNameInputIfIdle() {
  if (!tabOverlay.contains(document.activeElement)) {
    try { tabNameInput.focus(); } catch (e) {}
  }
}

function closeTabEditor() {
  tabOverlay.classList.remove("visible");
}

// Working symbols may be latex symbols or matrix inserters; preserve whichever each is.
function snapshotSymbols() {
  return workingSymbols.map(s => s.matrixType ? { matrixType: s.matrixType, label: s.label } : { latex: s.latex });
}

function saveTab() {
  const name = (tabNameInput.value || "").trim();
  if (!name) { if (tabError) tabError.textContent = "Please name your tab."; return; }
  if (!workingSymbols.length) { if (tabError) tabError.textContent = "Add at least one symbol, or use Remove Tab to delete it."; return; }

  let activeKey;
  if (editingIsBuiltin) {
    // Persist the edit as an override on top of the shipped default tab.
    saveDefaultOverride(editingKey, name, snapshotSymbols());
    activeKey = editingKey;
  } else if (editingKey) {
    const tab = state.customTabs.find(t => t.id === editingKey);
    if (tab) { tab.name = name; tab.symbols = snapshotSymbols(); }
    saveCustomTabs();
    activeKey = editingKey;
  } else {
    const id = "t_" + Date.now();
    state.customTabs.push({ id, name, symbols: snapshotSymbols() });
    saveCustomTabs();
    moveTabToFront(id); // show new tabs on the left, right after the New Tab chip
    activeKey = id;
  }
  state.activeCategory = activeKey;
  renderTabs();
  renderPalette(activeKey);
  closeTabEditor();
}

function deleteTab() {
  if (editingKey == null) { closeTabEditor(); return; }
  if (editingIsBuiltin) {
    removeDefaultTab(editingKey);          // hide the built-in tab + drop its override
  } else {
    state.customTabs = state.customTabs.filter(t => t.id !== editingKey);
    saveCustomTabs();
  }
  if (state.activeCategory === editingKey) state.activeCategory = firstVisibleKey();
  renderTabs();
  renderPalette(state.activeCategory);
  closeTabEditor();
}

document.getElementById("tab-add-btn").addEventListener("mousedown", e => e.preventDefault());
document.getElementById("tab-add-btn").addEventListener("click", e => { e.preventDefault(); addWorkingSymbol(); });
document.getElementById("tab-save-btn").addEventListener("mousedown", e => e.preventDefault());
document.getElementById("tab-save-btn").addEventListener("click", e => { e.preventDefault(); saveTab(); });
tabDeleteBtn.addEventListener("mousedown", e => e.preventDefault());
tabDeleteBtn.addEventListener("click", e => { e.preventDefault(); deleteTab(); });
document.getElementById("close-tab-editor-btn").addEventListener("click", closeTabEditor);
tabNameInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (tabMf) tabMf.focus(); } });

// Click on the modal backdrop (outside the panel) closes just the modal.
tabOverlay.addEventListener("mousedown", e => {
  if (e.target === tabOverlay) closeTabEditor();
});
