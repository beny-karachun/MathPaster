import { state } from './state.js';
import { editorWindow } from './dom.js';
import { applySettings, clampPositionToBounds, settingsKeys } from './settings.js';

/* ── Dragging & Resizing logic ── */
const header = document.getElementById("header");
let isDragging = false;
let isResizing = false;
let resizeHandleType = null;

let startX, startY;
let startMouseX, startMouseY;
let startWidth, startHeight;
let startBaseX, startBaseY;

// Header drag setup
header.style.cursor = "grab";
header.addEventListener("mousedown", e => {
  if (e.target.closest(".header-btn") || e.target.tagName === "INPUT") return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  header.style.cursor = "grabbing";
});

// Resizer handles setup
document.querySelectorAll(".resize-handle").forEach(handle => {
  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeHandleType = handle.dataset.handle;
    startWidth = state.currentSettings.popupWidth;
    startHeight = state.currentSettings.popupHeight;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startBaseX = state.baseX;
    startBaseY = state.baseY;
    
    const handleCursor = window.getComputedStyle(handle).cursor;
    document.body.style.cursor = handleCursor;
  });
});

/* ── Keyboard Window State & Events ── */
const kbdWindow = document.getElementById("keyboard-window");
const kbdHeader = document.getElementById("keyboard-header");

let kbdDragging = false;
let kbdResizing = false;
let kbdResizeHandle = null;

let kbdStartX, kbdStartY;
let kbdStartMouseX, kbdStartMouseY;
let kbdStartWidth, kbdStartHeight;
let kbdStartLeft, kbdStartTop;

let kbdLeft = 0, kbdTop = 0;

function updateKeyboardKeycapHeight() {
  if (!kbdWindow || kbdWindow.style.display === "none") return;
  const H = kbdWindow.offsetHeight;
  const headerEl = document.getElementById("keyboard-header");
  const headerHeight = headerEl ? headerEl.offsetHeight : 34;
  const containerHeight = H - headerHeight;
  
  // base height: 34px at containerHeight: 246px
  // formula: keycapHeight = (containerHeight - 110) / 4
  let keycapHeight = (containerHeight - 110) / 4;
  if (keycapHeight < 24) keycapHeight = 24;
  
  kbdWindow.style.setProperty("--kbd-keycap-height", `${keycapHeight}px`);
}

function clampKeyboardPosition() {
  const width = parseFloat(kbdWindow.style.width) || 680;
  const height = parseFloat(kbdWindow.style.height) || 280;
  
  kbdLeft = Math.max(0, Math.min(kbdLeft, window.innerWidth - width));
  kbdTop = Math.max(0, Math.min(kbdTop, window.innerHeight - height));
  
  kbdWindow.style.left = `${kbdLeft}px`;
  kbdWindow.style.top = `${kbdTop}px`;
}

function positionKeyboardDefault() {
  const editorRect = editorWindow.getBoundingClientRect();
  const kbdWidth = parseFloat(localStorage.getItem("mathpaster_kbd_width")) || 680;
  const kbdHeight = parseFloat(localStorage.getItem("mathpaster_kbd_height")) || 280;
  
  const savedLeft = localStorage.getItem("mathpaster_kbd_left");
  const savedTop = localStorage.getItem("mathpaster_kbd_top");
  
  if (savedLeft !== null && savedTop !== null) {
    kbdLeft = parseFloat(savedLeft);
    kbdTop = parseFloat(savedTop);
  } else {
    kbdLeft = Math.max(10, (window.innerWidth - kbdWidth) / 2);
    kbdTop = Math.max(10, editorRect.top - kbdHeight - 20);
  }
  
  kbdWindow.style.width = `${kbdWidth}px`;
  kbdWindow.style.height = `${kbdHeight}px`;
  kbdWindow.style.left = `${kbdLeft}px`;
  kbdWindow.style.top = `${kbdTop}px`;
  updateKeyboardKeycapHeight();
}

// Keyboard Header Drag setup
kbdHeader.style.cursor = "grab";
kbdHeader.addEventListener("mousedown", e => {
  if (e.target.closest(".header-btn")) return;
  kbdDragging = true;
  kbdStartX = e.clientX;
  kbdStartY = e.clientY;
  kbdStartLeft = kbdLeft;
  kbdStartTop = kbdTop;
  kbdHeader.style.cursor = "grabbing";
});

// Keyboard Resize handles setup
document.querySelectorAll(".kbd-resize-handle").forEach(handle => {
  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    e.stopPropagation();
    kbdResizing = true;
    kbdResizeHandle = handle.dataset.handle;
    kbdStartWidth = parseFloat(kbdWindow.style.width) || 680;
    kbdStartHeight = parseFloat(kbdWindow.style.height) || 280;
    kbdStartLeft = kbdLeft;
    kbdStartTop = kbdTop;
    kbdStartMouseX = e.clientX;
    kbdStartMouseY = e.clientY;
    
    const handleCursor = window.getComputedStyle(handle).cursor;
    document.body.style.cursor = handleCursor;
  });
});

// Keyboard close button setup
document.getElementById("close-keyboard-btn").addEventListener("click", () => {
  if (window.mathVirtualKeyboard) {
    window.mathVirtualKeyboard.hide();
  }
});

// Virtual keyboard show/hide event listener
if (window.mathVirtualKeyboard) {
  window.mathVirtualKeyboard.addEventListener("virtual-keyboard-toggle", () => {
    if (window.mathVirtualKeyboard.visible) {
      kbdWindow.style.display = "flex";
      if (!kbdWindow.style.left) {
        positionKeyboardDefault();
      } else {
        updateKeyboardKeycapHeight();
      }
    } else {
      kbdWindow.style.display = "none";
    }
  });
}

document.addEventListener("mousemove", e => {
  if (isDragging) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let proposedX = state.baseX + dx;
    let proposedY = state.baseY + dy;
    
    const width = state.currentSettings.popupWidth;
    const height = state.currentSettings.popupHeight;
    
    const maxXOffset = Math.max(0, (window.innerWidth - width) / 2);
    proposedX = Math.max(-maxXOffset, Math.min(proposedX, maxXOffset));
    
    const defaultYBottom = 0.025 * window.innerHeight;
    const T_default = window.innerHeight - height - defaultYBottom;
    const minYOffset = -T_default;
    const maxYOffset = defaultYBottom;
    proposedY = Math.max(minYOffset, Math.min(proposedY, maxYOffset));
    
    state.currentX = proposedX;
    state.currentY = proposedY;
    editorWindow.style.left = `${state.currentX}px`;
    editorWindow.style.top = `${state.currentY}px`;
  } else if (isResizing) {
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    if (resizeHandleType === "tl" || resizeHandleType === "bl") {
      newWidth = startWidth - dx;
    } else if (resizeHandleType === "tr" || resizeHandleType === "br") {
      newWidth = startWidth + dx;
    }
    
    if (resizeHandleType === "tl" || resizeHandleType === "tr") {
      newHeight = startHeight - dy;
    } else if (resizeHandleType === "bl" || resizeHandleType === "br") {
      newHeight = startHeight + dy;
    }
    
    const minWidth = 400;
    const minHeight = 300;
    if (newWidth < minWidth) newWidth = minWidth;
    if (newHeight < minHeight) newHeight = minHeight;
    
    const startLeft = (window.innerWidth - startWidth) / 2 + startBaseX;
    const startRight = startLeft + startWidth;
    
    const defaultYBottom = 0.025 * window.innerHeight;
    const T_default = window.innerHeight - startHeight - defaultYBottom;
    const startTop = T_default + startBaseY;
    const startBottom = startTop + startHeight;
    
    if (resizeHandleType === "tr" || resizeHandleType === "br") {
      newWidth = Math.min(newWidth, Math.max(minWidth, window.innerWidth - startLeft));
    } else {
      newWidth = Math.min(newWidth, Math.max(minWidth, startRight));
    }
    
    if (resizeHandleType === "tl" || resizeHandleType === "tr") {
      newHeight = Math.min(newHeight, Math.max(minHeight, startBottom));
    } else {
      newHeight = Math.min(newHeight, Math.max(minHeight, window.innerHeight - startTop));
    }
    
    if (newWidth > 1600) newWidth = 1600;
    if (newHeight > 1200) newHeight = 1200;
    
    const dw = newWidth - startWidth;
    let newBaseX = startBaseX;
    if (resizeHandleType === "tr" || resizeHandleType === "br") {
      newBaseX = startBaseX + dw / 2;
    } else {
      newBaseX = startBaseX - dw / 2;
    }
    
    let newBaseY = startBaseY;
    if (resizeHandleType === "bl" || resizeHandleType === "br") {
      newBaseY = startBaseY + (newHeight - startHeight);
    }
    
    state.currentX = newBaseX;
    state.currentY = newBaseY;
    editorWindow.style.left = `${state.currentX}px`;
    editorWindow.style.top = `${state.currentY}px`;
    
    state.currentSettings.popupWidth = newWidth;
    state.currentSettings.popupHeight = newHeight;
    applySettings(state.currentSettings);
  } else if (kbdDragging) {
    const dx = e.clientX - kbdStartX;
    const dy = e.clientY - kbdStartY;
    kbdLeft = kbdStartLeft + dx;
    kbdTop = kbdStartTop + dy;
    clampKeyboardPosition();
  } else if (kbdResizing) {
    const dx = e.clientX - kbdStartMouseX;
    const dy = e.clientY - kbdStartMouseY;
    
    let newWidth = kbdStartWidth;
    let newHeight = kbdStartHeight;
    let newLeft = kbdStartLeft;
    let newTop = kbdStartTop;
    
    if (kbdResizeHandle === "tl" || kbdResizeHandle === "bl") {
      newWidth = kbdStartWidth - dx;
    } else {
      newWidth = kbdStartWidth + dx;
    }
    
    if (kbdResizeHandle === "tl" || kbdResizeHandle === "tr") {
      newHeight = kbdStartHeight - dy;
    } else {
      newHeight = kbdStartHeight + dy;
    }
    
    const minWidth = 400;
    const minHeight = 200;
    
    if (kbdResizeHandle === "tl" || kbdResizeHandle === "bl") {
      const maxLeftWidth = kbdStartLeft + kbdStartWidth;
      newWidth = Math.min(newWidth, maxLeftWidth);
      if (newWidth < minWidth) newWidth = minWidth;
      newLeft = kbdStartLeft + (kbdStartWidth - newWidth);
    } else {
      newWidth = Math.min(newWidth, window.innerWidth - kbdStartLeft);
      if (newWidth < minWidth) newWidth = minWidth;
    }
    
    if (kbdResizeHandle === "tl" || kbdResizeHandle === "tr") {
      const maxTopHeight = kbdStartTop + kbdStartHeight;
      newHeight = Math.min(newHeight, maxTopHeight);
      if (newHeight < minHeight) newHeight = minHeight;
      newTop = kbdStartTop + (kbdStartHeight - newHeight);
    } else {
      newHeight = Math.min(newHeight, window.innerHeight - kbdStartTop);
      if (newHeight < minHeight) newHeight = minHeight;
    }
    
    kbdLeft = newLeft;
    kbdTop = newTop;
    kbdWindow.style.width = `${newWidth}px`;
    kbdWindow.style.height = `${newHeight}px`;
    kbdWindow.style.left = `${kbdLeft}px`;
    kbdWindow.style.top = `${kbdTop}px`;
    
    updateKeyboardKeycapHeight();
  }
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    header.style.cursor = "grab";
    state.baseX = state.currentX;
    state.baseY = state.currentY;
    localStorage.setItem("mathpaster_pos_x", state.baseX);
    localStorage.setItem("mathpaster_pos_y", state.baseY);
  } else if (isResizing) {
    isResizing = false;
    document.body.style.cursor = "";
    state.baseX = state.currentX;
    state.baseY = state.currentY;
    localStorage.setItem("mathpaster_pos_x", state.baseX);
    localStorage.setItem("mathpaster_pos_y", state.baseY);
    
    localStorage.setItem('mathpaster_settings', JSON.stringify(state.currentSettings));
    
    settingsKeys.forEach(k => {
      const input = document.getElementById('set-' + k);
      const valDisp = document.getElementById('val-' + k);
      if (input && (k === 'popupWidth' || k === 'popupHeight')) {
        input.value = state.currentSettings[k];
        if (valDisp) valDisp.textContent = state.currentSettings[k];
      }
    });
  } else if (kbdDragging) {
    kbdDragging = false;
    kbdHeader.style.cursor = "grab";
    localStorage.setItem("mathpaster_kbd_left", kbdLeft);
    localStorage.setItem("mathpaster_kbd_top", kbdTop);
  } else if (kbdResizing) {
    kbdResizing = false;
    document.body.style.cursor = "";
    localStorage.setItem("mathpaster_kbd_left", kbdLeft);
    localStorage.setItem("mathpaster_kbd_top", kbdTop);
    const kbdWidth = parseFloat(kbdWindow.style.width) || 680;
    const kbdHeight = parseFloat(kbdWindow.style.height) || 280;
    localStorage.setItem("mathpaster_kbd_width", kbdWidth);
    localStorage.setItem("mathpaster_kbd_height", kbdHeight);
  }
});

// Re-apply scaled settings or clamp positions on window resize
window.addEventListener("resize", () => {
  if (window.innerWidth <= 600) {
    applySettings(state.currentSettings);
  } else {
    clampPositionToBounds();
    if (kbdWindow.style.display !== "none") {
      clampKeyboardPosition();
    }
  }
});

// Prevent viewport scroll shifting when focusing inputs or opening the virtual keyboard
window.addEventListener("scroll", () => {
  window.scrollTo(0, 0);
});
