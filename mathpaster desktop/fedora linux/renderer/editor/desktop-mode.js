const isDesktop = new URLSearchParams(window.location.search).has("desktop");

if (isDesktop) {
  document.body.classList.add("desktop-mode");
  // Icon buttons retain their visible tooltip and an accessible name.
  document.querySelectorAll('button[title]').forEach(button => {
    if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', button.title);
  });
  document.getElementById('keyboard-btn').addEventListener('mousedown', event => event.preventDefault());
  document.getElementById('keyboard-btn').addEventListener('click', () => {
    const keyboard = window.mathVirtualKeyboard;
    if (!keyboard) return;
    if (keyboard.visible) keyboard.hide();
    else { document.getElementById('mf').focus(); keyboard.show(); }
  });

  const autostartToggle = document.getElementById("desktop-autostart-toggle");
  document.getElementById("desktop-general-settings").open = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (event.data?.mathpaster === "desktop-autostart-finished") autostartToggle.disabled = false;
    if (event.data?.mathpaster !== "desktop-app-state") return;
    autostartToggle.checked = Boolean(event.data.state?.launchOnRestart);
    autostartToggle.disabled = false;
  });

  autostartToggle.addEventListener("change", () => {
    autostartToggle.disabled = true;
    window.parent.postMessage({
      mathpaster: "desktop-set-autostart",
      enabled: autostartToggle.checked
    }, "*");
  });

  window.parent.postMessage({ mathpaster: "desktop-get-state" }, "*");
}
