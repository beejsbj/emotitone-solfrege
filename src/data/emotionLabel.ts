/**
 * The emotion label's policy: the one value to change when Burooj picks
 * (BJS-501). The label is the Stage's chord-centre emotion line.
 * - "off": hidden until the player turns Emotion on; then it shows on any
 *   held dyad or chord.
 * - "on": shown from the start on any held dyad or chord.
 * - "chord": shown from the start, only while three or more pitch classes
 *   are held.
 * This sets fresh/reset state and the pitch-count gate when Emotion is on.
 * A player's saved switch controls whether it is on; the policy still gates it.
 */
export type EmotionLabelPolicy = "off" | "on" | "chord";

export const EMOTION_LABEL_POLICY: EmotionLabelPolicy = "off";

/** Whether the label shows for this many held pitch classes. */
export function emotionLabelShows(
  policy: EmotionLabelPolicy,
  switchedOn: boolean,
  pitchClassCount: number,
): boolean {
  if (!switchedOn || pitchClassCount === 0) return false;
  return policy !== "chord" || pitchClassCount >= 3;
}
