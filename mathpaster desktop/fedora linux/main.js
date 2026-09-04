"use strict";

const path = require("node:path");
const {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray
} = require("electron");
const {
  DESKTOP_ID,
  isAutostartEnabled,
  setAutostartEnabled
} = require("./src/autostart");
const { ensureDesktopIntegration } = require("./src/desktop-entry");
const { createShortcutHandler } = require("./src/shortcut");

const TOGGLE_SHORTCUT = "Control+Shift+M";
const START_HIDDEN = process.argv.includes("--hidden");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let shortcutRegistered = false;

app.setName("MathPaster");
if (process.platform === "linux") app.setDesktopName(DESKTOP_ID);
if (process.platform === "linux" && process.env.XDG_SESSION_TYPE === "wayland") {
  // Fedora GNOME defaults to Wayland; Chromium's Vulkan path is not compatible
  // with Electron's Wayland surface factory on every Fedora graphics stack.
  app.commandLine.appendSwitch("disable-features", "Vulkan");
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());
}

function getIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(__dirname, "build", "icon.png");
}

function getAutostartOptions() {
  return {
    isPackaged: app.isPackaged,
    // AppImages run from a temporary mount; APPIMAGE points to the durable file.
    executablePath: process.env.APPIMAGE || process.execPath,
    appPath: app.getAppPath(),
    // RPM installation and AppImage integration both register this icon name.
    iconPath: app.isPackaged ? "mathpaster" : getIconPath()
  };
}

function getDesktopIntegrationOptions() {
  return {
    isPackaged: app.isPackaged,
    executablePath: process.env.APPIMAGE || process.execPath,
    appPath: app.getAppPath(),
    iconSourcePath: getIconPath()
  };
}

function sendAppState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("app:state", {
    launchOnRestart: isAutostartEnabled(),
    shortcut: "Ctrl+Shift+M",
    shortcutRegistered
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("window:shown");
}

function hideWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
}

function toggleWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible()) {
    hideWindow();
    console.info("MathPaster window hidden by Ctrl+Shift+M.");
  } else {
    showWindow();
    console.info("MathPaster window opened by Ctrl+Shift+M.");
  }
}

function quitApplication() {
  isQuitting = true;
  app.quit();
}

function rebuildTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: mainWindow && mainWindow.isVisible() ? "Hide MathPaster" : "Show MathPaster",
      click: toggleWindow
    },
    {
      label: "Launch on restart",
      type: "checkbox",
      checked: isAutostartEnabled(),
      click: (item) => {
        try {
          setAutostartEnabled(item.checked, getAutostartOptions());
          rebuildTrayMenu();
          sendAppState();
        } catch (error) {
          console.error("Could not update autostart:", error);
          sendAppState();
        }
      }
    },
    { type: "separator" },
    {
      label: shortcutRegistered ? "Shortcut: Ctrl+Shift+M" : "Shortcut unavailable",
      enabled: false
    },
    { type: "separator" },
    {
      label: "Quit MathPaster",
      click: quitApplication
    }
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(getIconPath()).resize({ width: 24, height: 24 });
  tray = new Tray(trayIcon);
  tray.setToolTip("MathPaster — Ctrl+Shift+M");
  tray.on("click", toggleWindow);
  rebuildTrayMenu();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    name: "mathpaster-main-window",
    width: 790,
    height: 614,
    minWidth: 500,
    minHeight: 388,
    useContentSize: true,
    center: true,
    frame: false,
    transparent: false,
    resizable: true,
    show: false,
    alwaysOnTop: true,
    windowStatePersistence: true,
    backgroundColor: "#0b0c18",
    icon: getIconPath(),
    title: "MathPaster",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  // Match the Chrome editor's aspect-locked corner resizing. The renderer also
  // letterboxes gracefully on Wayland compositors that ignore this hint.
  mainWindow.setAspectRatio(760 / 590);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideWindow();
    }
  });
  mainWindow.on("show", rebuildTrayMenu);
  mainWindow.on("hide", rebuildTrayMenu);
  mainWindow.webContents.on("did-finish-load", sendAppState);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });
}

function registerShortcut() {
  const handleShortcut = createShortcutHandler(toggleWindow);
  shortcutRegistered = globalShortcut.register(TOGGLE_SHORTCUT, handleShortcut);
  if (!shortcutRegistered) {
    console.error(`${TOGGLE_SHORTCUT} is already reserved by another application.`);
  } else {
    console.info(`${TOGGLE_SHORTCUT} registered for ${DESKTOP_ID}.`);
  }
  rebuildTrayMenu();
  sendAppState();
}

function registerIpc() {
  ipcMain.handle("window:hide", () => hideWindow());
  ipcMain.handle("window:toggle", () => toggleWindow());
  ipcMain.handle("app:get-state", () => ({
    launchOnRestart: isAutostartEnabled(),
    shortcut: "Ctrl+Shift+M",
    shortcutRegistered
  }));
  ipcMain.handle("app:set-autostart", (_event, enabled) => {
    const result = setAutostartEnabled(Boolean(enabled), getAutostartOptions());
    rebuildTrayMenu();
    sendAppState();
    return result;
  });
  ipcMain.handle("clipboard:write", (_event, latex, closeAfter = false) => {
    if (typeof latex !== "string") throw new TypeError("LaTeX must be a string.");
    clipboard.writeText(latex);
    if (closeAfter) hideWindow();
    return true;
  });
}

if (hasSingleInstanceLock) {
  app.whenReady().then(() => {
    registerIpc();
    try {
      ensureDesktopIntegration(getDesktopIntegrationOptions());
    } catch (error) {
      console.error("Could not register the desktop identity:", error);
    }
    createWindow();
    createTray();
    registerShortcut();
    if (!START_HIDDEN) showWindow();
  });

  app.on("activate", showWindow);
  app.on("window-all-closed", () => {});
  app.on("will-quit", () => globalShortcut.unregisterAll());
  process.on("SIGINT", quitApplication);
  process.on("SIGTERM", quitApplication);
}
