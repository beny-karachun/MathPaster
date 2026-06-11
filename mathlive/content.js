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
  let isVisible = false;
  let iframeReady = false;
  let toastTimer = 0;
  let initialMathDraft = null;

  /* ── Capture the element that was focused before opening ── */
  function captureActiveTarget() {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return;
    
    // Skip our own overlay/iframe
    if (el.id === "mathpaster-overlay" || el.id === "mathpaster-iframe") return;

    // Reset previous selection state
    activeTarget = null;
    activeTargetSelection = null;
    activeTargetRange = null;

    const isTextarea = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|search|url|)$/.test(el.type || "text"));
    const isCE = el.isContentEditable || (el.hasAttribute("contenteditable") && el.getAttribute("contenteditable") !== "false");
    
    let target = null;
    if (isTextarea || isCE) {
      target = el;
    } else {
      const ce = el.closest("[contenteditable]");
      if (ce && (ce.isContentEditable || ce.getAttribute("contenteditable") !== "false")) {
        target = ce;
      }
    }

    if (target) {
      activeTarget = target;
      let rawText = "";

      // Capture exact caret position before focus is lost to the iframe
      if (isTextarea) {
        activeTargetSelection = { start: target.selectionStart, end: target.selectionEnd };
        rawText = target.value.substring(target.selectionStart, target.selectionEnd);
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          activeTargetRange = sel.getRangeAt(0).cloneRange();
          rawText = sel.toString();
        }
      }

      rawText = rawText.trim();
      if (rawText.startsWith("$$") && rawText.endsWith("$$") && rawText.length >= 4) {
        initialMathDraft = { mode: "block", text: rawText.slice(2, -2).trim() };
      } else if (rawText.startsWith("$") && rawText.endsWith("$") && rawText.length >= 2) {
        initialMathDraft = { mode: "inline", text: rawText.slice(1, -1).trim() };
      }
    }
  }

  /* ── Insert text at caret in the original element ── */
  function insertTextAtCaret(text) {
    if (!activeTarget || !activeTarget.isConnected) return false;

    if (activeTarget.tagName === "TEXTAREA" || activeTarget.tagName === "INPUT") {
      activeTarget.focus();
      const start  = activeTargetSelection?.start ?? activeTarget.value.length;
      const end    = activeTargetSelection?.end   ?? start;
      const before = activeTarget.value.slice(0, start);
      const after  = activeTarget.value.slice(end);

      // Use native setter so React / Vue / Angular picks it up
      const proto = activeTarget.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(activeTarget, before + text + after);
      else activeTarget.value = before + text + after;

      activeTarget.selectionStart = activeTarget.selectionEnd = start + text.length;
      activeTarget.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      activeTarget.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (activeTarget.isContentEditable || activeTarget.hasAttribute("contenteditable")) {
      activeTarget.focus();
      const sel = window.getSelection();
      
      // Restore exact selection range if we captured it
      if (activeTargetRange) {
        sel.removeAllRanges();
        sel.addRange(activeTargetRange);
      } 
      // Fallback: place cursor at end if selection was completely lost
      else if (sel && (!sel.rangeCount || !activeTarget.contains(sel.anchorNode))) {
        const range = document.createRange();
        range.selectNodeContents(activeTarget);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      
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
        activeTarget.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      }
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
      "background:rgba(0,0,0,0.45)",
      "backdrop-filter:blur(6px)", "-webkit-backdrop-filter:blur(6px)",
      "opacity:0", "pointer-events:none",
      "transition:opacity .22s cubic-bezier(.4,0,.2,1)",
    ].join(";");

    iframe = document.createElement("iframe");
    iframe.id = "mathpaster-iframe";
    iframe.src = chrome.runtime.getURL("editor.html");
    iframe.style.cssText = [
      "position:absolute", "inset:0", "width:100%", "height:100%", "border:none",
      "background:transparent", "color-scheme:dark"
    ].join(";");
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
    if (activeTarget && activeTarget.isConnected) {
      setTimeout(() => { try { activeTarget.focus(); } catch {} }, 60);
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

      case "update-blur":
        if (overlay) {
          if (e.data.blur) {
            overlay.style.backdropFilter = "blur(6px)";
            overlay.style.webkitBackdropFilter = "blur(6px)";
          } else {
            overlay.style.backdropFilter = "none";
            overlay.style.webkitBackdropFilter = "none";
          }
        }
        break;
    }
  });



  /* ── Message from background (toolbar icon click) ── */
  chrome.runtime.onMessage.addListener(msg => {
    if (msg?.action === "toggle-mathpaster") toggleOverlay();
  });
})();
