"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createShortcutHandler } = require("../src/shortcut");

test("coalesces a portal activation burst into one toggle", () => {
  let currentTime = 1_000;
  let toggles = 0;
  const handleShortcut = createShortcutHandler(() => toggles++, {
    cooldownMs: 750,
    now: () => currentTime
  });

  assert.equal(handleShortcut(), true);
  currentTime += 5;
  assert.equal(handleShortcut(), false);
  currentTime += 40;
  assert.equal(handleShortcut(), false);
  assert.equal(toggles, 1);
});

test("allows a later intentional shortcut press", () => {
  let currentTime = 1_000;
  let toggles = 0;
  const handleShortcut = createShortcutHandler(() => toggles++, {
    cooldownMs: 750,
    now: () => currentTime
  });

  handleShortcut();
  currentTime += 751;
  assert.equal(handleShortcut(), true);
  assert.equal(toggles, 2);
});
