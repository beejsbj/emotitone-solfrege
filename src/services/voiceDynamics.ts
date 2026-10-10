// Below the detector's noise floor is silence; 0.1 RMS is a full voice.
export const VOICE_RMS_FLOOR = 0.003;
export const VOICE_RMS_FULL = 0.1;
export const VOICE_VELOCITY_MINIMUM = 0.15;
export const VOICE_VELOCITY_EXPONENT = 0.5;
export const DEFAULT_VOICE_VELOCITY = 0.7;

export function voiceRmsToVelocity(rms: number): number {
  if (!Number.isFinite(rms) || rms < VOICE_RMS_FLOOR) return 0;
  const level = (rms - VOICE_RMS_FLOOR) / (VOICE_RMS_FULL - VOICE_RMS_FLOOR);
  // Square-root compression keeps quiet humming useful without letting
  // microphone peaks exceed the instrument's velocity range.
  return Math.max(VOICE_VELOCITY_MINIMUM, Math.min(1, Math.max(0, level)) ** VOICE_VELOCITY_EXPONENT);
}
