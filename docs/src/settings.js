import { state } from './state.js';
import { editorWindow } from './dom.js';

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
  primaryHue: 250,
  primarySat: 80,
  primaryLight: 65,
  bgHue: 236,
  bgSat: 30,
  bgLight: 12,
  showLatexBar: false,
  blurBackground: false
};

state.currentSettings = { ...defaultSettings };

export function applySettings(settings) {
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
      --primary-hue: ${settings.primaryHue};
      --primary-sat: ${settings.primarySat}%;
      --primary-light: ${settings.primaryLight}%;
    }
    #editor-window {
      width: ${settings.popupWidth}px !important;
      height: ${settings.popupHeight}px !important;
      background: linear-gradient(145deg, 
        hsl(${settings.bgHue}, ${settings.bgSat}%, ${settings.bgLight + 6}%) 0%, 
        hsl(${settings.bgHue}, ${settings.bgSat}%, ${settings.bgLight}%) 50%, 
        hsl(${settings.bgHue}, ${settings.bgSat}%, ${Math.max(0, settings.bgLight - 5)}%) 100%) !important;
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
      background: linear-gradient(135deg, hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.8) 0%, hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%, 0.8) 100%) !important;
      border-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight + 10}%) !important;
      box-shadow: 0 0 24px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 5)}%, 0.5), inset 0 2px 4px rgba(255,255,255,0.3) !important;
    }
    
    .btn.primary {
      background: linear-gradient(135deg, hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%) 0%, hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 20)}%) 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%, 0.5) !important;
    }
    .btn.primary:hover {
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 20px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%, 0.6) !important;
    }
    
    .btn.secondary {
      color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.min(100, settings.primaryLight + 20)}%) !important;
      background: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.1) !important;
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
    }
    
    .icon {
      background: linear-gradient(135deg, hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.15) 0%, hsla(${settings.primaryHue}, ${settings.primarySat}%, ${Math.max(0, settings.primaryLight - 10)}%, 0.15) 100%) !important;
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.2) !important;
    }
    
    #latex-preview {
      border-left-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%) !important;
    }
    
    .matrix-selector-btn {
      background: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.1) !important;
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.2) !important;
    }
    .icon svg { stroke: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.min(100, settings.primaryLight + 15)}%) !important; }
    
    #mf-wrap:focus-within {
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.5) !important;
      box-shadow: 0 0 0 3px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.12), 0 4px 16px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.08) !important;
    }
    .matrix-cell.highlight {
      background: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.6) !important;
      border-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%) !important;
    }
    .switch input:checked + .slider {
      background-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.2) !important;
      border-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.4) !important;
    }
    .switch input:checked + .slider:before {
      background-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%) !important;
    }
    .mode-label.active {
      color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${Math.min(100, settings.primaryLight + 20)}%) !important;
      text-shadow: 0 0 8px hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
    }
    math-field, #mf {
      --caret-color: hsl(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%) !important;
      --selection-background-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.3) !important;
      --contains-highlight-background-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.12) !important;
      --smart-fence-color: hsla(${settings.primaryHue}, ${settings.primarySat}%, ${settings.primaryLight}%, 0.5) !important;
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

document.getElementById('settings-btn').addEventListener('click', () => {
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
