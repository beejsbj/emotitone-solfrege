/**
 * Admission limit for each live worklet: simultaneous voices, live and
 * transport alike. A stolen voice fades out over VOICE_RETIRE_SECONDS; each
 * worklet lets up to 24 fades run (cutting the quietest past that) and steals
 * the oldest releasing voice, then the oldest held voice.
 */
export const MAX_AUDIO_VOICES = 64

/** The stop fade, and the minimum explicit ADSR release. */
export const VOICE_RETIRE_SECONDS = .01

/**
 * Stop All's cut (BJS-598) swaps the shared room and delay for fresh ones
 * this long after it: past the cut voices' own VOICE_RETIRE_SECONDS release,
 * with room for the message to reach the worklet and a render quantum or two.
 * That release goes into the old returns, which then fade, so nothing of the
 * cut sound reaches the fresh ones.
 */
export const WET_CUT_DELAY_SECONDS = VOICE_RETIRE_SECONDS + .02

/**
 * That delay on a given audio context. The worklet takes the stop between
 * render callbacks and a graph change applies at the start of one, so on a
 * large callback (an Android device without the low-latency path, a
 * "playback" latency hint) the swap must wait two callbacks past the release,
 * or both land in the same callback and the release reaches the fresh buses.
 * `baseLatency` is that callback; `outputLatency` comes after rendering, when
 * both are already decided, so it does not count.
 */
export function wetCutDelaySeconds(baseLatency?: number): number {
  const callback = typeof baseLatency === 'number' && Number.isFinite(baseLatency) && baseLatency > 0 ? baseLatency : 0
  return Math.max(WET_CUT_DELAY_SECONDS, VOICE_RETIRE_SECONDS + 2 * callback)
}
