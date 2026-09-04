"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { fork } = require("node:child_process");

function getDefaultWorkerPath(directory = __dirname) {
  const unpackedDirectory = directory.replace(
    `${path.sep}app.asar${path.sep}`,
    `${path.sep}app.asar.unpacked${path.sep}`
  );
  return path.join(unpackedDirectory, "kde-shortcut-worker.js");
}

function createKdeShortcutWorker(callback, options = {}) {
  const launch = options.fork || fork;
  const workerPath = options.workerPath || getDefaultWorkerPath();
  const systemNode = options.execPath
    || (fs.existsSync("/usr/bin/node") ? "/usr/bin/node" : process.execPath);
  const startupTimeoutMs = options.startupTimeoutMs ?? 5000;
  let child = null;

  return {
    start() {
      if (child) return Promise.resolve(true);
      return new Promise((resolve, reject) => {
        let settled = false;
        let startupTimer = null;
        const worker = launch(workerPath, [], {
          execPath: systemNode,
          env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
          stdio: ["ignore", "ignore", "ignore", "ipc"]
        });
        child = worker;

        const finishStartup = (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(startupTimer);
          if (error) reject(error);
          else resolve(true);
        };

        startupTimer = setTimeout(() => {
          finishStartup(new Error("KDE shortcut worker did not become ready in time."));
        }, startupTimeoutMs);
        startupTimer.unref?.();

        worker.on("message", (message) => {
          if (message?.type === "shortcut-pressed") callback();
          if (message?.type === "ready") finishStartup();
          if (message?.type === "error") {
            finishStartup(new Error(message.message || "KDE shortcut worker failed."));
          }
        });
        worker.once("error", finishStartup);
        worker.once("exit", (code) => {
          if (child === worker) child = null;
          finishStartup(new Error(`KDE shortcut worker exited with code ${code}.`));
          if (settled && code) console.error(`KDE shortcut worker exited with code ${code}.`);
        });
      });
    },
    stop() {
      if (!child) return;
      const worker = child;
      child = null;
      worker.removeAllListeners();
      worker.once("error", () => {});
      if (worker.connected) worker.disconnect();
      else worker.kill();
    }
  };
}

module.exports = { createKdeShortcutWorker, getDefaultWorkerPath };
