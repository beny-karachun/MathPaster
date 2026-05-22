// Background service worker – listens for commands or messages and
// forwards a toggle message to the content script on the active tab.

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-editor") {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      await toggleEditorForTab(tabs[0], false);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "trigger-overlay") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs && tabs[0]) {
        await toggleEditorForTab(tabs[0], true); // Force bypass status check since user explicitly clicked the button
      }
    });
  }
  return true;
});

async function toggleEditorForTab(tab, force = false) {
  if (!tab.id || !tab.url) return;
  
  // Skip browser internal pages
  if (
    tab.url.startsWith("chrome://") || 
    tab.url.startsWith("edge://") || 
    tab.url.startsWith("about:") || 
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("view-source:")
  ) {
    return;
  }

  if (!force) {
    const result = await chrome.storage.local.get(["disabledGlobally", "disabledSites"]);
    if (result.disabledGlobally) {
      console.log("MathPaster: Globally disabled.");
      return;
    }
    const hostname = getHostname(tab.url);
    const disabledSites = result.disabledSites || [];
    if (hostname && disabledSites.includes(hostname)) {
      console.log(`MathPaster: Disabled on site ${hostname}.`);
      return;
    }
  }

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
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return "";
  }
}
