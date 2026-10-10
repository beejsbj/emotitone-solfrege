import { AudioBlockedError } from "@/services/audioFailures";

/** Shared unlock/interruption policy for the worklet and native playback graph. */
type Recovery = () => void | Promise<void>;
const recoveries = new WeakMap<AudioContext, Set<Recovery>>();
const resuming = new WeakMap<AudioContext, Promise<void>>();
const retryUnlock = new WeakMap<AudioContext, () => void>();
const suspending = new WeakMap<AudioContext, Promise<void>>();
const touch = new WeakMap<AudioContext, () => void>();
const activity = new Set<() => boolean>();
let microphoneSources = 0;

export function registerAudioActivity(isActive: () => boolean): () => void {
  activity.add(isActive);
  return () => { activity.delete(isActive); };
}

/** A lease protects startup, capture and transport even during silent passages. */
export function holdAudioActivity(): () => void {
  return registerAudioActivity(() => true);
}

export function onAudioRunning(context: AudioContext, recover: Recovery): () => void {
  const listeners = recoveries.get(context) ?? new Set<Recovery>();
  recoveries.set(context, listeners);
  listeners.add(recover);
  return () => { listeners.delete(recover); };
}

/** Acquire before asking for permission: playback can reject or end mic tracks. */
export function holdMicrophoneAudio(): () => void {
  const releaseActivity = holdAudioActivity();
  microphoneSources++;
  updateAudioSession();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseActivity();
    microphoneSources--;
    updateAudioSession();
  };
}

function updateAudioSession() {
  try {
    const session = typeof navigator !== "undefined" ? navigator.audioSession : undefined;
    const type = microphoneSources ? "play-and-record" : "playback";
    if (session && session.type !== type) {
      session.type = type;
    }
  } catch { /* Unsupported/denied session hints must not block audio unlock. */ }
}

/** Undefined is the synchronous ready path. Otherwise callers must await before
 * attacking, including while a route-change rebuild or idle suspend is pending. */
export function resumeAudioContext(context: AudioContext): Promise<void> | undefined {
  updateAudioSession();
  touch.get(context)?.();
  if (context.state === "closed") return Promise.reject(new Error("Audio context is closed"));
  const pending = resuming.get(context);
  if (pending) {
    // Unmanaged contexts have no wake handler: a later explicit call is their
    // retry gesture. Managed input still joins the wake handler's single try.
    if (!touch.has(context)) retryUnlock.get(context)?.();
    return pending;
  }
  const suspension = suspending.get(context);
  const unlock = () => new Promise<void>((resolve, reject) => {
    const attempt = () => {
      if (context.state === "closed") { reject(new Error("Audio context is closed")); return; }
      if (context.state === "running") { resolve(); return; }
      try {
        context.resume().then(() => {
          if (context.state === "running") resolve();
          else reject(new AudioBlockedError());
        }, reject);
      } catch (error) { reject(error); }
    };
    retryUnlock.set(context, attempt);
    attempt();
  });
  const resume = suspension ? suspension.then(unlock) : context.state !== "running" ? unlock() : undefined;
  const recover = (): Promise<void> | undefined => {
    retryUnlock.delete(context);
    if (context.state !== "running") throw new AudioBlockedError();
    const sampleRate = context.sampleRate;
    const jobs = [...(recoveries.get(context) ?? [])].map(callback => callback()).filter(Boolean);
    // A route change may finish while banks rebuild, leaving audio running at
    // another rate. Keep input gated until recovery matches the current rate.
    return jobs.length ? Promise.all(jobs).then(() => {
      if (context.state !== "running") return unlock().then(recover);
      if (context.sampleRate !== sampleRate) return recover();
    }) : undefined;
  };
  try {
    const work = resume ? resume.then(recover) : recover();
    if (!work) return;
    const ready = work.finally(() => {
      if (resuming.get(context) === ready) { resuming.delete(context); retryUnlock.delete(context); }
    });
    resuming.set(context, ready);
    return ready;
  } catch (error) {
    return Promise.reject(error);
  }
}

export const AUDIO_IDLE_MS = 30_000;

/** Installed only by a realtime context owner; conversion/offline contexts do
 * not acquire gestures or idle timers. The meter includes release/effect tails. */
export function manageAudioLifecycle(context: AudioContext, options: {
  isSounding: () => boolean;
}): () => void {
  let silentSince: number | undefined = performance.now();
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  touch.set(context, () => { silentSince = performance.now(); });
  const wake = () => {
    silentSince = performance.now();
    // Retry hung WebKit unlocks only on a new wake event. Note handlers in this
    // same gesture join the gate without issuing another resume.
    retryUnlock.get(context)?.();
    void resumeAudioContext(context)?.catch(() => { /* Retry on the next gesture. */ });
  };
  const visible = () => { if (document.visibilityState === "visible") wake(); };
  const stateChanged = () => {
    silentSince = performance.now();
    updateMeter();
    if (context.state === "closed") { retryUnlock.get(context)?.(); dispose(); }
    else if (context.state === "running") queueMicrotask(() => { if (!disposed) wake(); });
  };
  const poll = () => {
    if (disposed || context.state !== "running" || resuming.has(context) || suspending.has(context)) return;
    if ([...activity].some(read => read()) || options.isSounding()) {
      silentSince = undefined;
      return;
    }
    silentSince ??= performance.now();
    if (performance.now() - silentSince < AUDIO_IDLE_MS) return;
    const pending = context.suspend().catch(() => { silentSince = performance.now(); }).finally(() => {
      if (suspending.get(context) === pending) suspending.delete(context);
    });
    suspending.set(context, pending);
  };
  function updateMeter() {
    if (disposed || context.state !== "running") {
      clearInterval(timer);
      timer = undefined;
    } else {
      timer ??= setInterval(poll, 250);
    }
  }
  updateMeter();
  for (const event of ["pointerdown", "keydown", "touchend"]) document.addEventListener(event, wake, true);
  document.addEventListener("visibilitychange", visible);
  context.addEventListener?.("statechange", stateChanged);
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearInterval(timer);
    touch.delete(context);
    for (const event of ["pointerdown", "keydown", "touchend"]) document.removeEventListener(event, wake, true);
    document.removeEventListener("visibilitychange", visible);
    context.removeEventListener?.("statechange", stateChanged);
  }
  return dispose;
}
