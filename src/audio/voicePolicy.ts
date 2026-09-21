/**
 * Application admission limit for each live worklet and the Superdough graph.
 * Keep the worklet's render headroom: native playback gives up its default 128
 * slots so recorded performances face the same 64-voice admission pressure.
 * This is not a combined cross-engine budget. Each engine separately permits
 * up to eight retiring fades and prefers the oldest releasing voice, then the
 * oldest held voice. Authored patterns also share Superdough's 64 slots.
 */
export const MAX_AUDIO_VOICES = 64

/** Match Superdough's existing stop fade and minimum explicit ADSR release. */
export const VOICE_RETIRE_SECONDS = .01
