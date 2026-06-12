/* ── Entry point ──
 * Imports each feature module (their side-effect listeners wire up on import),
 * then runs the bootstrap calls in the same order the old single-file editor.js
 * executed them at the top level. That order is load-bearing.
 */
import { state } from './state.js';
import { initMathField } from './mathfield.js';
import { renderTabs, renderPalette } from './palette.js';
import { buildMatrixSelectorUI } from './matrix.js';
import { loadSettings, loadPosition, clampPositionToBounds } from './settings.js';
import { loadLicense } from './license.js';

// Side-effect modules: register their DOM event listeners on import.
import './tab-editor.js';
import './actions.js';
import './shortcuts.js';
import './drag-resize.js';

// 1. Math engine
initMathField();

// 2. Tabs + palette
renderTabs();
renderPalette(state.activeCategory);

// 3. Matrix selector grid
buildMatrixSelectorUI();

// 4. Persisted settings + window position
loadSettings();
loadPosition();
clampPositionToBounds();

// 5. Pro license (async; gates re-check on the license-changed event)
loadLicense();
