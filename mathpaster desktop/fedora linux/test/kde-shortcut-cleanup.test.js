"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  findReconciliation,
  isKdeSession,
  listKdeShortcutNames,
  parseShortcutNames,
  reconcileKdeShortcuts
} = require("../src/kde-shortcut-cleanup");

const OLD = "old-action-Ctrl+Shift+M";
const DUPLICATE = "duplicate-action-Ctrl+Alt+Shift+M";
const LIVE = "live-action-Alt+M";

test("detects KDE and Plasma sessions only", () => {
  assert.equal(isKdeSession({ XDG_CURRENT_DESKTOP: "KDE" }), true);
  assert.equal(isKdeSession({ DESKTOP_SESSION: "plasmawayland" }), true);
  assert.equal(isKdeSession({ XDG_CURRENT_DESKTOP: "GNOME" }), false);
});

test("parses only MathPaster-managed accelerator action names", () => {
  assert.deepEqual(parseShortcutNames(`${OLD}\n${LIVE}\nunrelated-Ctrl+K\n`), [OLD, LIVE]);
});

test("queries the KDE service even when a desktop launcher omits session markers", () => {
  const names = listKdeShortcutNames({
    environment: {},
    runQdbus: () => ({ status: 0, stdout: `${OLD}\n${LIVE}\n` })
  });
  assert.deepEqual(names, [OLD, LIVE]);
});

test("keeps the newly registered action and marks prior actions stale", () => {
  assert.deepEqual(findReconciliation([OLD, DUPLICATE], [OLD, DUPLICATE, LIVE]), {
    activeName: LIVE,
    staleNames: [OLD, DUPLICATE]
  });
});

test("does not prune when a new live action cannot be identified", () => {
  assert.deepEqual(findReconciliation([OLD, DUPLICATE], [OLD, DUPLICATE]), {
    activeName: null,
    staleNames: []
  });
});

test("unregisters only stale MathPaster actions", () => {
  const calls = [];
  const outputs = [
    { status: 0, stdout: `${OLD}\n${DUPLICATE}\n${LIVE}\n` },
    { status: 0, stdout: "true\n" },
    { status: 0, stdout: "true\n" }
  ];
  const result = reconcileKdeShortcuts([OLD, DUPLICATE], {
    environment: { XDG_CURRENT_DESKTOP: "KDE" },
    runQdbus: (argumentsList) => {
      calls.push(argumentsList);
      return outputs.shift();
    }
  });

  assert.deepEqual(result.removedNames, [OLD, DUPLICATE]);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].at(-1), OLD);
  assert.equal(calls[2].at(-1), DUPLICATE);
});
