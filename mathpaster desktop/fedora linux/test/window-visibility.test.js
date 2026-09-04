"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  concealWindow,
  isWindowOpen,
  revealWindow
} = require("../src/window-visibility");

function createWindow(state = {}) {
  const calls = [];
  const window = {
    destroyed: false,
    visible: true,
    minimized: false,
    isDestroyed() { return this.destroyed; },
    isVisible() { return this.visible; },
    isMinimized() { return this.minimized; },
    hide() { calls.push("hide"); this.visible = false; },
    minimize() { calls.push("minimize"); this.minimized = true; },
    restore() { calls.push("restore"); this.minimized = false; this.visible = true; },
    show() { calls.push("show"); this.visible = true; },
    moveTop() { calls.push("moveTop"); },
    focus() { calls.push("focus"); },
    ...state
  };
  return { calls, window };
}

test("treats a minimized surface as closed", () => {
  const { window } = createWindow({ minimized: true });
  assert.equal(isWindowOpen(window), false);
  window.minimized = false;
  assert.equal(isWindowOpen(window), true);
});

test("hides a visible window instead of minimizing it on Wayland", () => {
  const { calls, window } = createWindow();
  assert.equal(concealWindow(window, { keepMapped: true }), "hidden");
  assert.deepEqual(calls, ["hide"]);
  assert.equal(isWindowOpen(window), false);
});

test("uses hide before a window has ever been mapped", () => {
  const { calls, window } = createWindow({ visible: false });
  assert.equal(concealWindow(window, { keepMapped: true }), "hidden");
  assert.deepEqual(calls, ["hide"]);
});

test("restores, raises, and focuses a minimized window", () => {
  const { calls, window } = createWindow({ minimized: true });
  assert.equal(revealWindow(window), true);
  assert.deepEqual(calls, ["restore", "show", "moveTop", "focus"]);
  assert.equal(isWindowOpen(window), true);
});

test("always requests restore before showing because Wayland state can lag", () => {
  const { calls, window } = createWindow({ minimized: false, visible: false });
  assert.equal(revealWindow(window), true);
  assert.deepEqual(calls, ["restore", "show", "moveTop", "focus"]);
});
