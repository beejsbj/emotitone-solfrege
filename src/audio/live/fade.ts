/**
 * A member's fade-out (BJS-598): Stop All and the Loop Dial's flick end a
 * loop over a bar instead of at once.
 *
 * The fade is a level ramp in the mix, not a release: the member keeps
 * playing through it, and its sounding voices (release tails included) and
 * every onset it plays meanwhile share one ramp. It scales each voice before
 * the voice's filter and sends, so the member's room and delay sends fade
 * with its dry sound; what the shared room and delay already hold rings out
 * after, as it does after a mute. The ramp sits before the output limiter,
 * which only ever sees the level fall.
 *
 * The curve is (1 − t)²: it starts to fall at once (the tap is heard), is
 * 12 dB down halfway, and lands on silence with no slope, so the last of the
 * sound dissolves rather than stops.
 */
export interface MemberFade {
  /** The frame the ramp starts at (level 1). */
  start: number
  /** The frame it reaches silence. */
  end: number
}

/** The fade's level at `frame`: 1 before it starts, 0 from its end. */
export function fadeLevel(fade: MemberFade, frame: number): number {
  const length = fade.end - fade.start
  const t = length > 0 ? Math.min(1, Math.max(0, (frame - fade.start) / length)) : 1
  return (1 - t) * (1 - t)
}

/**
 * Scale one rendered span by the fade. The level is exact at the span's
 * edges and straight between them; spans are at most a quantum long, so the
 * line never strays measurably from the curve and the joins have no step.
 */
export function applyFade(channels: Float32Array[], length: number, frame: number, fade: MemberFade) {
  if (length <= 0) return
  const from = fadeLevel(fade, frame)
  const to = fadeLevel(fade, frame + length)
  if (from === 1 && to === 1) return
  const step = (to - from) / length
  for (const channel of channels) for (let i = 0; i < length; i++) channel[i] *= from + step * i
}
