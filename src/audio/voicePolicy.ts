/**
 * Application admission limit for each live worklet and the Superdough graph.
 * Keep the worklet's render headroom: native playback gives up its default 128
 * slots so recorded performances face the same 64-voice admission pressure.
 * This bounds simultaneous audio, not prepared graph allocations: native
 * lookahead can retain more graphs with distinct future audible intervals.
 * Native retirement uses a separate gain gate; audio cuts stay sample-timed
 * while source/timer cleanup can lag during a main-thread stall.
 * This is not a combined cross-engine budget. Each engine separately permits
 * up to eight retiring fades and prefers the oldest releasing voice, then the
 * oldest held voice. Authored patterns also share Superdough's 64 slots.
 */
export const MAX_AUDIO_VOICES = 64

/** Match Superdough's existing stop fade and minimum explicit ADSR release. */
export const VOICE_RETIRE_SECONDS = .01
