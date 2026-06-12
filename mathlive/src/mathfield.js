import { state } from './state.js';
import { mf, latexEl, loading } from './dom.js';

/* ── Live preview & Caching ── */
export function updatePreview() {
  const raw = mf.value || "";
  localStorage.setItem("mathpaster_draft", raw);
  if (!raw) { latexEl.textContent = ""; return; }
  latexEl.textContent = state.insertMode === "block" ? `$$${raw}$$` : `$${raw}$`;
}

/* ── Register <math-field> custom element from UMD build ── */
export function initMathField() {
  try {
    const MFE = window.MathLive?.MathfieldElement || window.MathfieldElement;

    if (!MFE) {
      loading.textContent = "Failed to load math engine: MathfieldElement is undefined.";
      return;
    }

    // Configure fonts
    try {
      MFE.fontsDirectory = "./lib/fonts/";
      MFE.soundsDirectory = null;
      if (window.mathVirtualKeyboard) {
        window.mathVirtualKeyboard.container = document.getElementById("keyboard-container");
      }
    } catch (e) {
      console.warn("Could not set MathfieldElement properties:", e);
    }

    if (!customElements.get("math-field")) {
      customElements.define("math-field", MFE);
    }

    customElements.whenDefined("math-field").then(() => {
      state.mfReady = true;
      
      // Prevent virtual keyboard from automatically popping up on focus
      mf.mathVirtualKeyboardPolicy = "manual";
      mf.setAttribute("math-virtual-keyboard-policy", "manual");
      
      state.defaultShortcuts = mf.getOption ? mf.getOption("inlineShortcuts") : mf.inlineShortcuts;
      
      const savedAuto = localStorage.getItem("mathpaster_autosymbols");
      if (savedAuto === "false") {
        document.getElementById("auto-symbol-switch").checked = false;
        document.querySelector("#auto-symbol-selector .mode-label").classList.remove("active");
        if (mf.setOptions) mf.setOptions({ inlineShortcuts: {}, mathModeSpace: "\\:" });
        else { mf.inlineShortcuts = {}; mf.mathModeSpace = "\\:"; }
      } else {
        if (mf.setOptions) mf.setOptions({ mathModeSpace: "\\:" });
        else mf.mathModeSpace = "\\:";
      }

      loading.classList.add("hidden");
      mf.style.display = "block";
      mf.addEventListener("input", updatePreview);
      window.parent.postMessage({ mathpaster: "ready" }, "*");
    }).catch(err => {
      loading.textContent = "Error defining math-field: " + err.message;
    });

  } catch (err) {
    loading.textContent = "Init Error: " + err.message;
  }
}

// Guarantee the iframe window claims focus on ANY click before MathLive can preventDefault
window.addEventListener("mousedown", () => {
  window.focus();
}, true);

// Enforce focus when clicking anywhere inside the editor wrap or the empty space of the math field
document.getElementById("mf-wrap").addEventListener("mousedown", (e) => {
  if (e.target === document.getElementById("mf-wrap") || e.target === mf) {
    e.preventDefault();
    if (state.mfReady && mf) {
      window.focus();
      mf.focus();
      try { mf.executeCommand("moveToMathFieldEnd"); } catch(err) {}
      try { mf.executeCommand("moveToRightEnd"); } catch(err) {}
    }
  }
});
