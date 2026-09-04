"use strict";

function isMKey(input = {}) {
  return input.code === "KeyM" || String(input.key || "").toLowerCase() === "m";
}

function isAltMToggle(input = {}) {
  return Boolean(
    input.alt
    && !input.control
    && !input.meta
    && !input.shift
    && isMKey(input)
  );
}

function createShortcutHandler(callback, options = {}) {
  const now = options.now || Date.now;
  const crossSourceWindowMs = options.crossSourceWindowMs ?? 50;
  let lastSource = null;
  let lastActivation = Number.NEGATIVE_INFINITY;

  return function handleShortcut(source = "shortcut") {
    const activatedAt = now();

    // KDE Wayland can deliver the same physical press through Electron's
    // portal callback and the native KGlobalAccel safety listener. Collapse
    // only cross-backend duplicates; repeated presses from one backend must
    // always remain responsive.
    if (source !== lastSource && activatedAt - lastActivation < crossSourceWindowMs) {
      return false;
    }

    lastSource = source;
    lastActivation = activatedAt;
    callback();
    return true;
  };
}

function createLocalShortcutHandler(activate) {
  let keyIsDown = false;

  function handleInput(event, input = {}) {
    if (input.type === "keyUp" && (isMKey(input) || input.key === "Alt")) {
      const handled = keyIsDown && isMKey(input);
      if (handled) event.preventDefault();
      keyIsDown = false;
      return handled;
    }

    if (!isAltMToggle(input)) return false;

    // Prevent both keyDown and char events so MathLive never inserts the M.
    event.preventDefault();
    if (input.type === "keyDown" && !input.isAutoRepeat && !keyIsDown) {
      keyIsDown = true;
      activate("local-input");
    }
    return true;
  }

  handleInput.reset = () => { keyIsDown = false; };
  return handleInput;
}

module.exports = {
  createLocalShortcutHandler,
  createShortcutHandler,
  isAltMToggle
};
