import { state } from './state.js';
import { editorWindow } from './dom.js';
import { applySettings, clampPositionToBounds } from './settings.js';

/* ── Dragging & Resizing logic ── */
const header = document.getElementById("header");
let isDragging = false;
let isResizing = false;
let resizeHandleType = null;

let startX, startY;
let startMouseX, startMouseY;
let startBaseX, startBaseY;
let startZoom;

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
    startZoom = state.zoom || 1;
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

    const zoom = state.zoom || 1;
    const width = state.currentSettings.popupWidth * zoom;
    const height = state.currentSettings.popupHeight * zoom;

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

    const designW = state.currentSettings.popupWidth;
    const designH = state.currentSettings.popupHeight;

    // Outward sign of the grabbed corner: +1 means dragging that way enlarges the box.
    const sx = (resizeHandleType === "tr" || resizeHandleType === "br") ? 1 : -1;
    const sy = (resizeHandleType === "bl" || resizeHandleType === "br") ? 1 : -1;

    // Aspect-locked uniform zoom: the least-squares scale change that best matches the
    // dragged corner's motion, so width and height always scale together (pure zoom).
    const deltaZoom = (sx * dx * designW + sy * dy * designH) / (designW * designW + designH * designH);
    let newZoom = startZoom + deltaZoom;

    // Clamp: rendered size stays within sane bounds and never larger than the viewport.
    const minZoom = Math.max(380 / designW, 300 / designH);
    let maxZoom = Math.min(1600 / designW, 1200 / designH,
                           (window.innerWidth * 0.98) / designW,
                           (window.innerHeight * 0.95) / designH);
    if (maxZoom < minZoom) maxZoom = minZoom;
    newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));

    // Keep the corner opposite the grabbed one anchored: compensate the flex
    // re-centering in X and the bottom-anchored layout in Y.
    const dwR = (designW * newZoom) - (designW * startZoom);
    const dhR = (designH * newZoom) - (designH * startZoom);
    const newBaseX = (sx > 0) ? startBaseX + dwR / 2 : startBaseX - dwR / 2;
    const newBaseY = (sy > 0) ? startBaseY + dhR : startBaseY;

    state.currentX = newBaseX;
    state.currentY = newBaseY;
    editorWindow.style.left = `${state.currentX}px`;
    editorWindow.style.top = `${state.currentY}px`;

    state.zoom = newZoom;
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
    // Corner-drag changes the uniform zoom (not the design width/height), so persist that.
    localStorage.setItem("mathpaster_zoom", state.zoom);
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
    // If the viewport shrank below the rendered window, zoom out so it still fits.
    const designW = state.currentSettings.popupWidth;
    const designH = state.currentSettings.popupHeight;
    const maxZoom = Math.min((window.innerWidth * 0.98) / designW, (window.innerHeight * 0.95) / designH);
    if ((state.zoom || 1) > maxZoom) {
      state.zoom = Math.max(0.3, maxZoom);
      localStorage.setItem("mathpaster_zoom", state.zoom);
      applySettings(state.currentSettings);
    }
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
