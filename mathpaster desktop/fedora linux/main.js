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
const {
  cleanInactiveKdeShortcuts,
  isKdeSession,
  listKdeShortcutNames,
  reconcileKdeShortcuts
} = require("./src/kde-shortcut-cleanup");
const {
  createKdeShortcutWorker
} = require("./src/kde-shortcut-worker-client");
const {
  createLocalShortcutHandler,
  createShortcutHandler
} = require("./src/shortcut");
const {
  concealWindow,
  isWindowOpen,
  revealWindow
} = require("./src/window-visibility");

const TOGGLE_SHORTCUT = "Alt+M";
const TOGGLE_SHORTCUT_LABEL = "Alt+M";
const START_HIDDEN = process.argv.includes("--hidden");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let shortcutRegistered = false;
let kdeShortcutWorker = null;
const handleShortcut = createShortcutHandler(toggleWindow);
const handleLocalShortcut = createLocalShortcutHandler(handleShortcut);

function isKdeWaylandSession() {
  return process.env.XDG_SESSION_TYPE === "wayland" && isKdeSession();
}

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
    shortcut: TOGGLE_SHORTCUT_LABEL,
    shortcutRegistered
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  handleLocalShortcut.reset();
  revealWindow(mainWindow);
  mainWindow.webContents.send("window:shown");
}

function hideWindow() {
  handleLocalShortcut.reset();
  concealWindow(mainWindow);
}

function toggleWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (isWindowOpen(mainWindow)) {
    hideWindow();
    console.info(`MathPaster window hidden by ${TOGGLE_SHORTCUT_LABEL}.`);
  } else {
    showWindow();
    console.info(`MathPaster window opened by ${TOGGLE_SHORTCUT_LABEL}.`);
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
      label: isWindowOpen(mainWindow) ? "Hide MathPaster" : "Show MathPaster",
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
      label: shortcutRegistered ? `Shortcut: ${TOGGLE_SHORTCUT_LABEL}` : "Shortcut unavailable",
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
  tray.setToolTip(`MathPaster — ${TOGGLE_SHORTCUT_LABEL}`);
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
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
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
  mainWindow.on("blur", handleLocalShortcut.reset);
  mainWindow.on("minimize", rebuildTrayMenu);
  mainWindow.on("restore", rebuildTrayMenu);
  mainWindow.webContents.on("did-finish-load", sendAppState);
  mainWindow.webContents.on("before-input-event", handleLocalShortcut);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });
}

async function registerShortcut() {
  const useNativeKdePresses = isKdeWaylandSession();
  let usingNativeKdePresses = false;

  // Plasma remembers portal shortcuts after an app exits, but some versions
  // return the remembered action from ListShortcuts without marking it active.
  // Chromium then skips BindShortcuts and the keystroke falls through into the
  // focused editor. Removing only this app's inactive actions forces a real
  // bind on every launch while preserving every other application's shortcuts.
  if (useNativeKdePresses) {
    const cleanup = cleanInactiveKdeShortcuts();
    if (cleanup.cleaned) {
      console.info("Removed inactive KDE MathPaster shortcut state before registration.");
    }
  }

  const previousKdeShortcutNames = listKdeShortcutNames();
  shortcutRegistered = globalShortcut.register(
    TOGGLE_SHORTCUT,
    () => handleShortcut("electron-global")
  );

  // Electron owns the portal registration, but subscribe to Plasma's Pressed
  // signal directly in this process. This produces one immediate event per
  // physical press without relying on Electron's unreliable Wayland callback
  // or a buffered external monitor process.
  if (shortcutRegistered && useNativeKdePresses) {
    kdeShortcutWorker = createKdeShortcutWorker(
      () => handleShortcut("kde-native")
    );
    try {
      await kdeShortcutWorker.start();
      usingNativeKdePresses = true;
    } catch (error) {
      console.error("Could not subscribe to KDE shortcut presses; using Electron fallback:", error);
      kdeShortcutWorker?.stop();
      kdeShortcutWorker = null;
    }
  }
  if (!shortcutRegistered) {
    kdeShortcutWorker?.stop();
    kdeShortcutWorker = null;
    console.error(`${TOGGLE_SHORTCUT} is already reserved by another application.`);
  } else {
    const backend = usingNativeKdePresses ? "KDE native press listener" : "Electron global shortcut";
    console.info(`${TOGGLE_SHORTCUT} registered for ${DESKTOP_ID} via ${backend}.`);
  }
  if (shortcutRegistered && previousKdeShortcutNames.length > 0) {
    const cleanupTimer = setTimeout(() => {
      const result = reconcileKdeShortcuts(previousKdeShortcutNames);
      if (result.removedNames?.length) {
        console.info(`Removed ${result.removedNames.length} stale KDE MathPaster shortcut registration(s).`);
      }
    }, 1000);
    cleanupTimer.unref();
  }
  rebuildTrayMenu();
  sendAppState();
}

function registerIpc() {
  ipcMain.handle("window:hide", () => hideWindow());
  ipcMain.handle("window:toggle", () => handleShortcut("renderer-local"));
  ipcMain.handle("app:get-state", () => ({
    launchOnRestart: isAutostartEnabled(),
    shortcut: TOGGLE_SHORTCUT_LABEL,
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
  app.whenReady().then(async () => {
    registerIpc();
    try {
      ensureDesktopIntegration(getDesktopIntegrationOptions());
      // Rewrite older packaged autostart entries with the `--` separator that
      // Electron requires before application-defined arguments.
      if (isAutostartEnabled()) {
        setAutostartEnabled(true, getAutostartOptions());
      }
    } catch (error) {
      console.error("Could not register the desktop identity:", error);
    }
    createWindow();
    createTray();
    await registerShortcut();
    if (!START_HIDDEN) showWindow();
  });

  app.on("activate", showWindow);
  app.on("window-all-closed", () => {});
  app.on("will-quit", () => {
    kdeShortcutWorker?.stop();
    globalShortcut.unregisterAll();
  });
  process.on("SIGINT", quitApplication);
  process.on("SIGTERM", quitApplication);
}
