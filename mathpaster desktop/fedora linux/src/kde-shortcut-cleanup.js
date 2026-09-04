"use strict";

const { spawnSync } = require("node:child_process");

const KDE_SHORTCUT_SERVICE = "org.kde.kglobalaccel";
const KDE_SHORTCUT_ROOT = "/kglobalaccel";
const KDE_SHORTCUT_COMPONENT = "/component/com_mathpaster_MathPaster";
const MANAGED_ACCELERATORS = new Set([
  "Ctrl+Shift+M",
  "Ctrl+Alt+Shift+M",
  "Alt+M"
]);

function isKdeSession(environment = process.env) {
  const desktop = `${environment.XDG_CURRENT_DESKTOP || ""}:${environment.DESKTOP_SESSION || ""}`.toLowerCase();
  return desktop.includes("kde") || desktop.includes("plasma");
}

function runQdbus(argumentsList, spawn = spawnSync) {
  for (const command of ["qdbus-qt6", "qdbus6", "qdbus"]) {
    const result = spawn(command, argumentsList, {
      encoding: "utf8",
      timeout: 2500,
      windowsHide: true
    });
    if (!result.error || result.error.code !== "ENOENT") return result;
  }
  return { status: 127, stdout: "" };
}

function isManagedShortcutName(name) {
  return [...MANAGED_ACCELERATORS].some((accelerator) => name.endsWith(`-${accelerator}`));
}

function parseShortcutNames(output) {
  return String(output || "")
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => name && isManagedShortcutName(name));
}

function listKdeShortcutNames(options = {}) {
  const result = (options.runQdbus || runQdbus)([
    KDE_SHORTCUT_SERVICE,
    KDE_SHORTCUT_COMPONENT,
    "org.kde.kglobalaccel.Component.shortcutNames"
  ]);
  if (result.status !== 0) return [];
  return parseShortcutNames(result.stdout);
}

function cleanInactiveKdeShortcuts(options = {}) {
  const environment = options.environment || process.env;
  if (!isKdeSession(environment)) return { attempted: false, cleaned: false };

  const result = (options.runQdbus || runQdbus)([
    KDE_SHORTCUT_SERVICE,
    KDE_SHORTCUT_COMPONENT,
    "org.kde.kglobalaccel.Component.cleanUp"
  ]);

  return {
    attempted: true,
    cleaned: result.status === 0 && String(result.stdout).trim() === "true"
  };
}

function findReconciliation(previousNames, currentNames) {
  const previous = new Set(previousNames.filter(isManagedShortcutName));
  const current = currentNames.filter(isManagedShortcutName);
  const added = current.filter((name) => !previous.has(name));

  // Electron's Wayland portal creates one opaque action ID per registration.
  // Only prune when that one new live action is unambiguous.
  if (added.length !== 1) return { activeName: current.length === 1 ? current[0] : null, staleNames: [] };

  return {
    activeName: added[0],
    staleNames: [...previous].filter((name) => name !== added[0])
  };
}

function reconcileKdeShortcuts(previousNames, options = {}) {
  const currentNames = listKdeShortcutNames(options);
  const reconciliation = findReconciliation(previousNames, currentNames);
  if (!reconciliation.activeName || reconciliation.staleNames.length === 0) return reconciliation;

  const invokeQdbus = options.runQdbus || runQdbus;
  const removedNames = [];
  for (const shortcutName of reconciliation.staleNames) {
    const result = invokeQdbus([
      KDE_SHORTCUT_SERVICE,
      KDE_SHORTCUT_ROOT,
      "org.kde.KGlobalAccel.unregister",
      "com.mathpaster.MathPaster",
      shortcutName
    ]);
    if (result.status === 0 && String(result.stdout).trim() === "true") removedNames.push(shortcutName);
  }

  return { ...reconciliation, removedNames };
}

module.exports = {
  cleanInactiveKdeShortcuts,
  findReconciliation,
  isKdeSession,
  isManagedShortcutName,
  listKdeShortcutNames,
  parseShortcutNames,
  reconcileKdeShortcuts,
  runQdbus
};
