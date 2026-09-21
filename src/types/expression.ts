/** Pitch movement relative to the sounding note's onset; cents are 1/100 semitone. */
export interface PitchExpressionPoint {
  timeMs: number;
  cents: number;
}
