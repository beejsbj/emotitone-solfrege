/**
 * Owns the production playback graph. Patterns, live instruments, recording and
 * visual analyzers borrow this context and master output; none creates its own.
 * Superdough remains the graph provider so its native nodes and effects share
 * the same destination as the live AudioWorklet.
 */
// @ts-ignore — superdough does not publish TypeScript declarations.
import { getAudioContext as superdoughContext, getDefaultValue, getSuperdoughAudioController, initAudio, multiChannelOrbits } from "superdough";
import { manageAudioLifecycle } from "@/services/audioLifecycle";
import { MAX_AUDIO_VOICES } from "@/audio/voicePolicy";
import type { LiveOrbitSends } from "@/audio/liveShaping";

/** Live notes on either backend share this orbit's reverb and delay. */
export const LIVE_ORBIT = 2;

let context: AudioContext | undefined;
let initialization: Promise<void> | undefined;
let stopLifecycle: (() => void) | undefined;

export function getAudioContext(): AudioContext {
  context ??= superdoughContext() as AudioContext;
  return context;
}

export function getMasterGain(): GainNode | null {
  try {
    return getSuperdoughAudioController()?.output?.destinationGain ?? null;
  } catch {
    return null;
  }
}

/** The live orbit, created with the channels Superdough itself would choose. */
export function getLiveOrbit(): LiveOrbitSends | undefined {
  try {
    const channels = multiChannelOrbits
      ? [LIVE_ORBIT * 2 - 1, LIVE_ORBIT * 2]
      : ([] as number[]).concat(getDefaultValue("channels"));
    return getSuperdoughAudioController()?.getOrbit(LIVE_ORBIT, channels.map((channel) => channel - 1));
  } catch {
    return undefined;
  }
}

/**
 * Load native effects once, including during background preparation. Resumption
 * belongs to a user gesture: awaiting resume here would hold the loading splash
 * open until that gesture, while preventing the Start button from appearing.
 */
export async function initializeAudio(): Promise<void> {
  getAudioContext();
  initialization ??= Promise.resolve().then(() => initAudio({ maxPolyphony: MAX_AUDIO_VOICES })).catch((error) => {
    initialization = undefined;
    throw error;
  });
  await initialization;
  const master = getMasterGain();
  if (!stopLifecycle && master && context) {
    const meter = context.createAnalyser();
    meter.fftSize = 2048;
    const samples = new Float32Array(meter.fftSize);
    master.connect(meter);
    const stop = manageAudioLifecycle(context, {
      isSounding() {
        meter.getFloatTimeDomainData(samples);
        // Below -80 dBFS is treated as silence, including effect tails.
        return samples.some(sample => Math.abs(sample) > 0.0001);
      },
    });
    stopLifecycle = () => { stop(); master.disconnect(meter); meter.disconnect(); };
    context.addEventListener("statechange", () => {
      if (context?.state === "closed") { stopLifecycle?.(); stopLifecycle = undefined; }
    });
  }
}
