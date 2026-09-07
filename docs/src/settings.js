import { state } from './state.js';
import { editorWindow } from './dom.js';
import { isPro, openUpgradeModal } from './license.js';

/* Each style has its own surfaces and typography in editor.css. */
const THEME_PRESETS = [
  { id: 'precision', name: 'Precision', mode: 'dark', description: 'Quiet focus. Crisp detail.', primary: { h: 162, s: 58, l: 65 }, shape: { borderRadiusBtn: 6, borderRadiusTab: 6, actionBtnRoundness: 8 } },
  { id: 'paper', name: 'Paper', mode: 'light', description: 'A little room to think.', primary: { h: 145, s: 29, l: 32 }, shape: { borderRadiusBtn: 5, borderRadiusTab: 5, actionBtnRoundness: 6 } },
  { id: 'glass', name: 'Glass', mode: 'light', description: 'Light, layered, luminous.', primary: { h: 226, s: 65, l: 48 }, shape: { borderRadiusBtn: 13, borderRadiusTab: 20, actionBtnRoundness: 14 } },
  { id: 'vaporwave', name: 'Vaporwave', mode: 'dark', description: 'After hours. Other worlds.', primary: { h: 185, s: 89, l: 72 }, shape: { borderRadiusBtn: 10, borderRadiusTab: 8, actionBtnRoundness: 10 } },
];
const DEFAULT_PRESET = 'precision';
const FREE_PRESETS = new Set(['precision', 'paper']);
const LEGACY_PRESETS = {
  'indigo-night': 'precision', daylight: 'paper', anthropic: 'precision',
  emerald: 'precision', crimson: 'precision', amber: 'precision', teal: 'precision',
  synthwave: 'vaporwave', 'anthropic-light': 'paper', mint: 'paper',
  sandstone: 'paper', 'cotton-candy': 'glass',
};
function resolvePreset(id) {
  return THEME_PRESETS.find(p => p.id === (LEGACY_PRESETS[id] || id)) || THEME_PRESETS[0];
}

/* ── Settings Logic ── */
const defaultSettings = {
  layoutVersion: 3,
  popupWidth: 610,
  popupHeight: 560,
  gapSize: 8,
  symbolGridWidth: 52,
  symbolHeight: 48,
  symbolFontSize: 22,
  borderRadiusBtn: 6,
  tabPaddingH: 12,
  tabPaddingV: 7,
  tabFontSize: 12,
  borderRadiusTab: 6,
  actionBtnPaddingX: 28,
  actionBtnPaddingY: 8,
  actionBtnFontSize: 14,
  actionBtnRoundness: 8,
  themePreset: DEFAULT_PRESET,
  showLatexBar: false
};

const MOBILE_BREAKPOINT = 600;
const MOBILE_DESIGN_WIDTH = 470;
const MOBILE_IFRAME_PADDING = 24;

state.currentSettings = { ...defaultSettings };

function isMobileFrame() {
  return window.innerWidth <= MOBILE_BREAKPOINT && window.frameElement !== null;
}

function syncDemoIframeHeight() {
  const frame = window.frameElement;
  if (!frame) return;
  const height = isMobileFrame()
    ? editorWindow.offsetHeight + MOBILE_IFRAME_PADDING
    : state.currentSettings.popupHeight * (state.zoom || 1) + 40;
  if (height > 0) frame.style.setProperty('height', `${Math.ceil(height)}px`, 'important');
}

// MathLive, palette tabs, and optional banners can all change the editor's natural
// height after the first settings pass. Keep the parent iframe matched to the final
// rendered content so the footer actions never end up below the mobile frame.
let mobileResizeFrame = 0;
if ('ResizeObserver' in window) {
  const mobileEditorResizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(mobileResizeFrame);
    mobileResizeFrame = requestAnimationFrame(syncDemoIframeHeight);
  });
  mobileEditorResizeObserver.observe(editorWindow);
}

export function applySettings(settings) {
  const preset = resolvePreset(settings.themePreset);
  settings.themePreset = preset.id;
  document.body.dataset.style = preset.id;
  document.body.classList.toggle('theme-light', preset.mode === 'light');
  const primaryHue = preset.primary.h, primarySat = preset.primary.s, primaryLight = preset.primary.l;

  // Uniform zoom from corner-drag resize: the window renders at the zoomed size and the
  // content (laid out at the design size) is scaled to fill it — so everything shrinks
  // or grows together and always fits.
  const requestedZoom = (state.zoom && isFinite(state.zoom) && state.zoom > 0) ? state.zoom : 1;
  // The demo needs visible space around the floating panel, including in the
  // narrower in-app browser. The extension keeps its normal viewport allowance.
  const widthAllowance = document.body.classList.contains('demo-mode') ? 0.84 : 0.94;
  const zoom = Math.min(requestedZoom, window.innerWidth * widthAllowance / settings.popupWidth,
    window.innerHeight * 0.86 / settings.popupHeight);
  const renderW = settings.popupWidth * zoom;
  const renderH = settings.popupHeight * zoom;

  // Reflow at the real available width so text and controls keep their size.
  const mobileWidth = Math.min(MOBILE_DESIGN_WIDTH, Math.floor(window.innerWidth * 0.94));

  let styleEl = document.getElementById('dynamic-theme');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-theme';
    document.head.appendChild(styleEl);
  }
  
  styleEl.innerHTML = `
    :root {
      --primary-hue: ${primaryHue};
      --primary-sat: ${primarySat}%;
      --primary-light: ${primaryLight}%;
      --accent2-hue: ${primaryHue};
      --accent2-sat: ${primarySat}%;
      --accent2-light: ${primaryLight}%;
    }
    #editor-scale {
      width: ${settings.popupWidth}px !important;
      height: ${settings.popupHeight}px !important;
      transform: scale(${zoom}) !important;
    }
    #editor-window {
      width: ${renderW}px !important;
      height: ${renderH}px !important;

    }
    #latex-preview { display: ${settings.showLatexBar ? 'flex' : 'none'} !important; }
    #body { gap: ${settings.gapSize}px !important; }
    #category-tabs {
      gap: ${settings.gapSize}px !important;
      padding: 2px 0 4px !important;
      margin: 0 !important;
    }
    #palette { grid-template-columns: repeat(auto-fill, minmax(${settings.symbolGridWidth}px, 1fr)) !important; gap: ${settings.gapSize}px !important; }
    #footer { gap: ${settings.gapSize}px !important; }
    .action-group { gap: ${settings.gapSize}px !important; }
    
    .pal-btn { height: ${settings.symbolHeight}px !important; font-size: ${settings.symbolFontSize}px !important; border-radius: ${settings.borderRadiusBtn}px !important; }
    
    .cat-tab { padding: ${settings.tabPaddingV}px ${settings.tabPaddingH}px !important; font-size: ${settings.tabFontSize}px !important; border-radius: ${settings.borderRadiusTab}px !important; }
    
    .icon, .header-btn, #close-btn, #settings-btn, .matrix-cell { border-radius: ${settings.borderRadiusBtn}px !important; }
    
    .btn {
      padding: ${settings.actionBtnPaddingY}px ${settings.actionBtnPaddingX}px !important;
      font-size: ${settings.actionBtnFontSize}px !important;
      border-radius: ${settings.actionBtnRoundness}px !important;
    }
    
    /* Dynamic Mobile Proportionate Scaling */
    @media (max-width: 600px) {
      body {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
        height: 100vh !important;
        width: 100vw !important;
        overflow: hidden !important;
        padding: 0 !important;
        padding-top: 20px !important;
        margin: 0 !important;
        background: transparent !important;
      }
      /* Lay the content out at the narrow mobile design width, in normal flow, with a
         content-driven height — so the window grows to fit the full symbol palette
         instead of clipping it. (Desktop keeps the absolute/fixed-height zoom layout.) */
      #editor-scale {
        position: static !important;
        transform: none !important;
        width: ${mobileWidth}px !important;
        height: auto !important;
      }
      #editor-window {
        width: ${mobileWidth}px !important;
        height: auto !important;
        flex-shrink: 0 !important;
        max-width: none !important;
        max-height: none !important;
        transform-origin: top center !important;
        transform: none !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6) !important;
        border-radius: 20px !important;
        animation: none !important;
        position: relative !important;
        margin: 0 !important;
      }
      /* Let body & palette flow at their natural height rather than fighting over a
         fixed window height (which previously squeezed the palette to a thin sliver). */
      #body { flex: 0 0 auto !important; overflow: visible !important; }
      #palette-container { flex: 0 0 auto !important; overflow: visible !important; }
      /* The empty math-input box shouldn't dominate the screen on a phone. */
      #mf, math-field { min-height: 60px !important; }
      #drag-hint {
        display: none !important;
      }
    }

    math-field, #mf {
      --caret-color: hsl(${primaryHue}, ${primarySat}%, ${primaryLight}%) !important;
      --selection-background-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.3) !important;
      --contains-highlight-background-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.12) !important;
      --smart-fence-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.5) !important;
    }
  `;
  
  // Update toggle state labels
  const labelLatex = document.getElementById("label-showLatexBar");
  if (labelLatex) labelLatex.classList.toggle("active", !!settings.showLatexBar);
  
  // Make sure the checkboxes match
  const inputLatex = document.getElementById("set-showLatexBar");
  if (inputLatex) inputLatex.checked = !!settings.showLatexBar;

  // Resize immediately when settings change; ResizeObserver handles asynchronous
  // content changes such as MathLive becoming ready or a taller symbol tab opening.
  syncDemoIframeHeight();

  localStorage.setItem('mathpaster_settings', JSON.stringify(settings));
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('mathpaster_settings'));
    if (saved) {
      // Upgrade former defaults, while retaining deliberately customized sizes.
      if ((saved.layoutVersion || 0) < 3 && saved.popupWidth === 760) saved.popupWidth = 610;
      if (!saved.layoutVersion) {
        const formerDefaults = { popupHeight: [550, 590], symbolHeight: [46], tabPaddingV: [10], actionBtnPaddingY: [12] };
        for (const [key, values] of Object.entries(formerDefaults)) {
          if (values.includes(saved[key])) saved[key] = defaultSettings[key];
        }
        saved.layoutVersion = defaultSettings.layoutVersion;
      }
      saved.layoutVersion = defaultSettings.layoutVersion;
      const preset = resolvePreset(saved.themePreset);
      const migration = LEGACY_PRESETS[saved.themePreset] ? preset.shape : {};
      state.currentSettings = { ...defaultSettings, ...saved, ...migration, themePreset: preset.id };
    }
  } catch (e) {}
  try {
    const z = parseFloat(localStorage.getItem('mathpaster_zoom'));
    if (z && isFinite(z) && z > 0) state.zoom = z;
  } catch (e) {}
  applySettings(state.currentSettings);
}

export const settingsKeys = Object.keys(defaultSettings);

/* ── Theme preset picker ── */
const themePresetsEl = document.getElementById('theme-presets');

function renderThemePresets() {
  if (!themePresetsEl) return;
  themePresetsEl.innerHTML = "";
  for (const p of THEME_PRESETS) {
    const locked = !FREE_PRESETS.has(p.id) && !isPro();
    const btn = document.createElement('button');
    btn.className = 'theme-swatch'
      + (p.id === state.currentSettings.themePreset ? ' selected' : '')
      + (locked ? ' locked' : '');
    btn.dataset.preset = p.id;
    btn.title = p.name + (locked ? ' (Pro)' : '');
    btn.setAttribute('aria-label', `${p.name} — ${p.description}${locked ? ' Pro' : ''}`);
    btn.setAttribute('aria-pressed', String(p.id === state.currentSettings.themePreset));
    btn.innerHTML = `
      <span class="swatch-preview preview-${p.id}" aria-hidden="true">
        <span class="mini-toolbar"><i></i><i></i><i></i></span>
        <span class="mini-equation">∫ x² dx</span>
        <span class="mini-keys"><i>π</i><i>√</i><i>∞</i><i>α</i><i>Σ</i></span>
        <span class="mini-footer"><i></i><b>Insert ↵</b></span>
      </span>
      <span class="swatch-heading"><span class="swatch-name">${p.name}</span><span class="swatch-tier">${FREE_PRESETS.has(p.id) ? 'FREE' : 'PRO'}</span></span>
      <span class="swatch-description">${p.description}</span>`;
    btn.addEventListener('mousedown', e => e.preventDefault()); // don't steal focus
    btn.addEventListener('click', () => {
      if (locked) {
        openUpgradeModal(`The “${p.name}” theme is part of MathPaster Pro.`);
        return;
      }
      Object.assign(state.currentSettings, p.shape, { themePreset: p.id });
      applySettings(state.currentSettings);
      renderThemePresets();
    });
    themePresetsEl.appendChild(btn);
  }
}
renderThemePresets();
// Unlock/lock swatches live when a license is activated or removed.
document.addEventListener('mathpaster:license-changed', renderThemePresets);

document.getElementById('settings-btn').addEventListener('click', () => {
  renderThemePresets();
  settingsKeys.forEach(k => {
    const input = document.getElementById('set-' + k);
    const valDisp = document.getElementById('val-' + k);
    if (input) {
      if (input.type === "checkbox") {
        input.checked = state.currentSettings[k];
      } else {
        input.value = state.currentSettings[k];
        if (valDisp) valDisp.textContent = state.currentSettings[k];
      }
    }
  });
  document.getElementById('settings-overlay').classList.add('visible');
});

settingsKeys.forEach(k => {
  const input = document.getElementById('set-' + k);
  const valDisp = document.getElementById('val-' + k);
  if (input) {
    const handleEvent = e => {
      if (input.type === "checkbox") {
        state.currentSettings[k] = e.target.checked;
      } else {
        state.currentSettings[k] = parseInt(e.target.value, 10);
        if (valDisp) valDisp.textContent = state.currentSettings[k];
      }
      applySettings(state.currentSettings);
    };
    input.addEventListener('input', handleEvent);
    if (input.type === "checkbox") {
      input.addEventListener('change', handleEvent);
    }
  }
});

// Relocated settings label click listeners
const labelLatex = document.getElementById("label-showLatexBar");
if (labelLatex) {
  labelLatex.addEventListener("click", () => {
    const input = document.getElementById("set-showLatexBar");
    if (input) {
      input.checked = !input.checked;
      state.currentSettings.showLatexBar = input.checked;
      applySettings(state.currentSettings);
    }
  });
}

document.getElementById('close-settings-btn').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.remove('visible');
});

document.getElementById('reset-settings-btn').addEventListener('click', () => {
  state.currentSettings = { ...defaultSettings };
  state.zoom = 1;
  try { localStorage.removeItem('mathpaster_zoom'); } catch (e) {}
  settingsKeys.forEach(k => {
    const input = document.getElementById('set-' + k);
    const valDisp = document.getElementById('val-' + k);
    if (input) {
      if (input.type === "checkbox") {
        input.checked = state.currentSettings[k];
      } else {
        input.value = state.currentSettings[k];
        if (valDisp) valDisp.textContent = state.currentSettings[k];
      }
    }
  });
  renderThemePresets();
  applySettings(state.currentSettings);
});

// Positioning state & helper to keep window fully visible within the viewport
// (editorWindow comes from dom.js; currentX/Y, baseX/Y live in state.js)
export function loadPosition() {
  try {
    const savedX = localStorage.getItem("mathpaster_pos_x");
    const savedY = localStorage.getItem("mathpaster_pos_y");
    if (savedX !== null) {
      state.currentX = parseFloat(savedX);
      state.baseX = state.currentX;
    }
    if (savedY !== null) {
      state.currentY = parseFloat(savedY);
      state.baseY = state.currentY;
    }
  } catch (e) {}
}

export function clampPositionToBounds() {
  // Narrow layouts flow vertically and do not use desktop drag offsets.
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    state.currentX = state.currentY = state.baseX = state.baseY = 0;
    editorWindow.style.left = '0px';
    editorWindow.style.top = '0px';
    return;
  }

  // Use the rendered (zoomed) size, since that's the window's actual on-screen footprint.
  const zoom = (state.zoom && isFinite(state.zoom) && state.zoom > 0) ? state.zoom : 1;
  const width = state.currentSettings.popupWidth * zoom;
  const height = state.currentSettings.popupHeight * zoom;

  const maxXOffset = Math.max(0, (window.innerWidth - width) / 2);
  state.currentX = Math.max(-maxXOffset, Math.min(state.currentX, maxXOffset));
  state.baseX = state.currentX;
  
  const defaultYBottom = 0.025 * window.innerHeight; // 2.5vh
  const T_default = window.innerHeight - height - defaultYBottom;
  const minYOffset = -T_default;
  const maxYOffset = defaultYBottom;
  state.currentY = Math.max(minYOffset, Math.min(state.currentY, maxYOffset));
  state.baseY = state.currentY;
  
  editorWindow.style.left = `${state.currentX}px`;
  editorWindow.style.top = `${state.currentY}px`;
}
