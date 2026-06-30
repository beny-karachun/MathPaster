import { state } from './state.js';
import { mf, latexEl, loading } from './dom.js';

/* ── Touch detection (mirrors how MathLive itself decides a device is touch) ── */
const IS_TOUCH = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

/* Open the device's native keyboard when the field is tapped on mobile.
 * MathLive hard-codes inputmode="none" on its hidden keyboard sink so it can show
 * its own math keyboard on touch devices. We run with policy:"manual" (no math
 * keyboard), which left phones with no keyboard at all. Flipping the sink to
 * inputmode="text" makes a tap summon the OS keyboard; input still flows through
 * the sink so MathLive parsing / auto-symbols keep working. The sink lives in the
 * field's shadow DOM and can be re-rendered, so we re-assert before each focus. */
function enableNativeKeyboard() {
  const root = mf && (mf.shadowRoot || mf);
  const sink = root && root.querySelector('.ML__keyboard-sink');
  if (sink && sink.getAttribute('inputmode') !== 'text') sink.setAttribute('inputmode', 'text');
}

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
      if (IS_TOUCH) {
        enableNativeKeyboard();
        mf.addEventListener("pointerdown", enableNativeKeyboard, true);
        mf.addEventListener("focusin", enableNativeKeyboard);
      }
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
    // On touch, let the native tap focus the field so the OS keyboard opens —
    // preventDefault() + programmatic focus here would suppress the keyboard.
    if (IS_TOUCH) return;
    e.preventDefault();
    if (state.mfReady && mf) {
      window.focus();
      mf.focus();
      try { mf.executeCommand("moveToMathFieldEnd"); } catch(err) {}
      try { mf.executeCommand("moveToRightEnd"); } catch(err) {}
    }
  }
});
