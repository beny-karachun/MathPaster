const isDesktop = new URLSearchParams(window.location.search).has("desktop");

if (isDesktop) {
  document.body.classList.add("desktop-mode");

  const autostartToggle = document.getElementById("desktop-autostart-toggle");
  document.getElementById("desktop-general-settings").open = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.data?.mathpaster !== "desktop-app-state") return;
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
