/* ── Shared mutable state ──
 * One singleton object holding every variable that is read or written across
 * more than one module. Modules import `state` and use `state.x` so reassignment
 * is visible everywhere (ES module bindings can't be reassigned by importers).
 * Values seeded here are overwritten during bootstrap:
 *   - customTabs / activeCategory  → set in palette.js on load
 *   - currentSettings              → set in settings.js on load
 */
export const state = {
  insertMode: "inline",
  mfReady: false,
  defaultShortcuts: null,

  customTabs: [],
  // Per-builtin-tab edits (Pro): { [builtinKey]: { name, symbols } }  → set in palette.js
  defaultOverrides: {},
  // Built-in tabs the user removed (Pro): [builtinKey, ...]            → set in palette.js
  hiddenDefaults: [],
  activeCategory: null,

  currentSettings: null,

  // Pro license cache ({key, instanceId, pro, lastValidated}) — set in license.js
  license: null,

  // Editor-window position offsets (relative to centered default)
  currentX: 0,
  currentY: 0,
  baseX: 0,
  baseY: 0,

  // Uniform UI zoom from corner-drag resize (1 = design size). The window renders at
  // popupWidth*zoom × popupHeight*zoom; #editor-scale scales the content to match.
  zoom: 1,
};
