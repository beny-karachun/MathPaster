"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const files = ["main.js", "preload.js", "renderer/desktop.js", "renderer/editor/desktop-mode.js"];
for (const directory of ["src", "renderer/editor/src", "test", "build"]) {
  for (const file of fs.readdirSync(path.join(root, directory))) {
    if (/\.(c?js)$/.test(file)) files.push(path.join(directory, file));
  }
}
for (const file of files) execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "inherit" });
execFileSync("/bin/sh", ["-n", path.join(root, "src/launch.sh")], { stdio: "inherit" });
console.log(`Syntax checks passed for ${files.length} application and test files.`);
