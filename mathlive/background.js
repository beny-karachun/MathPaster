// Background service worker – listens for the browser action (Ctrl+M) and
// forwards a message to the content script on the active tab.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "toggle-mathpaster" });
  } catch {
    // Content script may not be injected yet (e.g. chrome:// pages).
    // Silently ignore.
  }
});
