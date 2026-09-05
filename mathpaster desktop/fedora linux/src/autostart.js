"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DESKTOP_ID = "com.mathpaster.MathPaster";

function sanitizeDesktopValue(value) {
  const clean = String(value).replace(/[\r\n\0]/g, " ");
  return clean.replace(/\\/g, "\\\\");
}

function quoteExecArgument(value) {
  // Exec quoting is decoded AFTER Desktop Entry string escaping. Literal %
  // must also be doubled so paths cannot be interpreted as field codes.
  const quoted = String(value).replace(/[\r\n\0]/g, " ").replace(/([\\"`$])/g, "\\$1");
  return `"${sanitizeDesktopValue(quoted).replace(/%/g, "%%")}"`;
}

function getAutostartDirectory(env = process.env, homedir = os.homedir()) {
  const configHome = env.XDG_CONFIG_HOME || path.join(homedir, ".config");
  return path.join(configHome, "autostart");
}

function getAutostartPath(env = process.env, homedir = os.homedir()) {
  return path.join(getAutostartDirectory(env, homedir), `${DESKTOP_ID}.desktop`);
}

function getLaunchArguments({ isPackaged, executablePath, appPath }) {
  const args = isPackaged ? [executablePath, "--"] : ["/bin/sh", path.join(appPath, "src/launch.sh")];
  args.push("--hidden");
  return args;
}

function createDesktopEntry(launchArguments, iconPath) {
  const exec = launchArguments.map(quoteExecArgument).join(" ");
  return [
    "[Desktop Entry]",
    "Type=Application",
    "Version=1.0",
    "Name=MathPaster",
    "Comment=Start MathPaster in the tray",
    `Exec=${exec}`,
    `Icon=${sanitizeDesktopValue(iconPath)}`,
    "Terminal=false",
    "StartupNotify=false",
    "X-GNOME-Autostart-enabled=true",
    "Categories=Education;Science;Utility;",
    ""
  ].join("\n");
}

function isAutostartEnabled(options = {}) {
  try {
    const entry = fs.readFileSync(getAutostartPath(options.env, options.homedir), "utf8");
    const section = entry.split(/^\[Desktop Entry\]\s*$/m)[1]?.split(/^\[/m)[0] || "";
    return /^Exec=\S.+$/m.test(section)
      && !/^Hidden=true\s*$/m.test(section)
      && !/^X-GNOME-Autostart-enabled=false\s*$/m.test(section);
  } catch { return false; }
}

function setAutostartEnabled(enabled, options) {
  const autostartPath = getAutostartPath(options.env, options.homedir);

  if (!enabled) {
    try {
      fs.unlinkSync(autostartPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return false;
  }

  const directory = path.dirname(autostartPath);
  const temporaryPath = `${autostartPath}.tmp`;
  const launchArguments = getLaunchArguments(options);
  const entry = createDesktopEntry(launchArguments, options.iconPath);

  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.writeFileSync(temporaryPath, entry, { encoding: "utf8", mode: 0o644 });
  fs.renameSync(temporaryPath, autostartPath);
  return true;
}

module.exports = {
  DESKTOP_ID,
  createDesktopEntry,
  getAutostartDirectory,
  getAutostartPath,
  getLaunchArguments,
  isAutostartEnabled,
  quoteExecArgument,
  sanitizeDesktopValue,
  setAutostartEnabled
};
