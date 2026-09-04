"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  DESKTOP_ID,
  createDesktopEntry,
  getAutostartPath,
  getLaunchArguments,
  isAutostartEnabled,
  quoteExecArgument,
  setAutostartEnabled
} = require("../src/autostart");

test("quotes paths safely for a Desktop Entry Exec line", () => {
  assert.equal(quoteExecArgument('/opt/Math Paster/$app`"'), '"/opt/Math Paster/\\$app\\`\\""');
});

test("builds packaged and development launch commands", () => {
  assert.deepEqual(getLaunchArguments({
    isPackaged: true,
    executablePath: "/opt/MathPaster/mathpaster",
    appPath: "/ignored"
  }), ["/opt/MathPaster/mathpaster", "--hidden"]);

  assert.deepEqual(getLaunchArguments({
    isPackaged: false,
    executablePath: "/project/node_modules/electron/dist/electron",
    appPath: "/project/mathpaster desktop/fedora linux"
  }), [
    "/project/node_modules/electron/dist/electron",
    "/project/mathpaster desktop/fedora linux",
    "--hidden"
  ]);
});

test("accepts an AppImage path as the durable packaged executable", () => {
  assert.deepEqual(getLaunchArguments({
    isPackaged: true,
    executablePath: "/home/user/Applications/MathPaster.AppImage",
    appPath: "/tmp/.mount_mathpaster/resources/app.asar"
  }), ["/home/user/Applications/MathPaster.AppImage", "--hidden"]);
});

test("creates a valid Fedora autostart entry", () => {
  const entry = createDesktopEntry(
    ["/opt/Math Paster/mathpaster", "--hidden"],
    "/opt/Math Paster/icon.png"
  );

  assert.match(entry, /^\[Desktop Entry\]/);
  assert.match(entry, /Exec="\/opt\/Math Paster\/mathpaster" "--hidden"/);
  assert.match(entry, /X-GNOME-Autostart-enabled=true/);
  assert.match(entry, /StartupNotify=false/);
});

test("enables and disables launch on restart", () => {
  const temporaryHome = fs.mkdtempSync(path.join(os.tmpdir(), "mathpaster-autostart-"));
  const options = {
    env: {},
    homedir: temporaryHome,
    isPackaged: true,
    executablePath: "/opt/MathPaster/mathpaster",
    appPath: "/ignored",
    iconPath: "/opt/MathPaster/icon.png"
  };

  try {
    assert.equal(isAutostartEnabled(options), false);
    assert.equal(setAutostartEnabled(true, options), true);
    assert.equal(isAutostartEnabled(options), true);
    assert.equal(
      getAutostartPath(options.env, options.homedir),
      path.join(temporaryHome, ".config", "autostart", `${DESKTOP_ID}.desktop`)
    );
    assert.match(fs.readFileSync(getAutostartPath(options.env, options.homedir), "utf8"), /--hidden/);
    assert.equal(setAutostartEnabled(false, options), false);
    assert.equal(isAutostartEnabled(options), false);
  } finally {
    fs.rmSync(temporaryHome, { recursive: true, force: true });
  }
});
