"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const {
  createKdeShortcutWorker,
  getDefaultWorkerPath
} = require("../src/kde-shortcut-worker-client");

test("resolves packaged workers from app.asar.unpacked", () => {
  assert.equal(
    getDefaultWorkerPath("/opt/MathPaster/resources/app.asar/src"),
    "/opt/MathPaster/resources/app.asar.unpacked/src/kde-shortcut-worker.js"
  );
});

test("forwards every worker signal and stops cleanly", async () => {
  const child = new EventEmitter();
  child.kill = () => { child.killed = true; };
  let options = null;
  let workerPath = null;
  let argumentsList = null;
  let toggles = 0;
  const worker = createKdeShortcutWorker(() => toggles++, {
    execPath: "/usr/bin/node",
    workerPath: "/test/worker.js",
    fork: (launchedWorkerPath, launchedArguments, launchOptions) => {
      workerPath = launchedWorkerPath;
      argumentsList = launchedArguments;
      options = launchOptions;
      queueMicrotask(() => child.emit("message", { type: "ready" }));
      return child;
    }
  });

  assert.equal(await worker.start(), true);
  child.emit("message", { type: "shortcut-pressed" });
  child.emit("message", { type: "shortcut-pressed" });
  child.emit("message", { type: "shortcut-pressed" });
  assert.equal(toggles, 3);
  assert.equal(workerPath, "/test/worker.js");
  assert.deepEqual(argumentsList, []);
  assert.equal(options.execPath, "/usr/bin/node");
  assert.equal(options.env.ELECTRON_RUN_AS_NODE, "1");
  assert.deepEqual(options.stdio, ["ignore", "ignore", "ignore", "ipc"]);

  worker.stop();
  assert.equal(child.killed, true);
  child.emit("message", { type: "shortcut-pressed" });
  assert.equal(toggles, 3);
});

test("reports worker startup errors", async () => {
  const child = new EventEmitter();
  child.kill = () => {};
  const hostProcess = new EventEmitter();
  hostProcess.pid = 1234;
  const worker = createKdeShortcutWorker(() => {}, {
    fork: () => {
      queueMicrotask(() => child.emit("error", new Error("no worker")));
      return child;
    }
  });

  await assert.rejects(worker.start(), /no worker/);
  worker.stop();
});
