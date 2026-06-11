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
const RAW = path.join(__dirname, "raw");
const CHROME = "/usr/bin/google-chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

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

async function overview(page) {
  const f = fl(page);
  await cap(page, "Writing math in AI chats? There’s a better way.");
  await sleep(2000);
  await clickEl(page, page.locator("#chat-input"), 800);
  await page.keyboard.type("Can you check this for me?  ", { delay: 40 });
  await cap(page, "Press Ctrl + M — anywhere");
  await hudKeys(page, ["Ctrl", "M"], 1800);
  await sleep(1100);
  await page.keyboard.press("Control+m");
  await sleep(1200);
  await cap(page, "Type naturally — watch it become real math");
  await page.keyboard.type("x=(-b+sqrt(b^2-4ac))/(2a)", { delay: 105 });
  await sleep(1500);
  await cap(page, "");
  await clickEl(page, f.locator("#insert-btn"), 900);
  await sleep(1000);
  await cap(page, "Flawless LaTeX — pasted right where you need it");
  await sleep(2800);
}

async function autocomplete(page) {
  await cap(page, "Auto-Symbols: just type the name");
  await sleep(1200);
  await openEditor(page);
  await page.keyboard.type("alpha+beta=", { delay: 140 });
  await sleep(500);
  await page.keyboard.type("pi/2", { delay: 140 });
  await sleep(600);
  await page.keyboard.press("ArrowRight"); // step out of the denominator
  await sleep(300);
  await cap(page, "alpha → α   ·   pi → π   ·   sqrt → √");
  await page.keyboard.type("+sqrt(2)", { delay: 140 });
  await sleep(1600);
  await cap(page, "The LaTeX writes itself — see for yourself");
  const f = fl(page);
  const latexBar = await f.locator("#latex-preview").boundingBox();
  if (latexBar) await glide(page, latexBar.x + latexBar.width / 2, latexBar.y + 10, 800);
  await sleep(2600);
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
  promo_keyboard: keyboard,
  promo_shortcuts: shortcuts,
  promo_shortcuts_modes: shortcuts_modes,
  promo_customization: customization,
};

async function makeClip(browser, name, fn) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
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
  console.log(`✓ recorded ${name}`);
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
