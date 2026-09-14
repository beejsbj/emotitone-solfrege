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

  if (!document || typeof MutationObserver !== "function" || typeof environment.matchMedia !== "function") {
    throw new Error("Runtime guard requires a browser document, MutationObserver, and matchMedia");
  }
  const reducedMotionQuery = environment.matchMedia("(prefers-reduced-motion: reduce)");
  if (!reducedMotionQuery || typeof reducedMotionQuery.addEventListener !== "function" ||
      typeof reducedMotionQuery.removeEventListener !== "function") {
    throw new Error("Runtime guard requires an observable prefers-reduced-motion query");
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

  const transportSelector = ".code-strip-bar .code-strip-bar__play";
  const transportControls = Array.from(document.querySelectorAll(transportSelector));
  if (transportControls.length !== 1) {
    throw new Error(`Runtime guard requires exactly one production transport control; found ${transportControls.length}`);
  }
  const transportControl = transportControls[0];
  const configHandles = Array.from(document.querySelectorAll('[data-testid="config-panel-trigger"]'));
  if (configHandles.length !== 1) {
    throw new Error(`Runtime guard requires exactly one Config drawer handle; found ${configHandles.length}`);
  }
  const configHandle = configHandles[0];
  const configDrawer = configHandle.closest(".drawer");
  const configDrawerContent = configDrawer?.querySelector(".drawer__content");
  if (!configDrawer || !configDrawerContent) {
    throw new Error("Runtime guard requires the production Config drawer and content");
  }
  const performanceDeckHosts = Array.from(document.querySelectorAll("[data-stage-occlusion-host]"));
  if (performanceDeckHosts.length !== 1) {
    throw new Error(`Runtime guard requires exactly one Stage occlusion host; found ${performanceDeckHosts.length}`);
  }
  const performanceDeck = performanceDeckHosts[0];
  const performanceDeckContent = performanceDeck.querySelector(".drawer__content");
  const performanceDeckHandle = performanceDeck.querySelector('[data-testid="performance-deck-handle"]');
  const stageOccluders = Array.from(document.querySelectorAll("[data-stage-occluder]"));
  const stageOcclusionParts = stageOccluders.flatMap((occluder) =>
    Array.from(occluder.querySelectorAll("[data-stage-occlusion-part]"))
  );
  if (!performanceDeckContent || !performanceDeckHandle || stageOccluders.length === 0) {
    throw new Error("Runtime guard requires the production PerformanceDeck geometry contract");
  }

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalizeText = (value) => value?.replace(/\s+/g, " ").trim() ?? "";
  const readStageComposition = () => {
    const canvasBounds = canvas.getBoundingClientRect();
    const currentOccluders = Array.from(document.querySelectorAll("[data-stage-occluder]"));
    const currentParts = currentOccluders.flatMap((occluder) =>
      Array.from(occluder.querySelectorAll("[data-stage-occlusion-part]"))
    );
    const visible = (element) => {
      const style = environment.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    };
    const candidateTops = [...currentOccluders, ...currentParts]
      .filter(visible)
      .map((element) => element.getBoundingClientRect())
      .filter((bounds) => bounds.height > 0)
      .map((bounds) => bounds.top);
    const nearestOcclusionTop = candidateTops.length > 0
      ? Math.min(...candidateTops)
      : canvasBounds.bottom;
    const occlusionTop = Math.max(canvasBounds.top, Math.min(canvasBounds.bottom, nearestOcclusionTop));
    const usableWidth = Math.max(0, canvasBounds.width);
    const usableHeight = Math.max(0, occlusionTop - canvasBounds.top);
    const usable = {
      x: 0,
      y: 0,
      width: usableWidth,
      height: usableHeight,
    };
    return {
      usable,
      suspended: usableWidth < 150 || usableHeight < 150,
      retainedHost: performanceDeck.isConnected &&
        document.querySelectorAll("[data-stage-occlusion-host]").length === 1 &&
        document.querySelector("[data-stage-occlusion-host]") === performanceDeck,
      occluderCount: currentOccluders.length,
      partCount: currentParts.length,
      activeOcclusionCount: document.querySelectorAll("[data-stage-occlusion-active='true']").length,
    };
  };
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
    const currentTransportControls = Array.from(document.querySelectorAll(transportSelector));
    const currentConfigHandles = Array.from(document.querySelectorAll('[data-testid="config-panel-trigger"]'));
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
      transport: {
        count: currentTransportControls.length,
        retained: currentTransportControls.length === 1 && currentTransportControls[0] === transportControl,
        ariaLabel: transportControl.getAttribute("aria-label"),
      },
      configDrawer: {
        handleCount: currentConfigHandles.length,
        retained: currentConfigHandles.length === 1 && currentConfigHandles[0] === configHandle &&
          configHandle.closest(".drawer") === configDrawer,
        connected: configDrawer.isConnected && configDrawerContent.isConnected,
        expanded: configDrawer.getAttribute("data-expanded"),
        handleExpanded: configHandle.getAttribute("aria-expanded"),
        height: configDrawer.style.getPropertyValue("height"),
        contentHeight: configDrawerContent.style.getPropertyValue("height"),
      },
      performanceDeck: {
        retained: performanceDeck.isConnected &&
          document.querySelectorAll("[data-stage-occlusion-host]").length === 1 &&
          document.querySelector("[data-stage-occlusion-host]") === performanceDeck,
        expanded: performanceDeck.getAttribute("data-expanded"),
        handleExpanded: performanceDeckHandle.getAttribute("aria-expanded"),
        height: performanceDeck.style.getPropertyValue("height"),
        contentHeight: performanceDeckContent.style.getPropertyValue("height"),
      },
      reducedMotion: reducedMotionQuery.matches === true,
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
    transportSelector,
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
    Array.from(mutation.removedNodes ?? []).some(subtreeContainsWorkload) ||
    mutation.target === configDrawer || mutation.target === configDrawerContent || mutation.target === configHandle ||
    mutation.target === performanceDeck || mutation.target === performanceDeckContent ||
    mutation.target === performanceDeckHandle || mutation.target.matches?.("[data-stage-occluder], [data-stage-occlusion-part]");

  const heightFromStyleAttribute = (value) => {
    const match = String(value ?? "").match(/(?:^|;)\s*height\s*:\s*([^;]*)/i);
    return match?.[1]?.trim() ?? "";
  };
  const retainedMutationEvidence = (mutation) => {
    if (mutation.type !== "attributes") return null;
    let field = null;
    let oldValue = mutation.oldValue;
    let value = mutation.target.getAttribute(mutation.attributeName);
    if (mutation.target === transportControl && mutation.attributeName === "aria-label") {
      field = "transport.ariaLabel";
    } else if (mutation.target === configDrawer && mutation.attributeName === "style") {
      field = "configDrawer.height";
      oldValue = heightFromStyleAttribute(oldValue);
      value = configDrawer.style.getPropertyValue("height");
    } else if (mutation.target === configDrawerContent && mutation.attributeName === "style") {
      field = "configDrawer.contentHeight";
      oldValue = heightFromStyleAttribute(oldValue);
      value = configDrawerContent.style.getPropertyValue("height");
    } else if (mutation.target === configDrawer && mutation.attributeName === "data-expanded") {
      field = "configDrawer.expanded";
    } else if (mutation.target === configHandle && mutation.attributeName === "aria-expanded") {
      field = "configDrawer.handleExpanded";
    } else if (mutation.target === performanceDeck && mutation.attributeName === "style") {
      field = "performanceDeck.height";
      oldValue = heightFromStyleAttribute(oldValue);
      value = performanceDeck.style.getPropertyValue("height");
    } else if (mutation.target === performanceDeckContent && mutation.attributeName === "style") {
      field = "performanceDeck.contentHeight";
      oldValue = heightFromStyleAttribute(oldValue);
      value = performanceDeckContent.style.getPropertyValue("height");
    } else if (mutation.target === performanceDeck && mutation.attributeName === "data-expanded") {
      field = "performanceDeck.expanded";
    } else if (mutation.target === performanceDeckHandle && mutation.attributeName === "aria-expanded") {
      field = "performanceDeck.handleExpanded";
    } else if (mutation.target.matches?.("[data-stage-occluder]") && mutation.attributeName === "data-stage-occlusion-active") {
      field = "stageOccluder.active";
    } else if (mutation.target.matches?.("[data-stage-occluder]") && mutation.attributeName === "style") {
      field = "stageOccluder.style";
    } else if (mutation.target.matches?.("[data-stage-occluder]") && mutation.attributeName === "class") {
      field = "stageOccluder.class";
    } else if (mutation.target.matches?.("[data-stage-occlusion-part]") && mutation.attributeName === "style") {
      field = "stageOcclusionPart.style";
    }
    return field && oldValue !== value ? { field, oldValue, value } : null;
  };

  let workloadObserver = null;
  let drawerGeometryObserver = null;
  let stageGeometryObserver = null;
  const subscriptions = [];
  const recordWorkloadInput = (event) => {
    if (isWithinWorkload(event.target)) recordWorkload(`dom:${event.type}`);
  };
  let workloadInputListenersInstalled = false;
  const recordReducedMotionChange = () => recordWorkload("media:prefers-reduced-motion");
  let reducedMotionListenerInstalled = false;
  const processWorkloadMutations = (mutations) => {
    const relevant = mutations.filter(mutationTouchesWorkload);
    if (relevant.length === 0) return;
    const evidence = relevant.map(retainedMutationEvidence).filter(Boolean);
    if (!recordWorkload("dom:workload") && evidence.length > 0) {
      workloadChanges.push({
        at: now(),
        source: "dom:retained-workload-interruption",
        restoredToSessionBaseline: lastWorkloadSignature === sessionBaselineSignature,
        mutationEvidence: evidence,
        workload: readWorkload(),
      });
    }
  };
  const drainWorkloadObserver = () => {
    const pending = [
      ...(workloadObserver?.takeRecords() ?? []),
      ...(drawerGeometryObserver?.takeRecords() ?? []),
      ...(stageGeometryObserver?.takeRecords() ?? []),
    ];
    if (pending.length > 0) processWorkloadMutations(pending);
  };

  const contextEvents = [];
  const recordContextEvent = (event) => contextEvents.push({ type: event.type, at: now() });
  const hadOwnClearRect = Object.prototype.hasOwnProperty.call(context, "clearRect");
  const originalClearRectDescriptor = Object.getOwnPropertyDescriptor(context, "clearRect");
  const originalClearRect = context.clearRect;
  if (typeof originalClearRect !== "function") {
    throw new Error("Runtime guard requires a callable Stage 2D clearRect");
  }
  const stageCompositionSignature = (composition) => JSON.stringify(composition);
  const recordStageCompositionHeartbeat = (windowState) => {
    try {
      const composition = readStageComposition();
      const nextSignature = stageCompositionSignature(composition);
      windowState.stageCompositionSampleCount += 1;
      windowState.minimumUsableWidth = Math.min(windowState.minimumUsableWidth, composition.usable.width);
      windowState.minimumUsableHeight = Math.min(windowState.minimumUsableHeight, composition.usable.height);
      if (composition.suspended) windowState.suspendedCompositionSampleCount += 1;
      if (nextSignature !== windowState.initialStageCompositionSignature) {
        windowState.stageCompositionChangeCount += 1;
        if (nextSignature !== windowState.lastStageCompositionSignature && windowState.stageCompositionChanges.length < 50) {
          windowState.stageCompositionChanges.push({ at: now(), composition });
        }
      }
      windowState.lastStageCompositionSignature = nextSignature;
    } catch (error) {
      windowState.stageCompositionReadErrors.push(error?.message ?? String(error));
    }
  };
  function guardedClearRect(...args) {
    const result = Reflect.apply(originalClearRect, this, args);
    if (
      !stopped && activeWindow && this === context &&
      args[0] === 0 && args[1] === 0 && args[2] === canvas.width && args[3] === canvas.height
    ) {
      activeWindow.successfulFullCanvasClears.push(now());
      recordStageCompositionHeartbeat(activeWindow);
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
    workloadObserver = new MutationObserver(processWorkloadMutations);
    workloadObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["aria-label", "aria-expanded", "aria-pressed", "aria-valuetext", "data-latched", "data-testid"],
    });
    drawerGeometryObserver = new MutationObserver(processWorkloadMutations);
    drawerGeometryObserver.observe(configDrawer, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["data-expanded", "style"],
    });
    drawerGeometryObserver.observe(configDrawerContent, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["style"],
    });
    stageGeometryObserver = new MutationObserver(processWorkloadMutations);
    for (const target of [performanceDeck, performanceDeckContent]) {
      stageGeometryObserver.observe(target, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: target === performanceDeck ? ["data-expanded", "style"] : ["style"],
      });
    }
    for (const target of stageOcclusionParts) {
      stageGeometryObserver.observe(target, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["style"],
      });
    }
    for (const target of stageOccluders) {
      stageGeometryObserver.observe(target, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["class", "data-stage-occlusion-active", "style"],
      });
    }
    document.addEventListener("input", recordWorkloadInput, true);
    document.addEventListener("change", recordWorkloadInput, true);
    workloadInputListenersInstalled = true;
    reducedMotionQuery.addEventListener("change", recordReducedMotionChange);
    reducedMotionListenerInstalled = true;
    canvas.addEventListener("contextlost", recordContextEvent);
    canvas.addEventListener("contextrestored", recordContextEvent);
    contextListenersInstalled = true;
  } catch (error) {
    workloadObserver?.disconnect();
    drawerGeometryObserver?.disconnect();
    stageGeometryObserver?.disconnect();
    for (const unsubscribe of subscriptions) {
      try { unsubscribe(); } catch { /* Preserve the original installation error. */ }
    }
    if (workloadInputListenersInstalled) {
      document.removeEventListener("input", recordWorkloadInput, true);
      document.removeEventListener("change", recordWorkloadInput, true);
    }
    if (reducedMotionListenerInstalled) {
      reducedMotionQuery.removeEventListener("change", recordReducedMotionChange);
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
    const initialStageComposition = readStageComposition();
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
      initialStageComposition,
      initialStageCompositionSignature: stageCompositionSignature(initialStageComposition),
      lastStageCompositionSignature: stageCompositionSignature(initialStageComposition),
      stageCompositionSampleCount: 0,
      stageCompositionChangeCount: 0,
      stageCompositionChanges: [],
      stageCompositionReadErrors: [],
      suspendedCompositionSampleCount: 0,
      minimumUsableWidth: initialStageComposition.usable.width,
      minimumUsableHeight: initialStageComposition.usable.height,
    };
    return { label, startedAt: activeWindow.startedAt };
  };

  const snapshot = () => {
    if (stopped) throw new Error("Runtime guard has already stopped");
    if (!activeWindow) throw new Error("Runtime guard has no active window");
    drainWorkloadObserver();
    recordWorkload("window:snapshot");
    const endedAt = now();
    const current = activeWindow;
    const clears = current.successfulFullCanvasClears.slice();
    const boundaries = [current.startedAt, ...clears, endedAt];
    const gaps = boundaries.slice(1).map((time, index) => time - boundaries[index]);
    const maxIdleGapMs = gaps.length > 0 ? Math.max(...gaps) : endedAt - current.startedAt;
    const finalCanvas = canvasState();
    let finalStageComposition = null;
    try { finalStageComposition = readStageComposition(); } catch (error) {
      current.stageCompositionReadErrors.push(error?.message ?? String(error));
    }
    const windowWorkloadChanges = workloadChanges.slice(current.workloadChangeIndex);
    const windowContextEvents = contextEvents.slice(current.contextEventIndex);
    const observedDurationMs = endedAt - current.startedAt;
    const fullCoverage = clears.length >= 2 &&
      observedDurationMs >= current.expectedDurationMs &&
      maxIdleGapMs <= current.maximumCanvasIdleMs;
    const stageCompositionFullyObserved = clears.length >= 2 && current.stageCompositionReadErrors.length === 0 &&
      current.stageCompositionSampleCount === clears.length;
    const stageCompositionSuspended = current.initialStageComposition.suspended ||
      finalStageComposition?.suspended === true || current.suspendedCompositionSampleCount > 0;
    const stageCompositionChanged = current.stageCompositionChangeCount > 0 || Boolean(
      finalStageComposition &&
      stageCompositionSignature(finalStageComposition) !== current.initialStageCompositionSignature
    );
    const stageCompositionUnsuspended = stageCompositionFullyObserved && !stageCompositionSuspended;
    const stageCompositionStable = stageCompositionFullyObserved && !stageCompositionChanged;
    const issues = [];
    if (!current.stageExpectedActive) issues.push("stage-not-expected-active");
    if (windowWorkloadChanges.length > 0) issues.push("workload-changed");
    if (!current.initialCanvas.retainedCanvas || !finalCanvas.retainedCanvas) issues.push("stage-canvas-not-retained");
    if (!current.initialCanvas.connected || !finalCanvas.connected) issues.push("stage-canvas-disconnected");
    if (!current.initialCanvas.retainedContext || !finalCanvas.retainedContext) issues.push("stage-context-not-retained");
    if (current.initialCanvas.contextLost || finalCanvas.contextLost || windowContextEvents.length > 0) {
      issues.push("stage-context-loss");
    }
    if (!stageCompositionFullyObserved) issues.push("stage-composition-observation-incomplete");
    if (stageCompositionSuspended) issues.push("stage-composition-suspended");
    if (stageCompositionChanged) issues.push("stage-composition-changed");
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
        composition: {
          initial: current.initialStageComposition,
          final: finalStageComposition,
          fullyObserved: stageCompositionFullyObserved,
          unsuspendedThroughout: stageCompositionUnsuspended,
          stableThroughout: stageCompositionStable,
          sampleCount: current.stageCompositionSampleCount,
          changeCount: current.stageCompositionChangeCount,
          retainedChanges: current.stageCompositionChanges,
          readErrors: current.stageCompositionReadErrors,
          suspendedSampleCount: current.suspendedCompositionSampleCount,
          minimumUsableWidth: current.minimumUsableWidth,
          minimumUsableHeight: current.minimumUsableHeight,
        },
      },
    };
    windows.push(proof);
    activeWindow = null;
    return proof;
  };

  const stop = () => {
    if (stopped) throw new Error("Runtime guard has already stopped");
    const errorDetail = (phase, error) => ({
      phase,
      name: error?.name ?? "Error",
      message: error?.message ?? String(error),
    });
    const finalizationErrors = [];
    let activeWindowProof = null;
    if (activeWindow) {
      try { activeWindowProof = snapshot(); } catch (error) {
        finalizationErrors.push(errorDetail("active-window-snapshot", error));
      }
    }
    try { drainWorkloadObserver(); } catch (error) {
      finalizationErrors.push(errorDetail("guard-stop-observer-drain", error));
    }
    try { recordWorkload("guard:stop"); } catch (error) {
      finalizationErrors.push(errorDetail("guard-stop-workload", error));
    }
    stopped = true;
    const cleanupIssues = [];
    const cleanupErrors = [];
    const cleanupAttempt = (phase, action) => {
      try { action(); } catch (error) {
        const detail = errorDetail(phase, error);
        cleanupErrors.push(detail);
        cleanupIssues.push(`${phase}-failed:${detail.message}`);
      }
    };
    cleanupAttempt("workload-observer-disconnect", () => workloadObserver?.disconnect());
    cleanupAttempt("drawer-observer-disconnect", () => drawerGeometryObserver?.disconnect());
    cleanupAttempt("stage-observer-disconnect", () => stageGeometryObserver?.disconnect());
    cleanupAttempt("input-listener-remove", () =>
      document.removeEventListener("input", recordWorkloadInput, true));
    cleanupAttempt("change-listener-remove", () =>
      document.removeEventListener("change", recordWorkloadInput, true));
    cleanupAttempt("reduced-motion-listener-remove", () =>
      reducedMotionQuery.removeEventListener("change", recordReducedMotionChange));
    for (const unsubscribe of subscriptions) {
      cleanupAttempt("store-unsubscribe", unsubscribe);
    }
    cleanupAttempt("contextlost-listener-remove", () =>
      canvas.removeEventListener("contextlost", recordContextEvent));
    cleanupAttempt("contextrestored-listener-remove", () =>
      canvas.removeEventListener("contextrestored", recordContextEvent));
    if (context.clearRect !== guardedClearRect) {
      cleanupIssues.push("clearRect-wrapper-ownership-lost");
      cleanupErrors.push({
        phase: "clearRect-wrapper-ownership",
        name: "Error",
        message: "Runtime guard no longer owns the installed clearRect wrapper",
      });
    } else {
      cleanupAttempt("clearRect-restore", () => {
        if (hadOwnClearRect) Object.defineProperty(context, "clearRect", originalClearRectDescriptor);
        else delete context.clearRect;
      });
    }
    activeWindow = null;
    const endedAt = now();
    return {
      valid: workloadChanges.length === 0 && windows.length > 0 &&
        windows.every((window) => window.valid) && finalizationErrors.length === 0 && cleanupIssues.length === 0,
      issues: [
        ...(workloadChanges.length > 0 ? ["workload-changed-during-guard-session"] : []),
        ...(windows.length === 0 ? ["no-runtime-guard-windows"] : []),
        ...(windows.some((window) => !window.valid) ? ["invalid-runtime-guard-window"] : []),
        ...(finalizationErrors.length > 0 ? ["runtime-guard-finalization-failed"] : []),
        ...cleanupIssues,
      ],
      errors: [...finalizationErrors, ...cleanupErrors],
      startedAt: sessionStartedAt,
      endedAt,
      baseline: sessionBaseline,
      workloadChanges,
      windows: windows.slice(),
      activeWindowProof,
      cleanup: {
        subscriptionsRemoved: cleanupErrors.every(({ phase }) => phase !== "store-unsubscribe"),
        observerDisconnected: cleanupErrors.every(({ phase }) => !phase.endsWith("observer-disconnect")),
        workloadInputListenersRemoved: cleanupErrors.every(({ phase }) =>
          phase !== "input-listener-remove" && phase !== "change-listener-remove"),
        reducedMotionListenerRemoved: cleanupErrors.every(({ phase }) =>
          phase !== "reduced-motion-listener-remove"),
        contextListenersRemoved: cleanupErrors.every(({ phase }) =>
          phase !== "contextlost-listener-remove" && phase !== "contextrestored-listener-remove"),
        clearRectRestored: cleanupErrors.every(({ phase }) => !phase.startsWith("clearRect-")),
      },
    };
  };

  return { start, snapshot, stop };
}

/** Return a dependency-free expression suitable for Runtime.evaluate. */
export function runtimeGuardInstallerExpression(options = {}) {
  return `(${installBrowserRuntimeGuard.toString()})(${JSON.stringify(options)})`;
}
