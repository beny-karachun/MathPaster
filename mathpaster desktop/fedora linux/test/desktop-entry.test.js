"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  MANAGED_MARKER,
  createApplicationDesktopEntry,
  ensureDesktopIntegration,
  getDesktopLaunchArguments,
  getUserDesktopEntryPath,
  getUserIconPath
} = require("../src/desktop-entry");

test("builds source and packaged desktop launch commands", () => {
  assert.deepEqual(getDesktopLaunchArguments({
    isPackaged: true,
    executablePath: "/home/user/MathPaster.AppImage",
    appPath: "/ignored"
  }), ["/home/user/MathPaster.AppImage"]);

  assert.deepEqual(getDesktopLaunchArguments({
    isPackaged: false,
    executablePath: "/project/node_modules/electron/dist/electron",
    appPath: "/project/mathpaster desktop/fedora linux"
  }), [
    "/project/node_modules/electron/dist/electron",
    "/project/mathpaster desktop/fedora linux"
  ]);
});

test("creates a portal-resolvable application entry", () => {
  const entry = createApplicationDesktopEntry(["/home/user/MathPaster.AppImage"]);
  assert.match(entry, /StartupWMClass=com\.mathpaster\.MathPaster/);
  assert.match(entry, /Exec="\/home\/user\/MathPaster\.AppImage"/);
  assert.match(entry, new RegExp(MANAGED_MARKER));
});

test("installs a managed user launcher and icon when no RPM entry exists", () => {
  const temporaryHome = fs.mkdtempSync(path.join(os.tmpdir(), "mathpaster-desktop-entry-"));
  const iconSourcePath = path.join(temporaryHome, "source-icon.png");
  fs.writeFileSync(iconSourcePath, "icon");
  const options = {
    env: { XDG_DATA_DIRS: path.join(temporaryHome, "empty-system-data") },
    homedir: temporaryHome,
    isPackaged: true,
    executablePath: "/home/user/MathPaster.AppImage",
    appPath: "/ignored",
    iconSourcePath
  };

  try {
    const installedPath = ensureDesktopIntegration(options);
    assert.equal(installedPath, getUserDesktopEntryPath(options.env, options.homedir));
    assert.match(fs.readFileSync(installedPath, "utf8"), /MathPaster\.AppImage/);
    assert.equal(fs.readFileSync(getUserIconPath(options.env, options.homedir), "utf8"), "icon");
  } finally {
    fs.rmSync(temporaryHome, { recursive: true, force: true });
  }
});

test("prefers an RPM launcher and removes only a managed user override", () => {
  const temporaryHome = fs.mkdtempSync(path.join(os.tmpdir(), "mathpaster-system-entry-"));
  const systemData = path.join(temporaryHome, "system-share");
  const systemEntry = path.join(systemData, "applications", "com.mathpaster.MathPaster.desktop");
  const env = { XDG_DATA_DIRS: systemData };
  const userEntry = getUserDesktopEntryPath(env, temporaryHome);

  try {
    fs.mkdirSync(path.dirname(systemEntry), { recursive: true });
    fs.mkdirSync(path.dirname(userEntry), { recursive: true });
    fs.writeFileSync(systemEntry, "[Desktop Entry]\nName=MathPaster\n");
    fs.writeFileSync(userEntry, `[Desktop Entry]\n${MANAGED_MARKER}\n`);

    const result = ensureDesktopIntegration({
      env,
      homedir: temporaryHome,
      isPackaged: true,
      executablePath: "/opt/MathPaster/mathpaster",
      appPath: "/ignored"
    });
    assert.equal(result, systemEntry);
    assert.equal(fs.existsSync(userEntry), false);
  } finally {
    fs.rmSync(temporaryHome, { recursive: true, force: true });
  }
});
