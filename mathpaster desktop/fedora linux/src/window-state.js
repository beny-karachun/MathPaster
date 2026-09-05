"use strict";

const fs = require("node:fs");
const path = require("node:path");
const MAIN_WINDOW_NAME = "mathpaster-main-window";

function shouldUseX11ForWindowPosition(platform = process.platform, environment = process.env) {
  return Boolean(
    platform === "linux"
    && String(environment.XDG_SESSION_TYPE || "").toLowerCase() === "wayland"
    && String(environment.DISPLAY || "").trim()
  );
}

function validBounds(bounds) {
  return bounds && ["x", "y", "width", "height"].every(key => Number.isSafeInteger(bounds[key]) && Math.abs(bounds[key]) < 100000)
    && bounds.width > 0 && bounds.height > 0;
}

function fitWindowBounds(bounds, displays) {
  if (!validBounds(bounds)) return null;
  const areas = displays.map(display => display.workArea).filter(validBounds);
  if (!areas.length) return { ...bounds };
  const overlap = area => Math.max(0, Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x))
    * Math.max(0, Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y));
  const area = areas.reduce((best, candidate) => overlap(candidate) > overlap(best) ? candidate : best, areas[0]);
  const width = Math.min(area.width, Math.max(500, bounds.width));
  const height = Math.min(area.height, Math.max(440, bounds.height));
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  return {
    x: overlap(area) ? clamp(bounds.x, area.x, area.x + area.width - width) : area.x + Math.round((area.width - width) / 2),
    y: overlap(area) ? clamp(bounds.y, area.y, area.y + area.height - height) : area.y + Math.round((area.height - height) / 2),
    width, height
  };
}

function loadWindowBounds(filePath, displays) {
  try {
    return fitWindowBounds(JSON.parse(fs.readFileSync(filePath, "utf8")), displays);
  } catch {
    // Migrate the experimental Electron preference used by earlier builds.
    try {
      const old = JSON.parse(fs.readFileSync(path.join(path.dirname(filePath), "Local State"), "utf8"))?.windowStates?.[MAIN_WINDOW_NAME];
      if (old) return fitWindowBounds({ x: old.left, y: old.top, width: old.right - old.left, height: old.bottom - old.top }, displays);
    } catch {}
    return null;
  }
}

function trackWindowBounds(window, filePath, options = {}) {
  let lastBounds = null;
  let timer = null;
  let lastSaved = "";
  const capture = () => {
    if (window.isDestroyed() || !window.isVisible() || window.isMinimized() || window.isMaximized() || window.isFullScreen()) return;
    const bounds = window.getBounds();
    if (validBounds(bounds)) lastBounds = bounds;
  };
  const flush = () => {
    clearTimeout(timer);
    capture();
    if (!lastBounds) return;
    const serialized = JSON.stringify(lastBounds);
    if (serialized === lastSaved) return;
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const temp = `${filePath}.${process.pid}.tmp`;
      fs.writeFileSync(temp, serialized, { mode: 0o600 });
      fs.renameSync(temp, filePath);
      lastSaved = serialized;
    } catch (error) { (options.onError || console.error)("Could not save window position:", error); }
  };
  const schedule = () => {
    capture();
    clearTimeout(timer);
    timer = setTimeout(flush, options.delayMs ?? 200);
    timer.unref?.();
  };
  for (const event of ["move", "resize", "show"]) window.on(event, schedule);
  window.on("close", flush);
  window.on("closed", () => clearTimeout(timer));
  return { flush };
}

module.exports = {
  MAIN_WINDOW_NAME,
  fitWindowBounds,
  loadWindowBounds,
  trackWindowBounds,
  shouldUseX11ForWindowPosition
};
