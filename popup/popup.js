document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('enableExtensionToggle');
    const statusText = document.getElementById('statusText');

    // Load current state
    chrome.storage.local.get(['extensionEnabled'], (result) => {
        const isEnabled = result.extensionEnabled === undefined ? true : result.extensionEnabled;
        toggle.checked = isEnabled;
        updateStatusText(isEnabled);
    });

    toggle.addEventListener('change', () => {
        const isEnabled = toggle.checked;
        chrome.storage.local.set({ extensionEnabled: isEnabled }, () => {
            updateStatusText(isEnabled);
            // Notify active content scripts (optional, for immediate effect on current tab without refresh)
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'vmiExtensionStateChanged', enabled: isEnabled });
                }
            });
            console.log(`Visual Math Input set to: ${isEnabled ? 'Enabled' : 'Disabled'}`);
        });
    });

    function updateStatusText(isEnabled) {
        statusText.textContent = isEnabled ? 'Extension Enabled' : 'Extension Disabled';
    }
});