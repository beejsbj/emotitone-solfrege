import { assertPersistenceComparisons, HOST, verifyHostedBaseline } from "./capture-policy.mjs";

const provenance = await verifyHostedBaseline();
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
const storedField = (raw, field) => raw ? JSON.parse(raw)[field] : null;
const stageAppearance = (raw) => {
  const config = storedField(raw, "config");
  if (!config) return null;
  return Object.fromEntries(["blobs", "ambient", "particles", "strings", "hilbertScope"].map((section) => [section, config[section]]));
};
const matchesLuminousContract = (appearance) => appearance?.blobs?.opacity === 0.42
  && appearance.blobs.blurRadius === 12
  && appearance.blobs.glowIntensity === 24
  && appearance.particles?.count === 12
  && appearance.particles.speed === 5
  && appearance.hilbertScope?.sizeRatio === 0.72
  && appearance.hilbertScope.opacity === 0.92
  && appearance.hilbertScope.glowIntensity === 30
  && appearance.hilbertScope.history === 0.82
  && appearance.hilbertScope.smear === 0.6
  && appearance.hilbertScope.thickness === 5;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const readStageControls = (page) => page.locator('[data-testid^="stage-control-"]').evaluateAll((elements) => Object.fromEntries(
  elements.map((element) => [element.getAttribute("data-testid"), element.textContent?.trim() ?? null]),
));
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
  const initialStatus = page.locator(".config-panel__look-status");
  if (await initialStatus.count()) {
    await page.locator('[data-testid="stage-look-discard"]').click();
    await initialStatus.waitFor({ state: "detached" });
  }
  const baseline = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const baselineStageControls = await readStageControls(page);
  await page.locator('[data-testid="preset-apply-soft"]').click();
  await page.locator(".config-panel__look-status").waitFor();
  const preview = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const previewStageControls = await readStageControls(page);
  await page.locator('[data-testid="stage-look-discard"]').click();
  await page.locator(".config-panel__look-status").waitFor({ state: "detached" });
  const discardedStatusCleared = await page.locator(".config-panel__look-status").count() === 0;
  const discarded = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const discardedStageControls = await readStageControls(page);
  await page.locator('[data-testid="preset-apply-luminous"]').click();
  await page.locator(".config-panel__look-status").waitFor();
  const keptPreviewStageControls = await readStageControls(page);
  await page.locator('[data-testid="stage-look-keep"]').click();
  await page.locator(".config-panel__look-status").waitFor({ state: "detached" });
  const keptStatusCleared = await page.locator(".config-panel__look-status").count() === 0;
  await page.waitForTimeout(700);
  const kept = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const keptStageControls = await readStageControls(page);
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
    comparison: "Compared persisted Stage appearance, Visuals Enabled, and Stage reload preferences separately; ignored lastSaved timestamp. Live Stage controls verify preview, Discard, and Keep.",
    preview: {
      persistedFieldsUnchanged: same(stable(preview), stable(baseline)),
      liveStageChanged: !same(previewStageControls, baselineStageControls),
      stageControls: previewStageControls,
    },
    discarded: {
      persistedFieldsUnchanged: same(stable(discarded), stable(baseline)),
      statusCleared: discardedStatusCleared,
      liveStageMatchesBaseline: same(discardedStageControls, baselineStageControls),
      stageControls: discardedStageControls,
    },
    kept: {
      persistedFieldsChanged: !same(stable(kept), stable(baseline)),
      persistedStageAppearanceChanged: !same(stageAppearance(kept), stageAppearance(baseline)),
      persistedStageAppearanceMatchesLuminous: matchesLuminousContract(stageAppearance(kept)),
      visualsEnabledUnchanged: same(storedField(kept, "visualsEnabled"), storedField(baseline, "visualsEnabled")),
      stagePreferencesUnchanged: same(storedField(kept, "stagePreferences"), storedField(baseline, "stagePreferences")),
      statusCleared: keptStatusCleared,
      liveStageMatchesPreview: same(keptStageControls, keptPreviewStageControls),
      stageControls: keptStageControls,
    },
    reloaded: {
      persistedFieldsMatchKept: same(stable(reloaded), stable(kept)),
      persistedStageAppearanceMatchesKept: same(stageAppearance(reloaded), stageAppearance(kept)),
      visualsEnabledMatchesBaseline: same(storedField(reloaded, "visualsEnabled"), storedField(baseline, "visualsEnabled")),
      stagePreferencesMatchBaseline: same(storedField(reloaded, "stagePreferences"), storedField(baseline, "stagePreferences")),
      transientStatus: await page.locator(".config-panel__look-status").innerText(),
    },
  };
  assertPersistenceComparisons(output);
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
