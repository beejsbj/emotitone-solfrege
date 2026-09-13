import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import path from "node:path";
import { assertGuideReceipt, assertHostedDestinationState, assertHostedRouteState, assertPersistenceComparisons, createCaptureWorkspace, verifyHostedBaseline } from "./capture-policy.mjs";

const bytes = Buffer.from("known asset");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const response = (body) => new Response(body, { status: 200 });

test("deployment verification rejects a mismatched asset hash", async () => {
  const fetchImpl = async (url) => url.endsWith("/") ? response('<script src="/asset.js"></script>') : response(bytes);
  await assert.rejects(
    verifyHostedBaseline({ fetchImpl, host: "https://example.test", expectedAssets: { "/asset.js": "0".repeat(64) } }),
    /hash mismatch/,
  );
});

test("deployment verification accepts a referenced asset with the expected hash", async () => {
  const fetchImpl = async (url) => url.endsWith("/") ? response('<script src="/asset.js"></script>') : response(bytes);
  const provenance = await verifyHostedBaseline({ fetchImpl, host: "https://example.test", expectedAssets: { "/asset.js": sha256 } });
  assert.deepEqual(provenance.assets, [{ path: "/asset.js", sha256 }]);
  assert.equal(provenance.matchesHostedAssetBaseline, true);
  assert.equal(provenance.deploymentRevisionEstablished, false);
});

test("persistence verification rejects any false comparison", () => {
  const output = {
    preview: { persistedFieldsUnchanged: true, liveStageChanged: true },
    discarded: { persistedFieldsUnchanged: true, statusCleared: true, liveStageMatchesBaseline: true },
    kept: {
      persistedFieldsChanged: true,
      persistedStageAppearanceChanged: true,
      persistedStageAppearanceMatchesLuminous: true,
      visualsEnabledUnchanged: true,
      stagePreferencesUnchanged: true,
      statusCleared: true,
      liveStageMatchesPreview: true,
    },
    reloaded: {
      persistedFieldsMatchKept: true,
      persistedStageAppearanceMatchesKept: true,
      visualsEnabledMatchesBaseline: true,
      stagePreferencesMatchBaseline: true,
    },
  };
  const regressions = [
    ["discarded", "statusCleared", /Discard did not clear/],
    ["discarded", "liveStageMatchesBaseline", /Discard did not restore the live Stage/],
    ["kept", "persistedStageAppearanceChanged", /Keep did not persist a Stage appearance/],
    ["kept", "persistedStageAppearanceMatchesLuminous", /expected Luminous Stage appearance/],
    ["kept", "visualsEnabledUnchanged", /Keep changed Visuals Enabled/],
    ["kept", "stagePreferencesUnchanged", /Keep changed Stage reload preferences/],
  ];
  for (const [section, field, message] of regressions) {
    const regressed = structuredClone(output);
    regressed[section][field] = false;
    assert.throws(() => assertPersistenceComparisons(regressed), message);
  }
});

const passingGuideReceipt = () => ({
  viewports: ["desktop", "phone"].map((name) => ({
    viewport: { name },
    look: {
      storageUnchanged: true,
      discarded: { statusCleared: true, liveStageMatchesBaseline: true },
      kept: { storageUnchanged: true },
      afterKnobDebounce: { storageUnchanged: true },
    },
    knob: { changed: true },
    media: { reducedMotion: true, forcedColors: true, documentWidth: name === "desktop" ? 1440 : 390, viewportWidth: name === "desktop" ? 1440 : 390 },
  })),
});

test("guide verification rejects regressed recorded outcomes", () => {
  const regressions = [
    ["look", "storageUnchanged", /Discard did not restore local storage/],
    ["knob", "changed", /Knob drag did not change its value/],
    ["media", "reducedMotion", /Reduced Motion emulation was not active/],
    ["media", "forcedColors", /Forced Colors emulation was not active/],
  ];
  for (const [section, field, message] of regressions) {
    const result = passingGuideReceipt();
    result.viewports[1][section][field] = false;
    assert.throws(() => assertGuideReceipt(result), message);
  }

  const overflowing = passingGuideReceipt();
  overflowing.viewports[1].media.documentWidth = 391;
  assert.throws(() => assertGuideReceipt(overflowing), /document overflows horizontally/);
});

test("guide verification rejects persistence after Keep or the Knob debounce", () => {
  const discarded = passingGuideReceipt();
  discarded.viewports[0].look.discarded.liveStageMatchesBaseline = false;
  assert.throws(() => assertGuideReceipt(discarded), /Discard did not restore the live Stage controls/);

  const kept = passingGuideReceipt();
  kept.viewports[0].look.kept.storageUnchanged = false;
  assert.throws(() => assertGuideReceipt(kept), /Keep escaped the guide's ephemeral store/);

  const debounced = passingGuideReceipt();
  debounced.viewports[0].look.afterKnobDebounce.storageUnchanged = false;
  assert.throws(() => assertGuideReceipt(debounced), /debounced Knob save escaped/);
});

test("guide verification requires both expected viewports", () => {
  const result = passingGuideReceipt();
  result.viewports.pop();
  assert.throws(() => assertGuideReceipt(result), /did not capture both expected viewports/);
});

test("hosted destination verification rejects settling or mismatched content", () => {
  const passing = { destination: "stage", selected: "true", settled: true, contentMounted: true, documentWidth: 390, viewportWidth: 390 };
  assert.doesNotThrow(() => assertHostedDestinationState(passing));
  assert.throws(() => assertHostedDestinationState({ ...passing, settled: false }), /still settling/);
  assert.throws(() => assertHostedDestinationState({ ...passing, contentMounted: false }), /content is not mounted/);
});

test("hosted route verification rejects a wrong URL or shared-surface fallback", () => {
  const passing = { route: "/style-guide/config-menu", actualPathname: "/style-guide/config-menu", routeMarkerMounted: true };
  assert.doesNotThrow(() => assertHostedRouteState(passing));
  assert.throws(() => assertHostedRouteState({ ...passing, actualPathname: "/" }), /rendered URL does not match/);
  assert.throws(() => assertHostedRouteState({ ...passing, routeMarkerMounted: false }), /route-specific surface is not mounted/);
});

test("output policy rejects a dot-prefixed child inside the evidence archive", async () => {
  const archiveDirectory = path.join("/tmp", "archived-evidence");
  await assert.rejects(
    createCaptureWorkspace({ argv: ["--output", path.join(archiveDirectory, "..rerun")], archiveDirectory, label: "test" }),
    /Refusing to write rerun output inside archived evidence/,
  );
});
