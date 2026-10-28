/**
 * The worklet's output peak limiter (BJS-590).
 *
 * Every voice is summed at full scale and the master is a unity gain straight
 * into the destination, so a loud loop with live chords on top can go over
 * full scale and clip at the output (heard as clicks). This runs at the end of
 * each render, on the voice sum, and adds no latency: it reads the whole
 * quantum before any of it is output, so it can ramp the gain down ahead of a
 * peak inside that quantum, and never looks further ahead than that.
 *
 * - Below the ceiling it does nothing: the gain is exactly 1 and the samples
 *   are left untouched (bit for bit).
 * - Over it, the gain falls just enough that no output sample exceeds the
 *   ceiling, along a ramp inside the quantum (a peak at its very start can
 *   only be met by a step there), then recovers on a smooth release.
 * - Detection is stereo-linked on the dry sum, and the same gain is applied to
 *   the room and delay sends, as if the limiter sat on the voice bus before the
 *   sends: the effects hear what the dry output plays.
 */

/** The ceiling, in dBFS: about −0.3 dB leaves room for converter rounding. */
export const LIMITER_CEILING_DB = -.3
export const LIMITER_CEILING = 10 ** (LIMITER_CEILING_DB / 20)
/** How fast the gain may fall: by full scale in this long, so a 3 dB reduction ramps over about 1.5 ms. */
export const LIMITER_ATTACK_SECONDS = .005
/** Release time constant: about two thirds of a reduction recovers in this long, 95% in three times it. */
export const LIMITER_RELEASE_SECONDS = .08
/** Within this of unity the gain snaps back to exactly 1 (−0.00001 dB). */
const UNITY_SNAP = 1e-6

export class PeakLimiter {
  /** The gain at the end of the last quantum; exactly 1 when not limiting. */
  private gain = 1
  private readonly attackStep: number
  private readonly releaseCoefficient: number
  /** Per-frame gains for one quantum; grows only if a caller renders a longer block. */
  private gains = new Float64Array(128)
  /** The loudest dry sample the voice sum reached before limiting (telemetry; read-only to callers). */
  peakIn = 0

  constructor(sampleRate: number, readonly ceiling = LIMITER_CEILING) {
    this.attackStep = 1 / (LIMITER_ATTACK_SECONDS * sampleRate)
    this.releaseCoefficient = 1 - Math.exp(-1 / (LIMITER_RELEASE_SECONDS * sampleRate))
  }

  /** The gain now: 1 when idle. */
  get currentGain() { return this.gain }

  process(dry: Float32Array[], room?: Float32Array[], delay?: Float32Array[]) {
    const length = dry[0]?.length ?? 0
    if (!length) return
    const ceiling = this.ceiling
    let blockPeak = 0
    for (const channel of dry) for (let i = 0; i < length; i++) {
      const level = Math.abs(channel[i])
      if (level > blockPeak) blockPeak = level
    }
    if (blockPeak > this.peakIn) this.peakIn = blockPeak
    // Idle and under the ceiling: leave every sample as it is.
    if (this.gain === 1 && !(blockPeak > ceiling)) return
    if (this.gains.length < length) this.gains = new Float64Array(length)
    const gains = this.gains
    // The gain each frame needs so that its louder channel lands on the ceiling.
    for (let i = 0; i < length; i++) {
      let level = 0
      for (const channel of dry) { const value = Math.abs(channel[i]); if (value > level) level = value }
      gains[i] = level > ceiling ? ceiling / level : 1
    }
    // Backwards: the gain approaches each reduction along a ramp ending at its frame.
    if (blockPeak > ceiling) for (let i = length - 2; i >= 0; i--) {
      const ramp = gains[i + 1] + this.attackStep
      if (ramp < gains[i]) gains[i] = ramp
    }
    // Forwards: follow the ramps down, release smoothly up, and never above what a frame allows.
    let gain = this.gain
    for (let i = 0; i < length; i++) {
      const allowed = gains[i]
      if (allowed < gain) gain = allowed
      else if (gain < 1) {
        gain += (1 - gain) * this.releaseCoefficient
        if (gain > allowed) gain = allowed
        if (allowed === 1 && gain > 1 - UNITY_SNAP) gain = 1
      }
      gains[i] = gain
    }
    this.gain = gain
    applyGains(dry, gains, length)
    if (room) applyGains(room, gains, length)
    if (delay) applyGains(delay, gains, length)
  }
}

function applyGains(bus: Float32Array[], gains: Float64Array, length: number) {
  for (const channel of bus) for (let i = 0; i < length; i++) channel[i] *= gains[i]
}
