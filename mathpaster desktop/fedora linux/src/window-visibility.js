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

function revealWindow(window) {
  if (!window || window.isDestroyed()) return false;
  // xdg-shell has a request to minimize but no client request to unminimize.
  // Avoid using minimize as our hidden state, but restore unconditionally in
  // case the user minimized the window through the compositor.
  window.restore();
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
