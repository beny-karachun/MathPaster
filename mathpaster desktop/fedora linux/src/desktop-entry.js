"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  DESKTOP_ID,
  quoteExecArgument,
  sanitizeDesktopValue
} = require("./autostart");

const MANAGED_MARKER = "X-MathPaster-Managed=true";

function getDataHome(env = process.env, homedir = os.homedir()) {
  return env.XDG_DATA_HOME || path.join(homedir, ".local", "share");
}

function getUserDesktopEntryPath(env = process.env, homedir = os.homedir()) {
  return path.join(getDataHome(env, homedir), "applications", `${DESKTOP_ID}.desktop`);
}

function getUserIconPath(env = process.env, homedir = os.homedir()) {
  return path.join(getDataHome(env, homedir), "icons", "hicolor", "128x128", "apps", "mathpaster.png");
}

function getSystemDesktopEntryPaths(env = process.env) {
  const dataDirectories = (env.XDG_DATA_DIRS || "/usr/local/share:/usr/share")
    .split(":")
    .filter(Boolean);
  return dataDirectories.map((directory) =>
    path.join(directory, "applications", `${DESKTOP_ID}.desktop`)
  );
}

function getDesktopLaunchArguments({ isPackaged, executablePath, appPath }) {
  return isPackaged ? [executablePath] : ["/bin/sh", path.join(appPath, "src/launch.sh")];
}

function createApplicationDesktopEntry(launchArguments, icon = "mathpaster") {
  const exec = launchArguments.map(quoteExecArgument).join(" ");
  return [
    "[Desktop Entry]",
    "Type=Application",
    "Version=1.0",
    "Name=MathPaster",
    "Comment=Write math visually and paste LaTeX anywhere",
    `Exec=${exec}`,
    `Icon=${sanitizeDesktopValue(icon)}`,
    "Terminal=false",
    "StartupNotify=true",
    `StartupWMClass=${DESKTOP_ID}`,
    "Categories=Education;Science;Utility;",
    "Keywords=math;latex;equation;editor;",
    MANAGED_MARKER,
    ""
  ].join("\n");
}

function writeAtomically(targetPath, content, mode = 0o644) {
  const directory = path.dirname(targetPath);
  const temporaryPath = `${targetPath}.tmp`;
  fs.mkdirSync(directory, { recursive: true, mode: 0o755 });
  fs.writeFileSync(temporaryPath, content, { encoding: "utf8", mode });
  fs.renameSync(temporaryPath, targetPath);
}

function removeManagedUserEntry(userEntryPath) {
  try {
    const current = fs.readFileSync(userEntryPath, "utf8");
    if (current.includes(MANAGED_MARKER)) fs.unlinkSync(userEntryPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function ensureDesktopIntegration(options) {
  const systemEntry = getSystemDesktopEntryPaths(options.env)
    .find((candidate) => fs.existsSync(candidate));
  const userEntryPath = getUserDesktopEntryPath(options.env, options.homedir);

  if (systemEntry) {
    // A previous AppImage/source launcher must not override a later RPM install.
    removeManagedUserEntry(userEntryPath);
    return systemEntry;
  }

  // A launcher customized by the user is not ours to rewrite on each start.
  try {
    if (!fs.readFileSync(userEntryPath, "utf8").includes(MANAGED_MARKER)) return userEntryPath;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const userIconPath = getUserIconPath(options.env, options.homedir);
  if (options.iconSourcePath && fs.existsSync(options.iconSourcePath)) {
    fs.mkdirSync(path.dirname(userIconPath), { recursive: true, mode: 0o755 });
    fs.copyFileSync(options.iconSourcePath, userIconPath);
    fs.chmodSync(userIconPath, 0o644);
  }

  const launchArguments = getDesktopLaunchArguments(options);
  const entry = createApplicationDesktopEntry(launchArguments);
  writeAtomically(userEntryPath, entry);
  return userEntryPath;
}

module.exports = {
  MANAGED_MARKER,
  createApplicationDesktopEntry,
  ensureDesktopIntegration,
  getDataHome,
  getDesktopLaunchArguments,
  getSystemDesktopEntryPaths,
  getUserDesktopEntryPath,
  getUserIconPath,
  removeManagedUserEntry
};
