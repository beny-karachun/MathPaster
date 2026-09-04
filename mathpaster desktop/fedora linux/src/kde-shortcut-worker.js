"use strict";

const { createKdeShortcutListener } = require("./kde-shortcut-listener");

const listener = createKdeShortcutListener(() => {
  if (process.connected) process.send({ type: "shortcut-pressed" });
});

async function start() {
  try {
    await listener.start();
    if (process.connected) process.send({ type: "ready" });
  } catch (error) {
    if (process.connected) process.send({ type: "error", message: error.message });
    process.exitCode = 1;
  }
}

function stop() {
  listener.stop();
  process.exit();
}

process.once("SIGTERM", stop);
process.once("SIGINT", stop);
process.once("disconnect", stop);
start();
