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
  await wait(900); // real time: typing into a half-inserted matrix garbles cells
  for (let i = 1; i <= 4; i++) {
    await typeMath(page, String(i), 0);
    if (i < 4) await pressKey(page, "Tab");
    await wait(150);
  }
  await sleep(1000);
  await cap(page, "");
  await clickEl(page, f.locator("#insert-btn"), 900);
  await sleep(1100);
  await clickEl(page, page.locator("#send-btn"), 800);
  await sleep(500);
  await cap(page, "Your AI gets it — instantly");
  const replyDelay = COMPOSITE ? 9 : 28;
  await page.evaluate(([t, d]) => window.__stage.aiReply(t, d), [AI_REPLY, replyDelay]);
  await wait(1300 + AI_REPLY.length * replyDelay + 300); // dots + typed-out reply (wall-clock)
  await cap(page, "Works in any Chromium browser — on any site");
  await hold(3200);
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
  await cap(page, "Matrices? Just pick a size.");
  await sleep(900);
  await openEditor(page);
  await clickEl(page, f.locator(".cat-tab", { hasText: "Linear Algebra" }), 700);
  await sleep(300);
  await clickEl(page, f.locator(".pal-btn").first(), 600);
  await wait(300); // real time: size-picker pops before we aim at a cell
  /* matrix size picker: 5x5 grid, choose 3x3 (row-major index 12) */
  await clickEl(page, f.locator(".matrix-cell").nth(12), 800);
  await wait(900); // real time: typing into a half-inserted matrix garbles cells
  /* fill the matrix — Tab hops between placeholders */
  for (let i = 1; i <= 9; i++) {
    await typeMath(page, String(i), 0);
    if (i < 9) await pressKey(page, "Tab");
    await wait(140);
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
  await pressKey(page, "Control+m");
  await sleep(1100);
  await typeMath(page, "A=pir^2", 130);
  await sleep(700);
  await cap(page, "Insert without touching the mouse");
  await hudKeys(page, ["Ctrl", "⏎"], 1500);
  await sleep(900);
  await pressKey(page, "Control+Enter");
  await sleep(1400);
  await cap(page, "Toggle back any time");
  await hudKeys(page, ["Ctrl", "M"], 1400);
  await pressKey(page, "Control+m");
  await sleep(1300);
  await hudKeys(page, ["Esc"], 1300);
  await pressKey(page, "Escape");
  await sleep(700);
  await cap(page, "Fast in. Fast out.");
  await sleep(2000);
}

async function shortcuts_modes(page) {
  const f = fl(page);
  await cap(page, "Inline mode → $ … $");
  await sleep(1000);
  await openEditor(page);
  await typeMath(page, "E=mc^2", 130);
  await sleep(800);
  await clickEl(page, f.locator("#insert-btn"), 800);
  await sleep(1300);
  await typeMath(page, "  ", 60); // separate the two inserts in chat
  await openEditor(page);
  await typeMath(page, "a/b", 130);
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
  await typeMath(page, "x^2+y^2=r^2", 90); // give the theme something to recolor
  await sleep(400);
  await clickEl(page, f.locator("#settings-btn"), 800);
  await wait(500); // real time: settings panel animates in
  /* the Theme <details> ships open — click through curated preset swatches */
  await cap(page, "13 hand-tuned themes — dark and light");
  await clickEl(page, f.locator('.theme-swatch[data-preset="vaporwave"]'), 800);
  await sleep(1200);
  await clickEl(page, f.locator('.theme-swatch[data-preset="daylight"]'), 700); // light mode
  await sleep(1400);
  await clickEl(page, f.locator('.theme-swatch[data-preset="synthwave"]'), 700);
  await sleep(1100);
  await clickEl(page, f.locator("#close-settings-btn"), 700);
  await cap(page, "Your editor. Your look.");
  await sleep(2200);
}

/* ── NEW: custom palette tabs (Pro) ──
   "+ New Tab" → name it → browse the symbol catalog → save → use it.
   Pro is auto-granted in the rig (editor served over http = web-demo mode). */
async function customtabs(page) {
  const f = fl(page);
  await cap(page, "Build your own symbol tabs");
  await sleep(900);
  await openEditor(page);
  await clickEl(page, f.locator(".new-tab-chip"), 800);
  await wait(500); // real time: modal animates in
  await typeMath(page, "Quantum", 95); // name input is auto-focused
  await sleep(400);
  await cap(page, "Pick from the full symbol catalog");
  await clickEl(page, f.locator("#tab-browse-toggle"), 700);
  await wait(450); // real time: picker builds/expands
  await clickEl(page, f.locator("#symbol-search"), 600);
  for (const term of ["hbar", "dagger", "otimes"]) {
    await pressKey(page, "Control+a");
    await typeMath(page, term, 70);
    await sleep(420);
    await clickEl(page, f.locator("#symbol-grid .symbol-cell:not([hidden])").first(), 550);
    await sleep(220);
  }
  await sleep(500);
  await clickEl(page, f.locator("#tab-save-btn"), 800);
  await sleep(900);
  await cap(page, "Your symbols — front and center");
  await clickEl(page, f.locator(".pal-btn").first(), 700); // ℏ
  await sleep(300);
  await typeMath(page, "=h/2pi", 130); // ℏ = h/(2π)
  await pressKey(page, "End");
  await sleep(1000);
  await hold(2000);
}

/* ── NEW: snippets + snippet tabs (Pro) ──
   Type the quadratic formula (sequence probe-verified), save it as a named
   snippet, then pull a seeded formula out of the "Physics" tab and insert it. */
async function snippets(page) {
  const f = fl(page);
  await cap(page, "Type the same formula every week?");
  await sleep(900);
  await openEditor(page);
  await typeMath(page, "x=", 130);
  await typeMath(page, "/", 150); // empty fraction, cursor in numerator
  await sleep(300);
  await typeMath(page, "-b+-", 140); // +- → ±
  await typeMath(page, "sqrt", 150);
  await typeMath(page, "b^2-4ac", 125);
  await pressKey(page, "ArrowRight"); // leave the root
  await pressKey(page, "Tab"); // hop to the denominator
  await typeMath(page, "2a", 140);
  await pressKey(page, "End");
  await sleep(700);
  await cap(page, "Save it as a snippet — once");
  await clickEl(page, f.locator("#snippets-btn"), 800);
  await wait(500); // real time: the panel animates in; don't click mid-slide
  await clickEl(page, f.locator("#snippet-name-input"), 700);
  await typeMath(page, "Quadratic formula", 62);
  await clickEl(page, f.locator("#snippet-save-btn"), 650);
  await sleep(1000);
  await cap(page, "Organize snippets into tabs");
  await clickEl(page, f.locator(".snip-tab", { hasText: "Physics" }), 800);
  await sleep(1300);
  await cap(page, "Your formula sheet — one click away");
  await clickEl(page, f.locator("#snippets-list .entry-row").first(), 800); // Schrödinger
  await sleep(900);
  await clickEl(page, f.locator("#insert-btn"), 800);
  await sleep(1000);
  await hold(2000);
}

/* ── NEW: insert history (free) ──
   Seeded with the expressions "inserted" in earlier scenes; pull one back. */
async function history(page) {
  const f = fl(page);
  await cap(page, "Inserted it before? It's in your history");
  await sleep(900);
  await openEditor(page);
  await clickEl(page, f.locator("#history-btn"), 800);
  await sleep(900);
  await cap(page, "Every insert — saved automatically");
  await sleep(1700);
  await clickEl(page, f.locator("#history-list .entry-row").first(), 800); // quadratic
  await sleep(800);
  await cap(page, "Grab it again in seconds");
  await clickEl(page, f.locator("#insert-btn"), 800);
  await sleep(1000);
  await clickEl(page, page.locator("#send-btn"), 700);
  await sleep(600);
  await hold(1800);
}

const CLIPS = {
  promo_overview: overview,
  promo_autocomplete: autocomplete,
  promo_backslash: backslash,
  promo_keyboard: keyboard,
  promo_customtabs: customtabs,
  promo_snippets: snippets,
  promo_history: history,
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
  await context.addInitScript((seed) => {
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
  await wait(650); // let fonts/layout settle
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
