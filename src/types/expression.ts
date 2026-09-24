/** Pitch movement relative to the sounding note's onset; cents are 1/100 semitone. */
export interface PitchExpressionPoint {
  timeMs: number;
  cents: number;
}

/** Gain movement relative to the sounding note's onset; 1 is neutral gain. */
export interface GainExpressionPoint {
  timeMs: number;
  gain: number;
}
