import { mf } from './dom.js';
import { state } from './state.js';
import { loadExpression } from './actions.js';
import { isPro, wireCheckoutLink } from './license.js';
import { renderEntryList } from './entry-list.js';

/* ── Snippets (Pro) ──
 * Save whatever is in the editor as a reusable expression, organised into custom
 * tabs (folders). The panel opens for everyone; free users see an in-panel
 * teaser, Pro users get the full UI. Everything is stored locally.
 *   mathpaster_snippet_tabs  → [{ id, name }]
 *   mathpaster_snippets      → [{ id, latex, mode, name, ts, tabId }]
 *   mathpaster_snippet_active→ active tab id
 */
const SNIPPETS_KEY = "mathpaster_snippets";
const TABS_KEY     = "mathpaster_snippet_tabs";
const ACTIVE_KEY   = "mathpaster_snippet_active";

function loadArray(key) {
  try { const a = JSON.parse(localStorage.getItem(key)); if (Array.isArray(a)) return a; } catch (e) {}
  return [];
}
function loadSnips()  { return loadArray(SNIPPETS_KEY); }
function saveSnips(l) { try { localStorage.setItem(SNIPPETS_KEY, JSON.stringify(l)); } catch (e) {} }
function loadTabs()   { return loadArray(TABS_KEY); }
function saveTabs(l)  { try { localStorage.setItem(TABS_KEY, JSON.stringify(l)); } catch (e) {} }
function getActive()  { try { return localStorage.getItem(ACTIVE_KEY) || ""; } catch (e) { return ""; } }
function setActive(id){ try { localStorage.setItem(ACTIVE_KEY, id || ""); } catch (e) {} }

// Guarantee a tab always exists, every snippet points at a real tab, and the
// active tab is valid. Also migrates flat (pre-tabs) snippets into a default tab.
function ensureTabs() {
  let tabs = loadTabs();
  if (!tabs.length) {
    tabs = [{ id: "st_" + Date.now(), name: "My Snippets" }];
    saveTabs(tabs);
  }
  const ids = new Set(tabs.map(t => t.id));
  const snips = loadSnips();
  let changed = false;
  for (const s of snips) {
    if (!ids.has(s.tabId)) { s.tabId = tabs[0].id; changed = true; }
  }
  if (changed) saveSnips(snips);
  if (!ids.has(getActive())) setActive(tabs[0].id);
  return tabs;
}

const overlay   = document.getElementById("snippets-overlay");
const proBox    = document.getElementById("snippets-pro");
const teaserBox = document.getElementById("snippets-teaser");
const listEl    = document.getElementById("snippets-list");
const tabsEl    = document.getElementById("snippet-tabs");
const saveLabel = document.getElementById("snippet-save-label");
const nameInput = document.getElementById("snippet-name-input");
const saveBtn   = document.getElementById("snippet-save-btn");
const errEl     = document.getElementById("snippet-error");

const tabForm      = document.getElementById("snippet-tab-form");
const tabNameInput = document.getElementById("snippet-tab-name");
const tabSaveBtn   = document.getElementById("snippet-tab-save");
const tabDeleteBtn = document.getElementById("snippet-tab-delete");
const tabCancelBtn = document.getElementById("snippet-tab-cancel");

/* ── Tabs bar ── */
function renderTabsBar(tabs) {
  if (!tabsEl) return;
  tabsEl.innerHTML = "";
  const active = getActive();
  tabs.forEach(tab => {
    const chip = document.createElement("button");
    chip.className = "snip-tab" + (tab.id === active ? " active" : "");
    chip.addEventListener("mousedown", e => e.preventDefault());

    const lbl = document.createElement("span");
    lbl.className = "snip-tab-label";
    lbl.textContent = tab.name;
    chip.appendChild(lbl);

    const edit = document.createElement("span");
    edit.className = "snip-tab-edit";
    edit.title = "Rename or delete tab";
    edit.textContent = "✎";
    edit.addEventListener("mousedown", e => e.preventDefault());
    edit.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); openTabForm(tab.id); });
    chip.appendChild(edit);

    chip.addEventListener("click", () => { setActive(tab.id); closeTabForm(); render(); });
    tabsEl.appendChild(chip);
  });

  const add = document.createElement("button");
  add.className = "snip-tab new-tab";
  add.textContent = "+ New tab";
  add.addEventListener("mousedown", e => e.preventDefault());
  add.addEventListener("click", () => openTabForm(null));
  tabsEl.appendChild(add);
}

/* ── Tab create / rename / delete form ── */
let editingTabId = null;

function openTabForm(id) {
  editingTabId = id;
  const tabs = loadTabs();
  if (id) {
    const t = tabs.find(x => x.id === id);
    if (tabNameInput) tabNameInput.value = t ? t.name : "";
    if (tabSaveBtn)   tabSaveBtn.textContent = "Save";
    if (tabDeleteBtn) tabDeleteBtn.style.display = tabs.length > 1 ? "" : "none";
  } else {
    if (tabNameInput) tabNameInput.value = "";
    if (tabSaveBtn)   tabSaveBtn.textContent = "Add";
    if (tabDeleteBtn) tabDeleteBtn.style.display = "none";
  }
  if (tabForm) tabForm.style.display = "";
  if (tabNameInput) requestAnimationFrame(() => { try { tabNameInput.focus(); } catch (e) {} });
}

function closeTabForm() {
  editingTabId = null;
  if (tabForm) tabForm.style.display = "none";
  if (tabNameInput) tabNameInput.value = "";
}

function commitTabForm() {
  const name = (tabNameInput && tabNameInput.value || "").trim();
  if (!name) { if (tabNameInput) tabNameInput.focus(); return; }
  let tabs = loadTabs();
  if (editingTabId) {
    const t = tabs.find(x => x.id === editingTabId);
    if (t) t.name = name;
  } else {
    const id = "st_" + Date.now();
    tabs.push({ id, name });
    setActive(id);
  }
  saveTabs(tabs);
  closeTabForm();
  render();
}

function deleteTab() {
  if (!editingTabId) return;
  let tabs = loadTabs();
  if (tabs.length <= 1) return; // always keep at least one tab
  const removeId = editingTabId;
  tabs = tabs.filter(t => t.id !== removeId);
  saveTabs(tabs);
  saveSnips(loadSnips().filter(s => s.tabId !== removeId)); // drop its snippets
  if (getActive() === removeId) setActive(tabs[0].id);
  closeTabForm();
  render();
}

/* ── Snippet list + save ── */
function render() {
  const pro = isPro();
  if (proBox)    proBox.style.display    = pro ? "" : "none";
  if (teaserBox) teaserBox.style.display = pro ? "none" : "";
  if (!pro) return;

  const tabs = ensureTabs();
  renderTabsBar(tabs);
  const activeTab = tabs.find(t => t.id === getActive()) || tabs[0];
  if (saveLabel) saveLabel.textContent = `Save current expression to “${activeTab.name}”`;

  const items = loadSnips().filter(s => s.tabId === activeTab.id);
  renderEntryList(listEl, items, {
    emptyText: "No snippets in this tab yet. Type some math, then Save.",
    showName: true,
    onPick: s => { loadExpression(s.latex, s.mode); closePanel(); },
    onDelete: s => { saveSnips(loadSnips().filter(x => x.id !== s.id)); render(); },
  });
}

function saveCurrent() {
  const raw = (mf.value || "").trim();
  if (!raw) { if (errEl) errEl.textContent = "Type some math first, then save it as a snippet."; return; }
  const tabs = ensureTabs();
  const tabId = (tabs.find(t => t.id === getActive()) || tabs[0]).id;
  const name = (nameInput && nameInput.value || "").trim();
  const list = loadSnips();
  list.unshift({ id: "s_" + Date.now(), latex: raw, mode: state.insertMode, name, ts: Date.now(), tabId });
  saveSnips(list);
  if (nameInput) nameInput.value = "";
  if (errEl) errEl.textContent = "";
  render();
}

/* ── Panel open/close ── */
export function openSnippets() {
  if (errEl) errEl.textContent = "";
  closeTabForm();
  render();
  if (overlay) overlay.classList.add("visible");
}
function closePanel() {
  if (overlay) overlay.classList.remove("visible");
}

/* ── Wiring ── */
const openBtn  = document.getElementById("snippets-btn");
const closeBtn = document.getElementById("close-snippets-btn");
if (openBtn)  openBtn.addEventListener("click", openSnippets);
if (closeBtn) closeBtn.addEventListener("click", closePanel);

if (saveBtn) {
  saveBtn.addEventListener("mousedown", e => e.preventDefault());
  saveBtn.addEventListener("click", e => { e.preventDefault(); saveCurrent(); });
}
if (nameInput) {
  nameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); saveCurrent(); }
  });
}

if (tabSaveBtn) {
  tabSaveBtn.addEventListener("mousedown", e => e.preventDefault());
  tabSaveBtn.addEventListener("click", e => { e.preventDefault(); commitTabForm(); });
}
if (tabDeleteBtn) {
  tabDeleteBtn.addEventListener("mousedown", e => e.preventDefault());
  tabDeleteBtn.addEventListener("click", e => { e.preventDefault(); deleteTab(); });
}
if (tabCancelBtn) {
  tabCancelBtn.addEventListener("mousedown", e => e.preventDefault());
  tabCancelBtn.addEventListener("click", e => { e.preventDefault(); closeTabForm(); });
}
if (tabNameInput) {
  tabNameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); commitTabForm(); }
  });
}

// "Get Pro" in the snippets teaser is a real anchor — just point it at checkout.
wireCheckoutLink(document.getElementById("snippets-getpro-btn"));

if (overlay) overlay.addEventListener("mousedown", e => { if (e.target === overlay) closePanel(); });

// Activating/lapsing Pro while the panel is open swaps teaser ↔ full UI live.
document.addEventListener("mathpaster:license-changed", () => {
  if (overlay && overlay.classList.contains("visible")) render();
});
