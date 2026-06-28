import { state } from './state.js';
import { mf } from './dom.js';
import { doInsert } from './actions.js';
import { updatePreview } from './mathfield.js';

/* ── Word Deletion Handler ── */
function performCustomWordDelete() {
  if (!state.mfReady || !mf) return;
  try {
    const sel = mf.selection;
    const ranges = sel ? sel.ranges : null;
    let start = mf.position;
    let end = mf.position;
    
    if (ranges && ranges.length > 0) {
      start = ranges[0][0];
      end = ranges[0][1];
    }
    
    // If there's an active non-empty selection, delete it first
    if (start !== end) {
      mf.executeCommand("deleteBackward");
      return;
    }
    
    let pos = start;
    if (pos <= 0) return;
    
    const isBoundary = (latex) => {
      if (!latex) return true;
      const clean = latex.trim();
      if (clean === "" || clean === " " || clean === "," || clean === "." || clean === ";" || clean === ":") return true;
      if (clean === "\\:" || clean === "\\ " || clean === "\\space" || clean === "\\;" || clean === "\\," || clean === "\\!" || clean === "\\quad" || clean === "\\qquad") return true;
      return false;
    };
    
    // Check if we start on a boundary
    const startBoundary = isBoundary(mf.getValue([pos - 1, pos], 'latex'));
    if (startBoundary) {
      while (pos > 0 && isBoundary(mf.getValue([pos - 1, pos], 'latex'))) {
        pos--;
      }
    }
    
    // Scan backward for the word
    while (pos > 0 && !isBoundary(mf.getValue([pos - 1, pos], 'latex'))) {
      pos--;
    }
    
    if (pos < start) {
      try {
        mf.selection = { ranges: [[pos, start]] };
      } catch (selErr) {
        if (mf.setSelectionRange) {
          mf.setSelectionRange(pos, start);
        } else {
          mf.position = pos;
        }
      }
      mf.executeCommand("deleteBackward");
    }
  } catch (err) {
    console.error("Error in performCustomWordDelete:", err);
    // Fallback to standard delete
    try { mf.executeCommand("deletePreviousWord"); } catch (e) {}
  }
}

/* ── Keyboard shortcuts ── */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    // Close an open modal first; only close the whole editor if none are open.
    const tabOv = document.getElementById("tab-overlay");
    const setOv = document.getElementById("settings-overlay");
    const histOv = document.getElementById("history-overlay");
    const snipOv = document.getElementById("snippets-overlay");
    if (tabOv && tabOv.classList.contains("visible")) { tabOv.classList.remove("visible"); return; }
    if (setOv && setOv.classList.contains("visible")) { setOv.classList.remove("visible"); return; }
    if (histOv && histOv.classList.contains("visible")) { histOv.classList.remove("visible"); return; }
    if (snipOv && snipOv.classList.contains("visible")) { snipOv.classList.remove("visible"); return; }
    window.parent.postMessage({ mathpaster: "close" }, "*");
    return;
  }
  // Ctrl+Backspace inside mathfield -> delete word backward
  if (e.key === "Backspace" && (e.ctrlKey || e.metaKey)) {
    if (state.mfReady && mf && (
      document.activeElement === mf || 
      (typeof mf.hasFocus === "function" && mf.hasFocus()) || 
      e.target === mf || 
      mf.contains(e.target) || 
      (e.target.closest && e.target.closest("math-field") === mf)
    )) {
      e.preventDefault();
      e.stopPropagation();
      performCustomWordDelete();
      return;
    }
  }
  // Enter key when autocomplete popover is open → select & commit suggestion
  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    const popover = document.getElementById("mathlive-suggestion-popover");
    if (popover && popover.classList.contains("is-visible")) {
      const activeItem = popover.querySelector(".ML__popover__current");
      if (activeItem) {
        e.preventDefault();
        e.stopPropagation();
        activeItem.click();
        return;
      }
    }
  }
  // Ctrl+Enter → insert
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    e.stopPropagation();
    doInsert();
    return;
  }
  // Ctrl+M inside iframe → toggle (close)
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "m" || e.code === "KeyM")) {
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ mathpaster: "toggle" }, "*");
    return;
  }
  // Alt+K inside iframe → toggle virtual keyboard
  if (e.altKey && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
    e.preventDefault();
    e.stopPropagation();
    if (window.mathVirtualKeyboard) {
      if (window.mathVirtualKeyboard.visible) {
        window.mathVirtualKeyboard.hide();
      } else {
        window.mathVirtualKeyboard.show();
        setTimeout(() => { if (state.mfReady && mf) mf.focus(); }, 50);
      }
    }
    return;
  }
}, true);

/* ── Messages from content script ── */
window.addEventListener("message", e => {
  if (e.data?.mathpaster === "reset") {
    if (state.mfReady) {
      let draft = "";
      
      if (e.data.initialMath) {
        draft = e.data.initialMath.text;
        state.insertMode = e.data.initialMath.mode;
        // Also update local storage so it persists if they reload or toggle again without inserting
        localStorage.setItem("mathpaster_draft", draft);
        localStorage.setItem("mathpaster_mode", state.insertMode);
      } else {
        draft = localStorage.getItem("mathpaster_draft") || "";
        state.insertMode = localStorage.getItem("mathpaster_mode") || "inline";
      }

      mf.value = draft;
      
      document.getElementById("mode-switch").checked = (state.insertMode === "block");
      document.querySelectorAll(".mode-label").forEach(l => {
        l.classList.toggle("active", l.dataset.mode === state.insertMode);
      });
      
      updatePreview();
      setTimeout(() => {
        // Don't steal focus into the main field while the custom-tab modal is open.
        const tabOv = document.getElementById("tab-overlay");
        if (tabOv && tabOv.classList.contains("visible")) return;
        try { window.focus(); mf.focus(); } catch {}
      }, 100);
    }
  }
});

document.addEventListener("mousedown", e => {
  if (
    !e.target.closest("#editor-window") &&
    !e.target.closest("#settings-panel") &&
    !e.target.closest("#pro-overlay") &&
    !e.target.closest("#tab-overlay") &&
    !e.target.closest("#history-overlay") &&
    !e.target.closest("#snippets-overlay") &&
    !e.target.closest("#matrix-selector") &&
    !e.target.closest("#keyboard-window") &&
    !e.target.closest("mathlive-virtual-keyboard") &&
    !e.target.closest(".MLK__container") &&
    !e.target.closest(".ML__keyboard")
  ) {
    window.parent.postMessage({ mathpaster: "close" }, "*");
  }
});
