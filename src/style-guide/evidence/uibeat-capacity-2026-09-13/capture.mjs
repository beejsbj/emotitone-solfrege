#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { gzipSync } from "node:zlib";

import { verifyLoadedBuildIdentity } from "./capture-build-identity.mjs";

const TRACE_CATEGORIES = [
  "benchmark",
  "cc",
  "devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "viz",
].join(",");

function usage() {
  return `Usage:
  node capture.mjs --metadata device.json --output verification.json [options]

Options:
  --cdp URL          Chrome DevTools endpoint (default http://127.0.0.1:9222)
  --target TEXT      Unique substring selecting one already-open EmotiTone tab
  --duration MS      Sample duration per UIBeat state (default 10000)
  --trace-duration MS  Separate diagnostic trace per state (default 2000)
  --warmup MS        Settling time after each state change (default 2000)
  --self-test        Verify the statistics helpers without a browser

The attached tab must be foregrounded, focused, and already showing production.
Use a dedicated browser profile. The script restores the original UI Rhythm value.`;
}

function validateRuntime({ nodeVersion, webSocketType, fetchType }) {
  const nodeMajor = Number.parseInt(String(nodeVersion).split(".")[0], 10);
  if (nodeMajor < 22 || webSocketType !== "function" || fetchType !== "function") {
    throw new Error(
      `UIBeat capture requires Node.js 22 or newer with global fetch and WebSocket; found Node ${nodeVersion}, fetch=${fetchType}, WebSocket=${webSocketType}`,
    );
  }
}

function expectedUIBeatConsumers() {
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 &&
      rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
  };
  const contracts = [
    ["button", ".paper-button:not(:disabled):not(.paper-button--loading)", ".paper-button__face"],
    ["knob", ".knob-wrapper:not(.opacity-50)", ".knob-wrapper__face"],
    ["joystick", ".joystick", ".joystick__beat-face"],
    ["sticker", '.instrument-choice[data-state="selected"]', ".instrument-choice__sticker"],
  ];
  const entries = contracts.flatMap(([type, ownerSelector, targetSelector]) =>
    Array.from(document.querySelectorAll(ownerSelector))
      .filter(visible)
      .map((owner) => ({ type, target: owner.querySelector(targetSelector) }))
  );
  const targets = entries.flatMap(({ target }) => target && visible(target) ? [target] : []);
  const expectedByType = Object.fromEntries(entries.reduce((counts, { type }) => {
    counts.set(type, (counts.get(type) ?? 0) + 1);
    return counts;
  }, new Map()));
  return {
    targets,
    expectedCount: entries.length,
    expectedByType,
    missingTargetCount: entries.length - targets.length,
  };
}

function visualRuntimeFingerprint(store) {
  if (!store || typeof store.visualsEnabled !== "boolean" || !store.effectiveConfig) {
    throw new Error("Visual runtime fingerprint requires the production Pinia visualConfig store");
  }
  const effectiveConfig = JSON.parse(JSON.stringify(store.effectiveConfig));
  if (!effectiveConfig || typeof effectiveConfig !== "object" || Array.isArray(effectiveConfig)) {
    throw new Error("Visual runtime fingerprint could not serialize effectiveConfig");
  }
  if (effectiveConfig.uiBeat && typeof effectiveConfig.uiBeat === "object") {
    delete effectiveConfig.uiBeat.isEnabled;
  }
  return { visualsEnabled: store.visualsEnabled, effectiveConfig };
}

function parseArgs(argv) {
  const result = {
    cdp: "http://127.0.0.1:9222",
    target: "emotitone",
    duration: 10_000,
    traceDuration: 2_000,
    warmup: 2_000,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--self-test") result.selfTest = true;
    else if (argument === "--help" || argument === "-h") result.help = true;
    else if (argument.startsWith("--")) {
      const key = argument.slice(2);
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
      index += 1;
      if (key === "metadata" || key === "output" || key === "cdp" || key === "target") result[key] = value;
      else if (key === "duration" || key === "warmup" || key === "trace-duration") {
        result[key === "trace-duration" ? "traceDuration" : key] = Number(value);
      }
      else throw new Error(`Unknown option ${argument}`);
    } else throw new Error(`Unexpected argument ${argument}`);
  }
  if (!Number.isFinite(result.duration) || result.duration < 1_000) throw new Error("--duration must be at least 1000ms");
  if (!Number.isFinite(result.warmup) || result.warmup < 0) throw new Error("--warmup must be non-negative");
  if (!Number.isFinite(result.traceDuration) || result.traceDuration < 500) throw new Error("--trace-duration must be at least 500ms");
  return result;
}

function quantile(sorted, percentile) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function summarizeIntervals(intervals) {
  const sorted = intervals.filter(Number.isFinite).sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    count: sorted.length,
    meanMs: sorted.length ? total / sorted.length : null,
    p50Ms: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
    p99Ms: quantile(sorted, 0.99),
    maxMs: sorted.at(-1) ?? null,
    over20ms: sorted.filter((value) => value > 20).length,
    over33_3ms: sorted.filter((value) => value > 100 / 3).length,
    over50ms: sorted.filter((value) => value > 50).length,
  };
}

async function selfTest() {
  const summary = summarizeIntervals([10, 20, 30, 40, Number.NaN]);
  if (summary.count !== 4 || summary.p50Ms !== 25 || summary.maxMs !== 40 || summary.over33_3ms !== 1) {
    throw new Error(`Statistics self-test failed: ${JSON.stringify(summary)}`);
  }
  const healthyCounts = { button: 2, knob: 1, joystick: 1 };
  const healthyScene = {
    transportPlaying: true,
    expectedAcceptedConsumers: 4,
    expectedByType: healthyCounts,
    missingExpectedTargets: 0,
    visibleBoundConsumers: 4,
    visibleBoundByType: healthyCounts,
    visibleRunningConsumers: 4,
    visibleRunningByType: healthyCounts,
    runningAcceptedConsumers: 4,
    indicatorRunning: true,
  };
  const healthyFrame = {
    timedOut: false,
    interruptions: [],
    visibilityState: "visible",
    hasFocus: true,
    coverage: { requestedDurationMs: 4_000, observedDurationMs: 4_001, intervalCount: 241, includesInitialDelay: true },
    uiBeatCadence: {
      targetCount: 4,
      maximumAllowedIdleGapMs: 2_000,
      targets: Array.from({ length: 4 }, (_, index) => ({ index, mutationCount: 20, distinctScaleValues: 10, maxIdleGapMs: 100 })),
    },
    trackedConsumers: {
      initial: { targetCount: 4, expectedCount: 4, missingTargetCount: 0, matchesExpectedSet: true, allConnected: true, allVisible: true, allBound: true, allRunning: true },
      final: { targetCount: 4, expectedCount: 4, missingTargetCount: 0, matchesExpectedSet: true, allConnected: true, allVisible: true, allBound: true, allRunning: true },
      validThroughout: true,
    },
    beatIndicator: {
      tracking: {
        initial: { rootCount: 1, childCount: 4, contractValid: true, matchesRetainedNodes: true, allConnected: true, allVisible: true, allRunning: true, noneRunning: false },
        final: { rootCount: 1, childCount: 4, contractValid: true, matchesRetainedNodes: true, allConnected: true, allVisible: true, allRunning: true, noneRunning: false },
        validThroughout: true,
      },
      cadence: {
        maximumAllowedIdleGapMs: 2_000,
        maximumAllowedChildIdleGapMs: 2_000,
        maxIdleGapMs: 100,
        children: Array.from({ length: 4 }, (_, index) => ({ index, mutationCount: 20, distinctStyleValues: 5, maxIdleGapMs: 500 })),
      },
    },
  };
  if (!sampleIsValid("uiBeat-on-first", healthyFrame, healthyScene, healthyScene)) {
    throw new Error("Healthy on-sample self-test failed");
  }
  const partiallyRunning = {
    ...healthyScene,
    visibleRunningConsumers: 1,
    visibleRunningByType: { button: 1 },
  };
  if (sampleIsValid("uiBeat-on-first", healthyFrame, partiallyRunning, healthyScene)) {
    throw new Error("Partially running on-sample was accepted");
  }
  const changedInventory = {
    ...healthyScene,
    expectedAcceptedConsumers: 3,
    expectedByType: { button: 1, knob: 1, joystick: 1 },
    visibleBoundConsumers: 3,
    visibleBoundByType: { button: 1, knob: 1, joystick: 1 },
    visibleRunningConsumers: 3,
    visibleRunningByType: { button: 1, knob: 1, joystick: 1 },
    runningAcceptedConsumers: 3,
  };
  if (sampleIsValid("uiBeat-on-first", healthyFrame, healthyScene, changedInventory)) {
    throw new Error("Changed within-sample consumer inventory was accepted");
  }
  if (consumerInventoriesMatch([healthyScene, changedInventory])) {
    throw new Error("Changed cross-sample consumer inventory was accepted");
  }
  const missingFamily = {
    ...healthyScene,
    visibleBoundConsumers: 2,
    visibleBoundByType: { button: 2 },
    visibleRunningConsumers: 2,
    visibleRunningByType: { button: 2 },
    runningAcceptedConsumers: 2,
  };
  if (sampleIsValid("uiBeat-on-first", healthyFrame, missingFamily, missingFamily)) {
    throw new Error("Expected Knob and Joystick families missing from bindings were accepted");
  }
  const oneExpectedUnbound = {
    ...healthyScene,
    visibleBoundConsumers: 3,
    visibleBoundByType: { button: 1, knob: 1, joystick: 1 },
    visibleRunningConsumers: 3,
    visibleRunningByType: { button: 1, knob: 1, joystick: 1 },
    runningAcceptedConsumers: 3,
  };
  if (sampleIsValid("uiBeat-on-first", healthyFrame, oneExpectedUnbound, oneExpectedUnbound)) {
    throw new Error("One expected unbound consumer was accepted");
  }
  const frozenFrame = {
    ...healthyFrame,
    uiBeatCadence: {
      targetCount: 4,
      maximumAllowedIdleGapMs: 2_000,
      targets: Array.from({ length: 4 }, (_, index) => ({ index, mutationCount: 0, distinctScaleValues: 1, maxIdleGapMs: 1_000 })),
    },
  };
  if (sampleIsValid("uiBeat-on-first", frozenFrame, healthyScene, healthyScene)) {
    throw new Error("Frozen UIBeat cadence was accepted");
  }
  const frozenIndicatorFrame = {
    ...healthyFrame,
    beatIndicator: {
      ...healthyFrame.beatIndicator,
      cadence: {
        maximumAllowedIdleGapMs: 2_000,
        maximumAllowedChildIdleGapMs: 2_000,
        maxIdleGapMs: 4_001,
        children: Array.from({ length: 4 }, (_, index) => ({ index, mutationCount: 0, distinctStyleValues: 1 })),
      },
    },
  };
  if (sampleIsValid("uiBeat-on-first", frozenIndicatorFrame, healthyScene, healthyScene)) {
    throw new Error("Frozen BeatIndicator was accepted while control cadence remained healthy");
  }
  const oneFrozenIndicatorChildFrame = {
    ...healthyFrame,
    beatIndicator: {
      ...healthyFrame.beatIndicator,
      cadence: {
        ...healthyFrame.beatIndicator.cadence,
        children: healthyFrame.beatIndicator.cadence.children.map((child, index) =>
          index === 0 ? { ...child, mutationCount: 3, distinctStyleValues: 3, maxIdleGapMs: 3_000 } : child
        ),
      },
    },
  };
  if (sampleIsValid("uiBeat-on-first", oneFrozenIndicatorChildFrame, healthyScene, healthyScene)) {
    throw new Error("One BeatIndicator child that changed early then froze was accepted");
  }
  const missingIndicatorChildFrame = {
    ...healthyFrame,
    beatIndicator: {
      ...healthyFrame.beatIndicator,
      tracking: {
        ...healthyFrame.beatIndicator.tracking,
        initial: { ...healthyFrame.beatIndicator.tracking.initial, childCount: 3, contractValid: false },
      },
    },
  };
  if (sampleIsValid("uiBeat-on-first", missingIndicatorChildFrame, healthyScene, healthyScene)) {
    throw new Error("BeatIndicator with a missing child was accepted");
  }
  const earlyFreezeFrame = {
    ...healthyFrame,
    uiBeatCadence: {
      targetCount: 4,
      maximumAllowedIdleGapMs: 2_000,
      targets: Array.from({ length: 4 }, (_, index) => ({ index, mutationCount: 10, distinctScaleValues: 8, maxIdleGapMs: 8_500 })),
    },
  };
  if (sampleIsValid("uiBeat-on-first", earlyFreezeFrame, healthyScene, healthyScene)) {
    throw new Error("UIBeat cadence that changed initially then froze was accepted");
  }
  const shortEarlyActivityFrame = {
    ...healthyFrame,
    coverage: { requestedDurationMs: 1_000, observedDurationMs: 1_001, intervalCount: 61, includesInitialDelay: true },
    uiBeatCadence: {
      ...healthyFrame.uiBeatCadence,
      targets: healthyFrame.uiBeatCadence.targets.map((target) => ({ ...target, maxIdleGapMs: 800 })),
    },
  };
  if (sampleIsValid("uiBeat-on-first", shortEarlyActivityFrame, healthyScene, healthyScene)) {
    throw new Error("Window shorter than twice the cadence allowance was accepted");
  }
  if (sampleIsValid("uiBeat-on-first", { ...healthyFrame, interruptions: [{ type: "blur" }] }, healthyScene, healthyScene)) {
    throw new Error("Interrupted sample was accepted");
  }
  const starvedFrame = {
    ...healthyFrame,
    coverage: { requestedDurationMs: 1_000, observedDurationMs: 1_200, intervalCount: 1, includesInitialDelay: true },
  };
  if (sampleIsValid("uiBeat-on-first", starvedFrame, healthyScene, healthyScene)) {
    throw new Error("Initial-stall sample with one callback was accepted");
  }
  const emptyFrame = {
    ...healthyFrame,
    coverage: { requestedDurationMs: 1_000, observedDurationMs: 1_200, intervalCount: 0, includesInitialDelay: true },
  };
  if (sampleIsValid("uiBeat-on-first", emptyFrame, healthyScene, healthyScene)) {
    throw new Error("Sample without frame intervals was accepted");
  }
  const offScene = {
    transportPlaying: true,
    expectedAcceptedConsumers: 4,
    expectedByType: healthyCounts,
    missingExpectedTargets: 0,
    visibleBoundConsumers: 0,
    visibleBoundByType: {},
    visibleRunningConsumers: 0,
    visibleRunningByType: {},
    runningAcceptedConsumers: 0,
    indicatorRunning: false,
  };
  const stillTracking = {
    targetCount: 4,
    expectedCount: 4,
    missingTargetCount: 0,
    matchesExpectedSet: true,
    allConnected: true,
    allVisible: true,
    allBound: false,
    allRunning: false,
    noneBound: true,
    noneRunning: true,
  };
  const healthyOffFrame = {
    ...healthyFrame,
    uiBeatCadence: {
      targetCount: 4,
      maximumAllowedIdleGapMs: 2_000,
      targets: Array.from({ length: 4 }, (_, index) => ({
        index,
        mutationCount: 0,
        distinctScaleValues: 1,
        maxIdleGapMs: 4_001,
        initialScale: "1",
        finalScale: "1",
      })),
    },
    trackedConsumers: { initial: stillTracking, final: stillTracking, validThroughout: true },
    beatIndicator: {
      tracking: {
        initial: { rootCount: 1, childCount: 4, contractValid: true, matchesRetainedNodes: true, allConnected: true, allVisible: true, allRunning: false, noneRunning: true },
        final: { rootCount: 1, childCount: 4, contractValid: true, matchesRetainedNodes: true, allConnected: true, allVisible: true, allRunning: false, noneRunning: true },
        validThroughout: true,
      },
      cadence: {
        maximumAllowedIdleGapMs: 2_000,
        maximumAllowedChildIdleGapMs: 2_000,
        maxIdleGapMs: 4_001,
        children: Array.from({ length: 4 }, (_, index) => ({ index, mutationCount: 0, distinctStyleValues: 1, initialStyle: "scale(1)|1", finalStyle: "scale(1)|1" })),
      },
    },
  };
  if (!sampleIsValid("uiBeat-off", healthyOffFrame, offScene, offScene)) {
    throw new Error("Healthy off-sample self-test failed");
  }
  const leakedOffFrame = {
    ...healthyOffFrame,
    uiBeatCadence: {
      ...healthyOffFrame.uiBeatCadence,
      targets: healthyOffFrame.uiBeatCadence.targets.map((target, index) =>
        index === 0 ? { ...target, mutationCount: 1 } : target
      ),
    },
  };
  if (sampleIsValid("uiBeat-off", leakedOffFrame, offScene, offScene)) {
    throw new Error("Leaked off-window scale update was accepted");
  }
  const leakedIndicatorOffFrame = {
    ...healthyOffFrame,
    beatIndicator: {
      ...healthyOffFrame.beatIndicator,
      cadence: {
        ...healthyOffFrame.beatIndicator.cadence,
        children: healthyOffFrame.beatIndicator.cadence.children.map((child, index) =>
          index === 0 ? { ...child, mutationCount: 1, distinctStyleValues: 2, finalStyle: "scale(.9)|.5" } : child
        ),
      },
    },
  };
  if (sampleIsValid("uiBeat-off", leakedIndicatorOffFrame, offScene, offScene)) {
    throw new Error("Leaked off-window BeatIndicator motion was accepted");
  }
  const replacedOffFrame = {
    ...healthyOffFrame,
    trackedConsumers: { ...healthyOffFrame.trackedConsumers, validThroughout: false },
  };
  if (sampleIsValid("uiBeat-off", replacedOffFrame, offScene, offScene)) {
    throw new Error("Disconnected or replaced tracked consumer was accepted");
  }
  let missingWebSocketRejected = false;
  try {
    validateRuntime({ nodeVersion: "22.0.0", fetchType: "function", webSocketType: "undefined" });
  } catch { missingWebSocketRejected = true; }
  if (!missingWebSocketRejected) throw new Error("Runtime without WebSocket was accepted");
  validateRuntime({ nodeVersion: process.versions.node, fetchType: typeof fetch, webSocketType: typeof WebSocket });
  const validMetadata = {
    evidenceClass: "physical-native-visible",
    deviceName: "Test device",
    deviceType: "desktop",
    os: "Test OS",
    display: "Test display",
    power: "AC power",
    thermal: "Cool before capture",
    browserWindow: "Native and foreground",
    operatorObservationBefore: "Visible and unobscured before capture",
    sourceRevision: "0123456789abcdef",
  };
  validateMetadata(validMetadata);
  for (const missing of ["power", "thermal"]) {
    const incomplete = { ...validMetadata };
    delete incomplete[missing];
    let rejected = false;
    try { validateMetadata(incomplete); } catch { rejected = true; }
    if (!rejected) throw new Error(`Metadata without ${missing} was accepted`);
    const whitespaceOnly = { ...validMetadata, [missing]: "   \n" };
    rejected = false;
    try { validateMetadata(whitespaceOnly); } catch { rejected = true; }
    if (!rejected) throw new Error(`Whitespace-only ${missing} metadata was accepted`);
  }
  let promptedBeforeCompletion = false;
  try {
    await collectPostRunObservation(validMetadata, false, async () => "after capture");
  } catch { promptedBeforeCompletion = true; }
  if (!promptedBeforeCompletion) throw new Error("Post-run observation was accepted before capture completion");
  const successfulAnswers = ["yes", "no", "no", "yes", "No interruption or stutter; device remained cool"];
  const finalizedObservation = await collectPostRunObservation(validMetadata, true, async () => successfulAnswers.shift());
  if (!operatorObservationIsAcceptable(finalizedObservation) ||
      finalizedObservation?.narrative !== "No interruption or stutter; device remained cool") {
    throw new Error("Post-run observation finalization self-test failed");
  }
  const adverseAnswers = ["yes", "no", "yes", "yes", "Visible stutter occurred"];
  const adverseObservation = await collectPostRunObservation(validMetadata, true, async () => adverseAnswers.shift());
  if (operatorObservationIsAcceptable(adverseObservation)) {
    throw new Error("Adverse post-run operator observation was accepted");
  }
  const unknownAnswers = ["unknown", "no", "no", "yes", "Visibility could not be confirmed"];
  const unknownObservation = await collectPostRunObservation(validMetadata, true, async () => unknownAnswers.shift());
  if (operatorObservationIsAcceptable(unknownObservation)) {
    throw new Error("Unknown post-run operator verdict was accepted");
  }
  const stageOpenPlan = configPreparationActions({ panelExpanded: true, globalSelected: false });
  if (stageOpenPlan.join(",") !== "select-global") {
    throw new Error(`Open Stage panel would be toggled: ${stageOpenPlan.join(",")}`);
  }
  const stageClosedPlan = configPreparationActions({ panelExpanded: false, globalSelected: false });
  if (stageClosedPlan.join(",") !== "open-panel,select-global") {
    throw new Error(`Closed Stage panel preparation is incomplete: ${stageClosedPlan.join(",")}`);
  }
  const traceCounts = traceSummary([
    { name: "Paint" },
    { name: "RasterTask" },
    { name: "DrawFrame" },
  ]).byName;
  if (traceCounts.Paint !== 1 || traceCounts.RasterTask !== 1 || traceCounts.DrawFrame !== 1) {
    throw new Error(`Full trace event-name counts were not retained: ${JSON.stringify(traceCounts)}`);
  }
  const drained = [];
  let disconnected = false;
  drainPerformanceObservers([{
    observer: {
      takeRecords: () => [{ toJSON: () => ({ name: "terminal-long-frame" }) }],
      disconnect: () => { disconnected = true; },
    },
    sink: drained,
  }]);
  if (drained[0]?.name !== "terminal-long-frame" || !disconnected) {
    throw new Error("Queued terminal performance entry was not drained before disconnect");
  }
  assertMonitorCoversPreparation(100, 101);
  let uncoveredPreparationRejected = false;
  try { assertMonitorCoversPreparation(102, 101); } catch { uncoveredPreparationRejected = true; }
  if (!uncoveredPreparationRejected) throw new Error("Preparation before interruption monitoring was accepted");
  const fingerprint = {
    codeText: "do re mi",
    controls: [{ label: "BPM", value: "120" }],
    harmony: "auto",
    instrument: "Piano",
    globalConfig: [{ id: "global-control-paper", value: "ivory" }],
    visualRuntime: visualRuntimeFingerprint({
      visualsEnabled: true,
      effectiveConfig: {
        stage: { isEnabled: true, zoom: 1 },
        blobs: { isEnabled: true, count: 7 },
        strings: { isEnabled: true, count: 4 },
        uiBeat: { isEnabled: true, intensity: 1 },
      },
    }),
  };
  if (!fingerprintsMatch([{ workloadFingerprint: fingerprint }, { workloadFingerprint: { ...fingerprint } }])) {
    throw new Error("Unchanged workload fingerprint was rejected");
  }
  if (fingerprintsMatch([
    { workloadFingerprint: fingerprint },
    { workloadFingerprint: { ...fingerprint, controls: [{ label: "BPM", value: "121" }] } },
  ])) {
    throw new Error("Changed workload fingerprint was accepted");
  }
  const uiRhythmOffFingerprint = {
    ...fingerprint,
    visualRuntime: visualRuntimeFingerprint({
      visualsEnabled: true,
      effectiveConfig: {
        stage: { isEnabled: true, zoom: 1 },
        blobs: { isEnabled: true, count: 7 },
        strings: { isEnabled: true, count: 4 },
        uiBeat: { isEnabled: false, intensity: 1 },
      },
    }),
  };
  if (!fingerprintsMatch([{ workloadFingerprint: fingerprint }, { workloadFingerprint: uiRhythmOffFingerprint }])) {
    throw new Error("Intentional UI Rhythm toggle changed the workload fingerprint");
  }
  const visualChanges = [
    ["transient Stage Look", { ...fingerprint.visualRuntime, effectiveConfig: { ...fingerprint.visualRuntime.effectiveConfig, blobs: { isEnabled: true, count: 11 } } }],
    ["Blobs disabled", { ...fingerprint.visualRuntime, effectiveConfig: { ...fingerprint.visualRuntime.effectiveConfig, blobs: { isEnabled: false, count: 7 } } }],
    ["Strings disabled", { ...fingerprint.visualRuntime, effectiveConfig: { ...fingerprint.visualRuntime.effectiveConfig, strings: { isEnabled: false, count: 4 } } }],
    ["Stage numeric setting", { ...fingerprint.visualRuntime, effectiveConfig: { ...fingerprint.visualRuntime.effectiveConfig, stage: { isEnabled: true, zoom: 1.25 } } }],
    ["master visuals switch", { ...fingerprint.visualRuntime, visualsEnabled: false }],
  ];
  for (const [label, visualRuntime] of visualChanges) {
    if (fingerprintsMatch([
      { workloadFingerprint: fingerprint },
      { workloadFingerprint: { ...fingerprint, visualRuntime } },
    ])) throw new Error(`${label} change was accepted by the workload fingerprint`);
  }
  let missingVisualStoreRejected = false;
  try { visualRuntimeFingerprint(null); } catch (error) {
    missingVisualStoreRejected = /production Pinia visualConfig store/.test(error.message);
  }
  if (!missingVisualStoreRejected) throw new Error("Missing visualConfig runtime store was accepted");
  const captureFailure = new Error("capture failed");
  const restorationFailure = new Error("restore failed");
  let combinedFailure;
  try { throwCaptureOrRestorationError(captureFailure, restorationFailure); } catch (error) { combinedFailure = error; }
  if (!(combinedFailure instanceof AggregateError) ||
      combinedFailure.errors[0] !== captureFailure || combinedFailure.errors[1] !== restorationFailure ||
      combinedFailure.cause !== captureFailure) {
    throw new Error("Capture and restoration failures were not both preserved");
  }
  let restorationOnlyFailure;
  try { throwCaptureOrRestorationError(null, restorationFailure); } catch (error) { restorationOnlyFailure = error; }
  if (restorationOnlyFailure !== restorationFailure) throw new Error("Restoration-only failure was swallowed");
  const uniqueTarget = { type: "page", title: "EmotiTone", url: "https://example.test/current", webSocketDebuggerUrl: "ws://one" };
  if (selectUniqueTarget([uniqueTarget], "current", "http://cdp") !== uniqueTarget) {
    throw new Error("Unique CDP target was not selected");
  }
  let ambiguousTargetRejected = false;
  try {
    selectUniqueTarget([
      uniqueTarget,
      { ...uniqueTarget, url: "https://example.test/older", webSocketDebuggerUrl: "ws://two" },
    ], "emotitone", "http://cdp");
  } catch (error) {
    ambiguousTargetRejected = /Ambiguous page target/.test(error.message);
  }
  if (!ambiguousTargetRejected) throw new Error("Ambiguous CDP target was accepted");
  for (const renderer of ["Software Renderer", "Apple Software Renderer", "Microsoft Basic Render Driver", "softpipe"]) {
    if (!isKnownNonNativeRenderer([renderer], [])) throw new Error(`Software renderer was accepted: ${renderer}`);
  }
  if (isKnownNonNativeRenderer(["ANGLE (NVIDIA GeForce RTX 3060)"], ["DrawFrame"])) {
    throw new Error("Hardware renderer was classified as software");
  }
  const nativeEnvironment = { userAgent: "Chrome", webgl: { renderer: "NVIDIA RTX 3060", vendor: "NVIDIA" } };
  const stableRenderer = rendererAssessment(nativeEnvironment, { ...nativeEnvironment, webgl: { ...nativeEnvironment.webgl } }, []);
  if (stableRenderer.knownNonNativeRenderer || !stableRenderer.rendererStable || !stableRenderer.rendererIdentityUsable) {
    throw new Error("Stable hardware renderer was rejected");
  }
  for (const missingWebgl of [
    { renderer: null, vendor: null },
    { renderer: "   ", vendor: "NVIDIA" },
    { renderer: "NVIDIA RTX 3060", vendor: " " },
  ]) {
    const missingIdentity = rendererAssessment(
      { userAgent: "Chrome", webgl: missingWebgl },
      { userAgent: "Chrome", webgl: missingWebgl },
      [],
    );
    if (missingIdentity.rendererIdentityUsable) throw new Error("Missing or blank renderer identity was accepted");
  }
  const softwareFallback = rendererAssessment(
    nativeEnvironment,
    { userAgent: "Chrome", webgl: { renderer: "SwiftShader Device", vendor: "Google" } },
    [],
  );
  if (!softwareFallback.knownNonNativeRenderer || softwareFallback.rendererStable) {
    throw new Error("Native-to-software renderer fallback was accepted");
  }
  const changedNativeRenderer = rendererAssessment(
    nativeEnvironment,
    { userAgent: "Chrome", webgl: { renderer: "AMD Radeon", vendor: "AMD" } },
    [],
  );
  if (changedNativeRenderer.rendererStable) throw new Error("Changed native renderer was accepted");
  console.log("capture statistics self-test passed");
}

function sampleIsValid(label, frameCallbacks, initialScene, finalScene) {
  const expectedOn = label.startsWith("uiBeat-on");
  return !frameCallbacks.timedOut && frameCallbacks.interruptions.length === 0 &&
    frameCallbacks.visibilityState === "visible" && frameCallbacks.hasFocus &&
    frameCallbacks.coverage.includesInitialDelay && frameCallbacks.coverage.intervalCount >= 2 &&
    frameCallbacks.coverage.observedDurationMs >= frameCallbacks.coverage.requestedDurationMs &&
    frameCallbacks.coverage.requestedDurationMs >= 2 * frameCallbacks.uiBeatCadence.maximumAllowedIdleGapMs &&
    frameCallbacks.coverage.requestedDurationMs >= 2 * frameCallbacks.beatIndicator.cadence.maximumAllowedChildIdleGapMs &&
    initialScene.transportPlaying && finalScene.transportPlaying &&
    (expectedOn
      ? sceneHasCompleteVisibleBeat(initialScene) && sceneHasCompleteVisibleBeat(finalScene) &&
        consumerInventoriesMatch([initialScene, finalScene]) && uiBeatCadenceIsActive(frameCallbacks, initialScene) &&
        beatIndicatorCadenceIsActive(frameCallbacks) &&
        initialScene.indicatorRunning && finalScene.indicatorRunning
      : initialScene.runningAcceptedConsumers === 0 && finalScene.runningAcceptedConsumers === 0 &&
        initialScene.visibleRunningConsumers === 0 && finalScene.visibleRunningConsumers === 0 &&
        offTrackedConsumersAreStill(frameCallbacks) && beatIndicatorIsStill(frameCallbacks) &&
        !initialScene.indicatorRunning && !finalScene.indicatorRunning);
}

function beatIndicatorCadenceIsActive(frameCallbacks) {
  const { tracking, cadence } = frameCallbacks.beatIndicator ?? {};
  return tracking?.validThroughout && tracking.initial.contractValid && tracking.final.contractValid &&
    tracking.initial.matchesRetainedNodes && tracking.final.matchesRetainedNodes &&
    tracking.initial.rootCount === 1 && tracking.final.rootCount === 1 &&
    tracking.initial.childCount === 4 && tracking.final.childCount === 4 &&
    tracking.initial.allConnected && tracking.final.allConnected &&
    tracking.initial.allVisible && tracking.final.allVisible &&
    tracking.initial.allRunning && tracking.final.allRunning &&
    Number.isFinite(cadence?.maximumAllowedChildIdleGapMs) && cadence.maximumAllowedChildIdleGapMs > 0 &&
    cadence.children.length === 4 && cadence.children.every(({ mutationCount, distinctStyleValues, maxIdleGapMs }) =>
      mutationCount >= 2 && distinctStyleValues >= 2 && maxIdleGapMs <= cadence.maximumAllowedChildIdleGapMs
    ) && cadence.maxIdleGapMs <= cadence.maximumAllowedIdleGapMs;
}

function beatIndicatorIsStill(frameCallbacks) {
  const { tracking, cadence } = frameCallbacks.beatIndicator ?? {};
  return tracking?.validThroughout && tracking.initial.contractValid && tracking.final.contractValid &&
    tracking.initial.matchesRetainedNodes && tracking.final.matchesRetainedNodes &&
    tracking.initial.allConnected && tracking.final.allConnected &&
    tracking.initial.allVisible && tracking.final.allVisible &&
    tracking.initial.noneRunning && tracking.final.noneRunning &&
    cadence?.children.length === 4 && cadence.children.every((child) =>
      child.mutationCount === 0 && child.distinctStyleValues === 1 && child.initialStyle === child.finalStyle
    );
}

function consumerInventoriesMatch(scenes) {
  const inventories = scenes.map((scene) => JSON.stringify({
    total: scene.expectedAcceptedConsumers,
    byType: Object.fromEntries(Object.entries(scene.expectedByType).sort(([left], [right]) => left.localeCompare(right))),
  }));
  return inventories.length > 0 && inventories.every((value) => value === inventories[0]);
}

function uiBeatCadenceIsActive(frameCallbacks, scene) {
  const cadence = frameCallbacks.uiBeatCadence;
  const tracking = frameCallbacks.trackedConsumers;
  return cadence?.targetCount === scene.visibleBoundConsumers && cadence.targetCount > 0 &&
    tracking?.initial.targetCount === cadence.targetCount && tracking.final.targetCount === cadence.targetCount &&
    tracking.validThroughout &&
    tracking.initial.matchesExpectedSet && tracking.final.matchesExpectedSet &&
    tracking.initial.allConnected && tracking.final.allConnected &&
    tracking.initial.allVisible && tracking.final.allVisible &&
    tracking.initial.allBound && tracking.final.allBound &&
    tracking.initial.allRunning && tracking.final.allRunning &&
    Number.isFinite(cadence.maximumAllowedIdleGapMs) && cadence.maximumAllowedIdleGapMs > 0 &&
    cadence.targets.length === cadence.targetCount &&
    cadence.targets.every(({ mutationCount, distinctScaleValues, maxIdleGapMs }) =>
      mutationCount >= 2 && distinctScaleValues >= 2 && maxIdleGapMs <= cadence.maximumAllowedIdleGapMs
    );
}

function offTrackedConsumersAreStill(frameCallbacks) {
  const cadence = frameCallbacks.uiBeatCadence;
  const tracking = frameCallbacks.trackedConsumers;
  return cadence?.targetCount > 0 && tracking?.initial.targetCount === cadence.targetCount &&
    tracking.final.targetCount === cadence.targetCount &&
    tracking.validThroughout &&
    tracking.initial.matchesExpectedSet && tracking.final.matchesExpectedSet &&
    tracking.initial.allConnected && tracking.final.allConnected &&
    tracking.initial.allVisible && tracking.final.allVisible &&
    tracking.initial.noneBound && tracking.final.noneBound &&
    tracking.initial.noneRunning && tracking.final.noneRunning &&
    cadence.targets.length === cadence.targetCount &&
    cadence.targets.every(({ mutationCount, distinctScaleValues, initialScale, finalScale }) =>
      mutationCount === 0 && distinctScaleValues === 1 && initialScale === finalScale
    );
}

function cadenceAllowanceMs(scene) {
  const bpm = Number(scene.workloadFingerprint?.controls?.find(({ label }) => label === "BPM")?.value);
  return Number.isFinite(bpm) && bpm > 0 ? Math.max(2_000, 120_000 / bpm) : 0;
}

function indicatorChildCadenceAllowanceMs(scene) {
  const bpm = Number(scene.workloadFingerprint?.controls?.find(({ label }) => label === "BPM")?.value);
  return Number.isFinite(bpm) && bpm > 0 ? Math.max(2_000, 240_000 / bpm) : 0;
}

function isKnownNonNativeRenderer(environmentValues, traceNames) {
  return environmentValues.some((value) =>
    /headless|swiftshader|llvmpipe|softpipe|software(?:\s+\w+)*\s+renderer|software raster|microsoft basic render driver/i.test(value ?? "")
  ) || traceNames.some((name) => /SoftwareRenderer/i.test(name));
}

function rendererAssessment(initialEnvironment, finalEnvironment, traceNames) {
  const values = [
    initialEnvironment.userAgent,
    initialEnvironment.webgl?.renderer,
    initialEnvironment.webgl?.vendor,
    finalEnvironment.userAgent,
    finalEnvironment.webgl?.renderer,
    finalEnvironment.webgl?.vendor,
  ];
  const rendererIdentity = (environment) => JSON.stringify({
    renderer: environment.webgl?.renderer ?? null,
    vendor: environment.webgl?.vendor ?? null,
  });
  const identityIsUsable = (environment) =>
    typeof environment.webgl?.renderer === "string" && environment.webgl.renderer.trim().length > 0 &&
    typeof environment.webgl?.vendor === "string" && environment.webgl.vendor.trim().length > 0;
  return {
    knownNonNativeRenderer: isKnownNonNativeRenderer(values, traceNames),
    rendererStable: rendererIdentity(initialEnvironment) === rendererIdentity(finalEnvironment),
    rendererIdentityUsable: identityIsUsable(initialEnvironment) && identityIsUsable(finalEnvironment),
  };
}

function sceneHasCompleteVisibleBeat(scene) {
  const acceptedTypes = new Set(["button", "knob", "joystick", "sticker"]);
  const types = new Set([
    ...Object.keys(scene.expectedByType),
    ...Object.keys(scene.visibleBoundByType),
    ...Object.keys(scene.visibleRunningByType),
  ]);
  return scene.expectedAcceptedConsumers > 0 &&
    scene.missingExpectedTargets === 0 &&
    scene.visibleBoundConsumers === scene.expectedAcceptedConsumers &&
    scene.visibleRunningConsumers === scene.visibleBoundConsumers &&
    [...types].every((type) => acceptedTypes.has(type) &&
      (scene.expectedByType[type] ?? 0) === (scene.visibleBoundByType[type] ?? 0) &&
      (scene.visibleBoundByType[type] ?? 0) === (scene.visibleRunningByType[type] ?? 0));
}

function configPreparationActions({ panelExpanded, globalSelected }) {
  const actions = [];
  if (!panelExpanded) actions.push("open-panel");
  if (!globalSelected) actions.push("select-global");
  return actions;
}

async function collectPostRunObservation(metadata, captureComplete, prompt) {
  if (metadata.evidenceClass !== "physical-native-visible") return null;
  if (!captureComplete) throw new Error("Physical operator observation must be collected after capture completion");
  const verdict = async (question) => {
    const answer = String(await prompt(`${question} [yes/no]: `)).trim().toLowerCase();
    return answer === "yes" ? true : answer === "no" ? false : null;
  };
  const visibleAndUnobscured = await verdict("Was the native browser window visible and unobscured for the entire measured run?");
  const interruptionObserved = await verdict("Did any physical-display interruption occur during the measured run?");
  const stutterObserved = await verdict("Did you observe visible stutter during the measured run?");
  const thermalAcceptable = await verdict("Did the final thermal state remain acceptable without overheating or throttling?");
  const narrative = String(await prompt("Post-run observation narrative and final thermal state: ")).trim();
  if (!narrative) throw new Error("Physical capture requires a non-empty post-run operator narrative");
  return {
    recordedAt: new Date().toISOString(),
    visibleAndUnobscured,
    interruptionObserved,
    stutterObserved,
    thermalAcceptable,
    narrative,
  };
}

function operatorObservationIsAcceptable(observation) {
  return observation?.visibleAndUnobscured === true &&
    observation.interruptionObserved === false &&
    observation.stutterObserved === false &&
    observation.thermalAcceptable === true &&
    typeof observation.narrative === "string" && observation.narrative.trim().length > 0;
}

function drainPerformanceObservers(bindings) {
  for (const { observer, sink } of bindings) {
    sink.push(...observer.takeRecords().map((entry) => entry.toJSON()));
    observer.disconnect();
  }
}

function fingerprintsMatch(scenes) {
  const fingerprints = scenes.map((scene) => scene.workloadFingerprint);
  const complete = fingerprints.every((fingerprint) =>
    typeof fingerprint?.codeText === "string" && fingerprint.codeText.trim().length > 0 &&
    typeof fingerprint.harmony === "string" && fingerprint.harmony.trim().length > 0 &&
    typeof fingerprint.instrument === "string" && fingerprint.instrument.trim().length > 0 &&
    Array.isArray(fingerprint.controls) && fingerprint.controls.length > 0 &&
    fingerprint.controls.some(({ label, value }) => label === "BPM" && String(value).trim().length > 0) &&
    Array.isArray(fingerprint.globalConfig) && fingerprint.globalConfig.length > 0 &&
    typeof fingerprint.visualRuntime?.visualsEnabled === "boolean" &&
    fingerprint.visualRuntime.effectiveConfig && typeof fingerprint.visualRuntime.effectiveConfig === "object"
  );
  if (!complete) return false;
  const serialized = fingerprints.map((fingerprint) => JSON.stringify(fingerprint));
  return serialized.length > 0 && serialized.every((value) => value === serialized[0]);
}

function assertMonitorCoversPreparation(monitorStartedAt, preparationStartedAt) {
  if (!Number.isFinite(monitorStartedAt) || monitorStartedAt > preparationStartedAt) {
    throw new Error("Capture interruption monitor did not cover scene preparation");
  }
}

function throwCaptureOrRestorationError(captureError, restorationError) {
  if (captureError && restorationError) {
    throw new AggregateError(
      [captureError, restorationError],
      `Capture failed (${captureError.message}) and UI Rhythm restoration also failed (${restorationError.message})`,
      { cause: captureError },
    );
  }
  if (captureError) throw captureError;
  if (restorationError) throw restorationError;
}

function selectUniqueTarget(targets, query, endpoint) {
  const normalizedQuery = query.toLowerCase();
  const matches = targets.filter((candidate) =>
    candidate.type === "page" && [candidate.url, candidate.title]
      .some((value) => value?.toLowerCase().includes(normalizedQuery))
  );
  if (matches.length === 0) {
    throw new Error(`No page target matching ${JSON.stringify(query)} at ${endpoint}`);
  }
  if (matches.length > 1) {
    const descriptions = matches.map(({ title, url }) => `${JSON.stringify(title)} ${url}`).join("; ");
    throw new Error(
      `Ambiguous page target ${JSON.stringify(query)} matched ${matches.length} tabs at ${endpoint}: ${descriptions}. Close extra tabs or pass a unique --target substring.`,
    );
  }
  return matches[0];
}

class CdpConnection {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolvePromise, reject) => {
      this.socket.addEventListener("open", resolvePromise, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
    return () => this.listeners.set(
      method,
      (this.listeners.get(method) ?? []).filter((candidate) => candidate !== listener),
    );
  }

  command(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 45_000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timeout); resolvePromise(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); },
      });
    });
  }

  close() {
    this.socket?.close();
  }
}

const delay = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function evaluate(cdp, expression) {
  const response = await cdp.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}

async function clickSelector(cdp, selector) {
  const point = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLElement)) return null;
    element.scrollIntoView({ block: "center", inline: "center" });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) throw new Error(`Could not find clickable element ${selector}`);
  await cdp.command("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
  await delay(80);
  await cdp.command("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
}

async function waitForSelector(cdp, selector, timeout = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
    await delay(200);
  }
  const diagnostic = await evaluate(cdp, `({
    body: document.body?.innerText?.slice(0, 500),
    buttons: Array.from(document.querySelectorAll("button")).map((button) => ({ text: button.innerText, className: button.className, aria: button.getAttribute("aria-label") })).slice(0, 20),
  })`);
  throw new Error(`Timed out waiting for ${selector}: ${JSON.stringify(diagnostic)}`);
}

async function environment(cdp) {
  return evaluate(cdp, `(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const extension = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null;
    const vendor = extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : null;
    return {
      url: location.href,
      title: document.title,
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      webdriver: navigator.webdriver,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGiB: navigator.deviceMemory ?? null,
      viewportCssPx: [innerWidth, innerHeight],
      screenCssPx: [screen.width, screen.height],
      availableScreenCssPx: [screen.availWidth, screen.availHeight],
      devicePixelRatio,
      colorDepth: screen.colorDepth,
      webgl: { renderer, vendor },
    };
  })()`);
}

async function startCaptureMonitor(cdp) {
  await evaluate(cdp, `(() => {
    window.__uiBeatCapacityMonitor?.dispose?.();
    const events = [];
    const record = (type) => events.push({
      type,
      at: performance.now(),
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
      viewportCssPx: [innerWidth, innerHeight],
    });
    const listeners = [
      [document, "visibilitychange", () => record("visibilitychange")],
      [window, "blur", () => record("blur")],
      [window, "focus", () => record("focus")],
      [window, "resize", () => record("resize")],
    ];
    listeners.forEach(([target, type, listener]) => target.addEventListener(type, listener));
    window.__uiBeatCapacityMonitor = {
      events,
      trackedConsumers: [],
      trackedIndicatorRoots: [],
      trackedIndicatorChildren: [],
      dispose: () => {
        listeners.forEach(([target, type, listener]) => target.removeEventListener(type, listener));
        window.__uiBeatCapacityMonitor.trackedConsumers.length = 0;
        window.__uiBeatCapacityMonitor.trackedIndicatorRoots.length = 0;
        window.__uiBeatCapacityMonitor.trackedIndicatorChildren.length = 0;
      },
    };
  })()`);
}

async function stopCaptureMonitor(cdp) {
  return evaluate(cdp, `(() => {
    const events = window.__uiBeatCapacityMonitor?.events ?? [];
    window.__uiBeatCapacityMonitor?.dispose?.();
    delete window.__uiBeatCapacityMonitor;
    return events;
  })()`);
}

async function getMetrics(cdp) {
  const result = await cdp.command("Performance.getMetrics");
  return Object.fromEntries(result.metrics.map(({ name, value }) => [name, value]));
}

function metricDelta(before, after) {
  const names = [
    "TaskDuration",
    "ScriptDuration",
    "LayoutDuration",
    "RecalcStyleDuration",
    "DevToolsCommandDuration",
    "JSHeapUsedSize",
    "Nodes",
    "LayoutCount",
    "RecalcStyleCount",
  ];
  return Object.fromEntries(names.map((name) => [name, (after[name] ?? 0) - (before[name] ?? 0)]));
}

async function traceWhile(cdp, action) {
  const events = [];
  let complete;
  const completed = new Promise((resolvePromise) => { complete = resolvePromise; });
  const removeDataListener = cdp.on("Tracing.dataCollected", ({ value }) => events.push(...value));
  const removeCompleteListener = cdp.on("Tracing.tracingComplete", () => complete());
  let started = false;
  try {
    await cdp.command("Tracing.start", { categories: TRACE_CATEGORIES, options: "record-as-much-as-possible" });
    started = true;
    const value = await action();
    await cdp.command("Tracing.end");
    started = false;
    let completionTimeout;
    await Promise.race([completed, new Promise((_, reject) => {
      completionTimeout = setTimeout(() => reject(new Error("Trace completion timed out")), 15_000);
    })]);
    clearTimeout(completionTimeout);
    return { value, events };
  } finally {
    if (started) await cdp.command("Tracing.end").catch(() => undefined);
    removeDataListener();
    removeCompleteListener();
  }
}

function traceSummary(events) {
  const selectedNames = new Set([
    "AnimationFrame::Presentation",
    "Display::FrameDisplayed",
    "DroppedFrame",
    "FrameSequenceTrackerV3",
    "WaitForPresentation",
  ]);
  const interesting = events.filter((event) => selectedNames.has(event.name));
  const byName = {};
  for (const event of events) {
    byName[event.name] = (byName[event.name] ?? 0) + 1;
  }
  return {
    rawEventCount: events.length,
    byName,
    selectedEvents: interesting.map(({ name, ph, ts, dur, pid, tid, args }) => ({ name, ph, ts, dur, pid, tid, args })),
  };
}

async function sample(cdp, label, duration, traceDuration) {
  const initialScene = await sceneState(cdp);
  const before = await getMetrics(cdp);
  const frameCallbacks = await evaluate(cdp, `(async () => {
    ${drainPerformanceObservers.toString()}
    ${expectedUIBeatConsumers.toString()}
    const duration = ${duration};
    const timestamps = [];
    const longAnimationFrames = [];
    const longTasks = [];
    const interruptions = [];
    const observers = [];
    const startedAt = performance.now();
    const expectedOn = ${JSON.stringify(label.startsWith("uiBeat-on"))};
    const isVisibleCadenceTarget = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 &&
        rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
    };
    const monitor = window.__uiBeatCapacityMonitor;
    const initialExpected = expectedUIBeatConsumers();
    const currentlyExpectedTargets = initialExpected.targets;
    if (expectedOn && monitor && monitor.trackedConsumers.length === 0) {
      monitor.trackedConsumers.push(...currentlyExpectedTargets);
    }
    const cadenceTargets = monitor?.trackedConsumers ?? [];
    const currentIndicatorContract = () => {
      const roots = Array.from(document.querySelectorAll(
        '.code-strip-bar .beat-indicator[aria-label="Pattern beat"]:not(.beat-indicator--static)'
      )).filter(isVisibleCadenceTarget);
      const children = roots.flatMap((root) =>
        Array.from(root.querySelectorAll(':scope > .beat-indicator__beat'))
      );
      return { roots, children };
    };
    const initialIndicator = currentIndicatorContract();
    if (expectedOn && monitor && monitor.trackedIndicatorRoots.length === 0) {
      monitor.trackedIndicatorRoots.push(...initialIndicator.roots);
      monitor.trackedIndicatorChildren.push(...initialIndicator.children);
    }
    const indicatorRoots = monitor?.trackedIndicatorRoots ?? [];
    const indicatorChildren = monitor?.trackedIndicatorChildren ?? [];
    const trackedState = () => {
      const expected = expectedUIBeatConsumers();
      const retained = new Set(cadenceTargets);
      return {
        targetCount: cadenceTargets.length,
        expectedCount: expected.expectedCount,
        missingTargetCount: expected.missingTargetCount,
        matchesExpectedSet: expected.missingTargetCount === 0 && expected.targets.length === cadenceTargets.length &&
          expected.targets.every((target) => retained.has(target)),
        allConnected: cadenceTargets.every((target) => target.isConnected),
        allVisible: cadenceTargets.every(isVisibleCadenceTarget),
        allBound: cadenceTargets.every((target) => target.hasAttribute("data-ui-beat-scale")),
        allRunning: cadenceTargets.every((target) => target.getAttribute("data-ui-beat-state") === "running"),
        noneBound: cadenceTargets.every((target) => !target.hasAttribute("data-ui-beat-scale")),
        noneRunning: cadenceTargets.every((target) => target.getAttribute("data-ui-beat-state") !== "running"),
      };
    };
    const trackedAtStart = trackedState();
    const trackedStateMatchesMode = (state) => state.targetCount > 0 && state.matchesExpectedSet &&
      state.allConnected && state.allVisible &&
      (expectedOn ? state.allBound && state.allRunning : state.noneBound && state.noneRunning);
    let trackedConsumersValidThroughout = trackedStateMatchesMode(trackedAtStart);
    const indicatorState = () => {
      const current = currentIndicatorContract();
      const retainedRoots = new Set(indicatorRoots);
      const retainedChildren = new Set(indicatorChildren);
      const contractValid = current.roots.length === 1 && current.children.length === 4 &&
        current.children.every(isVisibleCadenceTarget);
      return {
        rootCount: current.roots.length,
        childCount: current.children.length,
        contractValid,
        matchesRetainedNodes: current.roots.length === indicatorRoots.length &&
          current.children.length === indicatorChildren.length &&
          current.roots.every((root) => retainedRoots.has(root)) &&
          current.children.every((child) => retainedChildren.has(child)),
        allConnected: [...indicatorRoots, ...indicatorChildren].every((target) => target.isConnected),
        allVisible: [...indicatorRoots, ...indicatorChildren].every(isVisibleCadenceTarget),
        allRunning: indicatorRoots.length > 0 &&
          indicatorRoots.every((root) => root.getAttribute("data-ui-beat-state") === "running"),
        noneRunning: indicatorRoots.every((root) => root.getAttribute("data-ui-beat-state") !== "running"),
      };
    };
    const indicatorAtStart = indicatorState();
    const indicatorStateMatchesMode = (state) => state.contractValid && state.matchesRetainedNodes &&
      state.allConnected && state.allVisible && (expectedOn ? state.allRunning : state.noneRunning);
    let indicatorValidThroughout = indicatorStateMatchesMode(indicatorAtStart);
    const cadence = cadenceTargets.map((target, index) => {
      const initialScale = target.style.getPropertyValue("scale");
      return { index, mutationCount: 0, lastScale: initialScale, scaleValues: new Set([initialScale]), changeTimes: [] };
    });
    const cadenceByTarget = new Map(cadenceTargets.map((target, index) => [target, cadence[index]]));
    const recordCadence = (records) => {
      for (const record of records) {
        const targetCadence = cadenceByTarget.get(record.target);
        if (!targetCadence) continue;
        targetCadence.mutationCount += 1;
        const scale = record.target.style.getPropertyValue("scale");
        targetCadence.scaleValues.add(scale);
        if (scale !== targetCadence.lastScale) {
          targetCadence.lastScale = scale;
          targetCadence.changeTimes.push(performance.now());
        }
      }
    };
    const cadenceObserver = new MutationObserver(recordCadence);
    cadenceTargets.forEach((target) => cadenceObserver.observe(target, { attributes: true, attributeFilter: ["style"] }));
    const indicatorStyle = (target) => target.style.transform + "|" + target.style.opacity;
    const indicatorCadence = indicatorChildren.map((target, index) => {
      const initialStyle = indicatorStyle(target);
      return { index, mutationCount: 0, lastStyle: initialStyle, styleValues: new Set([initialStyle]), changeTimes: [] };
    });
    const indicatorCadenceByTarget = new Map(indicatorChildren.map((target, index) => [target, indicatorCadence[index]]));
    const indicatorChangeTimes = [];
    const recordIndicatorCadence = (records) => {
      for (const record of records) {
        const targetCadence = indicatorCadenceByTarget.get(record.target);
        if (!targetCadence) continue;
        targetCadence.mutationCount += 1;
        const style = indicatorStyle(record.target);
        targetCadence.styleValues.add(style);
        if (style !== targetCadence.lastStyle) {
          targetCadence.lastStyle = style;
          const changedAt = performance.now();
          targetCadence.changeTimes.push(changedAt);
          indicatorChangeTimes.push(changedAt);
        }
      }
    };
    const indicatorObserver = new MutationObserver(recordIndicatorCadence);
    indicatorChildren.forEach((target) => indicatorObserver.observe(target, { attributes: true, attributeFilter: ["style"] }));
    const observe = (type, sink) => {
      try {
        const observer = new PerformanceObserver((list) => sink.push(...list.getEntries().map((entry) => entry.toJSON())));
        observer.observe({ type, buffered: false });
        observers.push({ observer, sink });
      } catch {}
    };
    observe("long-animation-frame", longAnimationFrames);
    observe("longtask", longTasks);
    const recordVisibility = () => interruptions.push({ type: "visibilitychange", at: performance.now(), visibilityState: document.visibilityState });
    const recordBlur = () => interruptions.push({ type: "blur", at: performance.now() });
    const recordFocus = () => interruptions.push({ type: "focus", at: performance.now() });
    document.addEventListener("visibilitychange", recordVisibility);
    window.addEventListener("blur", recordBlur);
    window.addEventListener("focus", recordFocus);
    let timedOut = false;
    let sampleTimeout;
    let frameId;
    let active = true;
    const callbackTimes = [];
    await Promise.race([new Promise((resolvePromise) => {
      const tick = (timestamp) => {
        if (!active) return;
        trackedConsumersValidThroughout &&= trackedStateMatchesMode(trackedState());
        indicatorValidThroughout &&= indicatorStateMatchesMode(indicatorState());
        const callbackAt = performance.now();
        timestamps.push(timestamp);
        callbackTimes.push(callbackAt);
        if (callbackAt - startedAt >= duration) resolvePromise();
        else frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    }), new Promise((resolvePromise) => {
      sampleTimeout = setTimeout(() => { timedOut = true; resolvePromise(); }, duration + 5_000);
    })]);
    active = false;
    if (frameId !== undefined) cancelAnimationFrame(frameId);
    clearTimeout(sampleTimeout);
    const endedAt = performance.now();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    document.removeEventListener("visibilitychange", recordVisibility);
    window.removeEventListener("blur", recordBlur);
    window.removeEventListener("focus", recordFocus);
    drainPerformanceObservers(observers);
    recordCadence(cadenceObserver.takeRecords());
    cadenceObserver.disconnect();
    recordIndicatorCadence(indicatorObserver.takeRecords());
    indicatorObserver.disconnect();
    const intervals = callbackTimes.map((callbackAt, index) =>
      index === 0 ? callbackAt - startedAt : callbackAt - callbackTimes[index - 1]
    );
    return {
      startedAt,
      endedAt,
      timestamps,
      callbackTimes,
      intervals,
      coverage: {
        requestedDurationMs: duration,
        observedDurationMs: endedAt - startedAt,
        intervalCount: intervals.length,
        includesInitialDelay: true,
      },
      longAnimationFrames,
      longTasks,
      interruptions,
      timedOut,
      uiBeatCadence: {
        targetCount: cadenceTargets.length,
        targets: cadence.map(({ index, mutationCount, scaleValues, changeTimes, lastScale }) => {
          const boundedChangeTimes = changeTimes.map((time) => Math.min(time, endedAt));
          const boundaries = [startedAt, ...boundedChangeTimes, endedAt];
          const maxIdleGapMs = Math.max(...boundaries.slice(1).map((time, boundaryIndex) => time - boundaries[boundaryIndex]));
          return {
            index,
            mutationCount,
            distinctScaleValues: scaleValues.size,
            maxIdleGapMs,
            initialScale: [...scaleValues][0],
            finalScale: lastScale,
          };
        }),
      },
      trackedConsumers: { initial: trackedAtStart, final: trackedState(), validThroughout: trackedConsumersValidThroughout },
      beatIndicator: {
        tracking: { initial: indicatorAtStart, final: indicatorState(), validThroughout: indicatorValidThroughout },
        cadence: {
          maxIdleGapMs: Math.max(...[startedAt, ...indicatorChangeTimes.map((time) => Math.min(time, endedAt)), endedAt]
            .slice(1).map((time, index, boundaries) => {
              const previous = index === 0 ? startedAt : boundaries[index - 1];
              return time - previous;
            })),
          children: indicatorCadence.map(({ index, mutationCount, styleValues, lastStyle, changeTimes }) => {
            const boundedChangeTimes = changeTimes.map((time) => Math.min(time, endedAt));
            const boundaries = [startedAt, ...boundedChangeTimes, endedAt];
            return {
              index,
              mutationCount,
              distinctStyleValues: styleValues.size,
              maxIdleGapMs: Math.max(...boundaries.slice(1).map((time, boundaryIndex) => time - boundaries[boundaryIndex])),
              initialStyle: [...styleValues][0],
              finalStyle: lastStyle,
            };
          }),
        },
      },
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
      uiBeat: {
        bound: document.querySelectorAll("[data-ui-beat-scale]").length,
        running: document.querySelectorAll('[data-ui-beat-state="running"]').length,
        idle: document.querySelectorAll('[data-ui-beat-state="idle"]').length,
        indicatorRunning: document.querySelectorAll('.beat-indicator[data-ui-beat-state="running"]').length,
      },
    };
  })()`);
  frameCallbacks.uiBeatCadence.maximumAllowedIdleGapMs = cadenceAllowanceMs(initialScene);
  frameCallbacks.beatIndicator.cadence.maximumAllowedIdleGapMs = cadenceAllowanceMs(initialScene);
  frameCallbacks.beatIndicator.cadence.maximumAllowedChildIdleGapMs = indicatorChildCadenceAllowanceMs(initialScene);
  const after = await getMetrics(cdp);
  const traced = await traceWhile(cdp, async () => delay(traceDuration));
  const finalScene = await sceneState(cdp);
  const valid = sampleIsValid(label, frameCallbacks, initialScene, finalScene);
  return {
    label,
    valid,
    initialScene,
    finalScene,
    frameCallbacks: { ...frameCallbacks, summary: summarizeIntervals(frameCallbacks.intervals) },
    cdpMetricsDelta: metricDelta(before, after),
    trace: { durationMs: traceDuration, ...traceSummary(traced.events) },
  };
}

async function sceneState(cdp) {
  return evaluate(cdp, `(() => {
    ${expectedUIBeatConsumers.toString()}
    ${visualRuntimeFingerprint.toString()}
    const running = Array.from(document.querySelectorAll('[data-ui-beat-state="running"]'));
    const bound = Array.from(document.querySelectorAll('[data-ui-beat-scale]'));
    const classify = (element) => {
      if (element.closest(".knob-wrapper")) return "knob";
      if (element.closest(".joystick")) return "joystick";
      if (element.closest(".sticker")) return "sticker";
      if (element.closest(".paper-button")) return "button";
      return "unknown";
    };
    const countByType = (elements) => Object.fromEntries(elements.reduce((counts, element) => {
      const type = classify(element);
      counts.set(type, (counts.get(type) ?? 0) + 1);
      return counts;
    }, new Map()));
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 &&
        rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
    };
    const runningConsumers = running.filter((element) => !element.classList.contains("beat-indicator"));
    const expected = expectedUIBeatConsumers();
    const visible = bound.filter(isVisible);
    const visibleRunning = runningConsumers.filter(isVisible);
    const normalizeText = (value) => value?.replace(/\\s+/g, " ").trim() ?? "";
    const workloadFingerprint = {
      codeText: Array.from(document.querySelectorAll(".cm-content .cm-line"))
        .map((line) => line.textContent ?? "")
        .join("\\n"),
      controls: Array.from(document.querySelectorAll(".control-bar .knob-wrapper")).map((control) => ({
        label: normalizeText(control.querySelector(".knob-wrapper__label")?.textContent),
        value: control.getAttribute("aria-valuetext") ??
          normalizeText(control.querySelector(".knob-range-value")?.textContent),
      })),
      harmony: document.querySelector(".control-bar .joystick")?.getAttribute("data-latched") ?? "",
      instrument: normalizeText(document.querySelector('[data-testid="instrument-selector-trigger"] .drawer__label')?.textContent),
      globalConfig: Array.from(document.querySelectorAll('[data-testid^="global-control-"]:not([data-testid="global-control-uiRhythm"])')).map((control) => ({
        id: control.getAttribute("data-testid"),
        value: control.getAttribute("aria-pressed") ?? control.getAttribute("aria-valuetext") ??
          normalizeText(control.querySelector(".knob-range-value")?.textContent),
      })),
      visualRuntime: visualRuntimeFingerprint(
        document.querySelector("#app")?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get("visualConfig"),
      ),
    };
    return {
      transportPlaying: Boolean(document.querySelector('button[aria-label="Stop"]')),
      expectedAcceptedConsumers: expected.expectedCount,
      expectedByType: expected.expectedByType,
      missingExpectedTargets: expected.missingTargetCount,
      boundAcceptedConsumers: bound.length,
      boundByType: countByType(bound),
      visibleBoundConsumers: visible.length,
      visibleBoundByType: countByType(visible),
      runningAcceptedConsumers: runningConsumers.length,
      runningByType: countByType(runningConsumers),
      visibleRunningConsumers: visibleRunning.length,
      visibleRunningByType: countByType(visibleRunning),
      workloadFingerprint,
      indicatorRunning: Boolean(document.querySelector('.beat-indicator[data-ui-beat-state="running"]')),
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
    };
  })()`);
}

async function setUiRhythm(cdp, enabled, warmup) {
  const selector = '[data-testid="global-control-uiRhythm"]';
  const current = await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)})?.getAttribute("aria-pressed") === "true"`);
  if (current !== enabled) await clickSelector(cdp, selector);
  await delay(warmup);
  const actual = await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)})?.getAttribute("aria-pressed") === "true"`);
  if (actual !== enabled) throw new Error(`UI Rhythm did not change to ${enabled}`);
}

async function prepareGlobalConfig(cdp) {
  const trigger = '[data-testid="config-panel-trigger"]';
  const globalTab = '[data-testid="config-tab-global"]';
  const initialState = await evaluate(cdp, `({
    panelExpanded: document.querySelector(${JSON.stringify(trigger)})?.getAttribute("aria-expanded") === "true",
    globalSelected: document.querySelector(${JSON.stringify(globalTab)})?.getAttribute("aria-selected") === "true",
  })`);
  for (const action of configPreparationActions(initialState)) {
    if (action === "open-panel") {
      await clickSelector(cdp, trigger);
      await waitForSelector(cdp, globalTab);
    } else {
      const selected = await evaluate(cdp, `document.querySelector(${JSON.stringify(globalTab)})?.getAttribute("aria-selected") === "true"`);
      if (!selected) await clickSelector(cdp, globalTab);
    }
  }
  await waitForSelector(cdp, '[data-testid="global-control-uiRhythm"]');
  await delay(700);
}

async function prepareScene(cdp) {
  await delay(1_000);
  if (await evaluate(cdp, `Boolean(document.querySelector(".converged-loader__skip"))`)) {
    await clickSelector(cdp, ".converged-loader__skip");
  } else if (await evaluate(cdp, `Boolean(document.querySelector('[aria-label="Play EmotiTone"]'))`)) {
    await clickSelector(cdp, '[aria-label="Play EmotiTone"]');
  }
  await waitForSelector(cdp, ".keyboard__key");
  await delay(500);
  const hasStop = await evaluate(cdp, `Boolean(document.querySelector('button[aria-label="Stop"]'))`);
  let addedNotes = 0;
  if (!hasStop) {
    const keys = await evaluate(cdp, `Array.from(document.querySelectorAll(".keyboard__key")).slice(0, 5).map((key) => {
      const rect = key.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })`);
    for (const point of keys) {
      await cdp.command("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
      await delay(100);
      await cdp.command("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
      await delay(80);
      addedNotes += 1;
    }
    await waitForSelector(cdp, 'button[aria-label="Play"]');
    await clickSelector(cdp, 'button[aria-label="Play"]');
    await delay(2_000);
  }
  if (!await evaluate(cdp, `Boolean(document.querySelector('button[aria-label="Stop"]'))`)) {
    throw new Error("Production transport is not playing");
  }
  await prepareGlobalConfig(cdp);
  if (!await evaluate(cdp, `Boolean(document.querySelector('[data-testid="global-control-uiRhythm"]'))`)) {
    throw new Error("Could not open the production Global config surface");
  }
  return {
    reusedExistingPlayback: hasStop,
    addedNotes,
    codeText: await evaluate(cdp, `document.querySelector(".cm-content")?.textContent ?? null`),
  };
}

function validateMetadata(metadata) {
  const required = [
    "evidenceClass",
    "deviceName",
    "deviceType",
    "os",
    "display",
    "power",
    "thermal",
    "browserWindow",
    "operatorObservationBefore",
    "sourceRevision",
  ];
  for (const key of required) {
    if (typeof metadata[key] !== "string" || metadata[key].trim().length === 0) {
      throw new Error(`Metadata is missing ${key}`);
    }
  }
  const allowed = ["physical-native-visible", "software-rendered", "emulated-viewport"];
  if (!allowed.includes(metadata.evidenceClass)) throw new Error(`Unsupported evidenceClass ${metadata.evidenceClass}`);
}

async function main() {
  validateRuntime({
    nodeVersion: process.versions.node,
    fetchType: typeof fetch,
    webSocketType: typeof WebSocket,
  });
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return console.log(usage());
  if (options.selfTest) return selfTest();
  if (!options.metadata || !options.output) throw new Error(`--metadata and --output are required\n\n${usage()}`);

  const metadata = JSON.parse(await readFile(resolve(options.metadata), "utf8"));
  validateMetadata(metadata);
  const endpoint = options.cdp.replace(/\/$/, "");
  const [targets, version] = await Promise.all([
    fetch(`${endpoint}/json/list`).then((response) => response.json()),
    fetch(`${endpoint}/json/version`).then((response) => response.json()),
  ]);
  const target = selectUniqueTarget(targets, options.target, endpoint);

  const cdp = new CdpConnection(target.webSocketDebuggerUrl);
  await cdp.open();
  try {
    await cdp.command("Runtime.enable");
    await cdp.command("Page.enable");
    await cdp.command("Performance.enable");
    await cdp.command("Page.bringToFront");
    await delay(500);
    const initialEnvironment = await environment(cdp);
    if (initialEnvironment.visibilityState !== "visible" || !initialEnvironment.hasFocus) {
      throw new Error(`Refusing background-tab evidence: visibility=${initialEnvironment.visibilityState}, focus=${initialEnvironment.hasFocus}`);
    }
    await startCaptureMonitor(cdp);
    const monitorStartedAt = Date.now();
    const preparationStartedAt = Date.now();
    assertMonitorCoversPreparation(monitorStartedAt, preparationStartedAt);
    const loadedBuildIdentity = await verifyLoadedBuildIdentity({
      cdp,
      expectedRevision: metadata.sourceRevision,
    });
    let scenePreparation;
    let originalUiRhythm;
    const samples = [];
    let captureInterruptions = [];
    let captureError = null;
    let restorationError = null;
    try {
      scenePreparation = await prepareScene(cdp);
      originalUiRhythm = await evaluate(cdp, `document.querySelector('[data-testid="global-control-uiRhythm"]')?.getAttribute("aria-pressed") === "true"`);
      await setUiRhythm(cdp, true, options.warmup);
      samples.push(await sample(cdp, "uiBeat-on-first", options.duration, options.traceDuration));
      await setUiRhythm(cdp, false, options.warmup);
      samples.push(await sample(cdp, "uiBeat-off", options.duration, options.traceDuration));
      await setUiRhythm(cdp, true, options.warmup);
      samples.push(await sample(cdp, "uiBeat-on-second", options.duration, options.traceDuration));
    } catch (error) {
      captureError = error;
    } finally {
      if (originalUiRhythm !== undefined) {
        try {
          await setUiRhythm(cdp, originalUiRhythm, 0);
        } catch (error) {
          restorationError = error;
        }
      }
      captureInterruptions = await stopCaptureMonitor(cdp).catch(() => [{ type: "monitor-read-failed" }]);
    }
    throwCaptureOrRestorationError(captureError, restorationError);
    const finalEnvironment = await environment(cdp);
    const measurementCompletedAt = new Date().toISOString();
    let postRunOperatorObservation = null;
    if (metadata.evidenceClass === "physical-native-visible") {
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error("Physical capture finalization requires an interactive terminal for the post-run operator observation");
      }
      const terminal = createInterface({ input: process.stdin, output: process.stdout });
      try {
        postRunOperatorObservation = await collectPostRunObservation(
          metadata,
          true,
          (question) => terminal.question(question),
        );
      } finally {
        terminal.close();
      }
    }
    const { knownNonNativeRenderer, rendererStable, rendererIdentityUsable } = rendererAssessment(
      initialEnvironment,
      finalEnvironment,
      samples.flatMap((sampleResult) => Object.keys(sampleResult.trace.byName)),
    );
    const sceneFingerprintStable = fingerprintsMatch(samples.flatMap(({ initialScene, finalScene }) => [initialScene, finalScene]));
    const onScenes = samples
      .filter(({ label }) => label.startsWith("uiBeat-on"))
      .flatMap(({ initialScene, finalScene }) => [initialScene, finalScene]);
    const consumerInventoryStable = consumerInventoriesMatch(onScenes);
    const allSamplesValid = samples.every((sampleResult) => sampleResult.valid) &&
      sceneFingerprintStable && consumerInventoryStable;
    const operatorObservationAcceptable = operatorObservationIsAcceptable(postRunOperatorObservation);
    const buildIdentityVerified = loadedBuildIdentity.sourceRevision === metadata.sourceRevision;
    const capacityClosureEligible = metadata.evidenceClass === "physical-native-visible" &&
      operatorObservationAcceptable &&
      buildIdentityVerified &&
      !knownNonNativeRenderer && rendererStable && rendererIdentityUsable &&
      allSamplesValid && captureInterruptions.length === 0 &&
      initialEnvironment.visibilityState === "visible" && initialEnvironment.hasFocus &&
      finalEnvironment.visibilityState === "visible" && finalEnvironment.hasFocus;
    const report = {
      schemaVersion: 1,
      capturedAt: measurementCompletedAt,
      finalizedAt: new Date().toISOString(),
      sourceRevision: metadata.sourceRevision ?? null,
      loadedBuildIdentity,
      evidenceClass: metadata.evidenceClass,
      capacityClosureEligible,
      device: metadata,
      postRunOperatorObservation,
      browser: { product: version.Browser, protocolVersion: version["Protocol-Version"], userAgent: version["User-Agent"] },
      environment: { initial: initialEnvironment, final: finalEnvironment },
      automatedEligibility: {
        knownNonNativeRenderer,
        buildIdentityVerified,
        rendererStable,
        rendererIdentityUsable,
        operatorObservationAcceptable,
        allSamplesValid,
        sceneFingerprintStable,
        consumerInventoryStable,
        captureUninterrupted: captureInterruptions.length === 0,
      },
      captureInterruptions,
      scenePreparation,
      methodology: {
        scene: "production route, sounding generated pattern, Config Global panel open",
        sequence: samples.map(({ label }) => label),
        durationMsPerState: options.duration,
        traceDurationMsPerState: options.traceDuration,
        warmupMs: options.warmup,
        buildIdentityScope: "before scene preparation, CDP matches the measured page's loaded entry HTML and CSS content plus exact-URL JavaScript executed in the main frame's default context to the manifest produced by a clean build of sourceRevision",
        frameCallbackScope: "rAF intervals cover browser-delivered animation opportunities for the whole page, including the delay from sample start to the first callback; they are not JS callback duration or proof of displayed hardware frames",
        uiBeatCadenceScope: "bounded MutationObservers record distinct inline scale changes for every expected visible UIBeat control and recurring transform/opacity changes for the retained four-child production BeatIndicator; aggregate on-window activity must avoid idle gaps longer than two beat periods with a 2000ms floor, every indicator child must avoid idle gaps longer than one four-beat cycle with the same floor, each window must span at least two applicable allowances, and retained nodes must remain unchanged while off",
        cdpTraceScope: "a separate diagnostic trace follows each untraced frame-callback window; selected raw presentation/drop events and full event-name counts are retained, event availability varies by browser build, and tracing does not prove display scanout",
        longAnimationFrameScope: "browser Long Animation Frame entries include main-thread script/render attribution where supported",
      },
      limitations: [
        "Physical displayed frames require the operator's named-device/native-window observation; CDP cannot independently prove panel scanout.",
        "requestAnimationFrame timestamps can reveal foreground page pacing but do not directly measure compositor-to-display presentation.",
        "The cadence guards' control-scale and BeatIndicator transform/opacity MutationObservers plus per-frame retained-node identity, connection, binding, state, and visibility checks add main-thread and layout observation work that can affect measured pacing.",
        "The read-only rendering-workload fingerprint depends on the production Pinia visualConfig runtime store and fails capture when that source-coupled introspection is unavailable.",
        "A software-rendered or emulated capture cannot close the physical-device capacity gate.",
      ],
      samples,
    };
    const output = resolve(options.output);
    const traceOutput = output.endsWith(".json")
      ? output.replace(/\.json$/, "-trace-events.json.gz")
      : `${output}-trace-events.json.gz`;
    const traceArtifact = {
      schemaVersion: 1,
      sourceRevision: metadata.sourceRevision,
      capturedAt: report.capturedAt,
      categories: TRACE_CATEGORIES,
      samples: samples.map((sampleResult) => ({
        label: sampleResult.label,
        durationMs: sampleResult.trace.durationMs,
        selectedEvents: sampleResult.trace.selectedEvents,
      })),
    };
    const traceBytes = gzipSync(`${JSON.stringify(traceArtifact)}\n`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(traceOutput, traceBytes);
    report.traceArtifact = {
      file: basename(traceOutput),
      sha256: createHash("sha256").update(traceBytes).digest("hex"),
      compressedBytes: traceBytes.byteLength,
      content: "gzip-compressed selected raw CDP presentation/drop events; full event-name counts remain inline",
    };
    for (const sampleResult of samples) delete sampleResult.trace.selectedEvents;
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    report.sha256BeforeDigestField = createHash("sha256").update(serialized).digest("hex");
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`wrote ${basename(output)}`);
  } finally {
    cdp.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
