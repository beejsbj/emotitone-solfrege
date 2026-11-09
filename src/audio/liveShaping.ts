/**
 * The Shape tab's sound controls as the live AudioWorklet takes them. Per-voice
 * filtering and send levels, and the room and echo they send to, all live on
 * the audio thread (src/audio/live/).
 */

/** Values the Shape tab owns. */
export interface LiveShaping {
  cutoff: number;
  resonance: number;
  room: number;
  delay: number;
}

/** At or above this cutoff the filter is bypassed. */
export const OPEN_CUTOFF_HZ = 12000;
/** The shared echo's time and feedback. */
export const LIVE_DELAY_TIME_SECONDS = 0.25;
export const LIVE_DELAY_FEEDBACK = 0.3;
