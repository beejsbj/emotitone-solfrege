// Verified with matched rendered-sample tests in audio-lab: keep the immediate
// attack close while the rhythm engine uses a larger margin for later pulses.
export const LIVE_AUDIO_SCHEDULING_LEAD_MS = 5;

type OutputClock = Pick<AudioContext, "currentTime"> & Partial<Pick<AudioContext,
  "getOutputTimestamp" | "baseLatency" | "outputLatency"
>>;

/** Estimated audible deadline on performance.now's clock, for presentation.
 * Recording and MIDI retain their musical timestamps; hardware estimates must
 * never be fed back into note scheduling.
 */
export function audioTimeToOutputTime(context: OutputClock, audioTime: number, nowMs = performance.now()): number {
  const timestamp = context.getOutputTimestamp?.();
  if (timestamp && Number.isFinite(timestamp.contextTime) && timestamp.contextTime! >= 0
    && Number.isFinite(timestamp.performanceTime) && timestamp.performanceTime! > 0) {
    return timestamp.performanceTime! + (audioTime - timestamp.contextTime!) * 1000;
  }
  const validLatency = (value: number | undefined) => Number.isFinite(value) && value! >= 0 ? value! : 0;
  return nowMs + (audioTime - context.currentTime + validLatency(context.baseLatency) + validLatency(context.outputLatency)) * 1000;
}
