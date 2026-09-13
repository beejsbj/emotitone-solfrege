import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import path from "node:path";
import { assertGuideReceipt, assertHostedDestinationState, assertHostedRouteState, assertLoadedAssetBaseline, assertPersistenceComparisons, assertStageControlSnapshot, createCaptureWorkspace, createLoadedAssetCollector, matchesRecursivePatch, verifyHostedBaseline } from "./capture-policy.mjs";

const bytes = Buffer.from("known asset");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const response = (body) => new Response(body, { status: 200 });
const stageControlSnapshot = () => ({
  stageToggle: { ariaPressed: "true" },
  controls: Object.fromEntries([
    "scopeSize", "scopeStrength", "scopeLineWeight", "scopeGlow", "scopeTrail",
    "bodiesVisible", "bodySize", "bodyStrength", "bodyMotion", "connectionMode", "connectionStrength",
    "atmosphereStrength", "atmosphereColorDepth", "stringPresence", "stringResponse", "fleckAmount", "fleckEnergy",
    "showChords", "showIntervals", "showEmotion", "labelStrength",
  ].map((id) => [`stage-control-${id}`, { ariaPressed: ["bodiesVisible", "showChords", "showIntervals", "showEmotion"].includes(id) ? "false" : null }])),
});

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
    baselineStageControls: stageControlSnapshot(),
    preview: { persistedFieldsUnchanged: true, liveStageChanged: true, stageControls: stageControlSnapshot() },
    discarded: { persistedFieldsUnchanged: true, statusCleared: true, liveStageMatchesBaseline: true, stageControls: stageControlSnapshot() },
    kept: {
      persistedFieldsChanged: true,
      persistedStageAppearanceChanged: true,
      persistedStageAppearanceMatchesLuminousOwnedPatch: true,
      learnerOwnedFieldsUnchanged: true,
      visualsEnabledUnchanged: true,
      stagePreferencesUnchanged: true,
      statusCleared: true,
      liveStageMatchesPreview: true,
      stageControls: stageControlSnapshot(),
    },
    reloaded: {
      persistedFieldsMatchKept: true,
      persistedStageAppearanceMatchesKept: true,
      visualsEnabledMatchesBaseline: true,
      stagePreferencesMatchBaseline: true,
      loadedAssetsMatchBaseline: true,
    },
  };
  const regressions = [
    ["discarded", "statusCleared", /Discard did not clear/],
    ["discarded", "liveStageMatchesBaseline", /Discard did not restore the live Stage/],
    ["kept", "persistedStageAppearanceChanged", /Keep did not persist a Stage appearance/],
    ["kept", "persistedStageAppearanceMatchesLuminousOwnedPatch", /complete Luminous-owned Stage patch/],
    ["kept", "learnerOwnedFieldsUnchanged", /learner-owned Stage fields/],
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
      baselineStageControls: stageControlSnapshot(),
      preview: { liveStageChanged: true, stageControls: stageControlSnapshot() },
      discarded: { statusCleared: true, liveStageMatchesBaseline: true, stageControls: stageControlSnapshot() },
      kept: { storageUnchanged: true, previewLiveStageChanged: true, previewDiffersFromSoft: true, statusCleared: true, liveStageMatchesPreview: true, stageControls: stageControlSnapshot() },
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

  const previewDidNotApply = passingGuideReceipt();
  previewDidNotApply.viewports[0].look.preview.liveStageChanged = false;
  assert.throws(() => assertGuideReceipt(previewDidNotApply), /Preview did not change the live Stage controls/);

  const keepDidNotRetainPreview = passingGuideReceipt();
  keepDidNotRetainPreview.viewports[0].look.kept.liveStageMatchesPreview = false;
  assert.throws(() => assertGuideReceipt(keepDidNotRetainPreview), /Keep did not retain the previewed Stage controls/);

  const luminousDidNotApply = passingGuideReceipt();
  luminousDidNotApply.viewports[0].look.kept.previewLiveStageChanged = false;
  assert.throws(() => assertGuideReceipt(luminousDidNotApply), /Luminous Preview did not change the live Stage controls/);

  const luminousMatchedSoft = passingGuideReceipt();
  luminousMatchedSoft.viewports[0].look.kept.previewDiffersFromSoft = false;
  assert.throws(() => assertGuideReceipt(luminousMatchedSoft), /Luminous Preview did not differ from Soft Preview/);

  const debounced = passingGuideReceipt();
  debounced.viewports[0].look.afterKnobDebounce.storageUnchanged = false;
  assert.throws(() => assertGuideReceipt(debounced), /debounced Knob save escaped/);
});

test("recursive patch comparison catches an omitted nested Luminous field", () => {
  const expected = { ambient: { brightnessMajor: 0.5 }, strings: { isEnabled: true } };
  assert.equal(matchesRecursivePatch({ ambient: { brightnessMajor: 0.5 }, strings: { isEnabled: true } }, expected), true);
  assert.equal(matchesRecursivePatch({ ambient: { brightnessMajor: 0.4 }, strings: { isEnabled: true } }, expected), false);
});

test("Stage control snapshots require the master and every boolean value", () => {
  const missingBoolean = stageControlSnapshot();
  missingBoolean.controls["stage-control-showEmotion"].ariaPressed = null;
  assert.throws(() => assertStageControlSnapshot(missingBoolean, "probe"), /showEmotion boolean state is missing/);
});

test("loaded asset verification rejects wrong bytes and unexpected executable assets", () => {
  const passing = [{ path: "/assets/index.js", sha256: "abc", bytes: 10 }];
  assert.doesNotThrow(() => assertLoadedAssetBaseline(passing, { "/assets/index.js": "abc" }, "route"));
  assert.throws(() => assertLoadedAssetBaseline([{ ...passing[0], sha256: "def" }], { "/assets/index.js": "abc" }, "route"), /pinned baseline/);
  assert.throws(() => assertLoadedAssetBaseline([...passing, { ...passing[0], sha256: "def" }], { "/assets/index.js": "abc" }, "route"), /loaded with differing bytes/);
  assert.throws(() => assertLoadedAssetBaseline([...passing, { path: "/assets/extra.js", sha256: "xyz", bytes: 5 }], { "/assets/index.js": "abc" }, "route"), /pinned baseline/);
});

test("loaded asset collection reports a response-body failure at finish", async () => {
  let onResponse;
  const page = {
    on: (_event, handler) => { onResponse = handler; },
    off: () => {},
    waitForLoadState: async () => {},
  };
  const finish = createLoadedAssetCollector(page, { host: "https://example.test" });
  onResponse({ url: () => "https://example.test/assets/index.js", ok: () => true, status: () => 200, body: async () => { throw new Error("body unavailable"); } });
  await assert.rejects(finish(), /body unavailable/);
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
