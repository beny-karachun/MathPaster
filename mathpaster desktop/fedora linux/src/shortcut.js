"use strict";

function createShortcutHandler(callback, options = {}) {
  // KDE's portal can emit a tiny activation burst for one keypress. Keep the
  // guard just long enough to collapse that burst without swallowing a real,
  // quick second press after copying or closing the window.
  const cooldownMs = options.cooldownMs ?? 160;
  const now = options.now || Date.now;
  let lastActivation = Number.NEGATIVE_INFINITY;

  return function handleShortcut() {
    const activatedAt = now();
    if (activatedAt - lastActivation < cooldownMs) return false;
    lastActivation = activatedAt;
    callback();
    return true;
  };
}

module.exports = { createShortcutHandler };
