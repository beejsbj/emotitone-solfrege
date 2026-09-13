import { assertPersistenceComparisons, HOST, verifyArchivedDeployment } from "./capture-policy.mjs";

const provenance = await verifyArchivedDeployment();
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "/tmp/uibeat-pw-node_modules/playwright-core/index.mjs");
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/home/admin/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const stable = (raw) => {
  if (!raw) return null;
  const value = JSON.parse(raw);
  return { config: value.config, visualsEnabled: value.visualsEnabled, stagePreferences: value.stagePreferences };
};
async function openConfig(page) {
  await page.goto(`${HOST}/`, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForTimeout(2_500);
  const skip = page.locator(".converged-loader__skip");
  if (await skip.count() && await skip.first().isVisible()) await skip.first().click();
  const play = page.locator('[aria-label="Play EmotiTone"]');
  if (await play.count() && await play.first().isVisible()) await play.first().click();
  await page.waitForTimeout(2_500);
  await page.locator('[data-testid="config-panel-trigger"]').click();
  await page.locator('[data-testid="config-tab-stage"]').click();
}
try {
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  page.setDefaultTimeout(20_000);
  await openConfig(page);
  const baseline = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  await page.locator('[data-testid="preset-apply-soft"]').click();
  await page.locator(".config-panel__look-status").waitFor();
  const preview = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  await page.locator('[data-testid="stage-look-discard"]').click();
  const discarded = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  await page.locator('[data-testid="preset-apply-luminous"]').click();
  await page.locator('[data-testid="stage-look-keep"]').click();
  await page.waitForTimeout(700);
  const kept = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForTimeout(2_500);
  const play = page.locator('[aria-label="Play EmotiTone"]');
  if (await play.count() && await play.first().isVisible()) await play.first().click();
  await page.waitForTimeout(2_500);
  await page.locator('[data-testid="config-panel-trigger"]').click();
  await page.locator('[data-testid="config-tab-stage"]').click();
  const reloaded = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const output = {
    status: "complete",
    host: HOST,
    provenance,
    viewport: { width: 1366, height: 768 },
    comparison: "Parsed config, visualsEnabled, and stagePreferences; ignored lastSaved timestamp.",
    preview: { persistedFieldsUnchanged: JSON.stringify(stable(preview)) === JSON.stringify(stable(baseline)) },
    discarded: { persistedFieldsUnchanged: JSON.stringify(stable(discarded)) === JSON.stringify(stable(baseline)) },
    kept: { persistedFieldsChanged: JSON.stringify(stable(kept)) !== JSON.stringify(stable(baseline)) },
    reloaded: { persistedFieldsMatchKept: JSON.stringify(stable(reloaded)) === JSON.stringify(stable(kept)), transientStatus: await page.locator(".config-panel__look-status").innerText() },
  };
  assertPersistenceComparisons(output);
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
