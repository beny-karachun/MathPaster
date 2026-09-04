import { loadExpression } from './actions.js';
import { renderEntryList } from './entry-list.js';

/* ── Insert History (free) ──
 * A Win+V-style list of the last 20 inserted expressions. recordHistory() is
 * called from doInsert() in actions.js on every successful insert; the panel
 * reads from storage each time it opens so it always reflects the latest state.
 */
const HISTORY_KEY = "mathpaster_history";
const HISTORY_MAX = 20;

function load() {
  try {
    const a = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (Array.isArray(a)) return a;
  } catch (e) {}
  return [];
}
function save(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) {}
}

// Record an inserted expression (raw, unwrapped LaTeX + its insert mode).
export function recordHistory(latex, mode) {
  const raw = (latex || "").trim();
  if (!raw) return;
  let list = load();
  if (list.length && list[0].latex === raw) {
    // Consecutive duplicate — just refresh its timestamp/mode, don't pile up.
    list[0].ts = Date.now();
    list[0].mode = mode;
  } else {
    list.unshift({ latex: raw, mode, ts: Date.now() });
  }
  if (list.length > HISTORY_MAX) list = list.slice(0, HISTORY_MAX);
  save(list);
  if (overlay && overlay.classList.contains("visible")) render();
}

const overlay  = document.getElementById("history-overlay");
const listEl   = document.getElementById("history-list");
const clearBtn = document.getElementById("history-clear-btn");

function render() {
  renderEntryList(listEl, load(), {
    emptyText: "No history yet. Expressions you insert show up here.",
    onPick: entry => { loadExpression(entry.latex, entry.mode); closePanel(); },
    onDelete: entry => {
      save(load().filter(e => !(e.ts === entry.ts && e.latex === entry.latex)));
      render();
    },
  });
}

export function openHistory() {
  render();
  if (overlay) overlay.classList.add("visible");
}
function closePanel() {
  if (overlay) overlay.classList.remove("visible");
}

const openBtn  = document.getElementById("history-btn");
const closeBtn = document.getElementById("close-history-btn");
if (openBtn)  openBtn.addEventListener("click", openHistory);
if (closeBtn) closeBtn.addEventListener("click", closePanel);
if (clearBtn) clearBtn.addEventListener("click", () => { save([]); render(); });
if (overlay)  overlay.addEventListener("mousedown", e => { if (e.target === overlay) closePanel(); });
