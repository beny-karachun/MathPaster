/* MathPaster promo clip recorder.
   Drives the real extension editor on a mock chat stage and records
   1920x1080 webm clips into raw/. Usage:
     node record.js            # all clips
     node record.js overview   # one clip
*/
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const STAGE = "http://localhost:8077/promo%20video/recorder/stage-real-2026.html";
const CHROME = "/usr/bin/google-chrome";

/* COMPOSITE=1 → tightened pacing, recorded into raw/real-2026/ for the 60s
   assembly. Capture stays 1080p: CSS-zooming the stage body breaks
   Playwright's click mapping inside the editor iframe, and the composite's
   max 1.08x push-in only costs an ~8% upscale — invisible for UI content. */
const COMPOSITE = !!process.env.COMPOSITE;
const RAW = path.join(__dirname, COMPOSITE ? "raw/real-2026" : "raw/real-2026");
const VIEW = { width: 1920, height: 1080 };

/* wait() is wall-clock; sleep()/hold() compress in composite mode to keep the
   showcase snappy (sleep also paces glide/drag interpolation steps). The speed
   comes from HERE, at capture time — never from post-hoc setpts resampling,
   which stutters against the 25fps screencast. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sleep = (ms) => wait(Math.round(ms * (COMPOSITE ? 0.42 : 1)));
const hold = (ms) => wait(Math.round(ms * (COMPOSITE ? 0.3 : 1)));
const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/* ── event timeline (consumed by compose.js for typing SFX) ── */
let EVENTS = [];
let T0 = 0;
const logEvent = (type) => EVENTS.push({ t: Date.now() - T0, type });

async function typeMath(page, text, delay = 110) {
  const d = Math.round(delay * (COMPOSITE ? 0.45 : 1));
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

/* The visible cursor animates via ONE CSS transition (compositor-smooth, moves
   every captured frame). The real Playwright mouse follows underneath at a few
   coarse waypoints paced by absolute wall-clock targets, so CDP latency can't
   stretch the glide or desync it from the CSS animation. */
async function glide(page, x, y, ms = 650) {
  /* 0.7, not lower: at 25fps a sub-400ms flick moves >50px/frame and reads as
     skipping — slightly longer glides keep per-frame displacement smooth. */
  const dur = Math.round(ms * (COMPOSITE ? 0.7 : 1));
  await page.evaluate(([a, b, d]) => window.__stage.glideCursor(a, b, d), [x, y, dur]);
  const steps = 5;
  const sx = cx, sy = cy;
  const t0 = Date.now();
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    await page.mouse.move(sx + (x - sx) * t, sy + (y - sy) * t);
    const dt = t0 + (dur * i) / steps - Date.now();
    if (dt > 0) await wait(dt);
  }
  cx = x; cy = y;
  await wait(30); // let the CSS transition settle before any click
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

/* drag from current cursor position to (x, y) with the button held.
   Here the dragged UI follows the REAL mouse, so the cursor must stay glued to
   it: keep per-step setCursor, but pace steps by absolute time at ~25/s so the
   motion matches the capture rate instead of being stretched by CDP latency. */
async function dragTo(page, x, y, ms = 900) {
  await page.mouse.down();
  await sleep(120);
  const dur = Math.round(ms * (COMPOSITE ? 0.7 : 1));
  const steps = Math.max(10, Math.round(dur / 40));
  const sx = cx, sy = cy;
  const t0 = Date.now();
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    const nx = sx + (x - sx) * t;
    const ny = sy + (y - sy) * t;
    await page.mouse.move(nx, ny);
    await setCursor(page, nx, ny);
    const dt = t0 + (dur * i) / steps - Date.now();
    if (dt > 0) await wait(dt);
  }
  await page.mouse.up();
  cx = x; cy = y;
  await sleep(150);
}

/* ── per-clip localStorage seeds (applied to the editor iframe before load) ──
   `age` is ms-before-now; the init script converts it to an absolute ts so the
   relative timestamps ("2m ago") look right at record time. */
const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
const SEEDS = {
  promo_history: {
    history: [
      { latex: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", mode: "inline", age: 3 * MIN },
      { latex: "\\frac{\\int_0^{\\pi}\\sin^2(t)\\:dt}{1+\\frac{1}{1+\\frac{1}{2}}}\\cdot\\begin{bmatrix}1 & 2\\\\ 3 & 4\\end{bmatrix}", mode: "inline", age: 21 * MIN },
      { latex: "E=mc^2", mode: "inline", age: 2 * HOUR },
      { latex: "\\oint\\vec{E}\\cdot d\\vec{A}=\\frac{Q}{\\varepsilon_0}", mode: "block", age: 5 * HOUR },
      { latex: "A=\\pi r^2", mode: "inline", age: 26 * HOUR },
    ],
  },
  promo_snippets: {
    raw: {
      mathpaster_snippet_tabs: [
        { id: "st_default", name: "My Snippets" },
        { id: "st_phys", name: "Physics" },
      ],
      mathpaster_snippet_active: "st_default",
    },
    snippets: [
      { id: "s_1", latex: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi=\\hat{H}\\Psi", mode: "inline", name: "Schrödinger equation", age: 2 * DAY, tabId: "st_phys" },
      { id: "s_2", latex: "\\oint\\vec{E}\\cdot d\\vec{A}=\\frac{Q_{enc}}{\\varepsilon_0}", mode: "inline", name: "Gauss's law", age: 5 * DAY, tabId: "st_phys" },
      { id: "s_3", latex: "F=G\\frac{m_1m_2}{r^2}", mode: "inline", name: "Newton's gravity", age: 6 * DAY, tabId: "st_phys" },
    ],
  },
};

const cap = (page, text) => page.evaluate((t) => window.__stage.setCaption(t), text);
const hudKeys = (page, keys, hold = 1600) =>
  page.evaluate(([k, h]) => window.__stage.showKeys(k, h), [keys, hold]);

const efr = (page) => page.frames().find((f) => f.url().includes("/mathlive/editor.html"));
const fl = (page) => page.frameLocator("#mathpaster-iframe");

async function openEditor(page) {
  await page.evaluate(() => window.__stage.openOverlay());
  await sleep(1000);
}

async function realIntegral(page) {
  await cap(page, 'Type int. MathPaster builds the integral.');
  await openEditor(page);
  await typeMath(page, 'int', 200);
  await hold(850);
  await typeMath(page, '1', 130);
  await pressKey(page, 'ArrowRight');
  await typeMath(page, '0', 130);
  await pressKey(page, 'End');
  await typeMath(page, 'x^2', 160);
  await pressKey(page, 'ArrowRight');
  await typeMath(page, 'dx', 160);
  await hold(1800);
  console.log('Integral:', await fl(page).locator('#mf').evaluate(el=>el.value));
  await cap(page, 'Insert real LaTeX directly into your text box.');
  await clickEl(page, fl(page).locator('#insert-btn'));
  await hold(1700);
}
async function realFraction(page) {
  await cap(page, 'Press / for a fraction. Type sqrt for a square root.');
  await openEditor(page);
  await typeMath(page, '(x+1)/', 190);
  await hold(650);
  await typeMath(page, 'sqrt', 170);
  await hold(650);
  await typeMath(page, 'x^2', 160);
  await pressKey(page, 'ArrowRight');
  await typeMath(page, '+1', 160);
  await hold(1700);
  console.log('Fraction:', await fl(page).locator('#mf').evaluate(el=>el.value));
}
async function realMatrix(page) {
  await cap(page, 'Choose the brackets. Pick a size. Fill the cells.');
  await openEditor(page);
  await clickEl(page, fl(page).locator('.cat-tab[data-key="Linear Algebra"]'));
  await clickEl(page, fl(page).locator('.pal-btn').first());
  await clickEl(page, fl(page).locator('.matrix-cell[data-r="2"][data-c="2"]'));
  await wait(800);
  for(let i=1;i<=4;i++){await typeMath(page,String(i),140);if(i<4) await pressKey(page,'Tab');await wait(220);}
  await hold(1700);
  console.log('Matrix:', await fl(page).locator('#mf').evaluate(el=>el.value));
}
async function realCommands(page) {
  await cap(page, 'Type a backslash. Find the symbol you need.');
  await openEditor(page);
  await typeMath(page, '\\nabla', 230);
  await hold(1300);
  await pressKey(page, 'Enter');
  await typeMath(page, 'f=0', 190);
  await hold(1500);
  await clickEl(page, fl(page).locator('#insert-btn'));
  await hold(1700);
}
async function realStyle(page) {
  await cap(page, 'Make the editor feel like your workspace.');
  await openEditor(page);
  await typeMath(page, 'E=mc^2', 170);
  await hold(800);
  await clickEl(page, fl(page).locator('#settings-btn'));
  await wait(700);
  await clickEl(page, fl(page).locator('.theme-swatch[title="Paper"]'));
  await hold(1000);
  await clickEl(page, fl(page).locator('#close-settings-btn'));
  await hold(1800);
}
const CLIPS = {promo_integral:realIntegral,promo_fraction:realFraction,promo_matrix:realMatrix,promo_commands:realCommands,promo_style:realStyle};

async function makeClip(browser, name, fn) {
  const context = await browser.newContext({
    viewport: VIEW,
    recordVideo: { dir: RAW, size: VIEW },
  });
  // Enlarge the editor via its own settings system so the product
  // dominates the 1080p frame (authentic look, correct hit-testing).
  await context.addInitScript((seed) => {
    if (location.pathname.includes("/mathlive/editor.html")) {
      localStorage.setItem(
        "mathpaster_settings",
        JSON.stringify({
          layoutVersion: 3,
          themePreset: "precision",
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
      if (seed) {
        for (const [k, v] of Object.entries(seed.raw || {})) {
          localStorage.setItem(k, JSON.stringify(v));
        }
        const stamp = (l) => l.map(({ age, ...e }) => ({ ...e, ts: Date.now() - age }));
        if (seed.history) localStorage.setItem("mathpaster_history", JSON.stringify(stamp(seed.history)));
        if (seed.snippets) localStorage.setItem("mathpaster_snippets", JSON.stringify(stamp(seed.snippets)));
      }
    }
  }, SEEDS[name] || null);
  const page = await context.newPage();
  EVENTS = [];
  T0 = Date.now(); // video capture starts ≈ page creation
  await page.goto(STAGE);
  await fl(page).locator("#mf").waitFor({ state: "visible", timeout: 30000 });
  await efr(page).addStyleTag({content:'html {background:#0b0e14!important} body {align-items:center!important;padding-bottom:0!important}'});
  await wait(650); // let fonts/layout settle
  cx = 1400; cy = 760;
  await setCursor(page, cx, cy);
  let videoPath = null;
  try {
    await fn(page);
    await page.screenshot({path:path.join(RAW,name+"-final.png")});
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
