import { state } from './state.js';
import { mf } from './dom.js';
import { updatePreview } from './mathfield.js';
import { recordUse } from './review.js';
import { recordHistory } from './history.js';

const copyButton = document.getElementById("copy-btn");
const insertButton = document.getElementById("insert-btn");
const copyFeedbackTimers = new Map();
let pendingCopy = null;
let copyTimeout = null;

function finishCopy() {
  clearTimeout(copyTimeout);
  pendingCopy = null;
  copyButton.removeAttribute("aria-busy");
  insertButton.removeAttribute("aria-busy");
  updatePreview();
}

function showCopied(button) {
  const label = button.querySelector(".copy-button-label");
  if (!label) return;

  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = label.textContent;
  clearTimeout(copyFeedbackTimers.get(button));
  button.classList.add("is-copied");
  label.textContent = "Copied!";

  copyFeedbackTimers.set(button, setTimeout(() => {
    button.classList.remove("is-copied");
    label.textContent = button.dataset.defaultLabel;
    copyFeedbackTimers.delete(button);
  }, 1400));
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || !pendingCopy || event.data?.requestId !== pendingCopy.id) return;
  if (event.data.mathpaster === "copied") {
    recordUse();
    recordHistory(pendingCopy.raw, pendingCopy.mode);
    showCopied(pendingCopy.closeAfter ? insertButton : copyButton);
    finishCopy();
  } else if (event.data.mathpaster === "copy-failed") finishCopy();
});

/* ── Mode toggle ── */
const modeSwitch = document.getElementById("mode-switch");
const modeLabels = document.querySelectorAll("#mode-selector .mode-label");

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

/* ── Load a saved expression back into the editor ──
 * Shared re-entry point for the history & snippets panels: restore the insert
 * mode, set the math field, refresh the preview, and re-focus the field.
 */
export function loadExpression(latex, mode) {
  if (mode === "inline" || mode === "block") updateModeUI(mode);
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
  requestCopy(true);
}

function requestCopy(closeAfter) {
  const raw = (mf.value || "").trim();
  if (!raw || pendingCopy || !state.mfReady) return;
  // A new attempt must not keep showing a previous success if this one fails.
  for (const button of [copyButton, insertButton]) {
    clearTimeout(copyFeedbackTimers.get(button));
    copyFeedbackTimers.delete(button);
    button.classList.remove("is-copied");
    if (button.dataset.defaultLabel) button.querySelector(".copy-button-label").textContent = button.dataset.defaultLabel;
  }
  const wrap = state.insertMode === "block" ? `$$${raw}$$` : `$${raw}$`;
  const id = crypto.randomUUID();
  pendingCopy = { id, raw, mode: state.insertMode, closeAfter };
  copyButton.disabled = insertButton.disabled = true;
  (closeAfter ? insertButton : copyButton).setAttribute("aria-busy", "true");
  copyTimeout = setTimeout(() => {
    finishCopy();
    window.parent.postMessage({ mathpaster: "toast", text: "Copy timed out. Your equation is saved — please try again." }, "*");
  }, 5000);
  window.parent.postMessage({ mathpaster: closeAfter ? "insert" : "copy", latex: wrap, requestId: id }, "*");
}
insertButton.addEventListener("mousedown", e => e.preventDefault());
insertButton.addEventListener("click", doInsert);

/* ── Copy ── */
copyButton.addEventListener("mousedown", e => e.preventDefault());
copyButton.addEventListener("click", () => requestCopy(false));
document.getElementById("new-equation-btn").addEventListener("click", () => {
  if (!state.mfReady) return;
  mf.executeCommand("selectAll");
  mf.executeCommand("deleteBackward");
  updatePreview();
  mf.focus();
});
