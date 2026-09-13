const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "/tmp/uibeat-pw-node_modules/playwright-core/index.mjs");
import fs from "node:fs/promises";
import assert from "node:assert/strict";

const out = new URL(".", import.meta.url).pathname;
const host = "https://emotitone-solfrege.vercel.app";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/home/admin/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const result = { host, capturedAt: new Date().toISOString(), browser: browser.version(), pages: [] };
try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }]) {
    for (const route of ["/style-guide/config-menu", "/"]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.name === "phone" ? 2 : 1 });
      const page = await context.newPage();
      page.setDefaultTimeout(20_000);
      await page.goto(`${host}${route}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
      if (route === "/") {
        await page.waitForTimeout(2500);
        for (const selector of ['.converged-loader__skip', '[aria-label="Play EmotiTone"]']) {
          const control = page.locator(selector).first();
          if (await control.isVisible()) await control.click();
        }
      }
      await page.locator('[data-testid="config-panel-trigger"]').click();
      const destinations = [];
      for (const destination of ["global", "stage", "deck", "midi"]) {
        const tab = page.locator(`[data-testid="config-tab-${destination}"]`);
        await tab.click();
        await page.waitForTimeout(300);
        const state = await page.evaluate((destination) => ({
          destination,
          selected: document.querySelector(`[data-testid="config-tab-${destination}"]`)?.getAttribute("aria-selected"),
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          activeContent: document.querySelector('[role="tabpanel"]:not([hidden])')?.textContent?.trim().slice(0, 1600) ?? null,
          assets: [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(el => el.getAttribute("src") ?? el.getAttribute("href")),
        }), destination);
        assert.equal(state.selected, "true");
        assert.ok(state.documentWidth <= state.viewportWidth, `${route} ${viewport.name} ${destination} overflows horizontally`);
        const prefix = route === "/" ? "hosted-production" : "hosted";
        await page.screenshot({ path: `${out}${prefix}-${viewport.name}-${destination}.png`, fullPage: false });
        destinations.push(state);
      }
      result.pages.push({ route, viewport, url: page.url(), destinations });
      await context.close();
    }
  }
} finally {
  await fs.writeFile(`${out}hosted-verification.json`, `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
}
console.log(`Verified ${result.pages.length} hosted route/viewport combinations across all four destinations`);
