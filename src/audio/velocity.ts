/** Normalized performed velocity uses linear amplitude in every renderer.
 * Missing/invalid legacy values retain unity; zero is silent, one is full gain.
 */
export function velocityToGain(velocity?: number): number {
  return typeof velocity === 'number' && Number.isFinite(velocity)
    ? Math.max(0, Math.min(1, velocity)) : 1
}

/** MIDI note-on must stay in 1–127; omitted app input retains the mirror's 100. */
export function velocityToMidi(velocity?: number): number {
  return velocity === undefined ? 100 : Math.max(1, Math.round(127 * velocityToGain(velocity)))
}
