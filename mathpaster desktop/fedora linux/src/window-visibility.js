"use strict";

function isWindowOpen(window) {
  return Boolean(
    window
    && !window.isDestroyed()
    && window.isVisible()
    && !window.isMinimized()
  );
}

function concealWindow(window) {
  if (!window || window.isDestroyed()) return "unavailable";
  window.hide();
  return "hidden";
}

function revealWindow(window, options = {}) {
  if (!window || window.isDestroyed()) return false;
  // xdg-shell has a request to minimize but no client request to unminimize.
  // Native Wayland can report stale minimize state. X11 must only restore
  // minimized windows so revealing a maximized window preserves its size.
  if (options.nativeWayland || window.isMinimized()) window.restore();
  window.show();
  if (typeof window.moveTop === "function") window.moveTop();
  window.focus();
  return true;
}

module.exports = {
  concealWindow,
  isWindowOpen,
  revealWindow
};
