"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const { fitWindowBounds, loadWindowBounds, trackWindowBounds, shouldUseX11ForWindowPosition } = require("../src/window-state");

const displays = [{ workArea: { x: 0, y: 24, width: 1440, height: 850 } }, { workArea: { x: -1920, y: 0, width: 1920, height: 1080 } }];
test("uses XWayland only when a Linux Wayland session exposes it", () => {
  assert.equal(shouldUseX11ForWindowPosition("linux", { XDG_SESSION_TYPE: "wayland", DISPLAY: ":0" }), true);
  assert.equal(shouldUseX11ForWindowPosition("linux", { XDG_SESSION_TYPE: "wayland" }), false);
  assert.equal(shouldUseX11ForWindowPosition("win32", { XDG_SESSION_TYPE: "wayland", DISPLAY: ":0" }), false);
});
test("preserves valid bounds including negative monitor coordinates", () => {
  const bounds = { x: -1600, y: 120, width: 800, height: 600 };
  assert.deepEqual(fitWindowBounds(bounds, displays), bounds);
});
test("fits offscreen and oversized windows onto a remaining monitor", () => {
  assert.deepEqual(fitWindowBounds({ x: 9000, y: 9000, width: 800, height: 600 }, displays), { x: 320, y: 149, width: 800, height: 600 });
  assert.deepEqual(fitWindowBounds({ x: 0, y: 0, width: 4000, height: 3000 }, [displays[0]]), { x: 0, y: 24, width: 1440, height: 850 });
  assert.equal(fitWindowBounds({ x: 0, y: 0, width: -1, height: 600 }, displays), null);
  assert.equal(fitWindowBounds({ x: "0", y: 0, width: 800, height: 600 }, displays), null);
});
test("saves moves atomically, flushes on close, and ignores minimize/maximize geometry", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mathpaster-bounds-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "window-bounds.json");
  const window = Object.assign(new EventEmitter(), {
    bounds: { x: 123, y: 145, width: 720, height: 550 }, minimized: false, maximized: false, visible: true,
    isDestroyed: () => false, isVisible() { return this.visible; },
    isMinimized() { return this.minimized; }, isMaximized() { return this.maximized; }, isFullScreen: () => false,
    getBounds() { return this.bounds; }
  });
  const keeper = trackWindowBounds(window, file);
  window.emit("resize");
  window.emit("close");
  assert.deepEqual(loadWindowBounds(file, displays), window.bounds);
  const normal = { ...window.bounds };
  window.maximized = true;
  window.bounds = { x: 0, y: 0, width: 1440, height: 900 };
  window.emit("resize");
  keeper.flush();
  assert.deepEqual(loadWindowBounds(file, displays), normal);
  assert.deepEqual(fs.readdirSync(directory), ["window-bounds.json"]);
  window.visible = false;
  window.emit("closed");
});
test("missing/corrupt state falls back safely and migrates old Electron bounds", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mathpaster-bounds-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "window-bounds.json");
  assert.equal(loadWindowBounds(file, displays), null);
  fs.writeFileSync(file, "{broken");
  assert.equal(loadWindowBounds(file, displays), null);
  fs.writeFileSync(path.join(directory, "Local State"), JSON.stringify({ windowStates: {
    "mathpaster-main-window": { left: 100, top: 100, right: 900, bottom: 700 }
  } }));
  assert.deepEqual(loadWindowBounds(file, displays), { x: 100, y: 100, width: 800, height: 600 });
});
