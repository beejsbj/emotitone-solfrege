/**
 * Owns the production playback graph. Patterns, live instruments, recording and
 * visual analyzers borrow this context and master output; none creates its own.
 * Superdough remains the graph provider so its native nodes and effects share
 * the same destination as the live AudioWorklet.
 */
// @ts-ignore — superdough does not publish TypeScript declarations.
import { getAudioContext as superdoughContext, getSuperdoughAudioController, initAudio } from "superdough";
import { MAX_AUDIO_VOICES } from "@/audio/voicePolicy";

let context: AudioContext | undefined;
let initialization: Promise<void> | undefined;

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
}
