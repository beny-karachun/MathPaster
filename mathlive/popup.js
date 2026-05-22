document.addEventListener("DOMContentLoaded", async () => {
  const statusBadge = document.getElementById("status-badge");
  const statusText = document.getElementById("status-text");
  const siteName = document.getElementById("site-name");
  const siteToggle = document.getElementById("site-toggle");
  const globalToggle = document.getElementById("global-toggle");
  const openBtn = document.getElementById("open-editor-btn");

  let currentHostname = "";
  let isInjectable = false;

  // 1. Get the current active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      const tab = tabs[0];
      const url = tab.url || "";
      
      // We can only inject overlay on http/https pages
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        try {
          currentHostname = new URL(url).hostname;
          siteName.textContent = currentHostname;
          siteToggle.disabled = false;
          isInjectable = true;
        } catch (e) {
          siteName.textContent = "Invalid URL";
        }
      } else {
        siteName.textContent = "Unavailable on this page";
        siteToggle.disabled = true;
        siteToggle.checked = false;
      }
    }
  } catch (err) {
    console.error("MathPaster: Error querying active tab:", err);
    siteName.textContent = "Unknown Tab";
  }

  // 2. Load storage states & update UI
  async function updateUI() {
    const result = await chrome.storage.local.get(["disabledGlobally", "disabledSites"]);
    const disabledGlobally = !!result.disabledGlobally;
    const disabledSites = result.disabledSites || [];

    // Set Global Toggle switch
    globalToggle.checked = !disabledGlobally;

    let isSiteDisabled = false;
    if (isInjectable && currentHostname) {
      isSiteDisabled = disabledSites.includes(currentHostname);
      siteToggle.checked = !isSiteDisabled;
    }

    // Determine overall status
    if (disabledGlobally) {
      statusBadge.className = "status-badge disabled";
      statusText.textContent = "Disabled";
      openBtn.disabled = true;
      if (isInjectable) {
        siteToggle.disabled = true;
      }
    } else if (!isInjectable) {
      statusBadge.className = "status-badge disabled";
      statusText.textContent = "Unsupported";
      openBtn.disabled = true;
    } else if (isSiteDisabled) {
      statusBadge.className = "status-badge disabled";
      statusText.textContent = "Inactive here";
      openBtn.disabled = true;
      siteToggle.disabled = false;
    } else {
      statusBadge.className = "status-badge active";
      statusText.textContent = "Active";
      openBtn.disabled = false;
      siteToggle.disabled = false;
    }
  }

  // Initial UI sync
  await updateUI();

  // 3. Set up event listeners
  globalToggle.addEventListener("change", async () => {
    const isEnabled = globalToggle.checked;
    await chrome.storage.local.set({ disabledGlobally: !isEnabled });
    await updateUI();
  });

  siteToggle.addEventListener("change", async () => {
    if (!isInjectable || !currentHostname) return;
    const isEnabled = siteToggle.checked;
    const result = await chrome.storage.local.get(["disabledSites"]);
    let disabledSites = result.disabledSites || [];

    if (isEnabled) {
      // Remove from disabled list (enable on site)
      disabledSites = disabledSites.filter(site => site !== currentHostname);
    } else {
      // Add to disabled list (disable on site)
      if (!disabledSites.includes(currentHostname)) {
        disabledSites.push(currentHostname);
      }
    }
    await chrome.storage.local.set({ disabledSites });
    await updateUI();
  });

  openBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "trigger-overlay" });
    setTimeout(() => {
      window.close();
    }, 150);
  });

  const rateStoreBtn = document.getElementById("rate-store-btn");
  if (rateStoreBtn) {
    rateStoreBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://chromewebstore.google.com/detail/mathpaster/gpfikddlkclmegpdjoaflmbndcnddleg" });
    });
  }
});
