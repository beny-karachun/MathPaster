import { state } from './state.js';
import { mf, latexEl } from './dom.js';
import { updatePreview } from './mathfield.js';
import { recordUse } from './review.js';

/* ── Mode toggle ── */
const modeSwitch = document.getElementById("mode-switch");
const modeLabels = document.querySelectorAll(".mode-label");

function updateModeUI(mode) {
  state.insertMode = mode;
  modeSwitch.checked = (mode === "block");
  modeLabels.forEach(l => l.classList.toggle("active", l.dataset.mode === mode));
  localStorage.setItem("mathpaster_mode", state.insertMode);
  updatePreview();
  if (state.mfReady) { window.focus(); mf.focus(); }
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
    if (state.mfReady && mf) {
      if (mf.setOptions) mf.setOptions({ inlineShortcuts: state.defaultShortcuts || {} });
      else mf.inlineShortcuts = state.defaultShortcuts || {};
    }
  } else {
    autoSymbolLabel.classList.remove("active");
    if (state.mfReady && mf) {
      if (mf.setOptions) mf.setOptions({ inlineShortcuts: {} });
      else mf.inlineShortcuts = {};
    }
  }
  localStorage.setItem("mathpaster_autosymbols", isAuto ? "true" : "false");
  if (state.mfReady) { window.focus(); mf.focus(); }
});

/* ── Close ── */
document.getElementById("close-btn").addEventListener("click", () => {
  window.parent.postMessage({ mathpaster: "close" }, "*");
});

/* ── Insert ── */
export function doInsert() {
  const raw = (mf.value || "").trim();
  if (!raw) return;
  const wrap = state.insertMode === "block" ? `$$${raw}$$` : `$${raw}$`;
  localStorage.removeItem("mathpaster_draft");
  recordUse();
  window.parent.postMessage({ mathpaster: "insert", latex: wrap }, "*");
}
document.getElementById("insert-btn").addEventListener("mousedown", e => e.preventDefault());
document.getElementById("insert-btn").addEventListener("click", doInsert);

/* ── Copy ── */
document.getElementById("copy-btn").addEventListener("mousedown", e => e.preventDefault());
document.getElementById("copy-btn").addEventListener("click", () => {
  const raw = (mf.value || "").trim();
  if (!raw) return;
  const wrap = state.insertMode === "block" ? `$$${raw}$$` : `$${raw}$`;
  recordUse();
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
