/**
 * Install the UIBeat capacity capture's browser-side workload and Stage guard.
 *
 * The function is deliberately self-contained so its source can be serialized
 * and evaluated in the measured page's main CDP execution context.
 */
export function installBrowserRuntimeGuard(options = {}, environment = globalThis) {
  const document = environment.document;
  const MutationObserver = environment.MutationObserver;
  const now = () => environment.performance.now();
  const canvasSelector = options.canvasSelector ?? ".unified-canvas";
  const defaultMaximumCanvasIdleMs = options.maximumCanvasIdleMs ?? 1_000;

  if (!document || typeof MutationObserver !== "function") {
    throw new Error("Runtime guard requires a browser document and MutationObserver");
  }

  const pinia = document.querySelector("#app")?.__vue_app__?.config?.globalProperties?.$pinia;
  const visualStore = pinia?._s?.get("visualConfig");
  const instrumentStore = pinia?._s?.get("instrument");
  const musicStore = pinia?._s?.get("music");
  if (!visualStore || typeof visualStore.$subscribe !== "function") {
    throw new Error("Runtime guard requires the production Pinia visualConfig store");
  }

  const canvases = Array.from(document.querySelectorAll(canvasSelector));
  if (canvases.length !== 1) {
    throw new Error(`Runtime guard requires exactly one ${canvasSelector}; found ${canvases.length}`);
  }
  const canvas = canvases[0];
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Runtime guard could not acquire the production Stage 2D context");

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalizeText = (value) => value?.replace(/\s+/g, " ").trim() ?? "";
  const visualRuntime = () => {
    if (typeof visualStore.visualsEnabled !== "boolean" || !visualStore.effectiveConfig) {
      throw new Error("Runtime guard could not read the production visual workload");
    }
    const effectiveConfig = clone(visualStore.effectiveConfig);
    if (!effectiveConfig || typeof effectiveConfig !== "object" || Array.isArray(effectiveConfig)) {
      throw new Error("Runtime guard could not serialize effective Stage configuration");
    }
    if (effectiveConfig.uiBeat && typeof effectiveConfig.uiBeat === "object") {
      delete effectiveConfig.uiBeat.isEnabled;
    }
    return { visualsEnabled: visualStore.visualsEnabled, effectiveConfig };
  };
  const readWorkload = () => {
    const codeLines = Array.from(document.querySelectorAll(".cm-content .cm-line"));
    const controlValues = Array.from(document.querySelectorAll(".control-bar .knob-wrapper")).map((control) => ({
      label: normalizeText(control.querySelector(".knob-wrapper__label")?.textContent),
      value: control.getAttribute("aria-valuetext") ??
        normalizeText(control.querySelector(".knob-range-value")?.textContent),
    }));
    const globalConfig = Array.from(document.querySelectorAll(
      '[data-testid^="global-control-"]:not([data-testid="global-control-uiRhythm"])',
    )).map((control) => ({
      id: control.getAttribute("data-testid"),
      value: control.getAttribute("aria-pressed") ?? control.getAttribute("aria-valuetext") ??
        normalizeText(control.querySelector(".knob-range-value")?.textContent),
    }));
    return {
      codeText: codeLines.length > 0
        ? codeLines.map((line) => line.textContent ?? "").join("\n")
        : document.querySelector(".cm-content")?.textContent ?? null,
      controls: controlValues,
      harmony: document.querySelector(".control-bar .joystick")?.getAttribute("data-latched") ?? null,
      instrument: instrumentStore?.currentInstrument ??
        normalizeText(document.querySelector('[data-testid="instrument-selector-trigger"] .drawer__label')?.textContent),
      music: musicStore ? {
        currentKey: musicStore.currentKey,
        currentMode: musicStore.currentMode,
        playStyle: musicStore.playStyle,
        playRate: musicStore.playRate,
      } : null,
      globalConfig,
      visualRuntime: visualRuntime(),
    };
  };
  const signature = (value) => JSON.stringify(value);
  const sessionStartedAt = now();
  const sessionBaseline = readWorkload();
  const sessionBaselineSignature = signature(sessionBaseline);
  let lastWorkloadSignature = sessionBaselineSignature;
  const workloadChanges = [];
  const windows = [];
  let activeWindow = null;
  let stopped = false;

  const recordWorkload = (source) => {
    if (stopped) return false;
    const workload = readWorkload();
    const nextSignature = signature(workload);
    if (nextSignature === lastWorkloadSignature) return false;
    workloadChanges.push({
      at: now(),
      source,
      restoredToSessionBaseline: nextSignature === sessionBaselineSignature,
      workload,
    });
    lastWorkloadSignature = nextSignature;
    return true;
  };

  const workloadSelectors = [
    ".cm-content",
    ".control-bar .knob-wrapper",
    ".control-bar .joystick",
    '[data-testid="instrument-selector-trigger"]',
    '[data-testid^="global-control-"]:not([data-testid="global-control-uiRhythm"])',
  ];
  const isWithinWorkload = (node) => {
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    return Boolean(element && workloadSelectors.some((selector) =>
      element.matches?.(selector) || element.closest?.(selector)
    ));
  };
  const subtreeContainsWorkload = (node) => {
    if (node?.nodeType !== 1) return false;
    return workloadSelectors.some((selector) => node.matches?.(selector) || node.querySelector?.(selector));
  };
  const mutationTouchesWorkload = (mutation) => isWithinWorkload(mutation.target) ||
    Array.from(mutation.addedNodes ?? []).some(subtreeContainsWorkload) ||
    Array.from(mutation.removedNodes ?? []).some(subtreeContainsWorkload);

  let workloadObserver = null;
  const subscriptions = [];
  const recordWorkloadInput = (event) => {
    if (isWithinWorkload(event.target)) recordWorkload(`dom:${event.type}`);
  };
  let workloadInputListenersInstalled = false;

  const contextEvents = [];
  const recordContextEvent = (event) => contextEvents.push({ type: event.type, at: now() });
  const hadOwnClearRect = Object.prototype.hasOwnProperty.call(context, "clearRect");
  const originalClearRectDescriptor = Object.getOwnPropertyDescriptor(context, "clearRect");
  const originalClearRect = context.clearRect;
  if (typeof originalClearRect !== "function") {
    throw new Error("Runtime guard requires a callable Stage 2D clearRect");
  }
  function guardedClearRect(...args) {
    const result = Reflect.apply(originalClearRect, this, args);
    if (
      !stopped && activeWindow && this === context &&
      args[0] === 0 && args[1] === 0 && args[2] === canvas.width && args[3] === canvas.height
    ) {
      activeWindow.successfulFullCanvasClears.push(now());
    }
    return result;
  }
  let wrapperInstalled = false;
  let contextListenersInstalled = false;
  try {
    Object.defineProperty(context, "clearRect", {
      value: guardedClearRect,
      configurable: true,
      enumerable: originalClearRectDescriptor?.enumerable ?? false,
      writable: true,
    });
    wrapperInstalled = true;
    for (const [name, store] of [
      ["visualConfig", visualStore],
      ["instrument", instrumentStore],
      ["music", musicStore],
    ]) {
      if (typeof store?.$subscribe === "function") {
        subscriptions.push(store.$subscribe(() => recordWorkload(`pinia:${name}`), { flush: "sync" }));
      }
    }
    workloadObserver = new MutationObserver((mutations) => {
      if (mutations.some(mutationTouchesWorkload)) recordWorkload("dom:workload");
    });
    workloadObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["aria-pressed", "aria-valuetext", "data-latched", "data-testid"],
    });
    document.addEventListener("input", recordWorkloadInput, true);
    document.addEventListener("change", recordWorkloadInput, true);
    workloadInputListenersInstalled = true;
    canvas.addEventListener("contextlost", recordContextEvent);
    canvas.addEventListener("contextrestored", recordContextEvent);
    contextListenersInstalled = true;
  } catch (error) {
    workloadObserver?.disconnect();
    for (const unsubscribe of subscriptions) {
      try { unsubscribe(); } catch { /* Preserve the original installation error. */ }
    }
    if (workloadInputListenersInstalled) {
      document.removeEventListener("input", recordWorkloadInput, true);
      document.removeEventListener("change", recordWorkloadInput, true);
    }
    if (contextListenersInstalled) {
      canvas.removeEventListener("contextlost", recordContextEvent);
      canvas.removeEventListener("contextrestored", recordContextEvent);
    }
    if (wrapperInstalled && context.clearRect === guardedClearRect) {
      if (hadOwnClearRect) Object.defineProperty(context, "clearRect", originalClearRectDescriptor);
      else delete context.clearRect;
    }
    throw error;
  }

  const canvasState = () => {
    const currentCanvases = Array.from(document.querySelectorAll(canvasSelector));
    let currentContext = null;
    try { currentContext = canvas.getContext("2d"); } catch { currentContext = null; }
    let contextLost = false;
    try { contextLost = typeof context.isContextLost === "function" && context.isContextLost(); } catch { contextLost = true; }
    return {
      count: currentCanvases.length,
      retainedCanvas: currentCanvases.length === 1 && currentCanvases[0] === canvas,
      connected: canvas.isConnected,
      retainedContext: currentContext === context,
      contextLost,
    };
  };

  const start = ({
    label,
    expectedDurationMs,
    maximumCanvasIdleMs = defaultMaximumCanvasIdleMs,
  } = {}) => {
    if (stopped) throw new Error("Runtime guard has already stopped");
    if (activeWindow) throw new Error(`Runtime guard window ${activeWindow.label} is still active`);
    if (typeof label !== "string" || label.trim().length === 0) {
      throw new Error("Runtime guard window requires a label");
    }
    if (!Number.isFinite(expectedDurationMs) || expectedDurationMs <= 0) {
      throw new Error("Runtime guard window requires a positive expectedDurationMs");
    }
    if (!Number.isFinite(maximumCanvasIdleMs) || maximumCanvasIdleMs <= 0) {
      throw new Error("Runtime guard window requires a positive maximumCanvasIdleMs");
    }
    recordWorkload("window:start");
    const runtime = visualRuntime();
    activeWindow = {
      label,
      startedAt: now(),
      expectedDurationMs,
      maximumCanvasIdleMs,
      workloadChangeIndex: workloadChanges.length,
      contextEventIndex: contextEvents.length,
      stageExpectedActive: runtime.visualsEnabled && runtime.effectiveConfig.stage?.isEnabled !== false,
      initialCanvas: canvasState(),
      successfulFullCanvasClears: [],
    };
    return { label, startedAt: activeWindow.startedAt };
  };

  const snapshot = () => {
    if (stopped) throw new Error("Runtime guard has already stopped");
    if (!activeWindow) throw new Error("Runtime guard has no active window");
    recordWorkload("window:snapshot");
    const endedAt = now();
    const current = activeWindow;
    const clears = current.successfulFullCanvasClears.slice();
    const boundaries = [current.startedAt, ...clears, endedAt];
    const gaps = boundaries.slice(1).map((time, index) => time - boundaries[index]);
    const maxIdleGapMs = gaps.length > 0 ? Math.max(...gaps) : endedAt - current.startedAt;
    const finalCanvas = canvasState();
    const windowWorkloadChanges = workloadChanges.slice(current.workloadChangeIndex);
    const windowContextEvents = contextEvents.slice(current.contextEventIndex);
    const observedDurationMs = endedAt - current.startedAt;
    const fullCoverage = clears.length >= 2 &&
      observedDurationMs >= current.expectedDurationMs &&
      maxIdleGapMs <= current.maximumCanvasIdleMs;
    const issues = [];
    if (!current.stageExpectedActive) issues.push("stage-not-expected-active");
    if (windowWorkloadChanges.length > 0) issues.push("workload-changed");
    if (!current.initialCanvas.retainedCanvas || !finalCanvas.retainedCanvas) issues.push("stage-canvas-not-retained");
    if (!current.initialCanvas.connected || !finalCanvas.connected) issues.push("stage-canvas-disconnected");
    if (!current.initialCanvas.retainedContext || !finalCanvas.retainedContext) issues.push("stage-context-not-retained");
    if (current.initialCanvas.contextLost || finalCanvas.contextLost || windowContextEvents.length > 0) {
      issues.push("stage-context-loss");
    }
    if (!fullCoverage) issues.push("stage-draw-heartbeat-incomplete");
    const proof = {
      label: current.label,
      valid: issues.length === 0,
      issues,
      startedAt: current.startedAt,
      endedAt,
      expectedDurationMs: current.expectedDurationMs,
      observedDurationMs,
      workloadChanges: windowWorkloadChanges,
      stage: {
        expectedActive: current.stageExpectedActive,
        initialCanvas: current.initialCanvas,
        finalCanvas,
        contextEvents: windowContextEvents,
        successfulFullCanvasClearCount: clears.length,
        successfulFullCanvasClearTimes: clears,
        maximumAllowedIdleGapMs: current.maximumCanvasIdleMs,
        maxIdleGapMs,
        fullCoverage,
      },
    };
    windows.push(proof);
    activeWindow = null;
    return proof;
  };

  const stop = () => {
    if (stopped) throw new Error("Runtime guard has already stopped");
    const activeWindowProof = activeWindow ? snapshot() : null;
    recordWorkload("guard:stop");
    const cleanupIssues = [];
    workloadObserver?.disconnect();
    document.removeEventListener("input", recordWorkloadInput, true);
    document.removeEventListener("change", recordWorkloadInput, true);
    for (const unsubscribe of subscriptions) {
      try { unsubscribe(); } catch (error) {
        cleanupIssues.push(`store-unsubscribe-failed:${error?.message ?? String(error)}`);
      }
    }
    canvas.removeEventListener("contextlost", recordContextEvent);
    canvas.removeEventListener("contextrestored", recordContextEvent);
    if (context.clearRect !== guardedClearRect) {
      cleanupIssues.push("clearRect-wrapper-ownership-lost");
    } else {
      try {
        if (hadOwnClearRect) Object.defineProperty(context, "clearRect", originalClearRectDescriptor);
        else delete context.clearRect;
      } catch (error) {
        cleanupIssues.push(`clearRect-restore-failed:${error?.message ?? String(error)}`);
      }
    }
    stopped = true;
    const endedAt = now();
    return {
      valid: workloadChanges.length === 0 && windows.length > 0 &&
        windows.every((window) => window.valid) && cleanupIssues.length === 0,
      issues: [
        ...(workloadChanges.length > 0 ? ["workload-changed-during-guard-session"] : []),
        ...(windows.length === 0 ? ["no-runtime-guard-windows"] : []),
        ...(windows.some((window) => !window.valid) ? ["invalid-runtime-guard-window"] : []),
        ...cleanupIssues,
      ],
      startedAt: sessionStartedAt,
      endedAt,
      baseline: sessionBaseline,
      workloadChanges,
      windows: windows.slice(),
      activeWindowProof,
      cleanup: {
        subscriptionsRemoved: cleanupIssues.every((issue) => !issue.startsWith("store-unsubscribe-failed:")),
        observerDisconnected: true,
        workloadInputListenersRemoved: true,
        contextListenersRemoved: true,
        clearRectRestored: cleanupIssues.every((issue) => !issue.startsWith("clearRect-")),
      },
    };
  };

  return { start, snapshot, stop };
}

/** Return a dependency-free expression suitable for Runtime.evaluate. */
export function runtimeGuardInstallerExpression(options = {}) {
  return `(${installBrowserRuntimeGuard.toString()})(${JSON.stringify(options)})`;
}
