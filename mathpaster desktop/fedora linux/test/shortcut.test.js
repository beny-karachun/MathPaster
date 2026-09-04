"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createLocalShortcutHandler,
  createShortcutHandler,
  isAltMToggle
} = require("../src/shortcut");

test("passes every shortcut activation through", () => {
  let toggles = 0;
  const handleShortcut = createShortcutHandler(() => toggles++);

  assert.equal(handleShortcut(), true);
  assert.equal(handleShortcut(), true);
  assert.equal(handleShortcut(), true);
  assert.equal(handleShortcut(), true);
  assert.equal(handleShortcut(), true);
  assert.equal(toggles, 5);
});

test("does not retain timing state between presses", () => {
  const calls = [];
  const handleShortcut = createShortcutHandler(() => calls.push("toggle"));

  handleShortcut();
  handleShortcut();
  handleShortcut();

  assert.deepEqual(calls, ["toggle", "toggle", "toggle"]);
});

test("returns true after dispatching each activation", () => {
  let toggles = 0;
  const handleShortcut = createShortcutHandler(() => toggles++);

  assert.equal(handleShortcut(), true);
  assert.equal(handleShortcut(), true);
  assert.equal(toggles, 2);
});

test("coalesces only duplicate events from different shortcut backends", () => {
  let currentTime = 1_000;
  let toggles = 0;
  const handleShortcut = createShortcutHandler(() => toggles++, {
    now: () => currentTime,
    crossSourceWindowMs: 50
  });

  assert.equal(handleShortcut("electron-global"), true);
  currentTime += 4;
  assert.equal(handleShortcut("kde-native"), false);
  currentTime += 1;
  assert.equal(handleShortcut("electron-global"), true);
  assert.equal(toggles, 2);
});

test("recognizes Alt+M without accepting extra modifiers", () => {
  assert.equal(isAltMToggle({ alt: true, key: "m" }), true);
  assert.equal(isAltMToggle({ alt: true, code: "KeyM", key: "µ" }), true);
  assert.equal(isAltMToggle({ alt: true, shift: true, key: "M" }), false);
  assert.equal(isAltMToggle({ control: true, key: "m" }), false);
});

test("focused Alt+M toggles once, blocks text input, and ignores repeat", () => {
  const sources = [];
  let prevented = 0;
  const event = { preventDefault: () => prevented++ };
  const handleInput = createLocalShortcutHandler((source) => sources.push(source));

  assert.equal(handleInput(event, { type: "keyDown", alt: true, code: "KeyM" }), true);
  assert.equal(handleInput(event, {
    type: "keyDown",
    alt: true,
    code: "KeyM",
    isAutoRepeat: true
  }), true);
  assert.equal(handleInput(event, { type: "char", alt: true, key: "m" }), true);
  assert.equal(handleInput(event, { type: "keyUp", alt: true, code: "KeyM" }), true);
  assert.equal(handleInput(event, { type: "keyDown", alt: true, code: "KeyM" }), true);

  assert.deepEqual(sources, ["local-input", "local-input"]);
  assert.equal(prevented, 5);
});
