import fs from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import {
  createCaptureWorkspace,
  HOST,
  publishCapture,
  publishFailedCapture,
  verifyArchivedDeployment,
} from "./capture-policy.mjs";

const archiveDirectory = new URL(".", import.meta.url).pathname;
const provenance = await verifyArchivedDeployment();
const workspace = await createCaptureWorkspace({ archiveDirectory, label: "config-hosted" });
let browser;
try {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "/tmp/uibeat-pw-node_modules/playwright-core/index.mjs");
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? "/home/admin/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const result = { status: "complete", host: HOST, provenance, capturedAt: new Date().toISOString(), browser: browser.version(), pages: [] };
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }]) {
    for (const route of ["/style-guide/config-menu", "/"]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.name === "phone" ? 2 : 1 });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(20_000);
        await page.goto(`${HOST}${route}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
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
          await page.screenshot({ path: path.join(workspace.staging, `${prefix}-${viewport.name}-${destination}.png`), fullPage: false });
          destinations.push(state);
        }
        result.pages.push({ route, viewport, url: page.url(), destinations });
      } finally {
        await context.close();
      }
    }
  }
  await browser.close();
  browser = undefined;
  await fs.writeFile(path.join(workspace.staging, "hosted-verification.json"), `${JSON.stringify(result, null, 2)}\n`);
  await publishCapture(workspace);
  console.log(`Verified ${result.pages.length} hosted route/viewport combinations across all four destinations in ${workspace.destination}`);
} catch (error) {
  if (browser) await browser.close().catch(() => {});
  await publishFailedCapture({ ...workspace, error });
  throw error;
}
