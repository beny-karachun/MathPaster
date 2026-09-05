"use strict";

const path = require("node:path");
const {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
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
const {
  loadWindowBounds,
  trackWindowBounds
} = require("./src/window-state");

const TOGGLE_SHORTCUT = "Alt+M";
const TOGGLE_SHORTCUT_LABEL = "Alt+M";
const START_HIDDEN = process.argv.includes("--hidden");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let shortcutRegistered = false;
let kdeShortcutWorker = null;
let windowReady = false;
let showWhenReady = !START_HIDDEN;
let visibilityRevision = 0;
let windowState = null;
const isWaylandSession = process.platform === "linux"
  && String(process.env.XDG_SESSION_TYPE || "").toLowerCase() === "wayland";
const useX11ForWindowPosition = app.commandLine.getSwitchValue("ozone-platform") === "x11";
const handleShortcut = createShortcutHandler(toggleWindow);
const handleLocalShortcut = createLocalShortcutHandler(handleShortcut);

function isNativeKdeWaylandSession() {
  return !useX11ForWindowPosition
    && isWaylandSession
    && isKdeSession();
}

app.setName("MathPaster");
if (process.platform === "linux") {
  app.setDesktopName(DESKTOP_ID);
  // This small 2D editor does not need GPU acceleration. Fedora driver stacks
  // can repeatedly crash Chromium's GPU process even with Vulkan disabled.
  // Use software compositing without weakening Chromium's sandbox.
  app.disableHardwareAcceleration();
}
// src/launch.sh selects Ozone BEFORE Electron initializes. Changing it here
// creates mismatched browser/renderer backends and an invisible native window.
if (isWaylandSession) {
  // Fedora GNOME defaults to Wayland; Chromium's Vulkan path is not compatible
  // with every Fedora graphics stack, including XWayland sessions.
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

function getLauncherPath() {
  // Never persist the temporary AppImage mount or the inner binary: both would
  // bypass the early display-backend selection on subsequent launches.
  if (process.env.APPIMAGE) return process.env.APPIMAGE;
  return app.isPackaged ? path.join(path.dirname(process.execPath), "mathpaster") : process.execPath;
}

function getAutostartOptions() {
  return {
    isPackaged: app.isPackaged,
    // AppImages run from a temporary mount; APPIMAGE points to the durable file.
    executablePath: getLauncherPath(),
    appPath: app.getAppPath(),
    // RPM installation and AppImage integration both register this icon name.
    iconPath: app.isPackaged ? "mathpaster" : getIconPath()
  };
}

function getDesktopIntegrationOptions() {
  return {
    isPackaged: app.isPackaged,
    executablePath: getLauncherPath(),
    appPath: app.getAppPath(),
    iconSourcePath: getIconPath()
  };
}

function sendAppState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("app:state", {
    launchOnRestart: isAutostartEnabled(),
    shortcut: TOGGLE_SHORTCUT_LABEL,
    shortcutRegistered,
    alwaysOnTop: mainWindow.isAlwaysOnTop()
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  showWhenReady = true;
  if (!windowReady) return;
  if (isWindowOpen(mainWindow)) {
    mainWindow.focus();
    return;
  }
  visibilityRevision++;
  handleLocalShortcut.reset();
  revealWindow(mainWindow, { nativeWayland: isWaylandSession && !useX11ForWindowPosition });
  mainWindow.webContents.send("window:shown");
}

function hideWindow() {
  windowState?.flush();
  showWhenReady = false;
  visibilityRevision++;
  handleLocalShortcut.reset();
  concealWindow(mainWindow);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("window:hidden");
}

function toggleWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!windowReady) {
    showWhenReady = !showWhenReady;
    return;
  }
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
  windowReady = false;
  const statePath = path.join(app.getPath("userData"), "window-bounds.json");
  const primary = screen.getPrimaryDisplay();
  const displays = [primary, ...screen.getAllDisplays().filter(display => display.id !== primary.id)];
  const bounds = loadWindowBounds(statePath, displays);
  mainWindow = new BrowserWindow({
    ...(bounds || { width: 820, height: 660, center: true }),
    minWidth: 500,
    minHeight: 440,
    useContentSize: true,
    frame: false,
    transparent: false,
    resizable: true,
    show: false,
    alwaysOnTop: true,
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
  windowState = trackWindowBounds(mainWindow, statePath);

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.once("ready-to-show", () => {
    windowReady = true;
    if (showWhenReady) showWindow();
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html")).catch(error => {
    console.error("Could not load the editor:", error);
    dialog.showErrorBox("MathPaster could not open", "The editor files could not be loaded. Please reinstall MathPaster.");
    quitApplication();
  });

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
  mainWindow.on("closed", () => { mainWindow = null; windowReady = false; });
  mainWindow.webContents.on("did-finish-load", sendAppState);
  mainWindow.webContents.on("before-input-event", handleLocalShortcut);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(error => console.error("Could not open link:", error));
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });
  mainWindow.webContents.on("render-process-gone", async (_event, details) => {
    if (isQuitting || details.reason === "clean-exit") return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "error", title: "The editor stopped responding",
      message: "Reload MathPaster to continue. Your saved draft will be restored.",
      buttons: ["Reload editor", "Quit"], defaultId: 0, cancelId: 1
    });
    if (response === 0 && mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
    else quitApplication();
  });
}

async function registerShortcut() {
  const useNativeKdePresses = isNativeKdeWaylandSession();
  let usingNativeKdePresses = false;

  // Plasma remembers portal shortcuts after an app exits, but some versions
  // return the remembered action from ListShortcuts without marking it active.
  // Chromium then skips BindShortcuts and the keystroke falls through into the
  // focused editor. Removing only this app's inactive actions forces a real
  // bind on every launch while preserving every other application's shortcuts.
  if (isKdeSession()) {
    const cleanup = cleanInactiveKdeShortcuts();
    if (cleanup.cleaned) {
      console.info("Removed inactive KDE MathPaster shortcut state before registration.");
    }
  }

  const previousKdeShortcutNames = useNativeKdePresses
    ? listKdeShortcutNames()
    : [];
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
    console.error(`${TOGGLE_SHORTCUT} could not be registered. Check desktop shortcut permissions or conflicting bindings.`);
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
  // Only our top-level, local shell may invoke privileged operations.
  const handle = (channel, callback) => ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents
      || event.senderFrame !== mainWindow.webContents.mainFrame) {
      throw new Error("Untrusted desktop request.");
    }
    return callback(...args);
  });
  handle("window:hide", () => hideWindow());
  handle("window:toggle", () => handleShortcut("renderer-local"));
  handle("window:pin", () => {
    mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
    sendAppState();
    return mainWindow.isAlwaysOnTop();
  });
  handle("app:get-state", () => ({
    launchOnRestart: isAutostartEnabled(),
    shortcut: TOGGLE_SHORTCUT_LABEL,
    shortcutRegistered,
    alwaysOnTop: mainWindow.isAlwaysOnTop()
  }));
  handle("app:set-autostart", enabled => {
    if (typeof enabled !== "boolean") throw new TypeError("Autostart must be a boolean.");
    const result = setAutostartEnabled(enabled, getAutostartOptions());
    rebuildTrayMenu();
    sendAppState();
    return result;
  });
  handle("clipboard:write", latex => {
    if (typeof latex !== "string" || !latex.trim() || latex.length > 1_000_000) {
      throw new TypeError("Enter an equation before copying.");
    }
    clipboard.writeText(latex);
    return { visibilityRevision };
  });
  handle("window:hide-after-copy", revision => {
    if (revision === visibilityRevision) hideWindow();
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
    try { createTray(); } catch (error) {
      console.error("Could not create tray:", error);
      showWhenReady = true;
    }
    await registerShortcut();
    if (showWhenReady || (!tray && !shortcutRegistered)) showWindow();
  }).catch(error => {
    console.error("MathPaster startup failed:", error);
    dialog.showErrorBox("MathPaster could not start", error.message);
    quitApplication();
  });

  app.on("activate", showWindow);
  app.on("window-all-closed", () => {});
  // app.quit(), session shutdown, and the tray must all bypass close-to-tray.
  app.on("before-quit", () => { isQuitting = true; windowState?.flush(); });
  app.on("will-quit", () => {
    kdeShortcutWorker?.stop();
    globalShortcut.unregisterAll();
  });
  process.on("SIGINT", quitApplication);
  process.on("SIGTERM", quitApplication);
}
