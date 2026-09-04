"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const {
  createKdeShortcutListener,
  isMathPasterShortcutPress,
  KDE_MATCH_RULE
} = require("../src/kde-shortcut-listener");

const COMPONENT = "com.mathpaster.MathPaster";
const ACTION = "live-action-Alt+M";

function createBus() {
  const bus = new EventEmitter();
  let disconnected = false;
  bus.call = async (message) => {
    assert.equal(message.member, "AddMatch");
    assert.deepEqual(message.body, [KDE_MATCH_RULE]);
    return {};
  };
  bus.disconnect = () => { disconnected = true; };
  return { bus, isDisconnected: () => disconnected };
}

test("recognizes only MathPaster Alt+M press payloads", () => {
  assert.equal(isMathPasterShortcutPress(COMPONENT, ACTION), true);
  assert.equal(isMathPasterShortcutPress("org.example.Other", ACTION), false);
  assert.equal(isMathPasterShortcutPress(COMPONENT, "live-action-Alt+K"), false);
  assert.equal(isMathPasterShortcutPress(COMPONENT, null), false);
});

test("dispatches every matching KDE press directly in process", async () => {
  const mock = createBus();
  let toggles = 0;
  const listener = createKdeShortcutListener(() => toggles++, {
    sessionBus: () => mock.bus
  });

  assert.equal(await listener.start(), true);
  const press = (action) => mock.bus.emit("message", {
    path: "/component/com_mathpaster_MathPaster",
    interface: "org.kde.kglobalaccel.Component",
    member: "globalShortcutPressed",
    body: [COMPONENT, action, 1]
  });
  press(ACTION);
  press(ACTION);
  press("live-action-Alt+K");
  press(ACTION);
  assert.equal(toggles, 3);

  listener.stop();
  assert.equal(mock.isDisconnected(), true);
  press(ACTION);
  assert.equal(toggles, 3);
});

test("disconnects when KDE's shortcut object cannot be reached", async () => {
  let disconnected = false;
  const listener = createKdeShortcutListener(() => {}, {
    sessionBus: () => ({
      on() {},
      off() {},
      async call() { throw new Error("KDE unavailable"); },
      disconnect() { disconnected = true; }
    })
  });

  await assert.rejects(listener.start(), /KDE unavailable/);
  assert.equal(disconnected, true);
});
