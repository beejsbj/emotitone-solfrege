import { getCurrentScope, onScopeDispose, readonly, ref, watch, type Ref } from "vue";

const reducedMotion = ref(false);

interface ClockState {
  phaseCycles: Ref<number>;
  animationFrame: number | null;
  previousTimestamp: number | null;
  speedReaders: Map<symbol, () => number>;
}

const DEFAULT_CLOCK_KEY = {};
const statesByKey = new WeakMap<object, ClockState>();
const activeStates = new Set<ClockState>();
let reducedMotionQuery: MediaQueryList | null = null;
let listenersReady = false;

function stateFor(key: object): ClockState {
  const existing = statesByKey.get(key);
  if (existing) return existing;

  const state: ClockState = {
    phaseCycles: ref(0),
    animationFrame: null,
    previousTimestamp: null,
    speedReaders: new Map(),
  };
  statesByKey.set(key, state);
  return state;
}

function canAnimate(state: ClockState) {
  return state.speedReaders.size > 0 &&
    !reducedMotion.value &&
    (typeof document === "undefined" || document.visibilityState !== "hidden");
}

function stopClock(state: ClockState) {
  if (state.animationFrame !== null && typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(state.animationFrame);
  }
  state.animationFrame = null;
  state.previousTimestamp = null;
}

function tick(state: ClockState, timestamp: number) {
  if (!canAnimate(state)) {
    stopClock(state);
    return;
  }

  if (state.previousTimestamp !== null) {
    const delta = Math.max(0, Math.min(100, timestamp - state.previousTimestamp));
    const readers = [...state.speedReaders.values()];
    const speed = Math.max(0, readers[readers.length - 1]?.() ?? 1);
    state.phaseCycles.value += delta * speed / (Math.PI * 2 * 1000);
  }
  state.previousTimestamp = timestamp;
  state.animationFrame = requestAnimationFrame((nextTimestamp) => tick(state, nextTimestamp));
}

function startClock(state: ClockState) {
  if (
    state.animationFrame !== null ||
    !canAnimate(state) ||
    typeof requestAnimationFrame !== "function"
  ) {
    return;
  }
  state.animationFrame = requestAnimationFrame((timestamp) => tick(state, timestamp));
}

function handleMotionPreference(event: MediaQueryListEvent | MediaQueryList) {
  reducedMotion.value = event.matches;
  for (const state of activeStates) {
    if (event.matches) stopClock(state);
    else startClock(state);
  }
}

function handleVisibilityChange() {
  for (const state of activeStates) {
    if (document.visibilityState === "hidden") stopClock(state);
    else startClock(state);
  }
}

function ensureListeners() {
  if (listenersReady || typeof window === "undefined") return;
  listenersReady = true;
  reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  if (reducedMotionQuery) {
    handleMotionPreference(reducedMotionQuery);
    reducedMotionQuery.addEventListener?.("change", handleMotionPreference);
  }
  document?.addEventListener?.("visibilitychange", handleVisibilityChange);
}

function acquire(state: ClockState, speed: () => number) {
  const subscriber = Symbol("music-color-clock-subscriber");
  state.speedReaders.set(subscriber, speed);
  activeStates.add(state);
  ensureListeners();
  startClock(state);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.speedReaders.delete(subscriber);
    if (state.speedReaders.size === 0) {
      stopClock(state);
      activeStates.delete(state);
    }
  };
}

export function useMusicColorClock(
  enabled: () => boolean,
  speed: () => number,
  clockKey: object = DEFAULT_CLOCK_KEY,
) {
  const state = stateFor(clockKey);
  let releaseActive: () => void = () => {};
  const setActive = (active: boolean) => {
    releaseActive();
    releaseActive = active ? acquire(state, speed) : () => {};
  };

  let stopWatching: () => void = () => {};
  if (getCurrentScope()) {
    stopWatching = watch(enabled, setActive, { immediate: true });
    onScopeDispose(() => {
      stopWatching();
      releaseActive();
    });
  } else {
    setActive(enabled());
  }

  return {
    phaseCycles: readonly(state.phaseCycles),
    reducedMotion: readonly(reducedMotion),
    release: () => {
      stopWatching();
      releaseActive();
    },
  };
}
