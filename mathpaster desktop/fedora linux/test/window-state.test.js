"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  MAIN_WINDOW_NAME,
  getWindowStateOptions,
  shouldUseX11ForWindowPosition
} = require("../src/window-state");

test("uses XWayland when a Wayland session exposes it so position can be restored", () => {
  assert.equal(shouldUseX11ForWindowPosition("linux", {
    XDG_SESSION_TYPE: "wayland",
    DISPLAY: ":0"
  }), true);
  assert.equal(shouldUseX11ForWindowPosition("linux", {
    XDG_SESSION_TYPE: "WAYLAND",
    DISPLAY: " :1 "
  }), true);
});

test("does not force X11 outside a Wayland session or without XWayland", () => {
  assert.equal(shouldUseX11ForWindowPosition("linux", {
    XDG_SESSION_TYPE: "wayland"
  }), false);
  assert.equal(shouldUseX11ForWindowPosition("linux", {
    XDG_SESSION_TYPE: "x11",
    DISPLAY: ":0"
  }), false);
  assert.equal(shouldUseX11ForWindowPosition("win32", {
    XDG_SESSION_TYPE: "wayland",
    DISPLAY: ":0"
  }), false);
});

test("uses one stable name and persists only the main window bounds", () => {
  assert.equal(MAIN_WINDOW_NAME, "mathpaster-main-window");
  assert.deepEqual(getWindowStateOptions(), {
    name: MAIN_WINDOW_NAME,
    windowStatePersistence: {
      bounds: true,
      displayMode: false
    }
  });
});

test("returns a fresh persistence object that callers cannot mutate globally", () => {
  const first = getWindowStateOptions();
  first.name = "changed";
  first.windowStatePersistence.bounds = false;

  assert.deepEqual(getWindowStateOptions(), {
    name: MAIN_WINDOW_NAME,
    windowStatePersistence: {
      bounds: true,
      displayMode: false
    }
  });
});
