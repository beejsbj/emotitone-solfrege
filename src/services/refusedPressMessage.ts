/**
 * What a refused press says: a key the worklet could not sound (its sound is
 * not held) raises a Heads-up in one plain line, "Can't play Piano: memory
 * full", instead of failing silently. The engine's reason maps to a few plain
 * words here, in one place; the line keeps to the Heads-up's 32 characters,
 * dropping the instrument's name when it would not fit.
 */
import { instrumentName, LOOPER_MESSAGE_MAX } from "@/services/looperMessages";
import type { LivePlaybackFailure } from "@/services/livePlayback";

/** The refused press's entry in the Heads-up stack: one line at a time. */
export const REFUSED_PRESS_HEADS_UP = "refused-press";

/** The engine's reason, in plain words. */
export function refusedPressWords(failure: LivePlaybackFailure | undefined, recoveryFailed = false): string {
  // Held keys and playing loops keep the sample memory full.
  if (failure?.budget) return "memory full";
  // Its samples could not download or decode; trying again may work.
  if (failure?.kind === "load") return "didn't load";
  // It can never play here: no AudioWorklet, a format or size the worklet can't hold.
  if (failure?.unsupported) return "not supported";
  // The engine rebuilt and could not bring the sound back.
  if (recoveryFailed) return "try again";
  // Not prepared yet, or the renderer is being rebuilt.
  return "not ready";
}

export function refusedPressMessage(instrument: string, failure: LivePlaybackFailure | undefined, recoveryFailed = false): string {
  const words = refusedPressWords(failure, recoveryFailed);
  const named = `Can't play ${instrumentName(instrument)}: ${words}`;
  return named.length <= LOOPER_MESSAGE_MAX ? named : `Can't play: ${words}`;
}
