import { state } from './state.js';
import { mf, latexEl } from './dom.js';
import { updatePreview } from './mathfield.js';
import { recordUse } from './review.js';
import { recordHistory } from './history.js';

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

/* ── Load a saved expression back into the editor ──
 * Shared re-entry point for the history & snippets panels: restore the insert
 * mode, set the math field, refresh the preview, and re-focus the field.
 */
export function loadExpression(latex) {
  state.insertMode = "inline";
  mf.value = latex || "";
  updatePreview();
  if (state.mfReady) {
    window.focus();
    mf.focus();
    try { mf.executeCommand("moveToMathFieldEnd"); } catch (_) {}
  }
}

/* ── Insert ── */
export function doInsert() {
  const raw = (mf.value || "").trim();
  if (!raw) return;
  const wrap = `$${raw}$`;
  localStorage.removeItem("mathpaster_draft");
  recordUse();
  recordHistory(raw, state.insertMode);
  window.parent.postMessage({ mathpaster: "insert", latex: wrap }, "*");
}
document.getElementById("insert-btn").addEventListener("mousedown", e => e.preventDefault());
document.getElementById("insert-btn").addEventListener("click", doInsert);

/* ── Copy ── */
document.getElementById("copy-btn").addEventListener("mousedown", e => e.preventDefault());
document.getElementById("copy-btn").addEventListener("click", () => {
  const raw = (mf.value || "").trim();
  if (!raw) return;
  const wrap = `$${raw}$`;
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
