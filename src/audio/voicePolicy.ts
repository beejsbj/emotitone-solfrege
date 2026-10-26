/**
 * Admission limit for each live worklet: simultaneous voices, live and
 * transport alike. Each worklet permits up to eight retiring fades and
 * prefers the oldest releasing voice, then the oldest held voice.
 */
export const MAX_AUDIO_VOICES = 64

/** The stop fade, and the minimum explicit ADSR release. */
export const VOICE_RETIRE_SECONDS = .01
