import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const HOST = "https://emotitone-solfrege.vercel.app";
export const HOSTED_BASELINE_SOURCE_REVISION = "4997c46b27c16216e71b0bf3b2b0ca73c212e388";
export const EXPECTED_ASSETS = Object.freeze({
  "/assets/index-23ff2ff7.js": "8ea45fd6e2019e56582a22dd977882d96cedae7ee062d8ecf47121055839ef06",
  "/assets/index-966b0f42.css": "966b0f427a6f6dc925de716a65ee1ebae4cb26bb55aa3daf7bad1c3c28ca8d96",
});

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
  assert.equal(output.preview.persistedFieldsUnchanged, true, "Preview changed persisted config");
  assert.equal(output.preview.liveStageChanged, true, "Preview did not change the live Stage controls");
  assert.equal(output.discarded.persistedFieldsUnchanged, true, "Discard did not restore persisted config");
  assert.equal(output.discarded.statusCleared, true, "Discard did not clear the transient Look status");
  assert.equal(output.discarded.liveStageMatchesBaseline, true, "Discard did not restore the live Stage controls");
  assert.equal(output.kept.persistedFieldsChanged, true, "Keep did not change persisted config");
  assert.equal(output.kept.persistedStageAppearanceChanged, true, "Keep did not persist a Stage appearance change");
  assert.equal(output.kept.persistedStageAppearanceMatchesLuminous, true, "Keep did not persist the expected Luminous Stage appearance");
  assert.equal(output.kept.visualsEnabledUnchanged, true, "Keep changed Visuals Enabled");
  assert.equal(output.kept.stagePreferencesUnchanged, true, "Keep changed Stage reload preferences");
  assert.equal(output.kept.statusCleared, true, "Keep did not clear the transient Look status");
  assert.equal(output.kept.liveStageMatchesPreview, true, "Keep did not commit the previewed Stage controls");
  assert.equal(output.reloaded.persistedFieldsMatchKept, true, "Reload did not preserve kept config");
  assert.equal(output.reloaded.persistedStageAppearanceMatchesKept, true, "Reload did not preserve the kept Stage appearance");
  assert.equal(output.reloaded.visualsEnabledMatchesBaseline, true, "Reload changed Visuals Enabled");
  assert.equal(output.reloaded.stagePreferencesMatchBaseline, true, "Reload changed Stage reload preferences");
}

export function assertGuideReceipt(result) {
  assert.deepEqual(result.viewports.map(({ viewport }) => viewport.name), ["desktop", "phone"], "Guide probe did not capture both expected viewports");
  for (const { viewport, look, knob, media } of result.viewports) {
    assert.equal(look.storageUnchanged, true, `${viewport.name}: Discard did not restore local storage`);
    assert.equal(look.discarded.statusCleared, true, `${viewport.name}: Discard did not clear the transient Look status`);
    assert.equal(look.discarded.liveStageMatchesBaseline, true, `${viewport.name}: Discard did not restore the live Stage controls`);
    assert.equal(look.kept.storageUnchanged, true, `${viewport.name}: Keep escaped the guide's ephemeral store`);
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
