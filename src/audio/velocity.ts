/** Normalized performed velocity uses linear amplitude in every renderer.
 * Missing/invalid legacy values retain unity; zero is silent, one is full gain.
 */
export function velocityToGain(velocity?: number): number {
  return typeof velocity === 'number' && Number.isFinite(velocity)
    ? Math.max(0, Math.min(1, velocity)) : 1
}

/**
 * How a recorded take plays back (BJS-556): its loudest note at full level,
 * every other note at the same fraction of it that it was played at
 * (gain = v / max v). Stored velocities are never rewritten; this runs when a
 * take is played or written out as Strudel text. A note without velocity counts
 * as full level, so a take with such a note, or a note at 1, plays as it was
 * played; an evenly soft take is raised to full level too. An all-silent take
 * stays silent. Live input never comes through here.
 */
export function takePlaybackGain(velocities: readonly (number | undefined)[]): (velocity?: number) => number {
  const gains = velocities.map(velocityToGain)
  const loudest = Math.max(...gains)
  if (!(loudest > 0)) return velocityToGain
  return velocity => velocityToGain(velocity) / loudest
}

/** MIDI note-on must stay in 1–127; omitted app input retains the mirror's 100. */
export function velocityToMidi(velocity?: number): number {
  return velocity === undefined ? 100 : Math.max(1, Math.round(127 * velocityToGain(velocity)))
}
