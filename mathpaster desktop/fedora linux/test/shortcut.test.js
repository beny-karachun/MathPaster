"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createShortcutHandler } = require("../src/shortcut");

test("coalesces a portal activation burst into one toggle", () => {
  let currentTime = 1_000;
  let toggles = 0;
  const handleShortcut = createShortcutHandler(() => toggles++, {
    cooldownMs: 160,
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
    cooldownMs: 160,
    now: () => currentTime
  });

  handleShortcut();
  currentTime += 161;
  assert.equal(handleShortcut(), true);
  assert.equal(toggles, 2);
});

test("does not discard a quick intentional reopen after the short guard", () => {
  let currentTime = 5_000;
  let toggles = 0;
  const handleShortcut = createShortcutHandler(() => toggles++, {
    cooldownMs: 160,
    now: () => currentTime
  });

  assert.equal(handleShortcut(), true);
  currentTime += 159;
  assert.equal(handleShortcut(), false);
  currentTime += 1;
  assert.equal(handleShortcut(), true);
  assert.equal(toggles, 2);
});
