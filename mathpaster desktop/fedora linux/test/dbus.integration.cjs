"use strict";

// Run under dbus-run-session to avoid touching the desktop's real bus.
const assert = require("node:assert/strict");
const dbus = require("dbus-next");
const { createKdeShortcutListener } = require("../src/kde-shortcut-listener");
const bus = dbus.sessionBus();
const timer = setTimeout(() => { console.error("D-Bus integration timed out"); process.exit(1); }, 8000);
const listener = createKdeShortcutListener(() => {});
(async () => {
  // Exercises patched XML introspection and Node's non-native socket path.
  const object = await bus.getProxyObject("org.freedesktop.DBus", "/org/freedesktop/DBus");
  const service = object.getInterface("org.freedesktop.DBus");
  assert.equal(typeof await service.GetId(), "string");
  await listener.start();
  listener.stop();
  console.log("D-Bus introspection and shortcut listener integration passed.");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  clearTimeout(timer);
  listener.stop();
  bus.disconnect();
});
