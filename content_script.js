// content_script.js

let activeInput = null;
let editorIcon = null;
let editorIframe = null;
// Border resize handles are managed by functions below
let originalSelectionDetails = null;
let latexToLoadForEditor = null;
let extensionGloballyEnabled = true;

const EDIT_ICON_URL = chrome.runtime.getURL('icons/edit_icon.png');
const ENTER_ICON_URL = chrome.runtime.getURL('icons/enter_icon.png');
const EDITOR_IFRAME_URL = chrome.runtime.getURL('editor/editor.html');

const ICON_ID = 'visual-math-input-icon-element';
const IFRAME_ID = 'visual-math-editor-iframe';

const DEFAULT_IFRAME_WIDTH = 800;
const DEFAULT_IFRAME_HEIGHT = 300;
const IFRAME_TITLE_BAR_HEIGHT = 35; // Height of the draggable title bar area in editor.html
const BORDER_DRAG_THICKNESS = 8; 
const SCREEN_MARGIN = 20; // Margin from screen edges for default position (px)


let isDragging = false;
let isResizing = false;
let currentResizeEdge = null; 
let iframeStartX, iframeStartY, mouseStartX, mouseStartY;
let iframeStartWidth, iframeStartHeight;

let isIframeMinimized = false;
let preMinimizeDimensions = { width: 0, height: 0, top: '', left: '' };
let resizeHandles = {}; // Object to store border resize handle elements

// --- Initialization and State Management ---
chrome.storage.local.get(['extensionEnabled'], (result) => {
    extensionGloballyEnabled = result.extensionEnabled === undefined ? true : result.extensionEnabled;
    // console.log("Visual Math Input: Initial enabled state:", extensionGloballyEnabled);
    if (extensionGloballyEnabled) initializeWhenEnabled();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'vmiExtensionStateChanged') {
        const oldState = extensionGloballyEnabled;
        extensionGloballyEnabled = request.enabled;
        // console.log("Visual Math Input: State changed via popup to:", extensionGloballyEnabled);
        if (oldState !== extensionGloballyEnabled) {
            if (extensionGloballyEnabled) initializeWhenEnabled(); else deactivateExtension();
        }
    }
    return true; 
});

function initializeWhenEnabled() {
    // console.log("Visual Math Input: Initializing features.");
    scanForInputs(document.body);
    try {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable'] });
    } catch (e) { /* console.warn("Visual Math Input: Observer error on init.", e); */ }
    window.removeEventListener('message', handleEditorMessage); 
    window.addEventListener('message', handleEditorMessage);
    document.removeEventListener('keydown', handleGlobalKeyDown, true); 
    document.addEventListener('keydown', handleGlobalKeyDown, true);
}

function deactivateExtension() {
    // console.log("Visual Math Input: Deactivating features.");
    observer.disconnect();
    if (editorIcon) { editorIcon.remove(); editorIcon = null; }
    if (editorIframe) closeEditorIframe(); 
    removeBorderResizeHandles(); 
    window.removeEventListener('message', handleEditorMessage);
    document.removeEventListener('keydown', handleGlobalKeyDown, true);
}

// --- Icon Management ---
function createEditorIcon() {
    let icon = document.getElementById(ICON_ID);
    if (icon) {
        if (!icon.querySelector('img')) {
            icon.innerHTML = ''; const img = document.createElement('img'); icon.appendChild(img);
        }
        return icon;
    }
    icon = document.createElement('div'); icon.id = ICON_ID; icon.className = 'visual-math-input-icon';
    const img = document.createElement('img'); icon.appendChild(img);
    if (document.body) document.body.appendChild(icon);
    else document.addEventListener('DOMContentLoaded', function onBodyReady(){ if(document.body && !document.getElementById(ICON_ID)) document.body.appendChild(icon); document.removeEventListener('DOMContentLoaded', onBodyReady);});
    icon.addEventListener('mousedown', (e) => e.preventDefault());
    icon.addEventListener('click', onEditorIconClick);
    return icon;
}
function positionIcon(inputElement) {
    if (!editorIcon) editorIcon = createEditorIcon();
    if (!editorIcon || !inputElement || !extensionGloballyEnabled) return;
    const inputRect = inputElement.getBoundingClientRect(); const iconSize = 22;
    let iconTop = inputRect.top + window.scrollY + (inputRect.height - iconSize) / 2;
    let iconLeft = inputRect.right + window.scrollX - (iconSize + 5);
    if (inputElement.tagName === 'TEXTAREA' || inputElement.isContentEditable) {
        iconTop = inputRect.top + window.scrollY + 5; iconLeft = inputRect.right + window.scrollX - (iconSize + 5);
    }
    editorIcon.style.top = `${Math.max(iconTop, window.scrollY)}px`; editorIcon.style.left = `${Math.max(iconLeft, window.scrollX)}px`;
    editorIcon.style.display = 'block';
}
function hideIcon() { if (editorIcon) editorIcon.style.display = 'none'; }
function updateIconImage(iconUrl) {
    if (!editorIcon) editorIcon = createEditorIcon();
    if (!editorIcon) return;
    const imgElement = editorIcon.querySelector('img');
    if (imgElement) imgElement.src = iconUrl;
    else { const newImg = document.createElement('img'); newImg.src = iconUrl; editorIcon.innerHTML = ''; editorIcon.appendChild(newImg); }
}

// --- Event Handlers for Inputs ---
function onFocusInput(event) {
    if (!extensionGloballyEnabled) return;
    const target = event.target;
    if (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'search' || target.type === 'url' || target.type === 'tel' || target.type === 'email' || target.type === 'password' || !target.type)) {}
    else if (target.tagName !== 'TEXTAREA' && !target.isContentEditable) return;
    activeInput = target;
    if (!editorIcon || !document.body.contains(editorIcon)) editorIcon = createEditorIcon(); 
    if (!editorIcon) { console.error("VMI: editorIcon could not be created/retrieved onFocusInput."); return; }
    if (!editorIframe) updateIconImage(EDIT_ICON_URL);
    positionIcon(activeInput);
}
function onBlurInput(event) {
    if (!extensionGloballyEnabled) return;
    setTimeout(() => {
        const activeElement = document.activeElement;
        const isFocusInsideEditor = editorIframe && (activeElement === editorIframe || editorIframe.contains(activeElement));
        const isFocusOnIcon = editorIcon && editorIcon.querySelector('img') && (activeElement === editorIcon || editorIcon.contains(activeElement));
        let isFocusOnBorderHandle = false;
        if(Object.keys(resizeHandles).length > 0){ Object.values(resizeHandles).forEach(handle => { if(handle && activeElement === handle) isFocusOnBorderHandle = true; }); }
        if (!isFocusInsideEditor && !isFocusOnIcon && !isFocusOnBorderHandle && !editorIframe) hideIcon();
    }, 150);
}

// --- Editor Iframe Management ---
function onEditorIconClick() {
    if (!activeInput || !extensionGloballyEnabled || !editorIcon) {
        if (!editorIcon && activeInput) { onFocusInput({target: activeInput}); if(!editorIcon) return; } 
        else if (!editorIcon) return; 
    }
    if (editorIframe) {
        if (isIframeMinimized) {
            restoreEditorWindow();
            if(editorIframe.contentWindow) editorIframe.contentWindow.postMessage({ type: 'editorRestored' }, '*');
        } else {
            if(editorIframe.contentWindow) editorIframe.contentWindow.postMessage({ type: 'requestLaTeX' }, '*');
        }
    } else {
        updateIconImage(ENTER_ICON_URL);
        originalSelectionDetails = window.cursorUtils.getSelectionDetails(activeInput);
        const selectedText = originalSelectionDetails.text;
        latexToLoadForEditor = null;
        if (selectedText.startsWith('$') && selectedText.endsWith('$') && selectedText.length > 4) {
            latexToLoadForEditor = selectedText.substring(1, selectedText.length - 1);
        }
        openEditorIframe(latexToLoadForEditor);
    }
}

function openEditorIframe(initialLatex) {
    if (editorIframe || !extensionGloballyEnabled) return;
    isIframeMinimized = false; 
    editorIframe = document.createElement('iframe');
    editorIframe.id = IFRAME_ID; editorIframe.src = EDITOR_IFRAME_URL;

    // --- MODIFIED: Default position to top-right of viewport ---
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight; // clientHeight might be better if scrollbars are an issue

    let iframeTop = window.scrollY + SCREEN_MARGIN;
    let iframeLeft = window.scrollX + viewportWidth - DEFAULT_IFRAME_WIDTH - SCREEN_MARGIN;

    // Ensure it's not off-screen if viewport is too small (though less likely with fixed position)
    iframeLeft = Math.max(window.scrollX + SCREEN_MARGIN, iframeLeft); 
    iframeTop = Math.max(window.scrollY + SCREEN_MARGIN, iframeTop); 
    // --- END MODIFICATION ---
    
    editorIframe.style.width = `${DEFAULT_IFRAME_WIDTH}px`; 
    editorIframe.style.height = `${DEFAULT_IFRAME_HEIGHT}px`;
    editorIframe.style.top = `${iframeTop}px`; 
    editorIframe.style.left = `${iframeLeft}px`;
    
    document.body.appendChild(editorIframe);
    editorIframe.addEventListener('mousedown', onIframeMouseDown); // For dragging title bar
    editorIframe.addEventListener('dblclick', onIframeDoubleClick); // For minimize/restore by title bar
    createBorderResizeHandles(); 
    positionBorderResizeHandles();
}

function closeEditorIframe() {
    if (editorIframe) {
        editorIframe.removeEventListener('mousedown', onIframeMouseDown);
        editorIframe.removeEventListener('dblclick', onIframeDoubleClick);
        editorIframe.remove(); editorIframe = null;
    }
    removeBorderResizeHandles(); 
    if (editorIcon) {
        updateIconImage(EDIT_ICON_URL);
        if (document.activeElement === activeInput) positionIcon(activeInput); else hideIcon();
    }
    latexToLoadForEditor = null; originalSelectionDetails = null; isIframeMinimized = false;
}

// --- Minimize/Restore by Double Click ---
function onIframeDoubleClick(e) {
    if (e.target !== editorIframe || isResizing || isDragging) return; 
    const iframeRect = editorIframe.getBoundingClientRect();
    const clickYRelativeToIframeTop = e.clientY - iframeRect.top;
    if (clickYRelativeToIframeTop >= 0 && clickYRelativeToIframeTop <= IFRAME_TITLE_BAR_HEIGHT) {
        if (isIframeMinimized) restoreEditorWindow(); else minimizeEditorWindow();
        e.preventDefault();
    }
}
function minimizeEditorWindow() {
    if (!editorIframe || isIframeMinimized) return;
    preMinimizeDimensions.width = editorIframe.offsetWidth; preMinimizeDimensions.height = editorIframe.offsetHeight;
    preMinimizeDimensions.top = editorIframe.style.top; preMinimizeDimensions.left = editorIframe.style.left;
    editorIframe.style.height = `${IFRAME_TITLE_BAR_HEIGHT}px`;
    editorIframe.classList.add('vmi-minimized-iframe');
    hideBorderResizeHandles(); 
    isIframeMinimized = true;
    if(editorIframe.contentWindow) editorIframe.contentWindow.postMessage({ type: 'editorMinimized' }, '*');
}
function restoreEditorWindow() {
    if (!editorIframe || !isIframeMinimized) return;
    editorIframe.style.width = `${preMinimizeDimensions.width}px`; editorIframe.style.height = `${preMinimizeDimensions.height}px`;
    editorIframe.style.top = preMinimizeDimensions.top; editorIframe.style.left = preMinimizeDimensions.left;
    editorIframe.classList.remove('vmi-minimized-iframe');
    showBorderResizeHandles(); 
    positionBorderResizeHandles(); 
    isIframeMinimized = false;
    if(editorIframe.contentWindow) editorIframe.contentWindow.postMessage({ type: 'editorRestored' }, '*');
}

// --- Draggable by Title Bar (Headbar) ---
function onIframeMouseDown(e) {
    if (e.target !== editorIframe || isResizing || isIframeMinimized) return; 
    const iframeRect = editorIframe.getBoundingClientRect();
    const clickYRelativeToIframeTop = e.clientY - iframeRect.top;
    if (clickYRelativeToIframeTop >= 0 && clickYRelativeToIframeTop <= IFRAME_TITLE_BAR_HEIGHT) {
        isDragging = true; editorIframe.style.cursor = 'grabbing';
        mouseStartX = e.clientX; mouseStartY = e.clientY;
        iframeStartX = editorIframe.offsetLeft; iframeStartY = editorIframe.offsetTop;
        document.addEventListener('mousemove', onDocumentMouseMove);
        document.addEventListener('mouseup', onDocumentMouseUp);
        e.preventDefault();
    }
}

// --- Resizing by Border Drag Zones ---
function createBorderResizeHandles() {
    const edges = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
    edges.forEach(edge => {
        if (resizeHandles[edge]) resizeHandles[edge].remove(); 
        const handle = document.createElement('div');
        handle.className = `vmi-resize-handle vmi-resize-${edge}`;
        handle.dataset.edge = edge; 
        handle.addEventListener('mousedown', onBorderHandleMouseDown);
        document.body.appendChild(handle);
        resizeHandles[edge] = handle;
    });
}
function positionBorderResizeHandles() {
    if (!editorIframe || Object.keys(resizeHandles).length === 0 || isIframeMinimized) return;
    const rect = editorIframe.getBoundingClientRect();
    const scrollX = window.scrollX; const scrollY = window.scrollY;
    const H = BORDER_DRAG_THICKNESS; 
    const cornerSize = H * 2; 
    if(resizeHandles['top']) resizeHandles['top'].style.cssText = `top:${rect.top+scrollY-H/2}px; left:${rect.left+scrollX+cornerSize/2}px; width:${rect.width-cornerSize}px; height:${H}px; cursor:ns-resize;`;
    if(resizeHandles['bottom']) resizeHandles['bottom'].style.cssText = `top:${rect.bottom+scrollY-H/2}px; left:${rect.left+scrollX+cornerSize/2}px; width:${rect.width-cornerSize}px; height:${H}px; cursor:ns-resize;`;
    if(resizeHandles['left']) resizeHandles['left'].style.cssText = `top:${rect.top+scrollY+cornerSize/2}px; left:${rect.left+scrollX-H/2}px; width:${H}px; height:${rect.height-cornerSize}px; cursor:ew-resize;`;
    if(resizeHandles['right']) resizeHandles['right'].style.cssText = `top:${rect.top+scrollY+cornerSize/2}px; left:${rect.right+scrollX-H/2}px; width:${H}px; height:${rect.height-cornerSize}px; cursor:ew-resize;`;
    if(resizeHandles['top-left']) resizeHandles['top-left'].style.cssText = `top:${rect.top+scrollY-H/2}px; left:${rect.left+scrollX-H/2}px; width:${cornerSize}px; height:${cornerSize}px; cursor:nwse-resize;`;
    if(resizeHandles['top-right']) resizeHandles['top-right'].style.cssText = `top:${rect.top+scrollY-H/2}px; left:${rect.right+scrollX-cornerSize+H/2}px; width:${cornerSize}px; height:${cornerSize}px; cursor:nesw-resize;`;
    if(resizeHandles['bottom-left']) resizeHandles['bottom-left'].style.cssText = `top:${rect.bottom+scrollY-cornerSize+H/2}px; left:${rect.left+scrollX-H/2}px; width:${cornerSize}px; height:${cornerSize}px; cursor:nesw-resize;`;
    if(resizeHandles['bottom-right']) resizeHandles['bottom-right'].style.cssText = `top:${rect.bottom+scrollY-cornerSize+H/2}px; left:${rect.right+scrollX-cornerSize+H/2}px; width:${cornerSize}px; height:${cornerSize}px; cursor:nwse-resize;`;
}
function removeBorderResizeHandles() { Object.values(resizeHandles).forEach(handle => handle && handle.remove()); resizeHandles = {}; }
function hideBorderResizeHandles() { Object.values(resizeHandles).forEach(h => h && (h.style.display = 'none')); }
function showBorderResizeHandles() { Object.values(resizeHandles).forEach(h => h && (h.style.display = 'block')); }
function onBorderHandleMouseDown(e) {
    if (isIframeMinimized) return;
    isResizing = true; currentResizeEdge = e.target.dataset.edge;
    mouseStartX = e.clientX; mouseStartY = e.clientY;
    const rect = editorIframe.getBoundingClientRect(); 
    iframeStartX = rect.left + window.scrollX; iframeStartY = rect.top + window.scrollY;
    iframeStartWidth = rect.width; iframeStartHeight = rect.height;
    document.body.style.cursor = window.getComputedStyle(e.target).cursor; 
    if(editorIframe) editorIframe.style.pointerEvents = 'none';
    document.addEventListener('mousemove', onDocumentMouseMove);
    document.addEventListener('mouseup', onDocumentMouseUp);
    e.preventDefault(); e.stopPropagation();
}
function onDocumentMouseMove(e) {
    if (isDragging && editorIframe) {
        const dx = e.clientX - mouseStartX; const dy = e.clientY - mouseStartY;
        editorIframe.style.left = `${iframeStartX + dx}px`; editorIframe.style.top = `${iframeStartY + dy}px`;
        positionBorderResizeHandles();
    } else if (isResizing && editorIframe) {
        let newLeft = parseFloat(editorIframe.style.left || iframeStartX); 
        let newTop = parseFloat(editorIframe.style.top || iframeStartY);
        let newWidth = parseFloat(editorIframe.style.width || iframeStartWidth);
        let newHeight = parseFloat(editorIframe.style.height || iframeStartHeight);
        const dx = e.clientX - mouseStartX; const dy = e.clientY - mouseStartY;
        const minWidth = 250; const minHeight = IFRAME_TITLE_BAR_HEIGHT + 100; 
        if (currentResizeEdge.includes('right')) newWidth = Math.max(minWidth, iframeStartWidth + dx);
        if (currentResizeEdge.includes('bottom')) newHeight = Math.max(minHeight, iframeStartHeight + dy);
        if (currentResizeEdge.includes('left')) {
            const potentialWidth = iframeStartWidth - dx;
            if (potentialWidth < minWidth) { newLeft = iframeStartX + iframeStartWidth - minWidth; newWidth = minWidth; } 
            else { newWidth = potentialWidth; newLeft = iframeStartX + dx; }
        }
        if (currentResizeEdge.includes('top')) {
            const potentialHeight = iframeStartHeight - dy;
            if (potentialHeight < minHeight) { newTop = iframeStartY + iframeStartHeight - minHeight; newHeight = minHeight; } 
            else { newHeight = potentialHeight; newTop = iframeStartY + dy; }
        }
        editorIframe.style.left = `${newLeft}px`; editorIframe.style.top = `${newTop}px`;
        editorIframe.style.width = `${newWidth}px`; editorIframe.style.height = `${newHeight}px`;
        positionBorderResizeHandles(); 
    }
}
function onDocumentMouseUp(e) {
    if (isDragging) { isDragging = false; if (editorIframe) editorIframe.style.cursor = 'default'; }
    if (isResizing) { 
        isResizing = false; currentResizeEdge = null;
        document.body.style.cursor = 'default'; 
        if (editorIframe) editorIframe.style.pointerEvents = 'auto'; 
    }
    document.removeEventListener('mousemove', onDocumentMouseMove);
    document.removeEventListener('mouseup', onDocumentMouseUp);
}

// --- Communication with Editor Iframe ---
function handleEditorMessage(event) {
    if (!editorIframe || !editorIframe.contentWindow || event.source !== editorIframe.contentWindow) return;
    const data = event.data;
    try {
        switch (data.type) {
            case 'mathquillEditorReady':
                if (isIframeMinimized && editorIframe.contentWindow) editorIframe.contentWindow.postMessage({ type: 'editorMinimized' }, '*');
                if (latexToLoadForEditor !== null) editorIframe.contentWindow.postMessage({ type: 'loadLatex', latex: latexToLoadForEditor }, '*');
                else editorIframe.contentWindow.postMessage({ type: 'loadLatex', latex: '' }, '*');
                break;
            case 'mathquillInsert':
                if (activeInput && data.latex !== undefined) {
                    const latexString = `$${data.latex}$`;
                    window.cursorUtils.insertText(activeInput, latexString, originalSelectionDetails);
                }
                closeEditorIframe(); break;
            case 'mathquillCancel': closeEditorIframe(); break;
        }
    } catch (e) { console.error("VMI: Error handling msg from editor", e); closeEditorIframe(); }
}

// --- Keyboard Shortcut for Closing ---
function handleGlobalKeyDown(e) {
    if (e.key === "Escape" && editorIframe && !isIframeMinimized) {
        let activeEl = document.activeElement; let focusInEditor = false;
        if (activeEl === editorIframe) focusInEditor = true;
        else {
            try { 
                if (editorIframe.contentDocument && editorIframe.contentDocument.activeElement && editorIframe.contentDocument.activeElement !== editorIframe.contentDocument.body) focusInEditor = true;
                else if (editorIframe.contentWindow && editorIframe.contentWindow.document.hasFocus && editorIframe.contentWindow.document.hasFocus()) {
                   if (activeEl && editorIframe.contentWindow.document.body.contains(activeEl)) focusInEditor = true;
                }
            } catch (err) {}
        }
        if(focusInEditor){ closeEditorIframe(); e.preventDefault(); e.stopPropagation(); }
    }
}

// --- DOM Scanning and Mutation Observer ---
function addListenersToElement(element) {
    element.removeEventListener('focus', onFocusInput, true); element.removeEventListener('blur', onBlurInput, true);
    element.addEventListener('focus', onFocusInput, true); element.addEventListener('blur', onBlurInput, true);
}
function scanForInputs(rootNode) {
    if (!rootNode || typeof rootNode.querySelectorAll !== 'function') return;
    const inputs = rootNode.querySelectorAll('input[type="text"], input:not([type]), textarea, [contenteditable="true"]');
    inputs.forEach(input => {
        if (input.tagName === 'INPUT') {
            const type = input.type ? input.type.toLowerCase() : '';
            const excludedTypes = ['button', 'checkbox', 'color', 'date', 'datetime-local', 'file', 'hidden', 'image', 'month', 'number', 'radio', 'range', 'reset', 'submit', 'time', 'week'];
            if (!excludedTypes.includes(type)) addListenersToElement(input);
        } else addListenersToElement(input);
    });
}
const observer = new MutationObserver((mutationsList) => {
    if (!extensionGloballyEnabled) return;
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches('input[type="text"], input:not([type]), textarea, [contenteditable="true"]')) addListenersToElement(node);
                    scanForInputs(node);
                }
            });
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'contenteditable') {
            if (mutation.target.isContentEditable) addListenersToElement(mutation.target);
            else { mutation.target.removeEventListener('focus', onFocusInput, true); mutation.target.removeEventListener('blur', onBlurInput, true); }
        }
    }
});

// --- Cleanup ---
window.addEventListener('beforeunload', () => { deactivateExtension(); });