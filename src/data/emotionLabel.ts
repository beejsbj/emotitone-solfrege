/**
 * The emotion label's default: the one value to change when Burooj picks
 * (BJS-501). The label is the Stage's chord-centre emotion line.
 * - "off": hidden until the player turns Emotion on; then it shows on any
 *   held dyad or chord.
 * - "on": shown from the start on any held dyad or chord.
 * - "chord": shown from the start, only while three or more pitch classes
 *   are held.
 * A player's saved Emotion switch still wins; this sets fresh and reset state.
 */
export type EmotionLabelDefault = "off" | "on" | "chord";

export const EMOTION_LABEL_DEFAULT: EmotionLabelDefault = "off";

/** Whether the label shows for this many held pitch classes. */
export function emotionLabelShows(
  policy: EmotionLabelDefault,
  switchedOn: boolean,
  pitchClassCount: number,
): boolean {
  if (!switchedOn || pitchClassCount === 0) return false;
  return policy !== "chord" || pitchClassCount >= 3;
}
