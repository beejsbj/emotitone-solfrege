/**
 * Admission limit for each live worklet: simultaneous voices, live and
 * transport alike. A stolen voice fades out over VOICE_RETIRE_SECONDS; each
 * worklet lets up to 24 fades run (cutting the quietest past that) and steals
 * the oldest releasing voice, then the oldest held voice.
 */
export const MAX_AUDIO_VOICES = 64

/**
 * The stop fade, the minimum explicit ADSR release, and the fade of a cut's
 * room and echo returns (BJS-596).
 */
export const VOICE_RETIRE_SECONDS = .01
