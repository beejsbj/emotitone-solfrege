import {
  assertLoadedAssetBaseline,
  assertPersistenceComparisons,
  createLoadedAssetCollector,
  disableBrowserCache,
  EXPECTED_ROUTE_ASSETS,
  HOST,
  matchesBaselineWithPatch,
  matchesRecursivePatch,
  verifyHostedBaseline,
} from "./capture-policy.mjs";

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
const LUMINOUS_OWNED_PATCH = {
  blobs: { isEnabled: true, baseSizeRatio: 0.09, opacity: 0.42, blurRadius: 12, oscillationAmplitude: 0.55, driftSpeed: 8, vibrationAmplitude: 12, glowEnabled: true, glowIntensity: 24 },
  ambient: { isEnabled: true, opacityMajor: 0.44, opacityMinor: 0.28, brightnessMajor: 0.5, brightnessMinor: 0.3, saturationMajor: 0.8, saturationMinor: 0.6 },
  particles: { isEnabled: true, count: 12, speed: 5, gravity: 0, airResistance: 0.99 },
  strings: { isEnabled: true, baseOpacity: 0.05, activeOpacity: 0.7, maxAmplitude: 22, dampingFactor: 0.08, interpolationSpeed: 0.15, opacityInterpolationSpeed: 0.1 },
  hilbertScope: { sizeRatio: 0.72, opacity: 0.92, glowEnabled: true, glowIntensity: 30, smear: 0.6, history: 0.82, thickness: 5 },
};
const LEARNER_OWNED_BLOB_FIELDS = ["connectionMode", "fieldSoftness", "fusionStrength", "webOpacity", "showChordLabel", "showIntervalLabels", "showEmotionLabel", "labelOpacity"];
const learnerOwnedFields = (appearance) => Object.fromEntries(LEARNER_OWNED_BLOB_FIELDS.map((field) => [field, appearance?.blobs?.[field]]));
const hasLearnerOwnedFields = (appearance) => LEARNER_OWNED_BLOB_FIELDS.every((field) => Object.hasOwn(appearance?.blobs ?? {}, field));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const readStageControls = async (page) => ({
  stageToggle: await page.locator('[data-testid="stage-toggle"]').evaluate((element) => ({ text: element.textContent?.trim() ?? null, ariaPressed: element.getAttribute("aria-pressed") })),
  controls: await page.locator('[data-testid^="stage-control-"]').evaluateAll((elements) => Object.fromEntries(elements.map((element) => [
    element.getAttribute("data-testid"),
    { text: element.textContent?.trim() ?? null, ariaPressed: element.getAttribute("aria-pressed"), ariaValueNow: element.getAttribute("aria-valuenow"), ariaValueText: element.getAttribute("aria-valuetext") },
  ]))),
});
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
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await disableBrowserCache(context, page);
  page.setDefaultTimeout(20_000);
  const finishInitialAssetCapture = createLoadedAssetCollector(page);
  await openConfig(page);
  const initialLoadedAssets = await finishInitialAssetCapture();
  assertLoadedAssetBaseline(initialLoadedAssets, EXPECTED_ROUTE_ASSETS["/"], "production initial navigation");
  const initialStatus = page.locator(".config-panel__look-status");
  if (await initialStatus.count()) {
    await page.locator('[data-testid="stage-look-discard"]').click();
    await initialStatus.waitFor({ state: "detached" });
  }
  const baseline = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const baselineStageControls = await readStageControls(page);
  await page.locator('[data-testid="preset-apply-soft"]').click();
  await page.locator(".config-panel__look-status").waitFor();
  await page.waitForTimeout(650);
  const preview = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const previewStageControls = await readStageControls(page);
  await page.locator('[data-testid="stage-look-discard"]').click();
  await page.locator(".config-panel__look-status").waitFor({ state: "detached" });
  await page.waitForTimeout(650);
  const discardedStatusCleared = await page.locator(".config-panel__look-status").count() === 0;
  const discarded = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const discardedStageControls = await readStageControls(page);
  await page.locator('[data-testid="preset-apply-luminous"]').click();
  await page.locator(".config-panel__look-status").waitFor();
  const keptPreviewStageControls = await readStageControls(page);
  await page.waitForTimeout(650);
  const luminousPreview = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  await page.locator('[data-testid="stage-look-keep"]').click();
  await page.locator(".config-panel__look-status").waitFor({ state: "detached" });
  const keptStatusCleared = await page.locator(".config-panel__look-status").count() === 0;
  await page.waitForTimeout(700);
  const kept = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const keptStageControls = await readStageControls(page);
  const finishReloadAssetCapture = createLoadedAssetCollector(page);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForTimeout(2_500);
  const play = page.locator('[aria-label="Play EmotiTone"]');
  if (await play.count() && await play.first().isVisible()) await play.first().click();
  await page.waitForTimeout(2_500);
  await page.locator('[data-testid="config-panel-trigger"]').click();
  await page.locator('[data-testid="config-tab-stage"]').click();
  const reloadedAssets = await finishReloadAssetCapture();
  assertLoadedAssetBaseline(reloadedAssets, EXPECTED_ROUTE_ASSETS["/"], "production reload");
  const reloaded = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const reloadedStageControls = await readStageControls(page);
  const reloadedStatus = page.locator(".config-panel__look-status");
  const transientStatusPresent = await reloadedStatus.count() === 1;
  const transientStatus = transientStatusPresent ? await reloadedStatus.innerText() : null;
  if (transientStatusPresent) {
    await page.locator('[data-testid="stage-look-discard"]').click();
    await reloadedStatus.waitFor({ state: "detached" });
  }
  await page.waitForTimeout(650);
  const reloadDiscarded = await page.evaluate(() => localStorage.getItem("emotitone-visual-config"));
  const reloadDiscardedStageControls = await readStageControls(page);
  const output = {
    status: "complete",
    host: HOST,
    provenance,
    loadedAssets: { initial: initialLoadedAssets },
    viewport: { width: 1366, height: 768 },
    baselineStageControls,
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
    luminousPreview: {
      persistedFieldsUnchanged: same(stable(luminousPreview), stable(baseline)),
      stageControls: keptPreviewStageControls,
    },
    kept: {
      persistedFieldsChanged: !same(stable(kept), stable(baseline)),
      persistedStageAppearanceChanged: !same(stageAppearance(kept), stageAppearance(baseline)),
      persistedStageAppearanceMatchesLuminousOwnedPatch: matchesRecursivePatch(stageAppearance(kept), LUMINOUS_OWNED_PATCH),
      learnerOwnedFieldsUnchanged: hasLearnerOwnedFields(stageAppearance(baseline)) && hasLearnerOwnedFields(stageAppearance(kept)) && same(learnerOwnedFields(stageAppearance(kept)), learnerOwnedFields(stageAppearance(baseline))),
      allNonLookFieldsUnchanged: matchesBaselineWithPatch(storedField(baseline, "config"), storedField(kept, "config"), LUMINOUS_OWNED_PATCH),
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
      loadedAssets: reloadedAssets,
      loadedAssetsMatchBaseline: true,
      transientStatusPresent,
      transientStatus,
      stageControls: reloadedStageControls,
      liveStageChangedFromKept: !same(reloadedStageControls, keptStageControls),
      discarded: {
        statusCleared: await page.locator(".config-panel__look-status").count() === 0,
        persistedFieldsMatchKept: same(stable(reloadDiscarded), stable(kept)),
        liveStageMatchesKept: same(reloadDiscardedStageControls, keptStageControls),
        stageControls: reloadDiscardedStageControls,
      },
    },
  };
  assertPersistenceComparisons(output);
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
