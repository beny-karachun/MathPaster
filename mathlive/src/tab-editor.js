import { state } from './state.js';
import { PALETTE_DATA } from './palette-data.js';
import { hasPremium, renderSymbolFace, saveCustomTabs, renderTabs, renderPalette } from './palette.js';

/* ── Custom-tab editor modal ── */
let editingTabId = null;          // null while creating a new tab
let workingSymbols = [];          // [{ latex }] being assembled in the modal
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
    return;
  }
  workingSymbols.forEach((sym, idx) => {
    const chip = document.createElement("div");
    chip.className = "tab-symbol-chip";
    chip.title = sym.latex;

    const face = document.createElement("span");
    face.className = "tab-symbol-face";
    face.innerHTML = renderSymbolFace(sym.latex);
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

export function openTabEditor(id) {
  if (!hasPremium()) return; // future paywall gate
  configureTabMf();
  editingTabId = id;
  if (tabError) tabError.textContent = "";

  if (id) {
    const tab = state.customTabs.find(t => t.id === id);
    tabNameInput.value = tab ? tab.name : "";
    workingSymbols = tab ? tab.symbols.map(s => ({ latex: s.latex })) : [];
    tabEditorTitle.textContent = "Edit Tab";
    tabDeleteBtn.style.display = "";
  } else {
    tabNameInput.value = "";
    workingSymbols = [];
    tabEditorTitle.textContent = "New Custom Tab";
    tabDeleteBtn.style.display = "none";
  }

  if (tabMf) tabMf.value = "";
  renderWorkingSymbols();
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

function saveTab() {
  const name = (tabNameInput.value || "").trim();
  if (!name) { if (tabError) tabError.textContent = "Please name your tab."; return; }
  if (!workingSymbols.length) { if (tabError) tabError.textContent = "Add at least one symbol."; return; }

  let id = editingTabId;
  if (id) {
    const tab = state.customTabs.find(t => t.id === id);
    if (tab) { tab.name = name; tab.symbols = workingSymbols.map(s => ({ latex: s.latex })); }
  } else {
    id = "t_" + Date.now();
    state.customTabs.push({ id, name, symbols: workingSymbols.map(s => ({ latex: s.latex })) });
  }
  saveCustomTabs();
  state.activeCategory = id;
  renderTabs();
  renderPalette(id);
  closeTabEditor();
}

function deleteTab() {
  if (!editingTabId) { closeTabEditor(); return; }
  state.customTabs = state.customTabs.filter(t => t.id !== editingTabId);
  saveCustomTabs();
  if (state.activeCategory === editingTabId) state.activeCategory = Object.keys(PALETTE_DATA)[0];
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
