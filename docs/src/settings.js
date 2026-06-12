import { state } from './state.js';
import { editorWindow } from './dom.js';
import { isPro, openUpgradeModal } from './license.js';

/* ── Theme presets (curated; replaces raw HSL customization) ── */
// 10 hand-tuned themes (6 dark + 4 light). Each drives the accent (primary) and the
// editor-window background (bg); `mode:'light'` additionally toggles body.theme-light.
const THEME_PRESETS = [
  // Dark
  { id: 'indigo-night',   name: 'Indigo Night', mode: 'dark',  primary: { h: 250, s: 80, l: 65 }, bg: { h: 236, s: 30, l: 12 } },
  { id: 'anthropic',      name: 'Anthropic',    mode: 'dark',  primary: { h: 16,  s: 60, l: 60 }, bg: { h: 25,  s: 12, l: 11 } },
  { id: 'emerald',        name: 'Emerald',      mode: 'dark',  primary: { h: 158, s: 64, l: 46 }, bg: { h: 200, s: 18, l: 10 } },
  { id: 'crimson',        name: 'Crimson',      mode: 'dark',  primary: { h: 350, s: 72, l: 60 }, bg: { h: 345, s: 18, l: 10 } },
  { id: 'amber',          name: 'Amber',        mode: 'dark',  primary: { h: 38,  s: 92, l: 58 }, bg: { h: 30,  s: 14, l: 10 } },
  { id: 'teal',           name: 'Teal',         mode: 'dark',  primary: { h: 187, s: 72, l: 50 }, bg: { h: 200, s: 28, l: 10 } },
  // Light
  { id: 'anthropic-light',name: 'Anthropic Light', mode: 'light', primary: { h: 16,  s: 55, l: 50 }, bg: { h: 40,  s: 30, l: 96 } },
  { id: 'daylight',       name: 'Daylight',     mode: 'light', primary: { h: 245, s: 68, l: 58 }, bg: { h: 230, s: 30, l: 97 } },
  { id: 'mint',           name: 'Mint',         mode: 'light', primary: { h: 160, s: 55, l: 40 }, bg: { h: 150, s: 25, l: 97 } },
  { id: 'sandstone',      name: 'Sandstone',    mode: 'light', primary: { h: 28,  s: 52, l: 48 }, bg: { h: 36,  s: 30, l: 95 } },
];
const DEFAULT_PRESET = 'indigo-night';
// One dark + one light theme stay free; the rest are part of Pro.
const FREE_PRESETS = new Set(['indigo-night', 'daylight']);

function resolvePreset(id) {
  return THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
}

/* ── Settings Logic ── */
const defaultSettings = {
  popupWidth: 760,
  popupHeight: 550,
  gapSize: 8,
  symbolGridWidth: 52,
  symbolHeight: 46,
  symbolFontSize: 22,
  borderRadiusBtn: 11,
  tabPaddingH: 19,
  tabPaddingV: 10,
  tabFontSize: 12,
  borderRadiusTab: 30,
  actionBtnPaddingX: 28,
  actionBtnPaddingY: 12,
  actionBtnFontSize: 16,
  actionBtnRoundness: 14,
  themePreset: DEFAULT_PRESET,
  showLatexBar: false,
  blurBackground: false
};

state.currentSettings = { ...defaultSettings };

export function applySettings(settings) {
  // Resolve the chosen preset into accent (primary*) + background (bg*) HSL,
  // and switch the whole UI to light mode when the preset calls for it.
  const preset = resolvePreset(settings.themePreset);
  const primaryHue = preset.primary.h, primarySat = preset.primary.s, primaryLight = preset.primary.l;
  const bgHue = preset.bg.h, bgSat = preset.bg.s, bgLight = preset.bg.l;
  document.body.classList.toggle('theme-light', preset.mode === 'light');

  let scaleFactor = Math.min((window.innerWidth * 0.94) / settings.popupWidth, (window.innerHeight * 0.90) / settings.popupHeight);
  
  if (window.innerWidth <= 600 && window.frameElement) {
    scaleFactor = (window.innerWidth * 0.94) / settings.popupWidth;
    const scaledHeight = settings.popupHeight * scaleFactor;
    window.frameElement.style.setProperty('height', (scaledHeight + 40) + 'px', 'important');
  }

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
    }
    #editor-window {
      width: ${settings.popupWidth}px !important;
      height: ${settings.popupHeight}px !important;
      background: linear-gradient(145deg, 
        hsl(${bgHue}, ${bgSat}%, ${bgLight + 6}%) 0%, 
        hsl(${bgHue}, ${bgSat}%, ${bgLight}%) 50%, 
        hsl(${bgHue}, ${bgSat}%, ${Math.max(0, bgLight - 5)}%) 100%) !important;
    }
    #latex-preview { display: ${settings.showLatexBar ? 'flex' : 'none'} !important; }
    #body { gap: ${settings.gapSize}px !important; }
    #category-tabs {
      gap: ${settings.gapSize}px !important;
      padding: 20px 24px 10px 24px !important;
      margin: -20px -24px 0 -24px !important;
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
      #editor-window {
        width: ${settings.popupWidth}px !important;
        height: ${settings.popupHeight}px !important;
        max-width: none !important;
        max-height: none !important;
        transform-origin: top center !important;
        transform: scale(${scaleFactor}) !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6) !important;
        border-radius: 20px !important;
        animation: none !important;
        position: relative !important;
        margin: 0 !important;
      }
      #drag-hint {
        display: none !important;
      }
    }

    .cat-tab.active {
      background: linear-gradient(135deg, hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.8) 0%, hsla(${primaryHue}, ${primarySat}%, ${Math.max(0, primaryLight - 10)}%, 0.8) 100%) !important;
      border-color: hsl(${primaryHue}, ${primarySat}%, ${primaryLight + 10}%) !important;
      box-shadow: 0 0 24px hsla(${primaryHue}, ${primarySat}%, ${Math.max(0, primaryLight - 5)}%, 0.5), inset 0 2px 4px rgba(255,255,255,0.3) !important;
    }
    
    .btn.primary {
      background: linear-gradient(135deg, hsl(${primaryHue}, ${primarySat}%, ${Math.max(0, primaryLight - 10)}%) 0%, hsl(${primaryHue}, ${primarySat}%, ${Math.max(0, primaryLight - 20)}%) 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px hsla(${primaryHue}, ${primarySat}%, ${Math.max(0, primaryLight - 10)}%, 0.5) !important;
    }
    .btn.primary:hover {
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 20px hsla(${primaryHue}, ${primarySat}%, ${Math.max(0, primaryLight - 10)}%, 0.6) !important;
    }
    
    .btn.secondary {
      color: hsl(${primaryHue}, ${primarySat}%, ${Math.min(100, primaryLight + 20)}%) !important;
      background: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.1) !important;
      border-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.3) !important;
    }
    
    .icon {
      background: linear-gradient(135deg, hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.15) 0%, hsla(${primaryHue}, ${primarySat}%, ${Math.max(0, primaryLight - 10)}%, 0.15) 100%) !important;
      border-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.3) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.2) !important;
    }
    
    #latex-preview {
      border-left-color: hsl(${primaryHue}, ${primarySat}%, ${primaryLight}%) !important;
    }
    
    .matrix-selector-btn {
      background: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.1) !important;
      border-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.3) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.2) !important;
    }
    .icon svg { stroke: hsl(${primaryHue}, ${primarySat}%, ${Math.min(100, primaryLight + 15)}%) !important; }
    
    #mf-wrap:focus-within {
      border-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.5) !important;
      box-shadow: 0 0 0 3px hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.12), 0 4px 16px hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.08) !important;
    }
    .matrix-cell.highlight {
      background: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.6) !important;
      border-color: hsl(${primaryHue}, ${primarySat}%, ${primaryLight}%) !important;
    }
    .switch input:checked + .slider {
      background-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.2) !important;
      border-color: hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.4) !important;
    }
    .switch input:checked + .slider:before {
      background-color: hsl(${primaryHue}, ${primarySat}%, ${primaryLight}%) !important;
    }
    .mode-label.active {
      color: hsl(${primaryHue}, ${primarySat}%, ${Math.min(100, primaryLight + 20)}%) !important;
      text-shadow: 0 0 8px hsla(${primaryHue}, ${primarySat}%, ${primaryLight}%, 0.3) !important;
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
  const labelBlur = document.getElementById("label-blurBackground");
  if (labelBlur) labelBlur.classList.toggle("active", !!settings.blurBackground);
  
  // Make sure the checkboxes match
  const inputLatex = document.getElementById("set-showLatexBar");
  if (inputLatex) inputLatex.checked = !!settings.showLatexBar;
  const inputBlur = document.getElementById("set-blurBackground");
  if (inputBlur) inputBlur.checked = !!settings.blurBackground;

  window.parent.postMessage({ mathpaster: "update-blur", blur: settings.blurBackground }, "*");
  localStorage.setItem('mathpaster_settings', JSON.stringify(settings));
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('mathpaster_settings'));
    if (saved) state.currentSettings = { ...defaultSettings, ...saved };
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
    const bg = `hsl(${p.bg.h}, ${p.bg.s}%, ${p.bg.l}%)`;
    const bgEdge = `hsl(${p.bg.h}, ${p.bg.s}%, ${Math.max(0, p.bg.l - 5)}%)`;
    const accent = `hsl(${p.primary.h}, ${p.primary.s}%, ${p.primary.l}%)`;
    btn.innerHTML =
      `<span class="swatch-preview" style="background:linear-gradient(145deg, ${bg}, ${bgEdge})">` +
        `<span class="swatch-dot" style="background:${accent}"></span>` +
        (locked ? `<span class="swatch-lock">PRO</span>` : ``) +
      `</span>` +
      `<span class="swatch-name">${p.name}</span>`;
    btn.addEventListener('mousedown', e => e.preventDefault()); // don't steal focus
    btn.addEventListener('click', () => {
      if (locked) {
        openUpgradeModal(`The “${p.name}” theme is part of MathPaster Pro.`);
        return;
      }
      state.currentSettings.themePreset = p.id;
      applySettings(state.currentSettings);
      themePresetsEl.querySelectorAll('.theme-swatch').forEach(s =>
        s.classList.toggle('selected', s.dataset.preset === p.id));
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
const labelBlur = document.getElementById("label-blurBackground");
if (labelBlur) {
  labelBlur.addEventListener("click", () => {
    const input = document.getElementById("set-blurBackground");
    if (input) {
      input.checked = !input.checked;
      state.currentSettings.blurBackground = input.checked;
      applySettings(state.currentSettings);
    }
  });
}

document.getElementById('close-settings-btn').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.remove('visible');
});

document.getElementById('reset-settings-btn').addEventListener('click', () => {
  state.currentSettings = { ...defaultSettings };
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
  const width = state.currentSettings.popupWidth;
  const height = state.currentSettings.popupHeight;
  
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
