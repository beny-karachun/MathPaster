import { state } from './state.js';
import { mf, palette } from './dom.js';
import { PALETTE_DATA } from './palette-data.js';
import { openTabEditor } from './tab-editor.js';
import { showMatrixSelector } from './matrix.js';
import { isPro, openUpgradeModal } from './license.js';

/* ── Custom tabs (Premium) ── */
const CUSTOM_TABS_KEY      = "mathpaster_custom_tabs";
const DEFAULT_OVERRIDES_KEY = "mathpaster_default_overrides"; // edits to built-in tabs
const HIDDEN_DEFAULTS_KEY   = "mathpaster_hidden_default_tabs"; // removed built-in tabs

// Single chokepoint for the premium gate (backed by the Lemon Squeezy license).
// Tabs created before a license lapse stay usable; only creating/editing is gated.
export function hasPremium() { return isPro(); }

state.customTabs      = loadCustomTabs();
state.defaultOverrides = loadDefaultOverrides();
state.hiddenDefaults   = loadHiddenDefaults();

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

function loadDefaultOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEFAULT_OVERRIDES_KEY));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) return saved;
  } catch (e) {}
  return {};
}
function saveDefaultOverrides() {
  try { localStorage.setItem(DEFAULT_OVERRIDES_KEY, JSON.stringify(state.defaultOverrides)); } catch (e) {}
}
function loadHiddenDefaults() {
  try {
    const saved = JSON.parse(localStorage.getItem(HIDDEN_DEFAULTS_KEY));
    if (Array.isArray(saved)) return saved.filter(k => PALETTE_DATA[k]);
  } catch (e) {}
  return [];
}
function saveHiddenDefaults() {
  try { localStorage.setItem(HIDDEN_DEFAULTS_KEY, JSON.stringify(state.hiddenDefaults)); } catch (e) {}
}

// A built-in (default) tab — has a fixed PALETTE_DATA entry — vs a user-made custom tab.
export function isBuiltinKey(key) { return Object.prototype.hasOwnProperty.call(PALETTE_DATA, key); }

// Copy a working symbol (latex symbol OR matrix-inserter) so stored/editor lists don't alias.
function cloneSym(s) {
  return s && s.matrixType ? { matrixType: s.matrixType, label: s.label } : { latex: s.latex };
}

// The editable symbol list for any tab key, in working form ([{latex} | {matrixType,label}]).
// Custom tab → its symbols; edited built-in → its override; pristine built-in → converted
// PALETTE_DATA (rich labels are dropped in favour of rendered faces once a tab is edited).
export function getEditableSymbols(key) {
  const custom = state.customTabs.find(t => t.id === key);
  if (custom) return custom.symbols.map(cloneSym);
  const ov = state.defaultOverrides[key];
  if (ov) return ov.symbols.map(cloneSym);
  return (PALETTE_DATA[key] || []).map(it =>
    it.matrixType ? { matrixType: it.matrixType, label: it.label } : { latex: it.latex });
}

// Persist a user's edit to a built-in tab (name + symbols). The key stays the category
// name so order and identity are stable; only the displayed label/content change.
export function saveDefaultOverride(key, name, symbols) {
  state.defaultOverrides[key] = { name, symbols: symbols.map(cloneSym) };
  saveDefaultOverrides();
}

// Remove a built-in tab: hide it from the bar and discard any override it carried.
export function removeDefaultTab(key) {
  if (!state.hiddenDefaults.includes(key)) state.hiddenDefaults.push(key);
  if (state.defaultOverrides[key]) { delete state.defaultOverrides[key]; saveDefaultOverrides(); }
  saveHiddenDefaults();
}

// Normalize one item (built-in PALETTE_DATA item OR working symbol) to a render descriptor.
function toRenderItem(item, useLabel) {
  if (item.matrixType) {
    const face = item.label || "▦";
    return { faceHTML: face, matrixType: item.matrixType, title: item.label || item.matrixType };
  }
  return {
    faceHTML: useLabel && item.label ? item.label : renderSymbolFace(item.latex),
    latex: item.latex,
    title: item.latex,
  };
}

// The list of buttons to draw for a tab. Pristine built-ins keep their hand-tuned rich
// labels; custom tabs and edited built-ins render faces from their LaTeX.
function getRenderItems(key) {
  const custom = state.customTabs.find(t => t.id === key);
  if (custom) return custom.symbols.map(s => toRenderItem(s, false));
  const ov = state.defaultOverrides[key];
  if (ov) return ov.symbols.map(s => toRenderItem(s, false));
  return (PALETTE_DATA[key] || []).map(it => toRenderItem(it, true));
}

// Empty placeholder slots render invisibly in static markup, which makes templated
// symbols (\frac{}{}, \int_{}^{}) look blank. Swap them for a faint visible box on the
// *face* only — the inserted LaTeX still uses real \placeholder{} slots.
const FACE_PLACEHOLDER = "\\textcolor{#9499b7}{\\square}";

// Turn a raw LaTeX command (with placeholders) into clean markup for a button face.
export function renderSymbolFace(latex) {
  const preview = String(latex || "")
    .replace(/#(\?|@|\d+)/g, "\\placeholder{}")              // #0/#?/#@ → placeholder
    .replace(/\\placeholder(\[[^\]]*\])?\{\}/g, FACE_PLACEHOLDER); // empty slots → visible box
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
  for (const item of getRenderItems(categoryName)) {
    const btn = document.createElement("button");
    btn.className = "pal-btn";
    btn.innerHTML = item.faceHTML;
    btn.title = item.title;
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

/* ── Tab ordering (drag-to-reorder, persisted) ── */
const TAB_ORDER_KEY = "mathpaster_tab_order";

function loadTabOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(TAB_ORDER_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return [];
}

function saveTabOrder(order) {
  try { localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(order)); } catch (e) {}
}

// Visible built-in category names (removed ones excluded) followed by custom tab ids.
function allTabKeys() {
  const builtins = Object.keys(PALETTE_DATA).filter(k => !state.hiddenDefaults.includes(k));
  return [...builtins, ...state.customTabs.map(t => t.id)];
}

// The saved order, with stale/hidden keys dropped and any newly-added keys appended.
function getOrderedKeys() {
  const all = allTabKeys();
  const order = loadTabOrder().filter(k => all.includes(k));
  for (const k of all) if (!order.includes(k)) order.push(k);
  return order;
}

// First tab currently on the bar — used as a fallback when the active tab is removed.
export function firstVisibleKey() {
  return getOrderedKeys()[0] || Object.keys(PALETTE_DATA)[0];
}

// Seed the active tab now that hidden/order state is known.
state.activeCategory = firstVisibleKey();

// Pin a tab to the front of the order (leftmost, just after the New Tab chip).
// Used when a custom tab is created so it appears on the left, not the far right.
export function moveTabToFront(key) {
  const order = getOrderedKeys().filter(k => k !== key);
  saveTabOrder([key, ...order]);
}

function labelForKey(key) {
  const custom = state.customTabs.find(t => t.id === key);
  if (custom) return custom.name;
  const ov = state.defaultOverrides[key];
  return ov && ov.name ? ov.name : key;
}

/* ── Drag-to-reorder ── */
let draggedTab = null;

function getDragAfterElement(x) {
  const els = [...categoryTabs.querySelectorAll('.cat-tab[draggable="true"]:not(.dragging)')];
  let closest = { offset: -Infinity, element: null };
  for (const el of els) {
    const box = el.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    if (offset < 0 && offset > closest.offset) closest = { offset, element: el };
  }
  return closest.element;
}

categoryTabs.addEventListener("dragover", e => {
  if (!draggedTab) return;
  e.preventDefault();
  const after = getDragAfterElement(e.clientX);
  if (after == null) categoryTabs.appendChild(draggedTab);
  else categoryTabs.insertBefore(draggedTab, after);
});
categoryTabs.addEventListener("drop", e => { if (draggedTab) e.preventDefault(); });

function persistOrderFromDOM() {
  const order = [...categoryTabs.querySelectorAll('.cat-tab[data-key]')].map(t => t.dataset.key);
  saveTabOrder(order);
}

function addTab(label, key, opts = {}) {
  const tab = document.createElement("button");
  tab.className = "cat-tab" + (key === state.activeCategory ? " active" : "");
  if (opts.custom) tab.classList.add("custom-tab");
  tab.dataset.key = key;
  tab.draggable = true;

  const labelSpan = document.createElement("span");
  labelSpan.className = "cat-tab-label";
  labelSpan.textContent = label;
  tab.appendChild(labelSpan);

  // Custom tabs always carry the pencil (editing is gated downstream); built-in tabs
  // show it only for Pro users, so free users aren't nagged on every default tab.
  if (opts.custom || hasPremium()) {
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

  tab.addEventListener("dragstart", e => {
    draggedTab = tab;
    tab.classList.add("dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", key); } catch (_) {}
    }
  });
  tab.addEventListener("dragend", () => {
    tab.classList.remove("dragging");
    draggedTab = null;
    persistOrderFromDOM();
  });

  tab.addEventListener("click", () => {
    state.activeCategory = key;
    document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderPalette(key);
    // Tabs are draggable (no mousedown-preventDefault), so keep the math field focused.
    if (state.mfReady) { window.focus(); mf.focus(); }
  });

  categoryTabs.appendChild(tab);
}

// Build the category tab bar: a leftmost "New Tab" chip, then the (reorderable) tabs.
export function renderTabs() {
  categoryTabs.innerHTML = "";

  // "New Tab" chip (premium) — leftmost, fixed (not reorderable).
  const newChip = document.createElement("button");
  newChip.className = "cat-tab new-tab-chip";
  newChip.title = "Create a custom tab";
  newChip.innerHTML = '<span class="cat-tab-label">+ New Tab</span><span class="pro-badge">PRO</span>';
  newChip.addEventListener("mousedown", e => e.preventDefault());
  newChip.addEventListener("click", () => {
    if (!hasPremium()) {
      openUpgradeModal("Custom tabs let you build your own symbol palettes with any \\command.");
      return;
    }
    openTabEditor(null);
  });
  categoryTabs.appendChild(newChip);

  for (const key of getOrderedKeys()) {
    addTab(labelForKey(key), key, { custom: state.customTabs.some(t => t.id === key) });
  }
}

// Wipe every tab customization — custom tabs, built-in edits, removals, and order —
// returning the bar to the original shipped set.
export function resetTabsToDefault() {
  state.customTabs = [];
  state.defaultOverrides = {};
  state.hiddenDefaults = [];
  saveCustomTabs();
  saveDefaultOverrides();
  saveHiddenDefaults();
  try { localStorage.removeItem(TAB_ORDER_KEY); } catch (e) {}
  state.activeCategory = Object.keys(PALETTE_DATA)[0];
  renderTabs();
  renderPalette(state.activeCategory);
}

/* ── "Reset tabs to default" control (Settings) — two-step inline confirm ── */
const resetTabsBtn     = document.getElementById("reset-tabs-btn");
const resetTabsConfirm = document.getElementById("reset-tabs-confirm");
const resetTabsYes     = document.getElementById("reset-tabs-yes");
const resetTabsCancel  = document.getElementById("reset-tabs-cancel");

function showResetConfirm(show) {
  if (resetTabsConfirm) resetTabsConfirm.hidden = !show;
  if (resetTabsBtn) resetTabsBtn.hidden = show;
}
if (resetTabsBtn) {
  resetTabsBtn.addEventListener("click", e => { e.preventDefault(); showResetConfirm(true); });
}
if (resetTabsCancel) {
  resetTabsCancel.addEventListener("click", e => { e.preventDefault(); showResetConfirm(false); });
}
if (resetTabsYes) {
  resetTabsYes.addEventListener("click", e => {
    e.preventDefault();
    resetTabsToDefault();
    showResetConfirm(false);
  });
}

// Activating/deactivating a license flips whether built-in tabs show their edit pencil.
document.addEventListener("mathpaster:license-changed", () => renderTabs());
