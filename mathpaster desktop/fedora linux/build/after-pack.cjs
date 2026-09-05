"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

module.exports = async function installLauncher(context) {
  if (context.electronPlatformName !== "linux") return;
  const executable = path.join(context.appOutDir, "mathpaster");
  await fs.rename(executable, `${executable}.bin`);
  await fs.copyFile(path.join(__dirname, "../src/launch.sh"), executable);
  await fs.chmod(executable, 0o755);
};
