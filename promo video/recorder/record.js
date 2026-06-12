/* MathPaster promo clip recorder.
   Drives the real extension editor on a mock chat stage and records
   1920x1080 webm clips into raw/. Usage:
     node record.js            # all clips
     node record.js overview   # one clip
*/
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const STAGE = "http://localhost:8077/promo%20video/recorder/stage.html";
const CHROME = "/usr/bin/google-chrome";

/* COMPOSITE=1 → tightened pacing, recorded into raw/composite/ for the 60s
   assembly. Capture stays 1080p: CSS-zooming the stage body breaks
   Playwright's click mapping inside the editor iframe, and the composite's
   max 1.08x push-in only costs an ~8% upscale — invisible for UI content. */
const COMPOSITE = !!process.env.COMPOSITE;
const RAW = path.join(__dirname, COMPOSITE ? "raw/composite" : "raw");
const VIEW = { width: 1920, height: 1080 };

/* wait() is wall-clock; sleep()/hold() compress in composite mode to hit
   the 60s budget (sleep also paces glide/drag interpolation steps). */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sleep = (ms) => wait(Math.round(ms * (COMPOSITE ? 0.8 : 1)));
const hold = (ms) => wait(Math.round(ms * (COMPOSITE ? 0.5 : 1)));
const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/* ── event timeline (consumed by compose.js for typing SFX) ── */
let EVENTS = [];
let T0 = 0;
const logEvent = (type) => EVENTS.push({ t: Date.now() - T0, type });

async function typeMath(page, text, delay = 110) {
  const d = Math.round(delay * (COMPOSITE ? 0.72 : 1));
  for (const ch of text) {
    await page.keyboard.type(ch);
    logEvent("key");
    await wait(d);
  }
}

async function pressKey(page, key) {
  await page.keyboard.press(key);
  logEvent("key");
}

let cx = 1400, cy = 760;

async function setCursor(page, x, y) {
  await page.evaluate(([a, b]) => window.__stage.setCursor(a, b), [x, y]);
}

async function glide(page, x, y, ms = 650) {
  const steps = Math.max(12, Math.round(ms / 25));
  const sx = cx, sy = cy;
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    const nx = sx + (x - sx) * t;
    const ny = sy + (y - sy) * t;
    await page.mouse.move(nx, ny);
    await setCursor(page, nx, ny);
    await sleep(ms / steps);
  }
  cx = x; cy = y;
}

async function clickXY(page, x, y, ms = 650) {
  await glide(page, x, y, ms);
  await page.evaluate(() => window.__stage.clickPulse());
  await page.mouse.down();
  logEvent("click");
  await sleep(80);
  await page.mouse.up();
  await sleep(150);
}

async function clickEl(page, locator, ms = 650) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("no bounding box for locator");
  await clickXY(page, box.x + box.width / 2, box.y + box.height / 2, ms);
}

/* drag from current cursor position to (x, y) with the button held */
async function dragTo(page, x, y, ms = 900) {
  await page.mouse.down();
  await sleep(120);
  const steps = Math.max(15, Math.round(ms / 25));
  const sx = cx, sy = cy;
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    const nx = sx + (x - sx) * t;
    const ny = sy + (y - sy) * t;
    await page.mouse.move(nx, ny);
    await setCursor(page, nx, ny);
    await sleep(ms / steps);
  }
  await page.mouse.up();
  cx = x; cy = y;
  await sleep(150);
}

const cap = (page, text) => page.evaluate((t) => window.__stage.setCaption(t), text);
const hudKeys = (page, keys, hold = 1600) =>
  page.evaluate(([k, h]) => window.__stage.showKeys(k, h), [keys, hold]);

const efr = (page) => page.frames().find((f) => f.url().includes("/mathlive/editor.html"));
const fl = (page) => page.frameLocator("#mathpaster-iframe");

async function openEditor(page) {
  await page.evaluate(() => window.__stage.openOverlay());
  await sleep(1000);
}

/* ───────────────────────── clips ───────────────────────── */

/* AI reply — values verified by hand:
   ∫₀^π sin²t dt = π/2;  1 + 1/(1 + 1/2) = 5/3;  (π/2)/(5/3) = 3π/10;
   (3π/10)·[[1,2],[3,4]] = [[3π/10, 3π/5], [9π/10, 6π/5]] */
const AI_REPLY =
  "Nice one! ∫₀^π sin²t dt = π/2, and the continued fraction is 5/3 — " +
  "so you're scaling the matrix by 3π/10:\n" +
  "[ 3π/10   3π/5 ]\n[ 9π/10   6π/5 ]";

async function overview(page) {
  const f = fl(page);
  await cap(page, "Some math is brutal to type");
  await hold(2000);
  await cap(page, "Put your cursor in any text box…");
  await clickEl(page, page.locator("#chat-input"), 800);
  await typeMath(page, "Evaluate this for me: ", 40);
  await sleep(400);
  await cap(page, "…and press Ctrl + M");
  await hudKeys(page, ["Ctrl", "M"], 1600);
  await sleep(1000);
  await pressKey(page, "Control+m");
  await sleep(1200);
  await cap(page, "Integrals, matrices, fractions — just type");
  /* (∫₀^π sin²(t) dt) / (1 + 1/(1 + 1/2)) · [[1,2],[3,4]]
     Sequence verified with probe.js: "int" inserts a bounds template with
     the cursor in the UPPER placeholder; ArrowRight hops to the lower one;
     End escapes the template. */
  await typeMath(page, "(int", 110);
  await typeMath(page, "pi", 140); // upper bound
  await pressKey(page, "ArrowRight"); // → lower placeholder
  await typeMath(page, "0", 140);
  await pressKey(page, "End"); // escape the bounds
  await typeMath(page, "sin(t)^2dt)", 110);
  await typeMath(page, "/", 140);
  await sleep(300);
  await typeMath(page, "1+1/(1+1/2", 120);
  await pressKey(page, "ArrowRight"); // leave the innermost fraction
  await typeMath(page, ")", 120);
  await pressKey(page, "ArrowRight"); // leave the nested fraction
  await pressKey(page, "ArrowRight"); // leave the main denominator
  await sleep(300);
  await typeMath(page, "*", 130);
  await sleep(300);
  /* matrix from the palette: Linear Algebra → [ ] → 2×2 → fill via Tab */
  await clickEl(page, f.locator(".cat-tab", { hasText: "Linear Algebra" }), 700);
  await sleep(250);
  await clickEl(page, f.locator(".pal-btn").first(), 600);
  await sleep(400);
  await clickEl(page, f.locator(".matrix-cell").nth(6), 700); // 2×2
  await sleep(600);
  for (let i = 1; i <= 4; i++) {
    await typeMath(page, String(i), 0);
    if (i < 4) await pressKey(page, "Tab");
    await sleep(140);
  }
  await sleep(1000);
  await cap(page, "");
  await clickEl(page, f.locator("#insert-btn"), 900);
  await sleep(1100);
  await clickEl(page, page.locator("#send-btn"), 800);
  await sleep(500);
  await cap(page, "Your AI gets it — instantly");
  const replyDelay = COMPOSITE ? 18 : 28;
  await page.evaluate(([t, d]) => window.__stage.aiReply(t, d), [AI_REPLY, replyDelay]);
  await wait(1300 + AI_REPLY.length * replyDelay + 400); // dots + typed-out reply (wall-clock)
  await cap(page, "Works in any Chromium browser — on any site");
  await hold(2400);
}

async function backslash(page) {
  const f = fl(page);
  await cap(page, "Need a symbol? Type \\ and its name");
  await hold(1600);
  await openEditor(page);
  await typeMath(page, "\\nabla", 230);
  await sleep(1000); // suggestion popover holds on screen
  await pressKey(page, "Enter");
  await sleep(500);
  await typeMath(page, "f=0", 140);
  await sleep(1100);
  await pressKey(page, "Control+a");
  await pressKey(page, "Delete");
  await cap(page, "Suggestions appear as you type");
  await sleep(400);
  await typeMath(page, "\\oint", 240);
  await sleep(1100);
  await pressKey(page, "Enter");
  await sleep(400);
  await typeMath(page, "E*dA", 150);
  await sleep(900);
  await cap(page, "Every LaTeX symbol — at your fingertips");
  await clickEl(page, f.locator("#insert-btn"), 900);
  await sleep(900);
  await hold(2200);
}

async function autocomplete(page) {
  await cap(page, "Auto-Symbols: just type the name");
  await sleep(1200);
  await openEditor(page);
  await typeMath(page, "alpha+beta=", 140);
  await sleep(500);
  await typeMath(page, "pi/2", 140);
  await sleep(600);
  await pressKey(page, "ArrowRight"); // step out of the denominator
  await sleep(300);
  await cap(page, "alpha → α   ·   pi → π   ·   sqrt → √");
  await typeMath(page, "+sqrt(2)", 140);
  await sleep(1600);
  await cap(page, "The LaTeX writes itself — see for yourself");
  const f = fl(page);
  const latexBar = await f.locator("#latex-preview").boundingBox();
  if (latexBar) await glide(page, latexBar.x + latexBar.width / 2, latexBar.y + 10, 800);
  await hold(2600);
}

async function keyboard(page) {
  const f = fl(page);
  await cap(page, "Every symbol, one click away");
  await sleep(1000);
  await openEditor(page);
  await clickEl(page, f.locator(".cat-tab", { hasText: "Calculus" }), 700);
  await sleep(300);
  await clickEl(page, f.locator(".pal-btn").first(), 600);
  await sleep(900);
  await page.keyboard.press("Control+a"); // clear the integral for the matrix demo
  await page.keyboard.press("Delete");
  await cap(page, "Matrices? Just pick a size.");
  await clickEl(page, f.locator(".cat-tab", { hasText: "Linear Algebra" }), 700);
  await sleep(300);
  await clickEl(page, f.locator(".pal-btn").first(), 600);
  await sleep(500);
  /* matrix size picker: 5x5 grid, choose 3x3 (row-major index 12) */
  await clickEl(page, f.locator(".matrix-cell").nth(12), 800);
  await sleep(800);
  /* fill the matrix — Tab hops between placeholders */
  for (let i = 1; i <= 9; i++) {
    await page.keyboard.type(String(i));
    if (i < 9) await page.keyboard.press("Tab");
    await sleep(130);
  }
  await sleep(1000);
  await cap(page, "A real math keyboard — drag it, resize it");
  const fr = efr(page);
  await fr.evaluate(() => window.mathVirtualKeyboard.show());
  await sleep(900);
  const header = await f.locator("#keyboard-header").boundingBox();
  if (header) {
    await glide(page, header.x + header.width / 2, header.y + header.height / 2, 700);
    await dragTo(page, 430, 330, 900); // park it left-middle, clear of the caption
  }
  const handle = await f.locator('#keyboard-window .kbd-resize-handle[data-handle="br"]').boundingBox();
  if (handle) {
    await glide(page, handle.x + handle.width / 2, handle.y + handle.height / 2, 600);
    await dragTo(page, handle.x + handle.width / 2 + 220, handle.y + handle.height / 2 + 100, 900);
  }
  await sleep(1800);
}

async function shortcuts(page) {
  await cap(page, "Hands on the keyboard? Stay there.");
  await sleep(1400);
  await hudKeys(page, ["Ctrl", "M"], 1500);
  await page.keyboard.press("Control+m");
  await sleep(1100);
  await page.keyboard.type("A=pir^2", { delay: 130 });
  await sleep(700);
  await cap(page, "Insert without touching the mouse");
  await hudKeys(page, ["Ctrl", "⏎"], 1500);
  await sleep(900);
  await page.keyboard.press("Control+Enter");
  await sleep(1400);
  await cap(page, "Toggle back any time");
  await hudKeys(page, ["Ctrl", "M"], 1400);
  await page.keyboard.press("Control+m");
  await sleep(1300);
  await hudKeys(page, ["Esc"], 1300);
  await page.keyboard.press("Escape");
  await sleep(700);
  await cap(page, "Fast in. Fast out.");
  await sleep(2000);
}

async function shortcuts_modes(page) {
  const f = fl(page);
  await cap(page, "Inline mode → $ … $");
  await sleep(1000);
  await openEditor(page);
  await page.keyboard.type("E=mc^2", { delay: 130 });
  await sleep(800);
  await clickEl(page, f.locator("#insert-btn"), 800);
  await sleep(1300);
  await page.keyboard.type("  ", { delay: 60 }); // separate the two inserts in chat
  await openEditor(page);
  await page.keyboard.type("a/b", { delay: 130 });
  await sleep(400);
  await cap(page, "Block mode → $$ … $$");
  await clickEl(page, f.locator('.mode-label[data-mode="block"]'), 800);
  await sleep(700);
  await clickEl(page, f.locator("#insert-btn"), 800);
  await sleep(1200);
  await cap(page, "Match any chatbot’s math format");
  await sleep(2400);
}

async function customization(page) {
  const f = fl(page);
  await cap(page, "Make it yours");
  await sleep(1000);
  await openEditor(page);
  await page.keyboard.type("x^2+y^2=r^2", { delay: 90 }); // give the theme something to recolor
  await sleep(400);
  await clickEl(page, f.locator("#settings-btn"), 800);
  await sleep(600);
  /* open the "Theme Colors" accordion (5th details element) */
  await clickEl(page, f.locator("#settings-panel details").nth(4).locator("summary"), 700);
  await sleep(500);
  const hue = await f.locator("#set-primaryHue").boundingBox();
  if (hue) {
    const cur = parseFloat(await f.locator("#set-primaryHue").inputValue());
    await glide(page, hue.x + hue.width * (cur / 360), hue.y + hue.height / 2, 700);
    await cap(page, "Any accent color — live");
    await dragTo(page, hue.x + hue.width * (335 / 360), hue.y + hue.height / 2, 1300);
  }
  await sleep(700);
  const bg = await f.locator("#set-bgHue").boundingBox();
  if (bg) {
    const cur = parseFloat(await f.locator("#set-bgHue").inputValue());
    await glide(page, bg.x + bg.width * (cur / 360), bg.y + bg.height / 2, 700);
    await cap(page, "Background too");
    await dragTo(page, bg.x + bg.width * (150 / 360), bg.y + bg.height / 2, 1300);
  }
  await sleep(800);
  await clickEl(page, f.locator("#close-settings-btn"), 700);
  await cap(page, "Your editor. Your look.");
  await sleep(2200);
}

const CLIPS = {
  promo_overview: overview,
  promo_autocomplete: autocomplete,
  promo_backslash: backslash,
  promo_keyboard: keyboard,
  promo_shortcuts: shortcuts,
  promo_shortcuts_modes: shortcuts_modes,
  promo_customization: customization,
};

async function makeClip(browser, name, fn) {
  const context = await browser.newContext({
    viewport: VIEW,
    recordVideo: { dir: RAW, size: VIEW },
  });
  // Enlarge the editor via its own settings system so the product
  // dominates the 1080p frame (authentic look, correct hit-testing).
  await context.addInitScript(() => {
    if (location.pathname.includes("/mathlive/editor.html")) {
      localStorage.setItem(
        "mathpaster_settings",
        JSON.stringify({
          popupWidth: 1000,
          popupHeight: 700,
          symbolGridWidth: 66,
          symbolHeight: 58,
          symbolFontSize: 28,
          tabPaddingH: 24,
          tabPaddingV: 13,
          tabFontSize: 16,
          actionBtnPaddingX: 34,
          actionBtnPaddingY: 15,
          actionBtnFontSize: 20,
          showLatexBar: true,
        })
      );
    }
  });
  const page = await context.newPage();
  EVENTS = [];
  T0 = Date.now(); // video capture starts ≈ page creation
  await page.goto(STAGE);
  await fl(page).locator("#mf").waitFor({ state: "visible", timeout: 30000 });
  await sleep(900); // let fonts/layout settle
  cx = 1400; cy = 760;
  await setCursor(page, cx, cy);
  let videoPath = null;
  try {
    await fn(page);
  } finally {
    const video = page.video();
    await context.close();
    videoPath = await video.path();
  }
  const dest = path.join(RAW, `${name}.webm`);
  fs.renameSync(videoPath, dest);
  fs.writeFileSync(
    path.join(RAW, `${name}.json`),
    JSON.stringify({ name, composite: COMPOSITE, events: EVENTS })
  );
  console.log(`✓ recorded ${name} (${EVENTS.length} events)`);
}

(async () => {
  fs.mkdirSync(RAW, { recursive: true });
  const wanted = process.argv.slice(2);
  const names = wanted.length
    ? wanted.map((w) => (w.startsWith("promo_") ? w : `promo_${w}`))
    : Object.keys(CLIPS);

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  for (const name of names) {
    if (!CLIPS[name]) { console.error(`unknown clip: ${name}`); continue; }
    await makeClip(browser, name, CLIPS[name]);
  }
  await browser.close();
})();
