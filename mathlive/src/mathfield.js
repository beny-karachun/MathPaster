import { state } from './state.js';
import { mf, latexEl, loading } from './dom.js';

/* ── Touch detection (mirrors how MathLive itself decides a device is touch) ── */
const IS_TOUCH = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

/* Open the device's native keyboard when the field is tapped on mobile.
 * MathLive hard-codes inputmode="none" on its hidden keyboard sink so it can show
 * its own math keyboard on touch devices. We run with policy:"manual" (no math
 * keyboard), which left phones with no keyboard at all. Flipping the sink to
 * inputmode="text" makes a tap summon the OS keyboard; typed text still flows through
 * the sink so MathLive parses it. (Auto-symbols need the extra bridge below, because
 * the OS keyboard commits characters without keydown.) The sink lives in the field's
 * shadow DOM and can be re-rendered, so we re-assert before each focus. */
function enableNativeKeyboard() {
  const root = mf && (mf.shadowRoot || mf);
  const sink = root && root.querySelector('.ML__keyboard-sink');
  if (sink && sink.getAttribute('inputmode') !== 'text') sink.setAttribute('inputmode', 'text');
}

/* Make auto-symbols (MathLive "inline shortcuts") work when characters arrive WITHOUT
 * a keydown. MathLive only expands shortcuts from its keydown handler, so any input
 * that commits via the IME path — phone keyboards, and Chrome on Linux/Wayland+IBus —
 * types "alpha" literally instead of α. This bridges that gap: on a commit with no
 * preceding keydown we look for a trailing shortcut key and expand it via the mathfield
 * API. On a normal physical keyboard MathLive already handled it (keydown fired), so we
 * stay dormant — no double expansion, no regression. Reading the LIVE inlineShortcuts
 * option means this honours the Auto-Symbols toggle for free (it's {} when off). */
function enableImeInlineShortcuts(mf) {
  let sawKeydown = false;     // set on any physical keydown; cleared on the next task
  let selfEditValue = null;   // value we just produced — ignore its async input echo
  let composing = false;      // true between compositionstart/end (predictive keyboards)
  let cachedMap = null, cachedKeys = [];

  // Longest keys first so "sqrt" wins over any shorter suffix; cached by map identity
  // (the toggle swaps in a new object, which transparently invalidates the cache).
  const keysFor = (map) => {
    if (map !== cachedMap) { cachedMap = map; cachedKeys = Object.keys(map).sort((a, b) => b.length - a.length); }
    return cachedKeys;
  };

  const tryExpand = () => {
    if (sawKeydown) return;                                 // physical keyboard: MathLive did it
    const map = (mf.getOption ? mf.getOption('inlineShortcuts') : mf.inlineShortcuts) || {};
    const keys = keysFor(map);
    if (!keys.length) return;                               // Auto-Symbols off / nothing to match
    const value = mf.value || '';
    if (value === selfEditValue) return;                    // async echo of our own edit
    const run = (value.match(/[A-Za-z]+$/) || [''])[0];     // trailing letters at the caret
    if (!run) return;
    // Longest shortcut that is a suffix of the run — but hold off if a longer key could
    // still be reached by typing more (mimics MathLive's backtracking: "in" ≠ "int").
    const key = keys.find(k => k.length <= run.length && run.endsWith(k)
      && !keys.some(k2 => k2.length > k.length && k2.startsWith(run.slice(run.length - k.length))));
    if (!key) return;
    for (let i = 0; i < key.length; i++) mf.executeCommand('deleteBackward');
    mf.insert(map[key], { format: 'latex' });
    selfEditValue = mf.value;
  };

  // Listen on `window` (capture), not on `mf`: MathLive stops propagation of the
  // keydowns it handles before they reach the shadow host, so a host listener misses
  // them and we'd wrongly think there was no keydown. Also hold the guard for a beat
  // after the last keydown — MathLive expands on keydown but fires its `input` echo a
  // tick later, so a same-task reset would let us wake up and race its native expansion
  // (e.g. eating the α in a physical "alphabeta"). A physical typing burst keeps
  // resetting the timer, so we stay dormant throughout; on a keydown-less path
  // (mobile / Wayland) the timer never arms and we're always active.
  let kdTimer = null;
  window.addEventListener('keydown', (e) => {
    // Ignore IME/composition keydowns — the keyCode-229 "IME is processing" sentinel
    // (key "Unidentified") that phone keyboards and Wayland/IBus fire for every character.
    // MathLive does NOT expand from these, so counting them as a real keystroke would
    // wrongly keep us dormant and auto-symbols would never expand on mobile — exactly the
    // case this bridge exists to fix. Only a genuine character keydown stands us down.
    if (e.isComposing || e.keyCode === 229 || e.key === 'Unidentified') return;
    sawKeydown = true;
    clearTimeout(kdTimer);
    kdTimer = setTimeout(() => { sawKeydown = false; }, 150);
  }, true);
  mf.addEventListener('compositionstart', () => { composing = true; });
  // Defer past MathLive's own compositionend handler, which commits the composed text
  // into the field a tick later — read the settled value, not the pre-commit one.
  mf.addEventListener('compositionend', () => { composing = false; setTimeout(tryExpand, 0); });
  mf.addEventListener('input', (e) => { if (composing || (e && e.isComposing)) return; tryExpand(); });
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
      // Auto-symbols on keydown-less input paths (mobile OS keyboards, Chrome/Wayland+IBus).
      // Always on — it self-disables on physical keyboards, so it's safe everywhere.
      enableImeInlineShortcuts(mf);
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
