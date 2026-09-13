#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, open, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { gzipSync } from "node:zlib";

import { verifyLoadedBuildIdentity } from "./capture-build-identity.mjs";
import { runtimeGuardInstallerExpression } from "./runtime-guard.mjs";

const TRACE_CATEGORIES = [
  "benchmark",
  "cc",
  "devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "viz",
].join(",");

const METADATA_EXAMPLE_PLACEHOLDERS = {
  deviceName: "manufacturer and model",
  deviceType: "desktop or mobile",
  os: "name and exact version",
  display: "native panel resolution, refresh rate, scaling, and browser viewport",
  power: "power source, power mode, and battery state",
  thermal: "observed thermal state before capture",
  browserWindow: "native browser, foreground, focused, unobscured, visible for full run",
  operatorObservationBefore: "name/date, native window visibility, and pre-run device condition",
  sourceRevision: "exact git SHA or exact-revision deployment SHA",
};

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

function clippingAwareVisible(element, environment = globalThis) {
  const rect = element.getBoundingClientRect();
  const style = environment.getComputedStyle(element);
  const unpainted = (computed) => computed.display === "none" ||
    Number.parseFloat(computed.opacity) === 0 || computed.contentVisibility === "hidden";
  if (unpainted(style) || ["hidden", "collapse"].includes(style.visibility) || rect.width <= 0 || rect.height <= 0) return false;
  let left = 0;
  let top = 0;
  let right = environment.innerWidth;
  let bottom = environment.innerHeight;
  const clips = (value) => /^(auto|clip|hidden|scroll)$/.test(value);
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const ancestorStyle = environment.getComputedStyle(ancestor);
    if (unpainted(ancestorStyle)) return false;
    const ancestorRect = ancestor.getBoundingClientRect();
    if (clips(ancestorStyle.overflowX || ancestorStyle.overflow)) {
      left = Math.max(left, ancestorRect.left);
      right = Math.min(right, ancestorRect.right);
    }
    if (clips(ancestorStyle.overflowY || ancestorStyle.overflow)) {
      top = Math.max(top, ancestorRect.top);
      bottom = Math.min(bottom, ancestorRect.bottom);
    }
  }
  return right > left && bottom > top && rect.right > left && rect.bottom > top && rect.left < right && rect.top < bottom;
}

function expectedUIBeatConsumers() {
  const contracts = [
    ["button", ".paper-button:not(:disabled):not(.paper-button--loading)", ".paper-button__face"],
    ["knob", ".knob-wrapper:not(.opacity-50)", ".knob-wrapper__face"],
    ["joystick", ".joystick", ".joystick__beat-face"],
    ["sticker", '.instrument-choice[data-state="selected"]', ".instrument-choice__sticker"],
  ];
  const entries = contracts.flatMap(([type, ownerSelector, targetSelector]) =>
    Array.from(document.querySelectorAll(ownerSelector))
      .filter((owner) => clippingAwareVisible(owner))
      .flatMap((owner) => {
        const target = owner.querySelector(targetSelector);
        return target && !clippingAwareVisible(target) ? [] : [{ type, target }];
      })
  );
  const targets = entries.flatMap(({ target }) => target && clippingAwareVisible(target) ? [target] : []);
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
  const scrollport = {
    parentElement: null,
    getBoundingClientRect: () => ({ left: 0, top: 150, right: 390, bottom: 600, width: 390, height: 450 }),
    style: { display: "block", visibility: "visible", overflowX: "hidden", overflowY: "auto" },
  };
  const clippedControl = {
    parentElement: scrollport,
    getBoundingClientRect: () => ({ left: 10, top: 50, right: 130, bottom: 130, width: 120, height: 80 }),
    style: { display: "block", visibility: "visible", overflowX: "visible", overflowY: "visible" },
  };
  const visibleControl = {
    ...clippedControl,
    getBoundingClientRect: () => ({ left: 10, top: 200, right: 130, bottom: 280, width: 120, height: 80 }),
  };
  const visibilityEnvironment = {
    innerWidth: 390,
    innerHeight: 844,
    getComputedStyle: (element) => element.style,
  };
  const partiallyVisibleOwner = {
    ...visibleControl,
    getBoundingClientRect: () => ({ left: 10, top: 140, right: 130, bottom: 220, width: 120, height: 80 }),
  };
  if (!clippingAwareVisible(partiallyVisibleOwner, visibilityEnvironment) ||
      clippingAwareVisible(clippedControl, visibilityEnvironment) ||
      !clippingAwareVisible(visibleControl, visibilityEnvironment)) {
    throw new Error("Partially visible owners, clipped faces, and visible UIBeat controls were not distinguished");
  }
  for (const hiddenStyle of [{ opacity: "0" }, { opacity: "0.0" }, { contentVisibility: "hidden" }, { display: "none" }]) {
    const hiddenControl = { ...visibleControl, style: { ...visibleControl.style, ...hiddenStyle } };
    const hiddenAncestorControl = {
      ...visibleControl,
      parentElement: { ...scrollport, style: { ...scrollport.style, ...hiddenStyle } },
    };
    if (clippingAwareVisible(hiddenControl, visibilityEnvironment) ||
        clippingAwareVisible(hiddenAncestorControl, visibilityEnvironment)) {
      throw new Error("Non-painted control or ancestor was included in the visible inventory");
    }
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
    identityViolations: [],
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
  for (const identityViolation of [
    { type: "attributes", attributeName: "data-ui-beat-state" },
    { type: "childList", attributeName: null },
  ]) {
    if (sampleIsValid("uiBeat-on-first", { ...healthyFrame, identityViolations: [identityViolation] }, healthyScene, healthyScene)) {
      throw new Error(`Trace-only UIBeat recovery was accepted: ${identityViolation.type}`);
    }
  }
  const traceFreezeRecoveryFrame = {
    ...healthyFrame,
    uiBeatCadence: {
      ...healthyFrame.uiBeatCadence,
      targets: healthyFrame.uiBeatCadence.targets.map((target, index) =>
        index === 0 ? { ...target, maxIdleGapMs: 2_500 } : target
      ),
    },
  };
  if (sampleIsValid("uiBeat-on-first", traceFreezeRecoveryFrame, healthyScene, healthyScene)) {
    throw new Error("Trace-only UIBeat freeze and recovery was accepted");
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
  for (const [key, placeholder] of Object.entries(METADATA_EXAMPLE_PLACEHOLDERS)) {
    let rejected = false;
    try { validateMetadata({ ...validMetadata, [key]: placeholder }); } catch { rejected = true; }
    if (!rejected) throw new Error(`Shipped ${key} metadata placeholder was accepted`);
  }
  let invalidPhysicalDeviceTypeRejected = false;
  try { validateMetadata({ ...validMetadata, deviceType: "tablet" }); } catch { invalidPhysicalDeviceTypeRejected = true; }
  if (!invalidPhysicalDeviceTypeRejected) throw new Error("Unsupported physical deviceType was accepted");
  validateMetadata({ ...validMetadata, evidenceClass: "software-rendered", deviceType: "virtual desktop" });
  const outputTestDirectory = await mkdtemp(join(tmpdir(), "uibeat-capacity-output-"));
  try {
    const reportPath = join(outputTestDirectory, "evidence.json");
    const tracePath = join(outputTestDirectory, "evidence-trace-events.json.gz");
    await writeFile(reportPath, "existing report");
    let existingReportRejected = false;
    try { await reserveEvidenceOutputs(reportPath); } catch { existingReportRejected = true; }
    if (!existingReportRejected || await readFile(reportPath, "utf8") !== "existing report") {
      throw new Error("Existing report was overwritten or accepted");
    }
    await unlink(reportPath);
    await writeFile(tracePath, "existing trace");
    let existingTraceRejected = false;
    try { await reserveEvidenceOutputs(reportPath); } catch { existingTraceRejected = true; }
    let reportPlaceholderExists = true;
    try { await readFile(reportPath); } catch (error) { if (error.code === "ENOENT") reportPlaceholderExists = false; else throw error; }
    if (!existingTraceRejected || reportPlaceholderExists || await readFile(tracePath, "utf8") !== "existing trace") {
      throw new Error("Trace collision did not preserve existing evidence and clean its report reservation");
    }
    await unlink(tracePath);
    const firstReservation = await reserveEvidenceOutputs(reportPath);
    await firstReservation.reportHandle.writeFile("reserved report");
    let racingReservationRejected = false;
    try { await reserveEvidenceOutputs(reportPath); } catch { racingReservationRejected = true; }
    if (!racingReservationRejected || await readFile(reportPath, "utf8") !== "reserved report") {
      throw new Error("Exclusive evidence reservation did not reject a racing writer");
    }
    await cleanupEvidenceOutputs(firstReservation);
  } finally {
    await rm(outputTestDirectory, { recursive: true, force: true });
  }
  let promptedBeforeCompletion = false;
  try {
    await collectPostRunObservation(validMetadata, false, async () => "after capture");
  } catch { promptedBeforeCompletion = true; }
  if (!promptedBeforeCompletion) throw new Error("Post-run observation was accepted before capture completion");
  const successfulAnswers = ["yes", "no", "no", "yes", "yes", "No interruption or stutter; device and display remained stable"];
  const finalizedObservation = await collectPostRunObservation(validMetadata, true, async () => successfulAnswers.shift());
  if (!operatorObservationIsAcceptable(finalizedObservation) ||
      finalizedObservation?.narrative !== "No interruption or stutter; device and display remained stable") {
    throw new Error("Post-run observation finalization self-test failed");
  }
  const adverseAnswers = ["yes", "no", "yes", "yes", "yes", "Visible stutter occurred"];
  const adverseObservation = await collectPostRunObservation(validMetadata, true, async () => adverseAnswers.shift());
  if (operatorObservationIsAcceptable(adverseObservation)) {
    throw new Error("Adverse post-run operator observation was accepted");
  }
  const unknownAnswers = ["unknown", "no", "no", "yes", "yes", "Visibility could not be confirmed"];
  const unknownObservation = await collectPostRunObservation(validMetadata, true, async () => unknownAnswers.shift());
  if (operatorObservationIsAcceptable(unknownObservation)) {
    throw new Error("Unknown post-run operator verdict was accepted");
  }
  const changedDisplayAnswers = ["yes", "no", "no", "yes", "no", "Window moved to another display"];
  if (operatorObservationIsAcceptable(await collectPostRunObservation(validMetadata, true, async () => changedDisplayAnswers.shift()))) {
    throw new Error("Changed physical display was accepted");
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
  const serializedUiRhythmReader = Function(`return (${readUiRhythmState.toString()})`)();
  const uiRhythmRoot = (values) => ({
    querySelectorAll: () => values.map((value) => ({ getAttribute: () => value })),
  });
  if (serializedUiRhythmReader(uiRhythmRoot(["false"])) !== false ||
      serializedUiRhythmReader(uiRhythmRoot(["true"])) !== true) {
    throw new Error("Serialized UI Rhythm reader did not retain valid false/true states");
  }
  for (const [label, root] of [
    ["missing", uiRhythmRoot([])],
    ["duplicate", uiRhythmRoot(["true", "true"])],
    ["malformed", uiRhythmRoot([null])],
  ]) {
    let rejected = false;
    try { serializedUiRhythmReader(root); } catch { rejected = true; }
    if (!rejected) throw new Error(`Serialized UI Rhythm reader accepted ${label} control state`);
  }
  const serializedMonitorStop = Function(`return (${stopCaptureMonitorInPage.toString()})`)();
  let missingMonitorRejected = false;
  try { serializedMonitorStop({}); } catch { missingMonitorRejected = true; }
  if (!missingMonitorRejected) throw new Error("Missing capacity monitor was accepted at finalization");
  let monitorDisposed = false;
  const monitorRoot = {
    __uiBeatCapacityMonitor: {
      events: [{ type: "healthy" }],
      dispose: () => { monitorDisposed = true; },
    },
  };
  const monitorEvents = serializedMonitorStop(monitorRoot);
  if (!monitorDisposed || monitorEvents[0]?.type !== "healthy" || "__uiBeatCapacityMonitor" in monitorRoot) {
    throw new Error("Healthy serialized capacity monitor cleanup failed");
  }
  const disposalFailure = new Error("monitor disposal failed");
  const failingMonitorRoot = {
    __uiBeatCapacityMonitor: { events: [], dispose: () => { throw disposalFailure; } },
  };
  let surfacedDisposalFailure;
  try { serializedMonitorStop(failingMonitorRoot); } catch (error) { surfacedDisposalFailure = error; }
  if (surfacedDisposalFailure !== disposalFailure || "__uiBeatCapacityMonitor" in failingMonitorRoot) {
    throw new Error("Capacity monitor disposal failure was swallowed or left the owned global behind");
  }
  const captureFailure = new Error("capture failed");
  const restorationFailure = new Error("restore failed");
  const monitorFailure = new Error("monitor failed");
  let combinedFailure;
  try { throwCaptureOrRestorationError(captureFailure, restorationFailure, null, monitorFailure); } catch (error) { combinedFailure = error; }
  if (!(combinedFailure instanceof AggregateError) ||
      combinedFailure.errors[0] !== captureFailure || combinedFailure.errors[1] !== restorationFailure ||
      combinedFailure.errors[2] !== monitorFailure ||
      combinedFailure.cause !== captureFailure) {
    throw new Error("Capture, restoration, and monitor failures were not all preserved");
  }
  let restorationOnlyFailure;
  try { throwCaptureOrRestorationError(null, restorationFailure); } catch (error) { restorationOnlyFailure = error; }
  if (restorationOnlyFailure !== restorationFailure) throw new Error("Restoration-only failure was swallowed");
  const traceFailure = new Error("trace failed");
  const windowCleanupFailure = new Error("window cleanup failed");
  let combinedTraceFailure;
  try { throwTraceOrWindowFinalizationError(traceFailure, windowCleanupFailure); } catch (error) { combinedTraceFailure = error; }
  if (!(combinedTraceFailure instanceof AggregateError) ||
      combinedTraceFailure.errors[0] !== traceFailure || combinedTraceFailure.errors[1] !== windowCleanupFailure ||
      combinedTraceFailure.cause !== traceFailure) {
    throw new Error("Trace and UIBeat window cleanup failures were not both preserved");
  }
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
    ambiguousTargetRejected = /exactly one page target/.test(error.message);
  }
  if (!ambiguousTargetRejected) throw new Error("Ambiguous CDP target was accepted");
  let extraPageRejected = false;
  try {
    selectUniqueTarget([
      uniqueTarget,
      { ...uniqueTarget, id: "other", title: "Unrelated", url: "https://unrelated.test/", webSocketDebuggerUrl: "ws://two" },
    ], "current", "http://cdp");
  } catch (error) {
    extraPageRejected = /exactly one page target/.test(error.message);
  }
  if (!extraPageRejected) throw new Error("Nonmatching extra page target was accepted");
  const expectedTarget = { targetId: "expected", type: "page", url: "https://example.test/current" };
  if (pageTargetViolation("Target.targetCreated", expectedTarget, "expected", expectedTarget.url)) {
    throw new Error("Expected page target creation was rejected");
  }
  if (!pageTargetViolation("Target.targetCreated", { ...expectedTarget, targetId: "other" }, "expected", expectedTarget.url) ||
      !pageTargetViolation("Target.targetInfoChanged", { ...expectedTarget, url: "https://example.test/other" }, "expected", expectedTarget.url) ||
      !pageTargetViolation("Target.targetDestroyed", { targetId: "expected" }, "expected", expectedTarget.url)) {
    throw new Error("Page creation, navigation, or destruction was not rejected");
  }
  const stableDisplay = {
    screenCssPx: [1920, 1080], availableScreenCssPx: [1920, 1040], devicePixelRatio: 1,
    colorDepth: 24, screenOrientation: { type: "landscape-primary", angle: 0 }, screenIsExtended: false,
  };
  if (!displayFingerprintsMatch(stableDisplay, { ...stableDisplay, screenCssPx: [...stableDisplay.screenCssPx] }) ||
      displayFingerprintsMatch(stableDisplay, { ...stableDisplay, devicePixelRatio: 2 })) {
    throw new Error("Available display fingerprint stability check failed");
  }
  for (const renderer of ["Software Renderer", "Apple Software Renderer", "Microsoft Basic Render Driver", "softpipe"]) {
    if (!isKnownNonNativeRenderer([renderer], [])) throw new Error(`Software renderer was accepted: ${renderer}`);
  }
  const viewport = Object.assign(new EventTarget(), {
    scale: 1, width: 390, height: 844, offsetLeft: 0, offsetTop: 0, pageLeft: 0, pageTop: 0,
  });
  const viewportEvents = [];
  const viewportBindings = visualViewportListenerBindings(viewport, (type) =>
    viewportEvents.push({ type, viewport: visualViewportSnapshot(viewport) })
  );
  viewportBindings.forEach(([target, type, listener]) => target.addEventListener(type, listener));
  Object.assign(viewport, { scale: 2, width: 195, offsetLeft: 12, pageLeft: 12 });
  viewport.dispatchEvent(new Event("resize"));
  Object.assign(viewport, { scale: 1, width: 390, offsetLeft: 0, pageLeft: 0 });
  viewport.dispatchEvent(new Event("scroll"));
  viewportBindings.forEach(([target, type, listener]) => target.removeEventListener(type, listener));
  viewport.dispatchEvent(new Event("resize"));
  if (viewportEvents.length !== 2 || viewportEvents[0].type !== "visual-viewport-resize" ||
      viewportEvents[0].viewport.scale !== 2 || viewportEvents[0].viewport.offsetLeft !== 12 ||
      viewportEvents[1].type !== "visual-viewport-scroll" || viewportEvents[1].viewport.scale !== 1 ||
      visualViewportSnapshot(null) !== null || visualViewportListenerBindings(null, () => {}).length !== 0 ||
      displayFingerprintsMatch({ visualViewport: viewportEvents[0].viewport }, { visualViewport: viewportEvents[1].viewport })) {
    throw new Error("Visual viewport change/recovery, geometry, or listener cleanup was not preserved");
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
    Array.isArray(frameCallbacks.identityViolations) && frameCallbacks.identityViolations.length === 0 &&
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
  const samePanelAndDisplayMode = await verdict("Did the native window remain on the same physical panel and display mode for the entire measured run?");
  const narrative = String(await prompt("Post-run observation narrative and final thermal state: ")).trim();
  if (!narrative) throw new Error("Physical capture requires a non-empty post-run operator narrative");
  return {
    recordedAt: new Date().toISOString(),
    visibleAndUnobscured,
    interruptionObserved,
    stutterObserved,
    thermalAcceptable,
    samePanelAndDisplayMode,
    narrative,
  };
}

function operatorObservationIsAcceptable(observation) {
  return observation?.visibleAndUnobscured === true &&
    observation.interruptionObserved === false &&
    observation.stutterObserved === false &&
    observation.thermalAcceptable === true &&
    observation.samePanelAndDisplayMode === true &&
    typeof observation.narrative === "string" && observation.narrative.trim().length > 0;
}

function visualViewportSnapshot(viewport) {
  if (!viewport) return null;
  return {
    scale: viewport.scale,
    width: viewport.width,
    height: viewport.height,
    offsetLeft: viewport.offsetLeft,
    offsetTop: viewport.offsetTop,
    pageLeft: viewport.pageLeft,
    pageTop: viewport.pageTop,
  };
}

function visualViewportListenerBindings(viewport, record) {
  return viewport ? [
    [viewport, "resize", () => record("visual-viewport-resize")],
    [viewport, "scroll", () => record("visual-viewport-scroll")],
  ] : [];
}

function displayFingerprint(environmentValue) {
  return JSON.stringify({
    screenCssPx: environmentValue.screenCssPx,
    availableScreenCssPx: environmentValue.availableScreenCssPx,
    devicePixelRatio: environmentValue.devicePixelRatio,
    colorDepth: environmentValue.colorDepth,
    screenOrientation: environmentValue.screenOrientation,
    screenIsExtended: environmentValue.screenIsExtended,
    visualViewport: environmentValue.visualViewport,
  });
}

function displayFingerprintsMatch(initialEnvironment, finalEnvironment) {
  return displayFingerprint(initialEnvironment) === displayFingerprint(finalEnvironment);
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

function throwCaptureOrRestorationError(captureError, restorationError, runtimeGuardError = null, monitorError = null) {
  const errors = [captureError, restorationError, runtimeGuardError, monitorError].filter(Boolean);
  if (errors.length > 1) {
    throw new AggregateError(
      errors,
      `Capture finalization had multiple failures: ${errors.map((error) => error.message).join("; ")}`,
      { cause: captureError ?? errors[0] },
    );
  }
  if (errors.length === 1) throw errors[0];
}

function readUiRhythmState(root = document) {
  const controls = root.querySelectorAll('[data-testid="global-control-uiRhythm"]');
  if (controls.length !== 1) {
    throw new Error(`Expected exactly one UI Rhythm control, found ${controls.length}`);
  }
  const ariaPressed = controls[0].getAttribute("aria-pressed");
  if (ariaPressed !== "true" && ariaPressed !== "false") {
    throw new Error(`UI Rhythm control has invalid aria-pressed: ${JSON.stringify(ariaPressed)}`);
  }
  return ariaPressed === "true";
}

function stopCaptureMonitorInPage(root = window) {
  const monitor = root.__uiBeatCapacityMonitor;
  if (!monitor || !Array.isArray(monitor.events) || typeof monitor.dispose !== "function") {
    throw new Error("UIBeat capacity monitor is missing or malformed at capture finalization");
  }
  const events = monitor.events;
  let disposeError = null;
  try { monitor.dispose(); }
  catch (error) { disposeError = error; }
  delete root.__uiBeatCapacityMonitor;
  if (disposeError) throw disposeError;
  return events;
}

function throwTraceOrWindowFinalizationError(traceError, finalizationError) {
  if (traceError && finalizationError) {
    throw new AggregateError(
      [traceError, finalizationError],
      "Trace and UIBeat window finalization both failed",
      { cause: traceError },
    );
  }
  if (traceError) throw traceError;
  if (finalizationError) throw finalizationError;
}

function selectUniqueTarget(targets, query, endpoint) {
  const pageTargets = targets.filter((candidate) => candidate.type === "page");
  if (pageTargets.length !== 1) {
    const descriptions = pageTargets.map(({ title, url }) => `${JSON.stringify(title)} ${url}`).join("; ");
    throw new Error(
      `UIBeat capture requires exactly one page target for browser-wide trace attribution; found ${pageTargets.length} at ${endpoint}${descriptions ? `: ${descriptions}` : ""}`,
    );
  }
  const normalizedQuery = query.toLowerCase();
  const matches = pageTargets.filter((candidate) =>
    [candidate.url, candidate.title]
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

function pageTargetViolation(method, targetInfo, expectedTargetId, expectedUrl) {
  if (method === "Target.targetDestroyed") return targetInfo.targetId === expectedTargetId;
  if (targetInfo?.type !== "page") return false;
  return targetInfo.targetId !== expectedTargetId || targetInfo.url !== expectedUrl;
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

  command(method, params = {}, timeoutMs = 45_000) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, timeoutMs);
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

async function startBrowserTargetMonitor(browserWebSocketUrl, expectedTarget) {
  if (typeof browserWebSocketUrl !== "string" || !browserWebSocketUrl) {
    throw new Error("CDP browser endpoint did not provide a WebSocket URL for page-target monitoring");
  }
  const cdp = new CdpConnection(browserWebSocketUrl);
  const events = [];
  let stopped = false;
  let result;
  await cdp.open();
  const record = (method, targetInfo) => {
    if (targetInfo?.type !== "page" && method !== "Target.targetDestroyed") return;
    events.push({ method, targetId: targetInfo.targetId, url: targetInfo.url ?? null });
  };
  const disposers = [
    cdp.on("Target.targetCreated", ({ targetInfo }) => record("Target.targetCreated", targetInfo)),
    cdp.on("Target.targetInfoChanged", ({ targetInfo }) => record("Target.targetInfoChanged", targetInfo)),
    cdp.on("Target.targetDestroyed", ({ targetId }) => record("Target.targetDestroyed", { targetId })),
  ];
  try {
    await cdp.command("Target.setDiscoverTargets", { discover: true });
    const initial = await cdp.command("Target.getTargets");
    const initialPages = initial.targetInfos.filter(({ type }) => type === "page");
    if (initialPages.length !== 1 || initialPages[0].targetId !== expectedTarget.id || initialPages[0].url !== expectedTarget.url) {
      throw new Error("Page-target monitor did not start with exactly the selected unchanged page");
    }
  } catch (error) {
    disposers.forEach((dispose) => dispose());
    cdp.close();
    throw error;
  }
  return {
    async stop() {
      if (stopped) return result;
      stopped = true;
      try {
        const final = await cdp.command("Target.getTargets");
        const finalPages = final.targetInfos.filter(({ type }) => type === "page");
        const violations = events.filter(({ method, targetId, url }) =>
          pageTargetViolation(method, { type: method === "Target.targetDestroyed" ? undefined : "page", targetId, url }, expectedTarget.id, expectedTarget.url)
        );
        const finalValid = finalPages.length === 1 && finalPages[0].targetId === expectedTarget.id &&
          finalPages[0].url === expectedTarget.url;
        result = { valid: finalValid && violations.length === 0, events, violations, finalPages };
        return result;
      } finally {
        await cdp.command("Target.setDiscoverTargets", { discover: false }).catch(() => {});
        disposers.forEach((dispose) => dispose());
        cdp.close();
      }
    },
  };
}

const delay = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function evaluate(cdp, expression, timeoutMs) {
  const response = await cdp.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, timeoutMs);
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
    ${visualViewportSnapshot.toString()}
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
      visualViewport: visualViewportSnapshot(window.visualViewport),
      screenCssPx: [screen.width, screen.height],
      availableScreenCssPx: [screen.availWidth, screen.availHeight],
      devicePixelRatio,
      colorDepth: screen.colorDepth,
      screenOrientation: screen.orientation ? { type: screen.orientation.type, angle: screen.orientation.angle } : null,
      screenIsExtended: typeof screen.isExtended === "boolean" ? screen.isExtended : null,
      webgl: { renderer, vendor },
    };
  })()`);
}

async function startCaptureMonitor(cdp) {
  await evaluate(cdp, `(() => {
    ${visualViewportSnapshot.toString()}
    ${visualViewportListenerBindings.toString()}
    window.__uiBeatCapacityMonitor?.dispose?.();
    const events = [];
    const record = (type) => events.push({
      type,
      at: performance.now(),
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
      viewportCssPx: [innerWidth, innerHeight],
      visualViewport: visualViewportSnapshot(window.visualViewport),
    });
    const listeners = [
      [document, "visibilitychange", () => record("visibilitychange")],
      [window, "blur", () => record("blur")],
      [window, "focus", () => record("focus")],
      [window, "resize", () => record("resize")],
      ...visualViewportListenerBindings(window.visualViewport, record),
    ];
    listeners.forEach(([target, type, listener]) => target.addEventListener(type, listener));
    window.__uiBeatCapacityMonitor = {
      events,
      trackedConsumers: [],
      trackedIndicatorRoots: [],
      trackedIndicatorChildren: [],
      dispose: () => {
        let windowMonitorError = null;
        try { window.__uiBeatWindowMonitor?.dispose?.(); }
        catch (error) { windowMonitorError = error; }
        delete window.__uiBeatWindowMonitor;
        listeners.forEach(([target, type, listener]) => target.removeEventListener(type, listener));
        window.__uiBeatCapacityMonitor.trackedConsumers.length = 0;
        window.__uiBeatCapacityMonitor.trackedIndicatorRoots.length = 0;
        window.__uiBeatCapacityMonitor.trackedIndicatorChildren.length = 0;
        if (windowMonitorError) throw windowMonitorError;
      },
    };
  })()`);
}

async function stopCaptureMonitor(cdp) {
  return evaluate(cdp, `(() => {
    ${stopCaptureMonitorInPage.toString()}
    return stopCaptureMonitorInPage(window);
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
  await evaluate(cdp, `window.__uiBeatRuntimeGuard.start(${JSON.stringify({
    label,
    expectedDurationMs: duration + traceDuration,
    maximumCanvasIdleMs: 1_000,
  })})`);
  const initialScene = await sceneState(cdp);
  const before = await getMetrics(cdp);
  const frameCallbacks = await evaluate(cdp, `(async () => {
    if (window.__uiBeatWindowMonitor) throw new Error("UIBeat window monitor already exists");
    ${drainPerformanceObservers.toString()}
    ${clippingAwareVisible.toString()}
    ${expectedUIBeatConsumers.toString()}
    const duration = ${duration};
    const timestamps = [];
    const longAnimationFrames = [];
    const longTasks = [];
    const interruptions = [];
    const observers = [];
    const startedAt = performance.now();
    const expectedOn = ${JSON.stringify(label.startsWith("uiBeat-on"))};
    const isVisibleCadenceTarget = clippingAwareVisible;
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
      )).filter((root) => isVisibleCadenceTarget(root));
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
        allVisible: cadenceTargets.every((target) => isVisibleCadenceTarget(target)),
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
        current.children.every((child) => isVisibleCadenceTarget(child));
      return {
        rootCount: current.roots.length,
        childCount: current.children.length,
        contractValid,
        matchesRetainedNodes: current.roots.length === indicatorRoots.length &&
          current.children.length === indicatorChildren.length &&
          current.roots.every((root) => retainedRoots.has(root)) &&
          current.children.every((child) => retainedChildren.has(child)),
        allConnected: [...indicatorRoots, ...indicatorChildren].every((target) => target.isConnected),
        allVisible: [...indicatorRoots, ...indicatorChildren].every((target) => isVisibleCadenceTarget(target)),
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
    const retainedStateValues = new Map([
      ...cadenceTargets.map((target) => [target, {
        "data-ui-beat-scale": target.getAttribute("data-ui-beat-scale"),
        "data-ui-beat-state": target.getAttribute("data-ui-beat-state"),
      }]),
      ...indicatorRoots.map((target) => [target, {
        "data-ui-beat-scale": target.getAttribute("data-ui-beat-scale"),
        "data-ui-beat-state": target.getAttribute("data-ui-beat-state"),
      }]),
    ]);
    const retainedNodes = new Set([...cadenceTargets, ...indicatorRoots, ...indicatorChildren]);
    const identityViolations = [];
    const containsRetainedNode = (node) => retainedNodes.has(node) ||
      (node?.nodeType === 1 && [...retainedNodes].some((retained) => node.contains(retained)));
    const recordIdentity = (records) => {
      for (const record of records) {
        let invalid = false;
        if (record.type === "childList") {
          invalid = [...record.removedNodes, ...record.addedNodes].some(containsRetainedNode);
        } else if (record.type === "attributes" && retainedStateValues.has(record.target)) {
          const expectedValue = retainedStateValues.get(record.target)[record.attributeName];
          invalid = record.oldValue !== expectedValue || record.target.getAttribute(record.attributeName) !== expectedValue;
        }
        if (invalid) identityViolations.push({
          at: performance.now(),
          type: record.type,
          attributeName: record.attributeName ?? null,
        });
      }
    };
    const identityObserver = new MutationObserver(recordIdentity);
    identityObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["data-ui-beat-scale", "data-ui-beat-state"],
    });
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
    let lifecycleDisposed = false;
    let primaryStopped = false;
    let performanceObserversCleaned = false;
    let validationActive = false;
    let validationFrameId;
    let rejectPrimary;
    const callbackTimes = [];
    const cleanupPrimary = (drainObservers = true) => {
      if (!primaryStopped) {
        primaryStopped = true;
        active = false;
        if (frameId !== undefined) cancelAnimationFrame(frameId);
        if (sampleTimeout !== undefined) clearTimeout(sampleTimeout);
        document.removeEventListener("visibilitychange", recordVisibility);
        window.removeEventListener("blur", recordBlur);
        window.removeEventListener("focus", recordFocus);
      }
      if (drainObservers && !performanceObserversCleaned) {
        performanceObserversCleaned = true;
        drainPerformanceObservers(observers);
      }
    };
    const abortPrimary = new Promise((_, reject) => { rejectPrimary = reject; });
    const disposeBeforeFinalizer = () => {
      if (lifecycleDisposed) return;
      lifecycleDisposed = true;
      let cleanupError = null;
      try { cleanupPrimary(); } catch (error) { cleanupError = error; }
      validationActive = false;
      if (validationFrameId !== undefined) cancelAnimationFrame(validationFrameId);
      for (const observer of [cadenceObserver, indicatorObserver, identityObserver]) {
        try { observer.disconnect(); } catch (error) { cleanupError ??= error; }
      }
      delete window.__uiBeatWindowMonitor;
      rejectPrimary(cleanupError ?? new Error("UIBeat window monitor disposed before primary sample completion"));
      if (cleanupError) throw cleanupError;
    };
    window.__uiBeatWindowMonitor = { dispose: disposeBeforeFinalizer };
    await Promise.race([new Promise((resolvePromise) => {
      const tick = (timestamp) => {
        if (!active) return;
        const callbackAt = performance.now();
        trackedConsumersValidThroughout &&= trackedStateMatchesMode(trackedState());
        indicatorValidThroughout &&= indicatorStateMatchesMode(indicatorState());
        timestamps.push(timestamp);
        callbackTimes.push(callbackAt);
        if (callbackAt - startedAt >= duration) resolvePromise();
        else frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    }), new Promise((resolvePromise) => {
      sampleTimeout = setTimeout(() => { timedOut = true; resolvePromise(); }, duration + 5_000);
    }), abortPrimary]);
    cleanupPrimary(false);
    if (lifecycleDisposed) throw new Error("UIBeat window monitor was disposed during primary sample finalization");
    const endedAt = performance.now();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    if (lifecycleDisposed) throw new Error("UIBeat window monitor was disposed after primary sample completion");
    cleanupPrimary(true);
    const intervals = callbackTimes.map((callbackAt, index) =>
      index === 0 ? callbackAt - startedAt : callbackAt - callbackTimes[index - 1]
    );
    const primaryResult = {
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
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
      uiBeat: {
        bound: document.querySelectorAll("[data-ui-beat-scale]").length,
        running: document.querySelectorAll('[data-ui-beat-state="running"]').length,
        idle: document.querySelectorAll('[data-ui-beat-state="idle"]').length,
        indicatorRunning: document.querySelectorAll('.beat-indicator[data-ui-beat-state="running"]').length,
      },
    };
    validationActive = true;
    const validationTick = () => {
      if (!validationActive) return;
      trackedConsumersValidThroughout &&= trackedStateMatchesMode(trackedState());
      indicatorValidThroughout &&= indicatorStateMatchesMode(indicatorState());
      validationFrameId = requestAnimationFrame(validationTick);
    };
    validationFrameId = requestAnimationFrame(validationTick);
    const finalizeWindow = () => {
      if (lifecycleDisposed || !validationActive) throw new Error("UIBeat window monitor already finalized");
      lifecycleDisposed = true;
      validationActive = false;
      if (validationFrameId !== undefined) cancelAnimationFrame(validationFrameId);
      const fullEndedAt = performance.now();
      recordCadence(cadenceObserver.takeRecords());
      cadenceObserver.disconnect();
      recordIndicatorCadence(indicatorObserver.takeRecords());
      indicatorObserver.disconnect();
      recordIdentity(identityObserver.takeRecords());
      identityObserver.disconnect();
      trackedConsumersValidThroughout &&= trackedStateMatchesMode(trackedState()) && identityViolations.length === 0;
      indicatorValidThroughout &&= indicatorStateMatchesMode(indicatorState()) && identityViolations.length === 0;
      const proof = {
        uiBeatWindowCoverage: { startedAt, primaryEndedAt: endedAt, endedAt: fullEndedAt },
        identityViolations,
        uiBeatCadence: {
        targetCount: cadenceTargets.length,
        targets: cadence.map(({ index, mutationCount, scaleValues, changeTimes, lastScale }) => {
          const boundedChangeTimes = changeTimes.map((time) => Math.min(time, fullEndedAt));
          const boundaries = [startedAt, ...boundedChangeTimes, fullEndedAt];
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
          maxIdleGapMs: Math.max(...[startedAt, ...indicatorChangeTimes.map((time) => Math.min(time, fullEndedAt)), fullEndedAt]
            .slice(1).map((time, index, boundaries) => {
              const previous = index === 0 ? startedAt : boundaries[index - 1];
              return time - previous;
            })),
          children: indicatorCadence.map(({ index, mutationCount, styleValues, lastStyle, changeTimes }) => {
            const boundedChangeTimes = changeTimes.map((time) => Math.min(time, fullEndedAt));
            const boundaries = [startedAt, ...boundedChangeTimes, fullEndedAt];
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
      };
      delete window.__uiBeatWindowMonitor;
      return proof;
    };
    window.__uiBeatWindowMonitor = { finalize: finalizeWindow, dispose: finalizeWindow };
    return primaryResult;
  })()`, duration + 45_000);
  const after = await getMetrics(cdp);
  let traced;
  let traceError = null;
  let uiBeatWindowProof;
  try {
    traced = await traceWhile(cdp, async () => delay(traceDuration));
  } catch (error) {
    traceError = error;
  } finally {
    try {
      uiBeatWindowProof = await evaluate(cdp, "window.__uiBeatWindowMonitor.finalize()");
    } catch (finalizeError) {
      throwTraceOrWindowFinalizationError(traceError, finalizeError);
    }
  }
  throwTraceOrWindowFinalizationError(traceError, null);
  Object.assign(frameCallbacks, uiBeatWindowProof);
  frameCallbacks.uiBeatCadence.maximumAllowedIdleGapMs = cadenceAllowanceMs(initialScene);
  frameCallbacks.beatIndicator.cadence.maximumAllowedIdleGapMs = cadenceAllowanceMs(initialScene);
  frameCallbacks.beatIndicator.cadence.maximumAllowedChildIdleGapMs = indicatorChildCadenceAllowanceMs(initialScene);
  const finalScene = await sceneState(cdp);
  const runtimeGuard = await evaluate(cdp, "window.__uiBeatRuntimeGuard.snapshot()");
  const valid = runtimeGuard.valid && sampleIsValid(label, frameCallbacks, initialScene, finalScene);
  return {
    label,
    valid,
    initialScene,
    finalScene,
    runtimeGuard,
    frameCallbacks: { ...frameCallbacks, summary: summarizeIntervals(frameCallbacks.intervals) },
    cdpMetricsDelta: metricDelta(before, after),
    trace: { durationMs: traceDuration, ...traceSummary(traced.events) },
  };
}

async function sceneState(cdp) {
  return evaluate(cdp, `(() => {
    ${clippingAwareVisible.toString()}
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
    const isVisible = clippingAwareVisible;
    const runningConsumers = running.filter((element) => !element.classList.contains("beat-indicator"));
    const expected = expectedUIBeatConsumers();
    const visible = bound.filter((element) => isVisible(element));
    const visibleRunning = runningConsumers.filter((element) => isVisible(element));
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
  const current = await evaluate(cdp, `(() => {
    ${readUiRhythmState.toString()}
    return readUiRhythmState(document);
  })()`);
  if (current !== enabled) await clickSelector(cdp, selector);
  await delay(warmup);
  const actual = await evaluate(cdp, `(() => {
    ${readUiRhythmState.toString()}
    return readUiRhythmState(document);
  })()`);
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
    if (metadata[key].trim() === METADATA_EXAMPLE_PLACEHOLDERS[key]) {
      throw new Error(`Metadata ${key} still contains the shipped example placeholder`);
    }
  }
  const allowed = ["physical-native-visible", "software-rendered", "emulated-viewport"];
  if (!allowed.includes(metadata.evidenceClass)) throw new Error(`Unsupported evidenceClass ${metadata.evidenceClass}`);
  if (metadata.evidenceClass === "physical-native-visible" && !["desktop", "mobile"].includes(metadata.deviceType)) {
    throw new Error(`Physical metadata deviceType must be desktop or mobile, found ${metadata.deviceType}`);
  }
}

function evidenceOutputPaths(outputOption) {
  const output = resolve(outputOption);
  return {
    output,
    traceOutput: output.endsWith(".json")
      ? output.replace(/\.json$/, "-trace-events.json.gz")
      : `${output}-trace-events.json.gz`,
  };
}

async function reserveEvidenceOutputs(outputOption) {
  const { output, traceOutput } = evidenceOutputPaths(outputOption);
  await mkdir(dirname(output), { recursive: true });
  const reportHandle = await open(output, "wx");
  try {
    const traceHandle = await open(traceOutput, "wx");
    return { output, traceOutput, reportHandle, traceHandle, committed: false };
  } catch (error) {
    await reportHandle.close().catch(() => {});
    await unlink(output).catch(() => {});
    throw error;
  }
}

async function cleanupEvidenceOutputs(reservation) {
  if (!reservation) return;
  await Promise.allSettled([reservation.reportHandle.close(), reservation.traceHandle.close()]);
  if (!reservation.committed) {
    await Promise.allSettled([unlink(reservation.output), unlink(reservation.traceOutput)]);
  }
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
  const browserTargetMonitor = await startBrowserTargetMonitor(version.webSocketDebuggerUrl, target);
  let pageTargetMonitoring = null;
  let evidenceOutputs = null;

  const cdp = new CdpConnection(target.webSocketDebuggerUrl);
  try {
    await cdp.open();
    await cdp.command("Runtime.enable");
    await cdp.command("Page.enable");
    await cdp.command("Performance.enable");
    await cdp.command("Page.bringToFront");
    await delay(500);
    const initialEnvironment = await environment(cdp);
    if (initialEnvironment.visibilityState !== "visible" || !initialEnvironment.hasFocus) {
      throw new Error(`Refusing background-tab evidence: visibility=${initialEnvironment.visibilityState}, focus=${initialEnvironment.hasFocus}`);
    }
    evidenceOutputs = await reserveEvidenceOutputs(options.output);
    await startCaptureMonitor(cdp);
    const monitorStartedAt = Date.now();
    const preparationStartedAt = Date.now();
    assertMonitorCoversPreparation(monitorStartedAt, preparationStartedAt);
    let loadedBuildIdentity;
    let scenePreparation;
    let originalUiRhythm;
    const samples = [];
    let captureInterruptions = [];
    let captureError = null;
    let restorationError = null;
    let runtimeGuardError = null;
    let monitorError = null;
    let runtimeGuardInstalled = false;
    let runtimeGuardSession = null;
    try {
      loadedBuildIdentity = await verifyLoadedBuildIdentity({
        cdp,
        expectedRevision: metadata.sourceRevision,
      });
      scenePreparation = await prepareScene(cdp);
      const installerExpression = runtimeGuardInstallerExpression({ maximumCanvasIdleMs: 1_000 });
      await evaluate(cdp, `(() => {
        if (window.__uiBeatRuntimeGuard) throw new Error("UIBeat runtime guard global already exists");
        window.__uiBeatRuntimeGuard = ${installerExpression};
        return true;
      })()`);
      runtimeGuardInstalled = true;
      originalUiRhythm = await evaluate(cdp, `(() => {
        ${readUiRhythmState.toString()}
        return readUiRhythmState(document);
      })()`);
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
      if (runtimeGuardInstalled) {
        try {
          runtimeGuardSession = await evaluate(cdp, `(() => {
            try { return window.__uiBeatRuntimeGuard.stop(); }
            finally { delete window.__uiBeatRuntimeGuard; }
          })()`);
          if (!runtimeGuardSession.valid) {
            runtimeGuardError = new Error(`Runtime guard invalid: ${runtimeGuardSession.issues.join(", ")}`);
          }
        } catch (error) {
          runtimeGuardError = error;
        }
      }
      try {
        captureInterruptions = await stopCaptureMonitor(cdp);
      } catch (error) {
        monitorError = error;
      }
    }
    throwCaptureOrRestorationError(captureError, restorationError, runtimeGuardError, monitorError);
    const finalEnvironment = await environment(cdp);
    const measurementCompletedAt = new Date().toISOString();
    pageTargetMonitoring = await browserTargetMonitor.stop();
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
    const displayFingerprintStable = displayFingerprintsMatch(initialEnvironment, finalEnvironment);
    const runtimeGuardValid = runtimeGuardSession.valid && samples.every(({ runtimeGuard }) => runtimeGuard.valid);
    const capacityClosureEligible = metadata.evidenceClass === "physical-native-visible" &&
      operatorObservationAcceptable &&
      buildIdentityVerified &&
      displayFingerprintStable && pageTargetMonitoring.valid && runtimeGuardValid &&
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
      pageTargetMonitoring,
      environment: { initial: initialEnvironment, final: finalEnvironment },
      automatedEligibility: {
        knownNonNativeRenderer,
        buildIdentityVerified,
        displayFingerprintStable,
        singlePageTargetThroughout: pageTargetMonitoring.valid,
        runtimeGuardValid,
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
      runtimeGuardSession,
      methodology: {
        scene: "production route, sounding generated pattern, Config Global panel open",
        sequence: samples.map(({ label }) => label),
        durationMsPerState: options.duration,
        traceDurationMsPerState: options.traceDuration,
        warmupMs: options.warmup,
        runtimeGuardScope: "a session-long source-coupled workload monitor retains changed-then-restored workload events, while each pacing-plus-trace window requires recurring successful full-canvas clears from the retained production Stage 2D context",
        buildIdentityScope: "before scene preparation, CDP matches the measured page's loaded entry HTML and CSS content plus exact-URL JavaScript executed in the main frame's default context to the manifest produced by a clean build of sourceRevision",
        frameCallbackScope: "rAF intervals and Long Animation Frame entries cover the untraced primary pacing window, including the delay from sample start to the first callback; they are not JS callback duration or proof of displayed hardware frames",
        uiBeatCadenceScope: "bounded MutationObservers plus a retained-state validation rAF cover each full pacing-plus-trace window, recording control scale and four-child production BeatIndicator activity and rejecting temporary binding, running-state, identity, connection, or visibility loss; activity idle-gap allowances include the full window, while minimum-duration coverage applies to the untraced primary pacing window",
        cdpTraceScope: "a separate diagnostic trace follows each untraced frame-callback window; selected raw presentation/drop events and full event-name counts are retained, event availability varies by browser build, and tracing does not prove display scanout",
        longAnimationFrameScope: "browser Long Animation Frame entries include main-thread script/render attribution where supported",
      },
      limitations: [
        "Physical displayed frames require the operator's named-device/native-window observation; CDP cannot independently prove panel scanout.",
        "requestAnimationFrame timestamps can reveal foreground page pacing but do not directly measure compositor-to-display presentation.",
        "The cadence guards' control-scale and BeatIndicator transform/opacity MutationObservers plus per-frame retained-node identity, connection, binding, state, and visibility checks add main-thread and layout observation work throughout pacing and tracing.",
        "The runtime workload subscriptions, semantic DOM observer, and Stage clearRect heartbeat wrapper add bounded observation work throughout the capture.",
        "The read-only rendering-workload fingerprint depends on the production Pinia visualConfig runtime store and fails capture when that source-coupled introspection is unavailable.",
        "A software-rendered or emulated capture cannot close the physical-device capacity gate.",
      ],
      samples,
    };
    const { output, traceOutput, reportHandle, traceHandle } = evidenceOutputs;
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
    await traceHandle.writeFile(traceBytes);
    report.traceArtifact = {
      file: basename(traceOutput),
      sha256: createHash("sha256").update(traceBytes).digest("hex"),
      compressedBytes: traceBytes.byteLength,
      content: "gzip-compressed selected raw CDP presentation/drop events; full event-name counts remain inline",
    };
    for (const sampleResult of samples) delete sampleResult.trace.selectedEvents;
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    report.sha256BeforeDigestField = createHash("sha256").update(serialized).digest("hex");
    await reportHandle.writeFile(`${JSON.stringify(report, null, 2)}\n`);
    await Promise.all([traceHandle.sync(), reportHandle.sync()]);
    evidenceOutputs.committed = true;
    console.log(`wrote ${basename(output)}`);
  } finally {
    await cleanupEvidenceOutputs(evidenceOutputs);
    await browserTargetMonitor.stop().catch(() => {});
    cdp.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
