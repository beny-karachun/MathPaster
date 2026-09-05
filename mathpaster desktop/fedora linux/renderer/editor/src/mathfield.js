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

/* Make auto-symbols work when characters arrive WITHOUT a keydown. MathLive only
 * expands inline shortcuts (and runs keybindings like "/"→fraction) from its keydown
 * handler, so any input that commits via the IME path — phone keyboards, and Chrome on
 * Linux/Wayland+IBus — leaves "alpha" / "*" / "/" literal. This bridges that gap.
 *
 * We track the recently-typed literal characters in a small `pending` buffer (fed from
 * each input event's committed data), and after every commit expand the longest inline
 * shortcut that is a suffix of it (letters like "alpha", AND symbols like "*", "->",
 * ">=", "+-"). Structural keybindings that aren't inline shortcuts — currently "/"
 * (fraction) — are replayed as a synthetic keydown so MathLive's own command runs.
 *
 * On a physical keyboard MathLive already does all this (a real keydown fired), so we
 * stay dormant — no double expansion, no regression. Reading the LIVE inlineShortcuts
 * option means this honours the Auto-Symbols toggle for free (it's {} when off).
 *
 * We mirror MathLive's own resolution: while the typed run is still a prefix of some
 * key we wait (so "th"→tanh doesn't steal "theta"→θ); when the next char can't extend
 * it we expand the pending shortcut first, then reprocess that char. */
function enableImeInlineShortcuts(mf) {
  // Characters MathLive turns into structure via a keybinding (not an inline shortcut),
  // so they're never literal on a physical keyboard. On the keydown-less path they'd be
  // left literal, so we replay them through MathLive as a synthetic keydown.
  const COMMAND_CHARS = '/';

  let sawKeydown = false;     // a genuine physical keydown fired — MathLive is handling it
  let internalKeydown = false;// our own synthetic keydown — must not trip the guard below
  let selfEditValue = null;   // value we just produced — ignore its async input echo
  let composing = false;      // true between compositionstart/end (predictive keyboards)
  let pending = '';           // literal characters typed since the last expansion / reset
  let waitTimer = null;       // pending-commit timer (a key that's also a prefix of a longer key)
  let cachedMap = null, cachedKeys = [];
  const INLINE_TIMEOUT = 200; // pause after which an ambiguous key commits (e.g. "xi" vs "xin")

  const getMap = () => (mf.getOption ? mf.getOption('inlineShortcuts') : mf.inlineShortcuts) || {};
  const keysFor = (map) => { if (map !== cachedMap) { cachedMap = map; cachedKeys = Object.keys(map); } return cachedKeys; };
  const sinkEl = () => (mf.shadowRoot && mf.shadowRoot.querySelector('.ML__keyboard-sink')) || mf;
  const reset = () => { pending = ''; clearTimeout(waitTimer); };

  const fireKey = (key) => {
    internalKeydown = true;
    try { sinkEl().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true })); }
    finally { internalKeydown = false; }
  };

  // Drop the literal char the IME just inserted, then let MathLive's keybinding run.
  const runCommand = (ch) => {
    try { mf.executeCommand('deleteBackward'); } catch (e) {}
    fireKey(ch);
    selfEditValue = mf.value;
    reset();
  };

  const hasPrefix       = (keys, s) => keys.some(k => k.startsWith(s));                        // some key starts with s
  const hasLongerPrefix = (keys, s) => keys.some(k => k.length > s.length && k.startsWith(s)); // …and is longer
  const longestSuffixKey = (keys, s) => { let b = ''; for (const k of keys) if (k.length > b.length && s.endsWith(k)) b = k; return b; };

  // A shortcut's expansion is usually a LaTeX string, but some entries are objects
  // ({ value, after }) — MathLive's conditional form. Take the string either way.
  const valueOf = (entry) => (typeof entry === 'string' ? entry : (entry && entry.value)) || '';

  // Replace the `n` literal chars before the caret with the shortcut expansion. The
  // `pending` buffer is kept equal to the field's literal tail, so `n` == the key length
  // — no whole-value check needed (which would wrongly fail inside a group ending in "}").
  const expandAt = (n, entry) => {
    const latex = valueOf(entry);
    if (!latex) return;
    for (let i = 0; i < n; i++) mf.executeCommand('deleteBackward');
    mf.insert(latex, { format: 'latex' });
    selfEditValue = mf.value;
  };

  const feedChar = (ch) => {
    clearTimeout(waitTimer);
    if (COMMAND_CHARS.indexOf(ch) >= 0) { runCommand(ch); return; }
    const map = getMap(); const keys = keysFor(map);
    if (!keys.length) { pending = ''; return; }               // Auto-Symbols off
    const combined = pending + ch;
    if (hasPrefix(keys, combined)) {                          // still building toward a key
      pending = combined;
      if (map[pending]) {                                     // pending is itself a complete key
        if (!hasLongerPrefix(keys, pending)) {                // …and can't grow → expand now
          const k = pending; pending = '';
          expandAt(k.length, map[k]);
        } else {                                              // …but a longer key could still come;
          const k = pending;                                  // commit after a pause, like MathLive
          waitTimer = setTimeout(() => {
            if (pending === k && !sawKeydown) { pending = ''; expandAt(k.length, map[k]); }
          }, INLINE_TIMEOUT);
        }
      }
      return;
    }
    // `ch` can't extend `pending`. Expand the pending shortcut (if any) *around* ch, which
    // the IME already inserted after it: lift ch off, expand, drop ch back, then reprocess.
    const k = longestSuffixKey(keys, pending);
    if (k) {
      mf.executeCommand('deleteBackward');                    // remove ch
      expandAt(k.length, map[k]);                             // remove k, insert expansion
      mf.insert(ch, { format: 'latex' });                    // reinsert literal ch
      selfEditValue = mf.value;
    }
    pending = '';
    if (hasPrefix(keys, ch)) {                                // ch may begin a new shortcut
      pending = ch;
      if (map[ch] && !hasLongerPrefix(keys, ch)) { pending = ''; expandAt(ch.length, map[ch]); }
    }
  };

  const onCommit = (data) => {
    if (data == null || data === '') { reset(); return; }
    // Programmatic inserts (palette symbols, matrix templates, snippets/history
    // loads) fire a single input event whose data is the WHOLE LaTeX string.
    // Feeding that through the expander corrupts it (the "in" of \begin becomes
    // \in, "&" becomes \&, and the deleteBackwards eat preceding content). Real
    // IME commits are plain text — a multi-char run containing LaTeX structure
    // chars can only be programmatic, so stand down and clear the buffer.
    if (data.length > 1 && /[\\{}&]/.test(data)) { reset(); return; }
    for (const ch of data) feedChar(ch);
  };

  // Listen on `window` (capture), not on `mf`: MathLive stops propagation of the keydowns
  // it handles before they reach the shadow host, so a host listener misses them.
  let kdTimer = null;
  window.addEventListener('keydown', (e) => {
    if (internalKeydown) return;                              // our own synthetic keydown
    // Ignore IME/composition keydowns — the keyCode-229 "IME is processing" sentinel
    // (key "Unidentified") phones and Wayland/IBus fire per character. MathLive doesn't
    // expand from those, so counting them as real would keep us dormant and nothing would
    // convert on mobile. Only a genuine character keydown stands us down — and we hold the
    // guard ~150ms past MathLive's async input echo so a physical burst can't wake us.
    if (e.isComposing || e.keyCode === 229 || e.key === 'Unidentified') return;
    sawKeydown = true;
    reset();                                                  // physical typing / arrow nav moves the caret
    clearTimeout(kdTimer);
    kdTimer = setTimeout(() => { sawKeydown = false; }, 150);
  }, true);
  // A tap can move the caret, so the pending buffer no longer mirrors the literal tail.
  mf.addEventListener('pointerdown', reset);
  mf.addEventListener('compositionstart', () => { composing = true; });
  // Defer past MathLive's own compositionend handler, which commits the composed text a
  // tick later, then feed the finalized string.
  mf.addEventListener('compositionend', (e) => {
    composing = false;
    const data = e && e.data;
    setTimeout(() => { if (!sawKeydown) onCommit(data); }, 0);
  });
  mf.addEventListener('input', (e) => {
    if (sawKeydown || composing || (e && e.isComposing)) return; // physical / mid-composition
    if (e && e.inputType && e.inputType !== 'insertText') { reset(); return; } // deletions, etc.
    if ((mf.value || '') === selfEditValue) return;           // async echo of our own edit
    onCommit(e && e.data);
  });
  mf.addEventListener('focusout', reset);
}

/* ── Live preview & Caching ── */
export function updatePreview() {
  const raw = mf.value || "";
  try { localStorage.setItem("mathpaster_draft", raw); } catch {
    window.parent.postMessage({ mathpaster: "toast", text: "Storage is full. Copy your equation before closing." }, "*");
  }
  for (const id of ["copy-btn", "insert-btn"]) {
    const button = document.getElementById(id);
    button.disabled = !raw.trim() || Boolean(document.querySelector('[aria-busy="true"]'));
  }
  if (!raw) { latexEl.textContent = ""; return; }
  latexEl.textContent = state.insertMode === "block" ? `$$${raw}$$` : `$${raw}$`;
}

/* ── Register <math-field> custom element from UMD build ── */
export function initMathField() {
  try {
    const MFE = window.MathLive?.MathfieldElement || window.MathfieldElement;

    if (!MFE) {
      loading.textContent = "The math engine could not load.";
      window.parent.postMessage({ mathpaster: "editor-error" }, "*");
      return;
    }

    // Configure fonts
    try {
      MFE.fontsDirectory = "./lib/fonts/";
      MFE.soundsDirectory = null;
      // The desktop shell has no MathLive instance. Keep the keyboard local
      // instead of creating a proxy that sends commands to the parent frame.
      mf.mathVirtualKeyboardPolicy = "sandboxed";
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
      mf.mathVirtualKeyboardPolicy = "sandboxed";
      
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
      mf.addEventListener("input", () => window.parent.postMessage({ mathpaster: "editing" }, "*"));
      // Auto-symbols on keydown-less input paths (mobile OS keyboards, Chrome/Wayland+IBus).
      // Always on — it self-disables on physical keyboards, so it's safe everywhere.
      enableImeInlineShortcuts(mf);
      if (IS_TOUCH) {
        enableNativeKeyboard();
        mf.addEventListener("pointerdown", enableNativeKeyboard, true);
        mf.addEventListener("focusin", enableNativeKeyboard);
      }
      document.dispatchEvent(new CustomEvent("mathpaster:mathfield-ready"));
      window.parent.postMessage({ mathpaster: "ready" }, "*");
    }).catch(err => {
      loading.textContent = "Error defining math-field: " + err.message;
      window.parent.postMessage({ mathpaster: "editor-error" }, "*");
    });

  } catch (err) {
    loading.textContent = "Init Error: " + err.message;
    window.parent.postMessage({ mathpaster: "editor-error" }, "*");
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
