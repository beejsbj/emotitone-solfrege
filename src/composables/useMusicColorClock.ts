import { getCurrentScope, onScopeDispose, readonly, ref, watch } from "vue";

const phaseCycles = ref(0);
const reducedMotion = ref(false);

let animationFrame: number | null = null;
let subscriberCount = 0;
let previousTimestamp: number | null = null;
let speedReader: (() => number) | null = null;
const speedReaders = new Map<symbol, () => number>();
let reducedMotionQuery: MediaQueryList | null = null;
let listenersReady = false;

function canAnimate() {
  return subscriberCount > 0 &&
    !reducedMotion.value &&
    (typeof document === "undefined" || document.visibilityState !== "hidden");
}

function stopClock() {
  if (animationFrame !== null && typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(animationFrame);
  }
  animationFrame = null;
  previousTimestamp = null;
}

function tick(timestamp: number) {
  if (!canAnimate()) {
    stopClock();
    return;
  }

  if (previousTimestamp !== null) {
    const delta = Math.max(0, Math.min(100, timestamp - previousTimestamp));
    const speed = Math.max(0, speedReader?.() ?? 1);
    phaseCycles.value += delta * speed / (Math.PI * 2 * 1000);
  }
  previousTimestamp = timestamp;
  animationFrame = requestAnimationFrame(tick);
}

function startClock() {
  if (
    animationFrame !== null ||
    !canAnimate() ||
    typeof requestAnimationFrame !== "function"
  ) {
    return;
  }
  animationFrame = requestAnimationFrame(tick);
}

function handleMotionPreference(event: MediaQueryListEvent | MediaQueryList) {
  reducedMotion.value = event.matches;
  if (event.matches) stopClock();
  else startClock();
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") stopClock();
  else startClock();
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

function acquire(speed: () => number) {
  const subscriber = Symbol("music-color-clock-subscriber");
  subscriberCount += 1;
  speedReaders.set(subscriber, speed);
  speedReader = speed;
  ensureListeners();
  startClock();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    subscriberCount = Math.max(0, subscriberCount - 1);
    speedReaders.delete(subscriber);
    if (subscriberCount === 0) {
      speedReader = null;
      stopClock();
    } else if (speedReader === speed) {
      const remainingReaders = [...speedReaders.values()];
      speedReader = remainingReaders[remainingReaders.length - 1] ?? null;
    }
  };
}

export function useMusicColorClock(
  enabled: () => boolean,
  speed: () => number,
) {
  let releaseActive: () => void = () => {};
  const setActive = (active: boolean) => {
    releaseActive();
    releaseActive = active ? acquire(speed) : () => {};
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
    phaseCycles: readonly(phaseCycles),
    reducedMotion: readonly(reducedMotion),
    release: () => {
      stopWatching();
      releaseActive();
    },
  };
}
