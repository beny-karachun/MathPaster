"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const installLauncher = require("../build/after-pack.cjs");

const capture = '#!/bin/sh\nprintf "%s\\n" "RUN_AS_NODE=${ELECTRON_RUN_AS_NODE-unset}" "$@"\n';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mathpaster launcher spaces-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

async function packaged(t) {
  const directory = fixture(t);
  fs.writeFileSync(path.join(directory, "mathpaster"), capture, { mode: 0o755 });
  await installLauncher({ electronPlatformName: "linux", appOutDir: directory });
  return path.join(directory, "mathpaster");
}

function run(launcher, args = [], extraEnv = {}) {
  return execFileSync(launcher, args, {
    env: { PATH: process.env.PATH, DISPLAY: ":0", ELECTRON_RUN_AS_NODE: "1", ...extraEnv },
    encoding: "utf8"
  }).trim().split("\n");
}

test("packaged launcher selects X11 before Electron starts and preserves hidden/profile arguments", async t => {
  assert.deepEqual(run(await packaged(t), ["--user-data-dir=/tmp/a profile", "--", "--hidden"]), [
    "RUN_AS_NODE=unset", "--ozone-platform=x11", "--user-data-dir=/tmp/a profile", "--", "--hidden"
  ]);
});

test("pure Wayland sessions without DISPLAY retain the native backend", async t => {
  assert.deepEqual(run(await packaged(t), [], { DISPLAY: "", WAYLAND_DISPLAY: "wayland-0" }), ["RUN_AS_NODE=unset"]);
});

test("explicit backend overrides are not replaced or duplicated", async t => {
  const launcher = await packaged(t);
  assert.deepEqual(run(launcher, ["--ozone-platform=wayland"]), ["RUN_AS_NODE=unset", "--ozone-platform=wayland"]);
  assert.deepEqual(run(launcher, ["--ozone-platform", "x11"]), ["RUN_AS_NODE=unset", "--ozone-platform", "x11"]);
});

test("RPM-style symlink launches locate the real binary", async t => {
  const launcher = await packaged(t);
  const link = path.join(fixture(t), "mathpaster-link");
  fs.symlinkSync(launcher, link);
  assert.deepEqual(run(link), ["RUN_AS_NODE=unset", "--ozone-platform=x11"]);
});

test("source launcher uses the same early backend selection and supports spaces", t => {
  const directory = fixture(t);
  const launcher = path.join(directory, "src/launch.sh");
  const electron = path.join(directory, "node_modules/electron/dist/electron");
  fs.mkdirSync(path.dirname(launcher), { recursive: true });
  fs.mkdirSync(path.dirname(electron), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "../src/launch.sh"), launcher);
  fs.chmodSync(launcher, 0o755);
  fs.writeFileSync(electron, capture, { mode: 0o755 });
  assert.deepEqual(run(launcher, ["--hidden"]), [
    "RUN_AS_NODE=unset", "--ozone-platform=x11", `${directory}/src/..`, "--hidden"
  ]);
});

test("packaging hook leaves non-Linux targets unchanged", async t => {
  const directory = fixture(t);
  await installLauncher({ electronPlatformName: "darwin", appOutDir: directory });
  assert.deepEqual(fs.readdirSync(directory), []);
});
