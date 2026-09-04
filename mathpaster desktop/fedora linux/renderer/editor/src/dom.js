/* ── Shared DOM references ──
 * Element refs used by more than one module. Modules are deferred, so the DOM
 * is fully parsed before this runs. Single-module refs (categoryTabs, header,
 * matrixSelector, the tab-* modal refs, kbd*) stay local to their own module.
 */
export const mf           = document.getElementById("mf");
export const latexEl      = document.getElementById("latex-code");
export const palette      = document.getElementById("palette");
export const loading      = document.getElementById("loading");
export const editorWindow = document.getElementById("editor-window");
