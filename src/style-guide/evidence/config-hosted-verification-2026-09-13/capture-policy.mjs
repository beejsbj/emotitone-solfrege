import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

export const HOST = "https://emotitone-solfrege.vercel.app";
export const HOSTED_BASELINE_SOURCE_REVISION = "4997c46b27c16216e71b0bf3b2b0ca73c212e388";
export const EXPECTED_ASSETS = Object.freeze({
  "/assets/index-23ff2ff7.js": "8ea45fd6e2019e56582a22dd977882d96cedae7ee062d8ecf47121055839ef06",
  "/assets/index-966b0f42.css": "966b0f427a6f6dc925de716a65ee1ebae4cb26bb55aa3daf7bad1c3c28ca8d96",
});
export const EXPECTED_ROUTE_ASSETS = Object.freeze({
  "/": Object.freeze({
    ...EXPECTED_ASSETS,
    "/assets/workbox-window.prod.es5-5ffdab76.js": "7b8e2b05f80dd0f8a658d52dfe00b1804757d77960118c4b930aa1a666a0bd9e",
  }),
  "/style-guide/config-menu": Object.freeze({
    ...EXPECTED_ASSETS,
    "/assets/workbox-window.prod.es5-5ffdab76.js": "7b8e2b05f80dd0f8a658d52dfe00b1804757d77960118c4b930aa1a666a0bd9e",
    "/assets/StyleGuide-953dfb2a.js": "8be3594f4a0c749aa2ecb6a3051155046e3da555dfda268ff1eb9be5803a7fbb",
    "/assets/StyleGuide-88a6048d.css": "88a6048d6ca412f580d5d051cd6096aa670b434b2f7eab9a9422376e5cdbc14d",
    "/assets/guide-defaults-1633c902.css": "1633c90292b5f666c323c6d3d3748a1f8e83205a6a18624abbf4e9d6df0a203d",
    "/assets/ConfigMenuPage-b7eb57ee.js": "321b6f8dfe7eebe3925fe7162554babb6ab246b3ccffd15096e3858d90ae21bb",
    "/assets/ConfigMenuPage-18ad3e74.css": "18ad3e74991dddef4e6b34cd072ab6b791494268a2d9d6eb64bc3bb3ba4acdc9",
  }),
});

export function createLoadedAssetCollector(page, { host = HOST } = {}) {
  const pending = [];
  const loaded = [];
  const onResponse = (response) => {
    const url = new URL(response.url());
    if (url.origin !== host || !/\.(?:js|css)$/.test(url.pathname)) return;
    pending.push((async () => {
      assert.ok(response.ok(), `Loaded asset failed: ${url.pathname} (HTTP ${response.status()})`);
      const body = await response.body();
      loaded.push({ path: url.pathname, sha256: createHash("sha256").update(body).digest("hex"), bytes: body.length });
      return null;
    })().catch((error) => error));
  };
  page.on("response", onResponse);

  return async function finish() {
    await page.waitForLoadState("networkidle");
    const outcomes = await Promise.all(pending);
    page.off("response", onResponse);
    const failure = outcomes.find((outcome) => outcome instanceof Error);
    if (failure) throw failure;
    return loaded.sort((left, right) => left.path.localeCompare(right.path));
  };
}

export async function disableBrowserCache(context, page) {
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
}

export function assertLoadedAssetBaseline(assets, expectedAssets, context) {
  const actual = {};
  for (const { path: assetPath, sha256 } of assets) {
    if (assetPath in actual) assert.equal(sha256, actual[assetPath], `${context}: ${assetPath} was loaded with differing bytes during one capture`);
    actual[assetPath] = sha256;
  }
  assert.deepEqual(actual, expectedAssets, `${context}: browser-loaded executable/style assets do not match the pinned baseline`);
}

export function matchesRecursivePatch(actual, expected) {
  if (typeof expected !== "object" || expected === null || Array.isArray(expected)) return Object.is(actual, expected);
  if (typeof actual !== "object" || actual === null || Array.isArray(actual)) return false;
  return Object.entries(expected).every(([key, value]) => matchesRecursivePatch(actual[key], value));
}

export function matchesBaselineWithPatch(baseline, actual, patch) {
  const expected = structuredClone(baseline);
  const overlay = (target, source) => {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) overlay(target[key], value);
      else target[key] = value;
    }
  };
  overlay(expected, patch);
  return isDeepStrictEqual(actual, expected);
}

const EXPECTED_STAGE_CONTROL_IDS = [
  "scopeSize", "scopeStrength", "scopeLineWeight", "scopeGlow", "scopeTrail",
  "bodiesVisible", "bodySize", "bodyStrength", "bodyMotion", "connectionMode", "connectionStrength",
  "atmosphereStrength", "atmosphereColorDepth", "stringPresence", "stringResponse", "fleckAmount", "fleckEnergy",
  "showChords", "showIntervals", "showEmotion", "labelStrength",
];
const BOOLEAN_STAGE_CONTROL_IDS = ["bodiesVisible", "showChords", "showIntervals", "showEmotion"];

export function assertStageControlSnapshot(snapshot, context) {
  assert.match(snapshot?.stageToggle?.ariaPressed ?? "", /^(?:true|false)$/, `${context}: Stage master boolean state is missing`);
  assert.deepEqual(Object.keys(snapshot?.controls ?? {}), EXPECTED_STAGE_CONTROL_IDS.map((id) => `stage-control-${id}`), `${context}: Stage control snapshot is incomplete`);
  for (const id of BOOLEAN_STAGE_CONTROL_IDS) {
    assert.match(snapshot.controls[`stage-control-${id}`]?.ariaPressed ?? "", /^(?:true|false)$/, `${context}: ${id} boolean state is missing`);
  }
}

async function requireSuccessfulResponse(response, url) {
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  return response;
}

export async function verifyHostedBaseline({ fetchImpl = fetch, host = HOST, expectedAssets = EXPECTED_ASSETS } = {}) {
  const documentResponse = await requireSuccessfulResponse(await fetchImpl(`${host}/`), `${host}/`);
  const document = await documentResponse.text();
  const verifiedAssets = [];

  for (const [assetPath, expectedSha256] of Object.entries(expectedAssets)) {
    assert.ok(document.includes(assetPath), `Current ${host} document does not reference archived asset ${assetPath}`);
    const assetUrl = new URL(assetPath, host).href;
    const assetResponse = await requireSuccessfulResponse(await fetchImpl(assetUrl), assetUrl);
    const actualSha256 = createHash("sha256").update(Buffer.from(await assetResponse.arrayBuffer())).digest("hex");
    assert.equal(actualSha256, expectedSha256, `Archived asset hash mismatch for ${assetPath}`);
    verifiedAssets.push({ path: assetPath, sha256: actualSha256 });
  }

  return {
    host,
    matchesHostedAssetBaseline: true,
    baselineDocumentedAtSourceRevision: HOSTED_BASELINE_SOURCE_REVISION,
    deploymentRevisionEstablished: false,
    verifiedAt: new Date().toISOString(),
    assets: verifiedAssets,
  };
}

function requestedOutputPath(argv) {
  const outputIndex = argv.indexOf("--output");
  if (outputIndex === -1) {
    assert.equal(argv.length, 0, `Unexpected arguments: ${argv.join(" ")}`);
    return null;
  }
  assert.equal(argv.length, 2, "Use only --output <fresh-directory>");
  assert.ok(argv[outputIndex + 1], "--output requires a directory");
  return path.resolve(argv[outputIndex + 1]);
}

export async function createCaptureWorkspace({ argv = process.argv.slice(2), archiveDirectory, label }) {
  const requested = requestedOutputPath(argv);
  const suffix = `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const destination = requested ?? path.join(os.tmpdir(), `emotitone-${label}-${suffix}`);
  const archive = path.resolve(archiveDirectory);
  const relativeToArchive = path.relative(archive, destination);
  const isOutsideArchive = relativeToArchive === ".." || relativeToArchive.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToArchive);
  assert.ok(isOutsideArchive, `Refusing to write rerun output inside archived evidence: ${destination}`);

  try {
    await fs.lstat(destination);
    throw new Error(`Output directory already exists; choose a fresh path: ${destination}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const staging = `${destination}.partial-${randomUUID().slice(0, 8)}`;
  await fs.mkdir(staging, { recursive: true });
  return { destination, staging };
}

export async function publishCapture({ destination, staging }) {
  await fs.rename(staging, destination);
}

export async function publishFailedCapture({ destination, staging, error }) {
  await fs.writeFile(path.join(staging, "capture-failed.json"), `${JSON.stringify({
    status: "failed",
    failedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  }, null, 2)}\n`);
  await fs.rename(staging, destination);
}

export function assertPersistenceComparisons(output) {
  assertStageControlSnapshot(output.baselineStageControls, "production baseline");
  assertStageControlSnapshot(output.preview.stageControls, "production Preview");
  assertStageControlSnapshot(output.discarded.stageControls, "production Discard");
  assertStageControlSnapshot(output.luminousPreview.stageControls, "production Luminous Preview");
  assertStageControlSnapshot(output.kept.stageControls, "production Keep");
  assertStageControlSnapshot(output.reloaded.stageControls, "production reload Preview");
  assertStageControlSnapshot(output.reloaded.discarded.stageControls, "production reload Discard");
  assert.equal(output.preview.persistedFieldsUnchanged, true, "Preview changed persisted config");
  assert.equal(output.preview.liveStageChanged, true, "Preview did not change the live Stage controls");
  assert.equal(output.discarded.persistedFieldsUnchanged, true, "Discard did not restore persisted config");
  assert.equal(output.discarded.statusCleared, true, "Discard did not clear the transient Look status");
  assert.equal(output.discarded.liveStageMatchesBaseline, true, "Discard did not restore the live Stage controls");
  assert.equal(output.luminousPreview.persistedFieldsUnchanged, true, "Luminous Preview changed persisted config");
  assert.equal(output.kept.persistedFieldsChanged, true, "Keep did not change persisted config");
  assert.equal(output.kept.persistedStageAppearanceChanged, true, "Keep did not persist a Stage appearance change");
  assert.equal(output.kept.persistedStageAppearanceMatchesLuminousOwnedPatch, true, "Keep did not persist the complete Luminous-owned Stage patch");
  assert.equal(output.kept.learnerOwnedFieldsUnchanged, true, "Keep changed learner-owned Stage fields");
  assert.equal(output.kept.allNonLookFieldsUnchanged, true, "Keep changed config outside the Luminous-owned fields");
  assert.equal(output.kept.visualsEnabledUnchanged, true, "Keep changed Visuals Enabled");
  assert.equal(output.kept.stagePreferencesUnchanged, true, "Keep changed Stage reload preferences");
  assert.equal(output.kept.statusCleared, true, "Keep did not clear the transient Look status");
  assert.equal(output.kept.liveStageMatchesPreview, true, "Keep did not commit the previewed Stage controls");
  assert.equal(output.reloaded.persistedFieldsMatchKept, true, "Reload did not preserve kept config");
  assert.equal(output.reloaded.persistedStageAppearanceMatchesKept, true, "Reload did not preserve the kept Stage appearance");
  assert.equal(output.reloaded.visualsEnabledMatchesBaseline, true, "Reload changed Visuals Enabled");
  assert.equal(output.reloaded.stagePreferencesMatchBaseline, true, "Reload changed Stage reload preferences");
  assert.equal(output.reloaded.loadedAssetsMatchBaseline, true, "Reload loaded assets outside the pinned baseline");
  assert.equal(output.reloaded.transientStatusPresent, true, "Reload did not present a transient Look status");
  assert.equal(output.reloaded.liveStageChangedFromKept, true, "Reload did not apply a transient Look to the live Stage controls");
  assert.equal(output.reloaded.discarded.statusCleared, true, "Reload Discard did not clear the transient Look status");
  assert.equal(output.reloaded.discarded.persistedFieldsMatchKept, true, "Reload Discard changed persisted config");
  assert.equal(output.reloaded.discarded.liveStageMatchesKept, true, "Reload Discard did not restore the kept Stage controls");
}

export function assertGuideReceipt(result) {
  assert.deepEqual(result.viewports.map(({ viewport }) => viewport.name), ["desktop", "phone"], "Guide probe did not capture both expected viewports");
  for (const { viewport, look, knob, media } of result.viewports) {
    assertStageControlSnapshot(look.baselineStageControls, `${viewport.name} baseline`);
    assertStageControlSnapshot(look.preview.stageControls, `${viewport.name} Preview`);
    assertStageControlSnapshot(look.discarded.stageControls, `${viewport.name} Discard`);
    assertStageControlSnapshot(look.kept.stageControls, `${viewport.name} Keep`);
    assert.equal(look.storageUnchanged, true, `${viewport.name}: Discard did not restore local storage`);
    assert.equal(look.preview.liveStageChanged, true, `${viewport.name}: Preview did not change the live Stage controls`);
    assert.equal(look.preview.storageUnchanged, true, `${viewport.name}: Soft Preview escaped the guide's ephemeral store`);
    assert.equal(look.discarded.statusCleared, true, `${viewport.name}: Discard did not clear the transient Look status`);
    assert.equal(look.discarded.liveStageMatchesBaseline, true, `${viewport.name}: Discard did not restore the live Stage controls`);
    assert.equal(look.kept.storageUnchanged, true, `${viewport.name}: Keep escaped the guide's ephemeral store`);
    assert.equal(look.kept.previewLiveStageChanged, true, `${viewport.name}: Luminous Preview did not change the live Stage controls`);
    assert.equal(look.kept.previewDiffersFromSoft, true, `${viewport.name}: Luminous Preview did not differ from Soft Preview`);
    assert.equal(look.kept.previewStorageUnchanged, true, `${viewport.name}: Luminous Preview escaped the guide's ephemeral store`);
    assert.equal(look.kept.statusCleared, true, `${viewport.name}: Keep did not clear the transient Look status`);
    assert.equal(look.kept.liveStageMatchesPreview, true, `${viewport.name}: Keep did not retain the previewed Stage controls`);
    assert.equal(look.afterKnobDebounce.storageUnchanged, true, `${viewport.name}: debounced Knob save escaped the guide's ephemeral store`);
    assert.equal(knob.changed, true, `${viewport.name}: Knob drag did not change its value`);
    assert.equal(media.reducedMotion, true, `${viewport.name}: Reduced Motion emulation was not active`);
    assert.equal(media.forcedColors, true, `${viewport.name}: Forced Colors emulation was not active`);
    assert.ok(media.documentWidth <= media.viewportWidth, `${viewport.name}: document overflows horizontally`);
  }
}

export function assertHostedDestinationState(state, context = state.destination) {
  assert.equal(state.selected, "true", `${context}: destination tab is not selected`);
  assert.equal(state.settled, true, `${context}: content transition is still settling`);
  assert.equal(state.contentMounted, true, `${context}: expected destination content is not mounted`);
  assert.ok(state.documentWidth <= state.viewportWidth, `${context}: document overflows horizontally`);
}

export function assertHostedRouteState(state, context = state.route) {
  assert.equal(state.actualPathname, state.route, `${context}: rendered URL does not match the requested route`);
  assert.equal(state.routeMarkerMounted, true, `${context}: route-specific surface is not mounted`);
}
