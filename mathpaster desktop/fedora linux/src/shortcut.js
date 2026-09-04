"use strict";

function createShortcutHandler(callback, options = {}) {
  const cooldownMs = options.cooldownMs ?? 750;
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
