import assert from "node:assert/strict";
import test from "node:test";

import { Window } from "happy-dom";

import {
  installBrowserRuntimeGuard,
  runtimeGuardInstallerExpression,
} from "./runtime-guard.mjs";

function createStore(state) {
  const listeners = new Set();
  return Object.assign(state, {
    $subscribe(listener, options) {
      assert.equal(options?.flush, "sync");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      for (const listener of listeners) listener();
    },
    listenerCount() {
      return listeners.size;
    },
  });
}

function createFixture({ failSubscriptionFor = null } = {}) {
  const window = new Window({ url: "https://emotitone.test/" });
  const { document } = window;
  let clock = 0;
  const calls = [];
  let shouldThrow = false;
  const originalClearRect = function (...args) {
    calls.push({ receiver: this, args });
    if (shouldThrow) throw new Error("native clear failed");
    return "native-result";
  };
  const context = {};
  Object.defineProperty(context, "clearRect", {
    value: originalClearRect,
    configurable: true,
    enumerable: false,
    writable: true,
  });
  const originalDescriptor = Object.getOwnPropertyDescriptor(context, "clearRect");
  context.isContextLost = () => false;

  const canvas = document.createElement("canvas");
  canvas.className = "unified-canvas";
  canvas.width = 640;
  canvas.height = 480;
  canvas.getContext = (type) => type === "2d" ? context : null;
  document.body.append(canvas);

  const code = document.createElement("div");
  code.className = "cm-content";
  const line = document.createElement("div");
  line.className = "cm-line";
  line.textContent = "do re mi";
  code.append(line);
  document.body.append(code);

  const controlBar = document.createElement("div");
  controlBar.className = "control-bar";
  const knob = document.createElement("div");
  knob.className = "knob-wrapper";
  knob.setAttribute("aria-valuetext", "120");
  knob.innerHTML = '<span class="knob-wrapper__label">BPM</span><span class="knob-range-value">120</span>';
  const joystick = document.createElement("div");
  joystick.className = "joystick";
  joystick.setAttribute("data-latched", "auto");
  controlBar.append(knob, joystick);
  document.body.append(controlBar);

  const instrumentTrigger = document.createElement("button");
  instrumentTrigger.setAttribute("data-testid", "instrument-selector-trigger");
  instrumentTrigger.innerHTML = '<span class="drawer__label">Piano</span>';
  document.body.append(instrumentTrigger);

  const globalControl = document.createElement("button");
  globalControl.setAttribute("data-testid", "global-control-paper");
  globalControl.setAttribute("aria-pressed", "true");
  const rhythmControl = document.createElement("button");
  rhythmControl.setAttribute("data-testid", "global-control-uiRhythm");
  rhythmControl.setAttribute("aria-pressed", "true");
  document.body.append(globalControl, rhythmControl);

  const visualStore = createStore({
    visualsEnabled: true,
    effectiveConfig: {
      stage: { isEnabled: true, zoom: 1 },
      codeStrip: { bpm: 120 },
      uiBeat: { isEnabled: true, intensity: 1 },
    },
  });
  const instrumentStore = createStore({ currentInstrument: "Piano" });
  const musicStore = createStore({
    currentKey: "C",
    currentMode: "major",
    playStyle: "together",
    playRate: 8,
  });
  const pinia = { _s: new Map([
    ["visualConfig", visualStore],
    ["instrument", instrumentStore],
    ["music", musicStore],
  ]) };
  const app = document.createElement("div");
  app.id = "app";
  app.__vue_app__ = { config: { globalProperties: { $pinia: pinia } } };
  document.body.prepend(app);

  const environment = {
    document,
    MutationObserver: window.MutationObserver,
    performance: { now: () => clock },
  };
  if (failSubscriptionFor) {
    pinia._s.get(failSubscriptionFor).$subscribe = () => {
      throw new Error(`subscribe failed:${failSubscriptionFor}`);
    };
  }
  let guard = null;
  let installError = null;
  try {
    guard = installBrowserRuntimeGuard({ maximumCanvasIdleMs: 250 }, environment);
  } catch (error) {
    installError = error;
  }
  const advance = (milliseconds) => { clock += milliseconds; };
  const clear = () => context.clearRect(0, 0, canvas.width, canvas.height);
  const fillHealthyWindow = () => {
    for (let elapsed = 100; elapsed <= 900; elapsed += 100) {
      advance(100);
      clear();
    }
    advance(100);
  };

  return {
    window,
    document,
    guard,
    installError,
    context,
    canvas,
    line,
    knob,
    visualStore,
    instrumentStore,
    musicStore,
    originalClearRect,
    originalDescriptor,
    calls,
    setShouldThrow(value) { shouldThrow = value; },
    advance,
    clear,
    fillHealthyWindow,
  };
}

test("accepts an unchanged workload and restores the exact clearRect property", () => {
  const fixture = createFixture();
  fixture.guard.start({ label: "uiBeat-on-first", expectedDurationMs: 1_000 });

  fixture.visualStore.effectiveConfig.uiBeat.isEnabled = false;
  fixture.visualStore.notify();
  fixture.knob.style.scale = "0.98";
  fixture.fillHealthyWindow();

  const proof = fixture.guard.snapshot();
  assert.equal(proof.valid, true);
  assert.equal(proof.stage.successfulFullCanvasClearCount, 9);
  assert.equal(proof.stage.maxIdleGapMs, 100);
  assert.deepEqual(proof.workloadChanges, []);

  const report = fixture.guard.stop();
  assert.equal(report.valid, true);
  assert.equal(fixture.context.clearRect, fixture.originalClearRect);
  assert.deepEqual(Object.getOwnPropertyDescriptor(fixture.context, "clearRect"), fixture.originalDescriptor);
  assert.equal(fixture.visualStore.listenerCount(), 0);
  assert.equal(fixture.instrumentStore.listenerCount(), 0);
  assert.equal(fixture.musicStore.listenerCount(), 0);
});

test("records workload changes even when Stage, BPM, instrument, and code are restored", async () => {
  const fixture = createFixture();
  fixture.guard.start({ label: "restored-workload", expectedDurationMs: 1_000 });

  fixture.visualStore.effectiveConfig.stage.zoom = 1.5;
  fixture.visualStore.notify();
  fixture.visualStore.effectiveConfig.stage.zoom = 1;
  fixture.visualStore.notify();

  fixture.visualStore.effectiveConfig.codeStrip.bpm = 121;
  fixture.visualStore.notify();
  fixture.visualStore.effectiveConfig.codeStrip.bpm = 120;
  fixture.visualStore.notify();

  fixture.instrumentStore.currentInstrument = "Violin";
  fixture.instrumentStore.notify();
  fixture.instrumentStore.currentInstrument = "Piano";
  fixture.instrumentStore.notify();

  fixture.line.textContent = "do mi sol";
  fixture.line.textContent = "do re mi";
  await new Promise((resolve) => fixture.window.setTimeout(resolve, 0));

  fixture.fillHealthyWindow();
  const proof = fixture.guard.snapshot();
  const report = fixture.guard.stop();

  assert.equal(proof.valid, false);
  assert.ok(proof.issues.includes("workload-changed"));
  assert.ok(proof.workloadChanges.some(({ workload }) => workload.visualRuntime.effectiveConfig.stage.zoom === 1.5));
  assert.ok(proof.workloadChanges.some(({ workload }) => workload.visualRuntime.effectiveConfig.codeStrip.bpm === 121));
  assert.ok(proof.workloadChanges.some(({ workload }) => workload.instrument === "Violin"));
  assert.ok(proof.workloadChanges.some(({ source, mutationEvidence }) =>
    source === "dom:workload-restored-within-batch" &&
    mutationEvidence.some(({ removedText }) => removedText === "do mi sol") &&
    mutationEvidence.some(({ addedText }) => addedText === "do re mi")
  ));
  assert.equal(proof.workloadChanges.at(-1).restoredToSessionBaseline, true);
  assert.equal(report.valid, false);
  assert.ok(report.issues.includes("workload-changed-during-guard-session"));
});

test("rejects a frozen production Stage canvas", () => {
  const fixture = createFixture();
  fixture.guard.start({ label: "frozen-stage", expectedDurationMs: 1_000 });
  fixture.advance(1_000);

  const proof = fixture.guard.snapshot();
  fixture.guard.stop();

  assert.equal(proof.valid, false);
  assert.ok(proof.issues.includes("stage-draw-heartbeat-incomplete"));
  assert.equal(proof.stage.successfulFullCanvasClearCount, 0);
  assert.equal(proof.stage.maxIdleGapMs, 1_000);
  assert.equal(proof.stage.fullCoverage, false);
});

test("rejects context loss and still cleans up its owned wrapper", () => {
  const fixture = createFixture();
  fixture.guard.start({ label: "lost-context", expectedDurationMs: 1_000 });
  fixture.advance(100);
  fixture.canvas.dispatchEvent(new fixture.window.Event("contextlost"));
  for (let elapsed = 100; elapsed <= 900; elapsed += 100) {
    fixture.clear();
    fixture.advance(100);
  }

  const proof = fixture.guard.snapshot();
  const report = fixture.guard.stop();

  assert.equal(proof.valid, false);
  assert.ok(proof.issues.includes("stage-context-loss"));
  assert.deepEqual(proof.stage.contextEvents.map(({ type }) => type), ["contextlost"]);
  assert.equal(report.cleanup.clearRectRestored, true);
  assert.equal(fixture.context.clearRect, fixture.originalClearRect);
});

test("the clearRect wrapper preserves receiver, arguments, return values, and errors", () => {
  const fixture = createFixture();
  fixture.guard.start({ label: "native-contract", expectedDurationMs: 1_000 });
  const receiver = { marker: true };
  const returned = fixture.context.clearRect.call(receiver, 1, 2, 3, 4);
  assert.equal(returned, "native-result");
  assert.equal(fixture.calls.at(-1).receiver, receiver);
  assert.deepEqual(fixture.calls.at(-1).args, [1, 2, 3, 4]);

  fixture.setShouldThrow(true);
  assert.throws(() => fixture.context.clearRect(0, 0, 640, 480), /native clear failed/);
  fixture.setShouldThrow(false);
  fixture.fillHealthyWindow();
  const proof = fixture.guard.snapshot();
  fixture.guard.stop();

  assert.equal(proof.stage.successfulFullCanvasClearCount, 9);
  assert.equal(fixture.context.clearRect, fixture.originalClearRect);
});

test("emits a self-contained CDP installer expression", () => {
  const expression = runtimeGuardInstallerExpression({ maximumCanvasIdleMs: 500 });
  assert.match(expression, /^\(function installBrowserRuntimeGuard/);
  assert.match(expression, /"maximumCanvasIdleMs":500/);
  assert.doesNotMatch(expression, /import\s|require\(/);
});

test("rolls back earlier hooks when installation fails partway", () => {
  const fixture = createFixture({ failSubscriptionFor: "instrument" });
  assert.match(fixture.installError?.message ?? "", /subscribe failed:instrument/);
  assert.equal(fixture.guard, null);
  assert.equal(fixture.visualStore.listenerCount(), 0);
  assert.equal(fixture.context.clearRect, fixture.originalClearRect);
  assert.deepEqual(Object.getOwnPropertyDescriptor(fixture.context, "clearRect"), fixture.originalDescriptor);
});
