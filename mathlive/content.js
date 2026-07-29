/* =============================================================
   MathPaster – Chrome Extension Content Script
   Creates a floating overlay with an iframe editor.
   Ctrl+M toggles the overlay. The iframe handles MathLive.
   ============================================================= */

(() => {
  "use strict";
  if (window.mathPasterInjected) return;
  window.mathPasterInjected = true;

  let overlay = null;
  let iframe  = null;
  let activeTarget = null;
  let activeTargetSelection = null;
  let activeTargetRange = null;
  let activeTargetTextSelection = null;
  let activeTargetId = null;
  let isVisible = false;
  let iframeReady = false;
  let toastTimer = 0;
  let restoreFocusTimer = 0;
  let initialMathDraft = null;

  function isTextControl(el) {
    return !!el && (
      el.tagName === "TEXTAREA" ||
      (el.tagName === "INPUT" && /^(text|search|url|)$/.test(el.type || "text"))
    );
  }

  function isEditableTarget(el) {
    return !!el && (
      isTextControl(el) ||
      el.isContentEditable ||
      (el.hasAttribute?.("contenteditable") && el.getAttribute("contenteditable") !== "false")
    );
  }

  function findEditableTarget(el) {
    if (!el) return null;
    if (isEditableTarget(el)) return el;
    const ce = el.closest?.("[contenteditable]");
    return isEditableTarget(ce) ? ce : null;
  }

  function rangeBelongsToTarget(range, target) {
    if (!range || !target) return false;
    const container = range.commonAncestorContainer;
    return container === target || target.contains(container);
  }

  // Keep character offsets as a fallback because React/ProseMirror editors can
  // replace the contenteditable DOM after an input event, invalidating a Range.
  function getTextSelection(target, range) {
    if (!rangeBelongsToTarget(range, target)) return null;
    try {
      const startRange = document.createRange();
      startRange.selectNodeContents(target);
      startRange.setEnd(range.startContainer, range.startOffset);

      const endRange = document.createRange();
      endRange.selectNodeContents(target);
      endRange.setEnd(range.endContainer, range.endOffset);

      return {
        start: startRange.toString().length,
        end: endRange.toString().length,
      };
    } catch {
      return null;
    }
  }

  function rangeFromTextSelection(target, textSelection) {
    if (!target || !textSelection) return null;
    const range = document.createRange();
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const total = Math.max(0, target.textContent?.length || 0);
    const start = Math.min(Math.max(0, textSelection.start), total);
    const end = Math.min(Math.max(start, textSelection.end), total);
    let offset = 0;
    let startPoint = null;
    let endPoint = null;
    let node;

    while ((node = walker.nextNode())) {
      const nextOffset = offset + node.data.length;
      if (!startPoint && start <= nextOffset) {
        startPoint = { node, offset: start - offset };
      }
      if (!endPoint && end <= nextOffset) {
        endPoint = { node, offset: end - offset };
        break;
      }
      offset = nextOffset;
    }

    try {
      if (!startPoint || !endPoint) {
        range.selectNodeContents(target);
        range.collapse(false);
      } else {
        range.setStart(startPoint.node, startPoint.offset);
        range.setEnd(endPoint.node, endPoint.offset);
      }
      return range;
    } catch {
      return null;
    }
  }

  function resolveActiveTarget() {
    if (isEditableTarget(activeTarget) && activeTarget.isConnected) return activeTarget;
    if (activeTargetId) {
      const replacement = document.getElementById(activeTargetId);
      if (isEditableTarget(replacement)) {
        activeTarget = replacement;
        activeTargetRange = null;
        return replacement;
      }
    }
    return null;
  }

  function rememberCurrentSelection() {
    const focusedTarget = findEditableTarget(document.activeElement);
    if (focusedTarget && (
      focusedTarget === activeTarget ||
      (activeTargetId && focusedTarget.id === activeTargetId)
    )) {
      activeTarget = focusedTarget;
    }

    const target = resolveActiveTarget();
    if (!target) return;

    if (isTextControl(target)) {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (typeof start === "number" && typeof end === "number") {
        activeTargetSelection = { start, end };
      }
      return;
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!rangeBelongsToTarget(range, target)) return;
    activeTargetRange = range.cloneRange();
    activeTargetTextSelection = getTextSelection(target, range);
  }

  function restoreActiveTarget() {
    const target = resolveActiveTarget();
    if (!target) return;

    try {
      target.focus({ preventScroll: true });
    } catch {
      try { target.focus(); } catch {}
    }

    if (isTextControl(target)) {
      if (activeTargetSelection) {
        const max = target.value.length;
        const start = Math.min(activeTargetSelection.start, max);
        const end = Math.min(Math.max(start, activeTargetSelection.end), max);
        try { target.setSelectionRange(start, end); } catch {}
      }
      return;
    }

    const sel = window.getSelection();
    if (!sel) return;
    let range = activeTargetRange;
    if (!rangeBelongsToTarget(range, target)) {
      range = rangeFromTextSelection(target, activeTargetTextSelection);
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
    }
    try {
      sel.removeAllRanges();
      sel.addRange(range);
      activeTargetRange = range.cloneRange();
      activeTargetTextSelection = getTextSelection(target, range);
    } catch {}
  }

  /* ── Capture the element that was focused before opening ── */
  function captureActiveTarget() {
    // A selected formula only applies to this opening. Without clearing it, a
    // later toggle can unexpectedly resurrect the first selected expression.
    initialMathDraft = null;

    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return;
    
    // Skip our own overlay/iframe
    if (el.id === "mathpaster-overlay" || el.id === "mathpaster-iframe") return;

    const target = findEditableTarget(el);
    // If focus was temporarily lost while the popup closed, keep the last
    // successful insertion bookmark instead of replacing it with no target.
    if (!target) return;

    activeTarget = null;
    activeTargetSelection = null;
    activeTargetRange = null;
    activeTargetTextSelection = null;
    activeTargetId = target.id || null;
    activeTarget = target;
    let rawText = "";

    // Capture exact caret position before focus is lost to the iframe
    if (isTextControl(target)) {
      activeTargetSelection = { start: target.selectionStart, end: target.selectionEnd };
      rawText = target.value.substring(target.selectionStart, target.selectionEnd);
    } else {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (rangeBelongsToTarget(range, target)) {
          activeTargetRange = range.cloneRange();
          activeTargetTextSelection = getTextSelection(target, range);
          rawText = sel.toString();
        }
      }
    }

    rawText = rawText.trim();
    if (rawText.startsWith("$$") && rawText.endsWith("$$") && rawText.length >= 4) {
      initialMathDraft = { mode: "block", text: rawText.slice(2, -2).trim() };
    } else if (rawText.startsWith("$") && rawText.endsWith("$") && rawText.length >= 2) {
      initialMathDraft = { mode: "inline", text: rawText.slice(1, -1).trim() };
    }
  }

  /* ── Insert text at caret in the original element ── */
  function insertTextAtCaret(text) {
    const target = resolveActiveTarget();
    if (!target) return false;

    if (isTextControl(target)) {
      target.focus();
      const start  = activeTargetSelection?.start ?? target.value.length;
      const end    = activeTargetSelection?.end   ?? start;
      const before = target.value.slice(0, start);
      const after  = target.value.slice(end);

      // Use native setter so React / Vue / Angular picks it up
      const proto = target.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(target, before + text + after);
      else target.value = before + text + after;

      const caret = start + text.length;
      target.selectionStart = target.selectionEnd = caret;
      activeTargetSelection = { start: caret, end: caret };
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      rememberCurrentSelection();
      return true;
    }

    if (target.isContentEditable || target.hasAttribute("contenteditable")) {
      restoreActiveTarget();
      const sel = window.getSelection();
      if (!sel) return false;
      
      // execCommand keeps the page's undo stack intact where supported;
      // fall back to manual Range insertion if it's unavailable or refused.
      if (!document.execCommand("insertText", false, text) && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      }
      // This becomes the fallback bookmark on the next open. Updating it here
      // prevents a stale first-open Range from receiving subsequent inserts.
      rememberCurrentSelection();
      return true;
    }
    return false;
  }

  /* ── Toast ── */
  function showToast(msg) {
    let toast = document.getElementById("mathpaster-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "mathpaster-toast";
      toast.style.cssText = [
        "position:fixed", "top:20px", "left:50%",
        "transform:translateX(-50%) translateY(-20px)",
        "z-index:2147483647", "padding:10px 20px", "border-radius:10px",
        "background:linear-gradient(135deg,#1e1b4b,#312e81)",
        "border:1px solid rgba(99,102,241,0.3)",
        "box-shadow:0 8px 32px rgba(0,0,0,0.4)",
        "color:#c7d2fe", "font-family:Inter,system-ui,sans-serif",
        "font-size:13px", "font-weight:500",
        "opacity:0", "pointer-events:none",
        "transition:opacity .25s ease,transform .25s ease",
      ].join(";");
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(-20px)";
    }, 2200);
  }

  /* ── Build overlay + iframe ── */
  function buildOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "mathpaster-overlay";
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:2147483640",
      "display:flex", "align-items:flex-end", "justify-content:center",
      "background:transparent",
      "opacity:0", "pointer-events:none",
      "transition:opacity .22s cubic-bezier(.4,0,.2,1)",
    ].join(";");
    overlay.style.setProperty("background-color", "transparent", "important");
    overlay.style.setProperty("backdrop-filter", "none", "important");
    overlay.style.setProperty("-webkit-backdrop-filter", "none", "important");

    iframe = document.createElement("iframe");
    iframe.id = "mathpaster-iframe";
    iframe.src = chrome.runtime.getURL("editor.html");
    iframe.style.cssText = [
      "position:absolute", "inset:0", "width:100%", "height:100%", "border:none",
      "background:transparent", "color-scheme:normal"
    ].join(";");
    // Keep host-page iframe rules (including ChatGPT's dark color scheme) from
    // turning the otherwise transparent iframe canvas black.
    iframe.style.setProperty("background-color", "transparent", "important");
    iframe.style.setProperty("color-scheme", "normal", "important");
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("allow", "clipboard-write");

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Click backdrop to close
    overlay.addEventListener("mousedown", e => {
      if (e.target === overlay) {
        e.preventDefault();
        hideOverlay();
      }
    });
  }

  function showOverlay() {
    clearTimeout(restoreFocusTimer);
    restoreFocusTimer = 0;
    captureActiveTarget();
    if (!overlay) buildOverlay();
    isVisible = true;
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
    // Block page scrolling
    document.body.style.overflow = "hidden";
    
    // Only send reset if iframe is fully ready.
    // If not ready yet, the "ready" event listener will send it.
    if (iframeReady) {
      iframe.contentWindow?.postMessage({ mathpaster: "reset", initialMath: initialMathDraft }, "*");
    }
    
    // Explicitly focus iframe to ensure keyboard events are captured
    setTimeout(() => { 
      if (iframe) {
        iframe.focus(); 
        if (iframe.contentWindow) iframe.contentWindow.focus();
      }
    }, 10);
  }

  function hideOverlay() {
    if (!overlay || !isVisible) return;
    isVisible = false;
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    // Restore page scrolling
    document.body.style.overflow = "";
    if (activeTarget || activeTargetId) {
      clearTimeout(restoreFocusTimer);
      restoreFocusTimer = setTimeout(() => {
        restoreFocusTimer = 0;
        restoreActiveTarget();
      }, 60);
    }
  }

  function toggleOverlay() {
    if (isVisible) hideOverlay();
    else showOverlay();
  }

  /* ── Messages from iframe ── */
  window.addEventListener("message", e => {
    // Only accept messages from our extension iframe
    if (!e.data || typeof e.data !== "object" || !e.data.mathpaster) return;
    if (e.source !== iframe?.contentWindow) return;

    switch (e.data.mathpaster) {
      case "ready":
        iframeReady = true;
        if (isVisible) {
          iframe.contentWindow?.postMessage({ mathpaster: "reset", initialMath: initialMathDraft }, "*");
        }
        break;

      case "close":
        hideOverlay();
        break;

      case "toggle":
        toggleOverlay();
        break;

      case "insert": {
        const latex = e.data.latex;
        hideOverlay();
        setTimeout(() => {
          if (insertTextAtCaret(latex)) {
            showToast("LaTeX inserted ✓");
          } else {
            navigator.clipboard.writeText(latex).then(() => {
              showToast("Copied to clipboard (no active input found)");
            }).catch(() => {
              showToast("Could not insert or copy");
            });
          }
        }, 120);
        break;
      }

      case "toast":
        showToast(e.data.text || "");
        break;

      case "resize":
        if (iframe && e.data.width && e.data.height) {
          iframe.style.width = `min(${e.data.width}px, 95vw)`;
          iframe.style.height = `${e.data.height}px`;
        }
        break;
    }
  });



  /* ── Message from background (toolbar icon click) ── */
  chrome.runtime.onMessage.addListener(msg => {
    if (msg?.action === "toggle-mathpaster") toggleOverlay();
  });
})();
