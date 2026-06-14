import { mf } from './dom.js';
import { state } from './state.js';
import { loadExpression } from './actions.js';
import { isPro, openUpgradeModal } from './license.js';
import { renderEntryList } from './entry-list.js';

/* ── Snippets (Pro) ──
 * Save whatever is in the editor as a reusable, optionally-named snippet. The
 * panel opens for everyone; free users see an in-panel teaser, Pro users get
 * the full save + list UI. Stored locally (matches the custom-tabs pattern).
 */
const SNIPPETS_KEY = "mathpaster_snippets";

function load() {
  try {
    const a = JSON.parse(localStorage.getItem(SNIPPETS_KEY));
    if (Array.isArray(a)) return a;
  } catch (e) {}
  return [];
}
function save(list) {
  try { localStorage.setItem(SNIPPETS_KEY, JSON.stringify(list)); } catch (e) {}
}

const overlay   = document.getElementById("snippets-overlay");
const proBox     = document.getElementById("snippets-pro");
const teaserBox  = document.getElementById("snippets-teaser");
const listEl     = document.getElementById("snippets-list");
const nameInput  = document.getElementById("snippet-name-input");
const saveBtn    = document.getElementById("snippet-save-btn");
const errEl      = document.getElementById("snippet-error");

function render() {
  const pro = isPro();
  if (proBox)    proBox.style.display    = pro ? "" : "none";
  if (teaserBox) teaserBox.style.display = pro ? "none" : "";
  if (!pro) return;
  renderEntryList(listEl, load(), {
    emptyText: "No snippets yet. Type some math, then Save current.",
    showName: true,
    onPick: s => { loadExpression(s.latex, s.mode); closePanel(); },
    onDelete: s => { save(load().filter(x => x.id !== s.id)); render(); },
  });
}

function saveCurrent() {
  const raw = (mf.value || "").trim();
  if (!raw) { if (errEl) errEl.textContent = "Type some math first, then save it as a snippet."; return; }
  const name = (nameInput && nameInput.value || "").trim();
  const list = load();
  list.unshift({ id: "s_" + Date.now(), latex: raw, mode: state.insertMode, name, ts: Date.now() });
  save(list);
  if (nameInput) nameInput.value = "";
  if (errEl) errEl.textContent = "";
  render();
}

export function openSnippets() {
  if (errEl) errEl.textContent = "";
  render();
  if (overlay) overlay.classList.add("visible");
}
function closePanel() {
  if (overlay) overlay.classList.remove("visible");
}

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

const teaserBtn = document.getElementById("snippets-getpro-btn");
if (teaserBtn) {
  teaserBtn.addEventListener("mousedown", e => e.preventDefault());
  teaserBtn.addEventListener("click", e => {
    e.preventDefault();
    closePanel();
    openUpgradeModal("Snippets let you save and reuse your favorite expressions.");
  });
}

if (overlay) overlay.addEventListener("mousedown", e => { if (e.target === overlay) closePanel(); });

// Activating/lapsing Pro while the panel is open swaps teaser ↔ full UI live.
document.addEventListener("mathpaster:license-changed", () => {
  if (overlay && overlay.classList.contains("visible")) render();
});
