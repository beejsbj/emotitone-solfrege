const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "/tmp/uibeat-pw-node_modules/playwright-core/index.mjs");
import fs from "node:fs/promises";

const out = new URL(".", import.meta.url).pathname;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/home/admin/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const result = { route: "http://127.0.0.1:5181/style-guide/config-menu", capturedAt: new Date().toISOString(), viewports: [] };

for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.name === "phone" ? 2 : 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  await page.goto(result.route, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.locator('[data-testid="config-panel-trigger"]').click();
  await page.locator('[data-testid="config-tab-stage"]').click();
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page.locator('[data-testid="preset-apply-soft"]').click();
  await page.locator('.config-panel__look-status').waitFor();
  const preview = await page.evaluate(() => ({ status: document.querySelector('.config-panel__look-status')?.textContent?.trim(), storage: { ...localStorage } }));
  await page.locator('[data-testid="stage-look-discard"]').click();
  const discarded = await page.evaluate(() => ({ status: document.querySelector('.config-panel__look-status')?.textContent?.trim() ?? null, storage: { ...localStorage } }));
  await page.locator('[data-testid="preset-apply-luminous"]').click();
  await page.locator('[data-testid="stage-look-keep"]').click();
  const kept = await page.evaluate(() => ({ status: document.querySelector('.config-panel__look-status')?.textContent?.trim() ?? null, storage: { ...localStorage } }));
  const knob = page.locator('[data-testid="stage-control-scopeSize"]');
  await knob.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const knobBefore = await knob.innerText();
  const box = await knob.boundingBox();
  if (!box) throw new Error("Stage scope knob has no box after scrollIntoView");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - Math.max(24, box.height), { steps: 8 });
  await page.mouse.up();
  const knobAfter = await knob.innerText();
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  const media = await page.evaluate(() => ({ reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, forcedColors: matchMedia("(forced-colors: active)").matches, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }));
  result.viewports.push({ viewport, look: { preview, discarded, kept, storageUnchanged: JSON.stringify(before) === JSON.stringify(discarded.storage) }, knob: { before: knobBefore, after: knobAfter, changed: knobBefore !== knobAfter }, media });
  await context.close();
}

await fs.writeFile(`${out}verification.json`, JSON.stringify(result, null, 2));
await browser.close();
