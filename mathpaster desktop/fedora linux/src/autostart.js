"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DESKTOP_ID = "com.mathpaster.MathPaster";

function sanitizeDesktopValue(value) {
  const clean = String(value).replace(/[\r\n\0]/g, " ");
  return clean.replace(/([\\"`$])/g, "\\$1");
}

function quoteExecArgument(value) {
  return `"${sanitizeDesktopValue(value)}"`;
}

function getAutostartDirectory(env = process.env, homedir = os.homedir()) {
  const configHome = env.XDG_CONFIG_HOME || path.join(homedir, ".config");
  return path.join(configHome, "autostart");
}

function getAutostartPath(env = process.env, homedir = os.homedir()) {
  return path.join(getAutostartDirectory(env, homedir), `${DESKTOP_ID}.desktop`);
}

function getLaunchArguments({ isPackaged, executablePath, appPath }) {
  const args = [executablePath];
  if (!isPackaged) args.push(appPath);
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
  return fs.existsSync(getAutostartPath(options.env, options.homedir));
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
  setAutostartEnabled
};
