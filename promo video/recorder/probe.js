/* Quick headless probe: type a key sequence into the editor and print the
   resulting LaTeX. "|" in the sequence = ArrowRight. No video recorded.
   Usage: node probe.js "(int_0^pi|sin(t)^2dt)/1+1/(1+1/2|)||"
*/
const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("http://localhost:8077/promo%20video/recorder/stage.html");
  await page.frameLocator("#mathpaster-iframe").locator("#mf").waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate(() => window.__stage.openOverlay());
  await page.waitForTimeout(800);

  /* DSL: "|" ArrowRight, "~" Enter, ">" End, other chars typed literally */
  for (const ch of process.argv[2] || "") {
    if (ch === "|") await page.keyboard.press("ArrowRight");
    else if (ch === "~") await page.keyboard.press("Enter");
    else if (ch === ">") await page.keyboard.press("End");
    else await page.keyboard.type(ch);
    await page.waitForTimeout(35);
  }

  const fr = page.frames().find((f) => f.url().includes("editor.html"));
  console.log("LATEX:", await fr.evaluate(() => document.getElementById("mf").value));
  await browser.close();
})();
