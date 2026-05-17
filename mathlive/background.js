// Background service worker – listens for the browser action (Ctrl+M) and
// forwards a message to the content script on the active tab.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) return;

  try {
    // Inject the content script dynamically using the scripting API
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    // Send the toggle message to the injected script
    await chrome.tabs.sendMessage(tab.id, { action: "toggle-mathpaster" });
  } catch (err) {
    console.error("MathPaster: Failed to inject or send message:", err);
  }
});
