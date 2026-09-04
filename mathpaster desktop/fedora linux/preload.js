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
  writeClipboard: (latex, closeAfter = false) =>
    ipcRenderer.invoke("clipboard:write", latex, Boolean(closeAfter)),
  onAppState: (callback) => subscribe("app:state", callback),
  onWindowShown: (callback) => subscribe("window:shown", callback)
});
