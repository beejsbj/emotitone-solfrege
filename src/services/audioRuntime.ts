/** The app's AudioContext and master output. The live worklet renders the
 * whole mix into the master, its room and echo included (BJS-596); the audio
 * lifecycle is shared. */
import { manageAudioLifecycle } from "@/services/audioLifecycle";

let context: AudioContext | undefined;
let master: GainNode | undefined;
let stopLifecycle: (() => void) | undefined;

// ─── The context's buffer (BJS-590) ──────────────────────────────────────────

/** What the browser is asked to size the output buffer for: a category, or seconds. */
export type LatencyHint = AudioContextLatencyCategory | number;
const LATENCY_CATEGORIES: readonly string[] = ["interactive", "balanced", "playback"];
/** The app's default. Undefined is the browser's own default, "interactive". */
const DEFAULT_LATENCY_HINT: LatencyHint | undefined = undefined;
let latencyHintOverride: LatencyHint | undefined;
/** The hint each context was created with; null when the browser's default was used. */
const createdWith = new WeakMap<BaseAudioContext, LatencyHint | null>();

/**
 * A latencyHint as written in a link: a category in any case, or seconds in
 * (0, 1] as a plain decimal (no sign, exponent or hex). Anything else is undefined.
 */
export function parseLatencyHint(value: string | null | undefined): LatencyHint | undefined {
  const text = value?.trim().toLowerCase();
  if (!text) return undefined;
  if (LATENCY_CATEGORIES.includes(text)) return text as AudioContextLatencyCategory;
  if (!/^\d*\.?\d+$/.test(text)) return undefined;
  const seconds = Number(text);
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 1 ? seconds : undefined;
}

/**
 * Ask for a buffer other than the app's default (a lab page's A/B link). It
 * applies to the next context created, so set it before anything creates one;
 * false means a live context already exists and keeps its own buffer.
 */
export function setLatencyHintOverride(hint: LatencyHint | undefined): boolean {
  latencyHintOverride = hint;
  return !context || context.state === "closed";
}

/** The hint `audio` was created with: null for the browser's default, undefined if this runtime did not create it. */
export function latencyHintOf(audio: BaseAudioContext): LatencyHint | null | undefined {
  return createdWith.get(audio);
}

function createContext(): AudioContext {
  const hint = latencyHintOverride ?? DEFAULT_LATENCY_HINT;
  if (hint !== undefined) {
    try {
      const hinted = new AudioContext({ latencyHint: hint });
      createdWith.set(hinted, hint);
      return hinted;
    } catch {
      // A browser that refuses the hint still gets a working context, recorded as the default.
    }
  }
  const created = new AudioContext();
  createdWith.set(created, null);
  return created;
}

export function getAudioContext(): AudioContext {
  if (!context || context.state === "closed") {
    stopLifecycle?.();
    master?.disconnect();
    stopLifecycle = undefined;
    context = createContext();
    master = new GainNode(context, { channelCount: 2, channelCountMode: "explicit" });
    master.connect(context.destination);
  }
  return context;
}

export function getMasterGain(): GainNode | null {
  getAudioContext();
  return master!;
}

/** Preparation never resumes: startup and interruption unlock belong to the
 * existing audioLifecycle gate and the user's Play/Start gesture. */
export async function initializeAudio(): Promise<void> {
  const ownedContext = getAudioContext(), output = master!;
  if (!stopLifecycle) {
    const meter = ownedContext.createAnalyser();
    meter.fftSize = 2048;
    const samples = new Float32Array(meter.fftSize);
    output.connect(meter);
    const stop = manageAudioLifecycle(ownedContext, {
      isSounding() {
        meter.getFloatTimeDomainData(samples);
        return samples.some(sample => Math.abs(sample) > 0.0001);
      },
    });
    stopLifecycle = () => { stop(); output.disconnect(meter); meter.disconnect(); };
    ownedContext.addEventListener("statechange", () => {
      if (ownedContext.state === "closed") { stopLifecycle?.(); stopLifecycle = undefined; }
    });
  }
}
