/**
 * Admission limit for each live worklet: simultaneous voices, live and
 * transport alike. A stolen voice fades out over VOICE_RETIRE_SECONDS; each
 * worklet lets as many fades run as it has voices (cutting the quietest past
 * that) and steals the oldest releasing voice, then the oldest held voice.
 */
export const MAX_AUDIO_VOICES = 64

/** The stop fade, and the minimum explicit ADSR release. */
export const VOICE_RETIRE_SECONDS = .01
