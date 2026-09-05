"use strict";

// Real Electron smoke/regression suite. All application data stays in /tmp.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile, execFileSync } = require("node:child_process");
const { promisify } = require("node:util");
const { _electron: electron } = require("playwright-core");

const appDir = path.resolve(__dirname, "..");
const launcher = process.env.MATHPASTER_TEST_EXECUTABLE || path.join(appDir, "src/launch.sh");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "mathpaster-e2e-"));
const env = { ...process.env, XDG_CONFIG_HOME: path.join(profile, "config"), XDG_DATA_HOME: path.join(profile, "data"),
  XDG_CURRENT_DESKTOP: "MathPasterTest", DESKTOP_SESSION: "MathPasterTest" };
delete env.ELECTRON_RUN_AS_NODE;
const failures = [];
let application;

async function launch(hidden = false) {
  application = await electron.launch({
    executablePath: launcher,
    args: [`--user-data-dir=${path.join(profile, "userdata")}`, ...(hidden ? ["--", "--hidden"] : [])],
    env, timeout: 25000
  });
  application.process().stderr.on("data", chunk => {
    const message = String(chunk);
    if (/GPU process exited unexpectedly|FATAL/.test(message)) failures.push(message);
  });
  const page = await application.firstWindow();
  page.on("pageerror", error => failures.push(error.message));
  page.setDefaultTimeout(8000);
  await page.waitForFunction(() => document.querySelector("#editor-frame")?.contentDocument?.querySelector("#loading.hidden"));
  const frame = await (await page.locator("#editor-frame").elementHandle()).contentFrame();
  await frame.waitForFunction(() => document.getElementById("mf").value !== undefined);
  return { page, frame };
}

async function show() {
  await application.evaluate(({ app }) => app.emit("activate"));
  await assertMappedOnDesktop();
}

async function assertMappedOnDesktop() {
  const nativeId = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getNativeWindowHandle().readUInt32LE(0));
  await waitFor(() => {
    const clients = execFileSync("xprop", ["-root", "_NET_CLIENT_LIST"], { encoding: "utf8", env });
    if (!clients.match(/0x[\da-f]+/gi)?.some(id => Number(id) === nativeId)) return false;
    const state = execFileSync("xprop", ["-id", `0x${nativeId.toString(16)}`, "WM_STATE"], { encoding: "utf8", env });
    return /window state: Normal/.test(state);
  }, `native window 0x${nativeId.toString(16)} must be managed by the desktop`);
}
async function visible() {
  return application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible());
}
async function waitFor(check, label) {
  const until = Date.now() + 8000;
  while (Date.now() < until) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out: ${label}`);
}
async function value(frame) { return frame.locator("#mf").evaluate(el => el.value); }
async function setEquation(frame, latex) {
  await frame.locator("#mf").evaluate((el, text) => { el.value = text; el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" })); el.focus(); }, latex);
}
async function scenario(name, action) {
  await action();
  console.log(`PASS ${name}`);
}

(async () => {
  console.log(`Artifacts: ${profile}`);
  let { page, frame } = await launch();
  await scenario("editor loads with empty copy actions disabled", async () => {
    assert.equal(await frame.locator("#copy-btn").isDisabled(), true);
    assert.equal(await visible(), true);
    await assertMappedOnDesktop();
    await page.screenshot({ path: path.join(profile, "desktop-empty.png") });
  });
  await scenario("physical typing, copy, clipboard, and history", async () => {
    await frame.locator("#mf").click();
    await page.keyboard.type("x+1");
    await frame.locator("#copy-btn").click();
    await waitFor(async () => (await application.evaluate(({ clipboard }) => clipboard.readText())) === "$x+1$", "clipboard text");
    await frame.waitForFunction(() => JSON.parse(localStorage.getItem("mathpaster_history"))?.[0]?.latex === "x+1");
    await frame.locator("#history-btn").click();
    assert.equal(await frame.locator("#history-list .entry-row").count(), 1);
    await page.keyboard.press("Escape");
    await frame.waitForFunction(() => !document.getElementById("history-overlay").classList.contains("visible"));
    assert.equal(await visible(), true);
  });
  await scenario("hide and reopen preserves equation, cursor, and Auto symbols", async () => {
    await frame.locator("#mf").evaluate(el => { el.position = 1; });
    const before = await frame.locator("#mf").evaluate(el => ({ value: el.value, position: el.position }));
    await page.evaluate(() => window.mathpasterDesktop.hide());
    assert.equal(await visible(), false);
    await show();
    assert.deepEqual(await frame.locator("#mf").evaluate(el => ({ value: el.value, position: el.position })), before);
    assert.equal(await frame.locator("#auto-symbol-switch").isChecked(), true);
    assert.equal(await frame.locator("#auto-symbol-selector .mode-label").evaluate(el => el.classList.contains("active")), true);
  });
  await scenario("focused Alt+M is consumed without inserting M", async () => {
    const before = await value(frame);
    await application.evaluate(({ BrowserWindow }) => {
      const wc = BrowserWindow.getAllWindows()[0].webContents;
      wc.sendInputEvent({ type: "keyDown", keyCode: "M", modifiers: ["alt"] });
      wc.sendInputEvent({ type: "keyUp", keyCode: "M", modifiers: ["alt"] });
    });
    await waitFor(async () => !(await visible()), "Alt+M hide");
    await show();
    assert.equal(await value(frame), before);
  });
  await scenario("opening the launcher again reveals hidden and minimized windows", async () => {
    const before = await value(frame);
    for (const state of ["hidden", "minimized"]) {
      if (state === "hidden") await page.evaluate(() => window.mathpasterDesktop.hide());
      else {
        await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
        await waitFor(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized()), "native minimize");
      }
      // No Playwright flags, manually injected Ozone flags, or app.emit here:
      // this is the same executable/argument path as opening the desktop icon.
      await promisify(execFile)(launcher, [`--user-data-dir=${path.join(profile, "userdata")}`], { env, timeout: 15000 });
      await assertMappedOnDesktop();
      assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
      assert.equal(await value(frame), before);
    }
  });
  await scenario("block copy and hide keeps a recoverable draft", async () => {
    await frame.locator('#mode-selector [data-mode="block"]').click();
    await frame.locator("#insert-btn").click();
    await waitFor(async () => !(await visible()), "copy and hide");
    assert.equal(await application.evaluate(({ clipboard }) => clipboard.readText()), "$$x+1$$");
    await show();
    assert.equal(await value(frame), "x+1");
  });
  await scenario("old copy cannot close a newly reopened window", async () => {
    const token = await page.evaluate(() => window.mathpasterDesktop.writeClipboard("$race$"));
    await page.evaluate(() => window.mathpasterDesktop.hide());
    await show();
    await page.evaluate(token => window.mathpasterDesktop.hideAfterCopy(token.visibilityRevision), token);
    assert.equal(await visible(), true);
  });
  await scenario("clipboard failure preserves the draft and does not record success", async () => {
    const history = await frame.evaluate(() => localStorage.getItem("mathpaster_history"));
    await application.evaluate(({ clipboard }) => {
      globalThis.testWriteClipboard = clipboard.writeText;
      clipboard.writeText = () => { throw new Error("Simulated clipboard failure"); };
    });
    try {
      await frame.locator("#insert-btn").click();
      await page.waitForFunction(() => document.getElementById("toast").textContent.startsWith("Could not copy"));
      await frame.waitForFunction(() => !document.getElementById("insert-btn").disabled);
      assert.equal(await visible(), true);
      assert.equal(await value(frame), "x+1");
      assert.equal(await frame.locator(".btn.is-copied").count(), 0);
      assert.equal(await frame.evaluate(() => localStorage.getItem("mathpaster_history")), history);
    } finally {
      await application.evaluate(({ clipboard }) => { clipboard.writeText = globalThis.testWriteClipboard; delete globalThis.testWriteClipboard; });
    }
  });
  await scenario("pin button updates the actual window", async () => {
    await page.locator("#pin-button").click();
    await page.waitForFunction(() => document.getElementById("pin-button").getAttribute("aria-pressed") === "false");
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()), false);
    await page.locator("#pin-button").click();
    await page.waitForFunction(() => document.getElementById("pin-button").getAttribute("aria-pressed") === "true");
  });
  await scenario("new equation is undoable; virtual keyboard and matrix picker work", async () => {
    await frame.locator("#new-equation-btn").click();
    assert.equal(await value(frame), "");
    await page.keyboard.press("Control+z");
    await frame.waitForFunction(() => document.getElementById("mf").value === "x+1");
    await frame.locator("#keyboard-btn").click();
    await frame.waitForFunction(() => window.mathVirtualKeyboard.visible);
    assert.equal(await frame.locator("#keyboard-window").isVisible(), true);
    await page.screenshot({ path: path.join(profile, "desktop-keyboard.png"), animations: "disabled" });
    await frame.locator('#keyboard-container .MLK__keycap:visible').filter({ hasText: /7/ }).click();
    assert.match(await value(frame), /7/);
    await setEquation(frame, "x+1");
    await page.keyboard.press("Escape");
    await frame.waitForFunction(() => !window.mathVirtualKeyboard.visible);
    assert.equal(await visible(), true);
    await frame.locator('.cat-tab[data-key="Linear Algebra"]').click();
    await frame.locator('.pal-btn[title="[ ]"]').click();
    await frame.getByRole("button", { name: "2 by 3 matrix", exact: true }).click();
    await frame.waitForFunction(() => document.getElementById("mf").value.includes("\\begin{bmatrix}"));
    await setEquation(frame, "x+1");
    await frame.locator('.cat-tab[data-key="Common"]').click();
    await frame.locator("#set-showLatexBar").check();
    assert.match(await frame.locator("#latex-code").textContent(), /x\+1/);
    await frame.locator("#set-showLatexBar").uncheck();
  });
  await scenario("autostart toggles a real entry inside the isolated profile", async () => {
    const entry = path.join(env.XDG_CONFIG_HOME, "autostart", "com.mathpaster.MathPaster.desktop");
    await frame.locator("#settings-btn").click();
    await frame.locator("#desktop-autostart-toggle").check();
    await waitFor(async () => fs.existsSync(entry), "autostart entry");
    assert.match(fs.readFileSync(entry, "utf8"), /--hidden/);
    await frame.waitForFunction(() => !document.getElementById("desktop-autostart-toggle").disabled);
    await frame.locator("#desktop-autostart-toggle").uncheck();
    await waitFor(async () => !fs.existsSync(entry), "remove autostart entry");
    await page.keyboard.press("Escape");
  });
  await scenario("settings, Escape, and light theme cover the whole window", async () => {
    await frame.locator("#settings-btn").click();
    await frame.locator('summary').filter({ hasText: /^Theme$/ }).click();
    await frame.locator('[data-preset="daylight"]').click();
    await page.waitForFunction(() => document.documentElement.classList.contains("theme-light"));
    await page.keyboard.press("Escape");
    await frame.waitForFunction(() => !document.getElementById("settings-overlay").classList.contains("visible"));
    assert.equal(await visible(), true);
    await page.waitForFunction(() => !document.getElementById("toast").classList.contains("visible"));
    await page.screenshot({ path: path.join(profile, "desktop-light.png") });
  });
  await scenario("license modal Escape dismisses the modal without hiding the app", async () => {
    await frame.locator(".new-tab-chip").click();
    await frame.waitForFunction(() => document.getElementById("pro-overlay").classList.contains("visible"));
    await page.keyboard.press("Escape");
    await frame.waitForFunction(() => !document.getElementById("pro-overlay").classList.contains("visible"));
    assert.equal(await visible(), true);
  });
  await scenario("license errors recover; mocked activation unlocks snippets and custom palettes", async () => {
    let serviceFails = true;
    await application.context().route("https://api.lemonsqueezy.com/**", route => route.fulfill({
      status: serviceFails ? 503 : 200, contentType: "application/json",
      body: JSON.stringify(serviceFails ? { error: "Offline test" } : {
        activated: true, meta: { store_id: 405445 }, instance: { id: "test-only-instance" }
      })
    }));
    await frame.locator("#settings-btn").click();
    await frame.locator("#pro-settings-group summary").click();
    await frame.locator("#license-key-input").fill("test-only-not-a-real-license");
    await frame.locator("#license-activate-btn").click();
    await frame.waitForFunction(() => document.getElementById("license-msg").textContent.includes("unavailable"));
    assert.equal(await frame.locator("#license-activate-btn").isEnabled(), true);
    serviceFails = false;
    await frame.locator("#license-activate-btn").click();
    await frame.waitForFunction(() => document.getElementById("license-status").textContent.startsWith("Pro active"));
    await page.screenshot({ path: path.join(profile, "desktop-settings.png") });
    await page.keyboard.press("Escape");
    await frame.locator("#snippets-btn").click();
    await frame.locator("#snippet-name-input").fill("Saved test equation");
    await frame.locator("#snippet-save-btn").click();
    assert.equal(await frame.locator("#snippets-list .entry-row").count(), 1);
    await page.keyboard.press("Escape");
    await frame.locator("#new-equation-btn").click();
    await frame.locator("#snippets-btn").click();
    await frame.locator("#snippets-list .entry-row").focus();
    await page.keyboard.press("Enter");
    assert.equal(await value(frame), "x+1");
    await frame.locator(".new-tab-chip").click();
    await frame.locator("#tab-name-input").fill("Test symbols");
    await frame.locator("#tab-mf").evaluate(el => { el.value = "\\alpha"; });
    await frame.locator("#tab-add-btn").click();
    await frame.locator("#tab-save-btn").click();
    assert.equal(await frame.locator(".cat-tab.active").textContent(), "Test symbols✎");
    await frame.locator("#palette .pal-btn").click();
    assert.match(await value(frame), /\\alpha/);
    await setEquation(frame, "x+1");
    await frame.locator('.cat-tab[data-key="Common"]').click();
  });
  await scenario("compact layout keeps native-sized controls and visible footer", async () => {
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 120, y: 100, width: 500, height: 440 }));
    await frame.waitForFunction(() => window.innerWidth === 500);
    const bounds = await frame.evaluate(() => {
      const button = document.getElementById("insert-btn").getBoundingClientRect();
      const editor = document.getElementById("editor-scale").getBoundingClientRect();
      return { bottom: button.bottom, right: button.right, height: button.height, scale: getComputedStyle(document.getElementById("editor-scale")).transform, width: editor.width, viewport: [innerWidth, innerHeight] };
    });
    assert(bounds.bottom <= bounds.viewport[1] && bounds.right <= bounds.viewport[0]);
    assert(bounds.height >= 40);
    assert.equal(bounds.scale, "none");
    await page.screenshot({ path: path.join(profile, "desktop-compact.png") });
  });
  await scenario("normal app quit exits without close-to-tray deadlock", async () => {
    await application.close(); application = null;
  });
  // The second launch shares this suite's isolated profile, including its draft.
  ({ page, frame } = await launch(true));
  await scenario("restart restores position, size, theme, draft, and hidden launch", async () => {
    const bounds = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
    assert.deepEqual(bounds, { x: 120, y: 100, width: 500, height: 440 });
    assert.equal(await visible(), false);
    await show();
    await frame.waitForFunction(() => document.getElementById("mf").value === "x+1");
    await page.waitForFunction(() => document.documentElement.classList.contains("theme-light"));
    assert.equal(await frame.locator('.cat-tab').filter({ hasText: "Test symbols" }).count(), 1);
  });
  await scenario("malformed saved data cannot prevent editor startup", async () => {
    await frame.evaluate(() => {
      localStorage.setItem("mathpaster_custom_tabs", JSON.stringify([null, { id: "bad", symbols: [null] }]));
      localStorage.setItem("mathpaster_default_overrides", JSON.stringify({ Common: { symbols: null } }));
      localStorage.setItem("mathpaster_history", JSON.stringify([null, { latex: 42 }]));
      localStorage.setItem("mathpaster_settings", JSON.stringify({ fontSize: "broken", windowWidth: -200, preset: "missing" }));
    });
    await page.reload();
    await page.waitForFunction(() => document.querySelector("#editor-frame")?.contentDocument?.querySelector("#loading.hidden"));
    frame = await (await page.locator("#editor-frame").elementHandle()).contentFrame();
    await frame.waitForFunction(() => document.getElementById("mf").value === "x+1");
    assert.equal(await frame.locator(".cat-tab").count() > 1, true);
    await frame.locator("#history-btn").click();
    assert.equal(await frame.locator("#history-list .entry-row").count(), 0);
    await page.keyboard.press("Escape");
  });
  assert.deepEqual(failures, [], "No uncaught renderer errors or GPU crashes");
  console.log("Desktop end-to-end checks passed.");
})().catch(async error => {
  console.error(error);
  console.error("Renderer/GPU errors:", failures);
  try { await (await application.firstWindow()).screenshot({ path: path.join(profile, "failure.png") }); } catch {}
  process.exitCode = 1;
}).finally(async () => {
  if (application) await application.close();
});
