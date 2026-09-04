"use strict";

const desktop = window.mathpasterDesktop;
const frame = document.getElementById("editor-frame");
const shortcutStatus = document.getElementById("shortcut-status");
const shortcutDot = document.getElementById("shortcut-dot");
const toast = document.getElementById("toast");
let toastTimer = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1800);
}

function sendToEditor(message) {
  if (frame.contentWindow) frame.contentWindow.postMessage(message, "*");
}

function applyAppState(state) {
  if (!state) return;
  shortcutStatus.classList.toggle("unavailable", !state.shortcutRegistered);
  shortcutStatus.title = state.shortcutRegistered
    ? "Global shortcut is active"
    : "Ctrl+Shift+M is already reserved by another application";
  shortcutDot.setAttribute("aria-label", state.shortcutRegistered ? "Shortcut active" : "Shortcut unavailable");
  sendToEditor({ mathpaster: "desktop-app-state", state });
}

document.getElementById("hide-button").addEventListener("click", () => desktop.hide());
document.getElementById("close-button").addEventListener("click", () => desktop.hide());

frame.addEventListener("load", () => sendToEditor({ mathpaster: "reset" }));

window.addEventListener("message", async (event) => {
  if (event.source !== frame.contentWindow || !event.data || typeof event.data.mathpaster !== "string") return;

  switch (event.data.mathpaster) {
    case "ready":
      sendToEditor({ mathpaster: "reset" });
      desktop.getState().then(applyAppState);
      break;
    case "desktop-get-state":
      desktop.getState().then(applyAppState);
      break;
    case "desktop-set-autostart":
      try {
        const enabled = await desktop.setAutostart(Boolean(event.data.enabled));
        applyAppState(await desktop.getState());
        showToast(enabled ? "MathPaster will launch after login." : "Launch on restart is off.");
      } catch (error) {
        applyAppState(await desktop.getState());
        showToast("Could not update the restart setting.");
      }
      break;
    case "close":
    case "toggle":
      await desktop.hide();
      break;
    case "insert":
      await desktop.writeClipboard(event.data.latex, true);
      break;
    case "toast":
      showToast(event.data.text || "Done");
      break;
    default:
      break;
  }
});

desktop.onAppState(applyAppState);
desktop.onWindowShown(() => sendToEditor({ mathpaster: "reset" }));
desktop.getState().then(applyAppState);
