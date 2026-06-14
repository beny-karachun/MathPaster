import { state } from './state.js';
import { mf, palette } from './dom.js';
import { PALETTE_DATA } from './palette-data.js';
import { openTabEditor } from './tab-editor.js';
import { showMatrixSelector } from './matrix.js';
import { isPro, openUpgradeModal } from './license.js';

/* ── Custom tabs (Premium) ── */
const CUSTOM_TABS_KEY = "mathpaster_custom_tabs";

// Single chokepoint for the premium gate (backed by the Lemon Squeezy license).
// Tabs created before a license lapse stay usable; only creating/editing is gated.
export function hasPremium() { return isPro(); }

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

// Built-in category names followed by custom tab ids, in their natural order.
function allTabKeys() {
  return [...Object.keys(PALETTE_DATA), ...state.customTabs.map(t => t.id)];
}

// The saved order, with stale keys dropped and any newly-added keys appended.
function getOrderedKeys() {
  const all = allTabKeys();
  const order = loadTabOrder().filter(k => all.includes(k));
  for (const k of all) if (!order.includes(k)) order.push(k);
  return order;
}

// Pin a tab to the front of the order (leftmost, just after the New Tab chip).
// Used when a custom tab is created so it appears on the left, not the far right.
export function moveTabToFront(key) {
  const order = getOrderedKeys().filter(k => k !== key);
  saveTabOrder([key, ...order]);
}

function labelForKey(key) {
  const custom = state.customTabs.find(t => t.id === key);
  return custom ? custom.name : key;
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
