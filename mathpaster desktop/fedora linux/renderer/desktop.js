"use strict";

const desktop = window.mathpasterDesktop;
const frame = document.getElementById("editor-frame");
const shortcutStatus = document.getElementById("shortcut-status");
const toast = document.getElementById("toast");
const pinButton = document.getElementById("pin-button");
let toastTimer;
let copyCloseTimer;
let copyGeneration = 0;

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), error ? 4500 : 1800);
}

function sendToEditor(message) {
  frame.contentWindow?.postMessage(message, "*");
}

function cancelPendingClose() {
  copyGeneration++;
  clearTimeout(copyCloseTimer);
}

function applyAppState(state) {
  if (!state) return;
  shortcutStatus.classList.toggle("unavailable", !state.shortcutRegistered);
  shortcutStatus.title = state.shortcutRegistered
    ? "Alt+M shows or hides MathPaster from any application"
    : "Global shortcut unavailable. Use the tray to open MathPaster; Alt+M still works inside the editor.";
  shortcutStatus.setAttribute("aria-label", state.shortcutRegistered ? "Alt+M is ready" : "Global shortcut unavailable");
  pinButton.setAttribute("aria-pressed", String(Boolean(state.alwaysOnTop)));
  pinButton.title = state.alwaysOnTop ? "Always on top — click to unpin" : "Keep window on top";
  sendToEditor({ mathpaster: "desktop-app-state", state });
}

async function refreshState() {
  try { applyAppState(await desktop.getState()); }
  catch { showToast("Could not read desktop settings. Try reopening MathPaster.", true); }
}

async function hide() {
  cancelPendingClose();
  try { await desktop.hide(); }
  catch { showToast("Could not hide the window. Please try again.", true); }
}

async function copyFromEditor(data, closeAfter) {
  cancelPendingClose();
  const generation = copyGeneration;
  try {
    const result = await desktop.writeClipboard(data.latex);
    sendToEditor({ mathpaster: "copied", requestId: data.requestId, target: closeAfter ? "insert" : "copy" });
    showToast("LaTeX copied to clipboard");
    if (closeAfter && generation === copyGeneration) {
      copyCloseTimer = setTimeout(() => {
        desktop.hideAfterCopy(result.visibilityRevision).catch(() => showToast("Copied. Use Esc to hide the window.", true));
      }, 300);
    }
  } catch {
    sendToEditor({ mathpaster: "copy-failed", requestId: data.requestId });
    showToast("Could not copy. Your equation is still saved — please try again.", true);
  }
}

document.getElementById("hide-button").addEventListener("click", hide);
document.getElementById("close-button").addEventListener("click", hide);
pinButton.addEventListener("click", () => desktop.togglePin().catch(() => showToast("Could not change window pinning.", true)));
document.getElementById("reload-editor").addEventListener("click", () => {
  document.getElementById("editor-error").hidden = true;
  frame.src = frame.src;
});

window.addEventListener("message", async event => {
  if (event.source !== frame.contentWindow || !event.data || typeof event.data.mathpaster !== "string") return;
  const data = event.data;
  switch (data.mathpaster) {
    case "ready":
      document.getElementById("editor-error").hidden = true;
      sendToEditor({ mathpaster: "desktop-initialize" });
      await refreshState();
      break;
    case "desktop-get-state": await refreshState(); break;
    case "desktop-set-autostart":
      try {
        if (typeof data.enabled !== "boolean") return;
        await desktop.setAutostart(data.enabled);
        showToast(data.enabled ? "MathPaster will launch after login" : "Launch after login is off");
      } catch { showToast("Could not update launch settings. Please try again.", true); }
      finally {
        await refreshState();
        sendToEditor({ mathpaster: "desktop-autostart-finished" });
      }
      break;
    case "close": await hide(); break;
    case "toggle": await desktop.toggle().catch(() => showToast("Could not toggle the window.", true)); break;
    case "insert": await copyFromEditor(data, true); break;
    case "copy": await copyFromEditor(data, false); break;
    case "editing": cancelPendingClose(); break;
    case "toast": showToast(String(data.text || "Done")); break;
    case "editor-error": document.getElementById("editor-error").hidden = false; break;
    case "desktop-theme":
      document.documentElement.classList.toggle("theme-light", data.light === true);
      break;
  }
});

desktop.onAppState(applyAppState);
desktop.onWindowShown(() => {
  cancelPendingClose();
  sendToEditor({ mathpaster: "desktop-focus" });
});
desktop.onWindowHidden(cancelPendingClose);
refreshState();
