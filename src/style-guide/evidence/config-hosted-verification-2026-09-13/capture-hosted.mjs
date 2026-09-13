import fs from "node:fs/promises";
import path from "node:path";
import {
  assertHostedDestinationState,
  createCaptureWorkspace,
  HOST,
  publishCapture,
  publishFailedCapture,
  verifyHostedBaseline,
} from "./capture-policy.mjs";

const destinationMarkers = {
  global: '[data-testid="global-public-controls"]',
  stage: '[data-testid="stage-public-controls"]',
  deck: '[data-testid="deck-public-controls"]',
  midi: ".config-panel__midi-grid",
};
const archiveDirectory = new URL(".", import.meta.url).pathname;
const provenance = await verifyHostedBaseline();
const workspace = await createCaptureWorkspace({ archiveDirectory, label: "config-hosted" });
let browser;
try {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "/tmp/uibeat-pw-node_modules/playwright-core/index.mjs");
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? "/home/admin/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const result = { host: HOST, provenance, capturedAt: new Date().toISOString(), browser: browser.version(), pages: [] };
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
          await page.waitForFunction(({ destination, marker }) => {
            const surface = document.querySelector('[data-testid="tabbed-overlay-swipe-surface"]');
            const activePage = surface?.querySelector('.tabbed-overlay-panel__page--current:not([inert])');
            return document.querySelector(`[data-testid="config-tab-${destination}"]`)?.getAttribute("aria-selected") === "true"
              && !surface?.classList.contains("tabbed-overlay-panel__swipe-surface--settling")
              && Boolean(activePage?.querySelector(marker));
          }, { destination, marker: destinationMarkers[destination] });
          const state = await page.evaluate(({ destination, marker }) => {
            const surface = document.querySelector('[data-testid="tabbed-overlay-swipe-surface"]');
            const activePage = surface?.querySelector('.tabbed-overlay-panel__page--current:not([inert])');
            return {
              destination,
              selected: document.querySelector(`[data-testid="config-tab-${destination}"]`)?.getAttribute("aria-selected"),
              settled: !surface?.classList.contains("tabbed-overlay-panel__swipe-surface--settling"),
              contentMarker: marker,
              contentMounted: Boolean(activePage?.querySelector(marker)),
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: innerWidth,
              activeContent: activePage?.querySelector('[role="tabpanel"]:not([hidden])')?.textContent?.trim().slice(0, 1600) ?? null,
              assets: [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(el => el.getAttribute("src") ?? el.getAttribute("href")),
            };
          }, { destination, marker: destinationMarkers[destination] });
          assertHostedDestinationState(state, `${route} ${viewport.name} ${destination}`);
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
  result.status = "complete";
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
