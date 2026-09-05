"use strict";

const MAIN_WINDOW_NAME = "mathpaster-main-window";

function shouldUseX11ForWindowPosition(platform = process.platform, environment = process.env) {
  return Boolean(
    platform === "linux"
    && String(environment.XDG_SESSION_TYPE || "").toLowerCase() === "wayland"
    && String(environment.DISPLAY || "").trim()
  );
}

function getWindowStateOptions() {
  return {
    // Electron keys persisted state by this name, so it must remain stable
    // across development, AppImage, and RPM launches.
    name: MAIN_WINDOW_NAME,
    windowStatePersistence: {
      bounds: true,
      // MathPaster only promises to remember location and size. Restoring an
      // incidental fullscreen/maximized state would make the popup feel stuck.
      displayMode: false
    }
  };
}

module.exports = {
  MAIN_WINDOW_NAME,
  getWindowStateOptions,
  shouldUseX11ForWindowPosition
};
