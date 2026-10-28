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
