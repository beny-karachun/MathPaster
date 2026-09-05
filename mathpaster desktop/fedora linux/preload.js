"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("mathpasterDesktop", {
  getState: () => ipcRenderer.invoke("app:get-state"),
  setAutostart: (enabled) => ipcRenderer.invoke("app:set-autostart", Boolean(enabled)),
  hide: () => ipcRenderer.invoke("window:hide"),
  toggle: () => ipcRenderer.invoke("window:toggle"),
  togglePin: () => ipcRenderer.invoke("window:pin"),
  writeClipboard: latex => ipcRenderer.invoke("clipboard:write", latex),
  hideAfterCopy: revision => ipcRenderer.invoke("window:hide-after-copy", revision),
  onAppState: (callback) => subscribe("app:state", callback),
  onWindowShown: (callback) => subscribe("window:shown", callback),
  onWindowHidden: (callback) => subscribe("window:hidden", callback)
});
