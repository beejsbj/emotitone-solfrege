#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { gzipSync } from "node:zlib";

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
  --target TEXT      Substring selecting the already-open EmotiTone tab
  --duration MS      Sample duration per UIBeat state (default 10000)
  --trace-duration MS  Separate diagnostic trace per state (default 2000)
  --warmup MS        Settling time after each state change (default 2000)
  --self-test        Verify the statistics helpers without a browser

The attached tab must be foregrounded, focused, and already showing production.
Use a dedicated browser profile. The script restores the original UI Rhythm value.`;
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

function selfTest() {
  const summary = summarizeIntervals([10, 20, 30, 40, Number.NaN]);
  if (summary.count !== 4 || summary.p50Ms !== 25 || summary.maxMs !== 40 || summary.over33_3ms !== 1) {
    throw new Error(`Statistics self-test failed: ${JSON.stringify(summary)}`);
  }
  const healthyScene = { transportPlaying: true, runningAcceptedConsumers: 4, indicatorRunning: true };
  const healthyFrame = { timedOut: false, interruptions: [], visibilityState: "visible", hasFocus: true };
  if (!sampleIsValid("uiBeat-on-first", healthyFrame, healthyScene, healthyScene)) {
    throw new Error("Healthy on-sample self-test failed");
  }
  if (sampleIsValid("uiBeat-on-first", healthyFrame, { ...healthyScene, runningAcceptedConsumers: 0 }, healthyScene)) {
    throw new Error("Zero-consumer on-sample was accepted");
  }
  if (sampleIsValid("uiBeat-on-first", { ...healthyFrame, interruptions: [{ type: "blur" }] }, healthyScene, healthyScene)) {
    throw new Error("Interrupted sample was accepted");
  }
  const offScene = { transportPlaying: true, runningAcceptedConsumers: 0, indicatorRunning: false };
  if (!sampleIsValid("uiBeat-off", healthyFrame, offScene, offScene)) {
    throw new Error("Healthy off-sample self-test failed");
  }
  console.log("capture statistics self-test passed");
}

function sampleIsValid(label, frameCallbacks, initialScene, finalScene) {
  const expectedOn = label.startsWith("uiBeat-on");
  return !frameCallbacks.timedOut && frameCallbacks.interruptions.length === 0 &&
    frameCallbacks.visibilityState === "visible" && frameCallbacks.hasFocus &&
    initialScene.transportPlaying && finalScene.transportPlaying &&
    (expectedOn
      ? initialScene.runningAcceptedConsumers > 0 && finalScene.runningAcceptedConsumers > 0 && initialScene.indicatorRunning && finalScene.indicatorRunning
      : initialScene.runningAcceptedConsumers === 0 && finalScene.runningAcceptedConsumers === 0 && !initialScene.indicatorRunning && !finalScene.indicatorRunning);
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
  for (const event of events) byName[event.name] = (byName[event.name] ?? 0) + 1;
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
    const duration = ${duration};
    const timestamps = [];
    const longAnimationFrames = [];
    const longTasks = [];
    const interruptions = [];
    const observers = [];
    const observe = (type, sink) => {
      try {
        const observer = new PerformanceObserver((list) => sink.push(...list.getEntries().map((entry) => entry.toJSON())));
        observer.observe({ type, buffered: false });
        observers.push(observer);
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
    const startedAt = performance.now();
    let timedOut = false;
    let sampleTimeout;
    await Promise.race([new Promise((resolvePromise) => {
      const tick = (timestamp) => {
        timestamps.push(timestamp);
        if (performance.now() - startedAt >= duration) resolvePromise();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), new Promise((resolvePromise) => {
      sampleTimeout = setTimeout(() => { timedOut = true; resolvePromise(); }, duration + 5_000);
    })]);
    clearTimeout(sampleTimeout);
    document.removeEventListener("visibilitychange", recordVisibility);
    window.removeEventListener("blur", recordBlur);
    window.removeEventListener("focus", recordFocus);
    observers.forEach((observer) => observer.disconnect());
    const intervals = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
    return {
      startedAt,
      endedAt: performance.now(),
      timestamps,
      intervals,
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
  })()`);
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
    const visible = bound.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 &&
        rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
    });
    return {
      transportPlaying: Boolean(document.querySelector('button[aria-label="Stop"]')),
      boundAcceptedConsumers: bound.length,
      boundByType: countByType(bound),
      visibleBoundConsumers: visible.length,
      visibleBoundByType: countByType(visible),
      runningAcceptedConsumers: running.filter((element) => !element.classList.contains("beat-indicator")).length,
      runningByType: countByType(running.filter((element) => !element.classList.contains("beat-indicator"))),
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
  if (!await evaluate(cdp, `Boolean(document.querySelector('[data-testid="global-control-uiRhythm"]'))`)) {
    await clickSelector(cdp, '[data-testid="config-panel-trigger"]');
    await waitForSelector(cdp, '[data-testid="global-control-uiRhythm"]');
    await delay(700);
  }
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
  const required = ["evidenceClass", "deviceName", "deviceType", "os", "display", "browserWindow", "operatorObservation", "sourceRevision"];
  for (const key of required) if (!metadata[key]) throw new Error(`Metadata is missing ${key}`);
  const allowed = ["physical-native-visible", "software-rendered", "emulated-viewport"];
  if (!allowed.includes(metadata.evidenceClass)) throw new Error(`Unsupported evidenceClass ${metadata.evidenceClass}`);
}

async function main() {
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
  const target = targets.find((candidate) =>
    candidate.type === "page" && [candidate.url, candidate.title].some((value) => value?.toLowerCase().includes(options.target.toLowerCase()))
  );
  if (!target) throw new Error(`No page target matching ${JSON.stringify(options.target)} at ${endpoint}`);

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
    const scenePreparation = await prepareScene(cdp);
    const originalUiRhythm = await evaluate(cdp, `document.querySelector('[data-testid="global-control-uiRhythm"]')?.getAttribute("aria-pressed") === "true"`);
    const samples = [];
    try {
      await setUiRhythm(cdp, true, options.warmup);
      samples.push(await sample(cdp, "uiBeat-on-first", options.duration, options.traceDuration));
      await setUiRhythm(cdp, false, options.warmup);
      samples.push(await sample(cdp, "uiBeat-off", options.duration, options.traceDuration));
      await setUiRhythm(cdp, true, options.warmup);
      samples.push(await sample(cdp, "uiBeat-on-second", options.duration, options.traceDuration));
    } finally {
      await setUiRhythm(cdp, originalUiRhythm, 0).catch(() => undefined);
    }
    const finalEnvironment = await environment(cdp);
    const knownNonNativeRenderer = [initialEnvironment.userAgent, initialEnvironment.webgl.renderer]
      .some((value) => /headless|swiftshader|llvmpipe|software raster/i.test(value ?? "")) ||
      samples.some((sampleResult) => Object.keys(sampleResult.trace.byName).some((name) => /SoftwareRenderer/.test(name)));
    const allSamplesValid = samples.every((sampleResult) => sampleResult.valid);
    const capacityClosureEligible = metadata.evidenceClass === "physical-native-visible" &&
      !knownNonNativeRenderer && allSamplesValid &&
      initialEnvironment.visibilityState === "visible" && initialEnvironment.hasFocus &&
      finalEnvironment.visibilityState === "visible" && finalEnvironment.hasFocus;
    const report = {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      sourceRevision: metadata.sourceRevision ?? null,
      evidenceClass: metadata.evidenceClass,
      capacityClosureEligible,
      device: metadata,
      browser: { product: version.Browser, protocolVersion: version["Protocol-Version"], userAgent: version["User-Agent"] },
      environment: { initial: initialEnvironment, final: finalEnvironment },
      automatedEligibility: { knownNonNativeRenderer, allSamplesValid },
      scenePreparation,
      methodology: {
        scene: "production route, sounding generated pattern, Config Global panel open",
        sequence: samples.map(({ label }) => label),
        durationMsPerState: options.duration,
        traceDurationMsPerState: options.traceDuration,
        warmupMs: options.warmup,
        frameCallbackScope: "rAF intervals cover browser-delivered animation opportunities for the whole page; they are not JS callback duration or proof of displayed hardware frames",
        cdpTraceScope: "a separate diagnostic trace follows each untraced frame-callback window; selected raw presentation/drop events and full event-name counts are retained, event availability varies by browser build, and tracing does not prove display scanout",
        longAnimationFrameScope: "browser Long Animation Frame entries include main-thread script/render attribution where supported",
      },
      limitations: [
        "Physical displayed frames require the operator's named-device/native-window observation; CDP cannot independently prove panel scanout.",
        "requestAnimationFrame timestamps can reveal foreground page pacing but do not directly measure compositor-to-display presentation.",
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
