/**
 * The room reverb, inside the worklet (BJS-596).
 *
 * It replaces the native convolver the app used to run after the worklet,
 * whose impulse was three seconds of noise falling 60 dB in 2 s, faded in
 * over 100 ms and darkened by a lowpass sweeping from 15 kHz to 1 kHz (the
 * reverbGen recipe). Convolving that impulse in JavaScript costs more than a
 * phone has for each render quantum, so this is a feedback delay network
 * tuned to the same character instead:
 *
 * - eight delay lines (31–67 ms) mixed by a normalised 8×8 Hadamard matrix,
 *   behind four allpass diffusers per channel, so the tail is dense noise from
 *   about 30 ms, as the old impulse's fade-in was;
 * - a decay of 60 dB in ROOM_T60_LOW seconds below ROOM_CROSSOVER_HZ and
 *   ROOM_T60_HIGH above it (a one-pole split in every line), as the sweep made
 *   the highs die first;
 * - a gentle lowpass at ROOM_TONE_HZ on the way out, where the sweep began;
 * - left and right each feed half the lines and are read with two orthogonal
 *   sign patterns, so the tail is wide and its two sides uncorrelated;
 * - its level matches the convolver's normalised impulse (energy 0.19 per
 *   channel at 48 kHz).
 *
 * All state is allocated here, never while rendering. The state is double
 * precision, so a long decay never reaches a denormal before it is cleared.
 */

const LINE_MS = [31.3, 37.9, 41.9, 46.3, 51.1, 56.9, 61.7, 67.3]
const DIFFUSER_MS = [4.77, 3.59, 12.73, 9.3]
const DIFFUSER_GAIN = [.75, .75, .625, .625]
/** Seconds to fall 60 dB, below and above the crossover. */
export const ROOM_T60_LOW = 2
export const ROOM_T60_HIGH = 1.6
export const ROOM_CROSSOVER_HZ = 3000
export const ROOM_TONE_HZ = 16000
/** Output level: matches the old convolver's normalised impulse energy. */
const ROOM_LEVEL = .2826
const LINES = LINE_MS.length
const NORMALISE = 1 / Math.sqrt(LINES)
/** Each side reads all eight lines, so its taps are normalised too. */
const TAP_GAIN = ROOM_LEVEL * NORMALISE

export class RoomReverb {
  /** Frames after the last sound sent in until the tail is 120 dB below it: twice the slowest decay. */
  readonly tailFrames: number
  private readonly lengths: Int32Array
  private readonly starts: Int32Array
  private readonly positions: Int32Array
  private readonly lines: Float64Array
  private readonly lowGains = new Float64Array(LINES)
  private readonly highGains = new Float64Array(LINES)
  private readonly splits = new Float64Array(LINES)
  private readonly crossover: number
  /** Each channel's four allpass diffusers, left's then right's, in one buffer. */
  private readonly diffusers: Float64Array
  private readonly diffuserLengths: Int32Array
  private readonly diffuserStarts: Int32Array
  private readonly diffuserPositions: Int32Array
  private readonly taps = new Float64Array(LINES)
  private readonly mixed = new Float64Array(LINES)
  private readonly tone: number
  private toneLeft = 0
  private toneRight = 0

  constructor(sampleRate: number) {
    const frames = (ms: number) => Math.max(1, Math.round(ms * sampleRate / 1000))
    this.lengths = Int32Array.from(LINE_MS, frames)
    this.starts = new Int32Array(LINES)
    let total = 0
    for (let line = 0; line < LINES; line++) {
      this.starts[line] = total
      total += this.lengths[line]
      // Per pass through its line: the gain that falls 60 dB in T60 seconds.
      this.lowGains[line] = 10 ** (-3 * this.lengths[line] / (sampleRate * ROOM_T60_LOW))
      this.highGains[line] = 10 ** (-3 * this.lengths[line] / (sampleRate * ROOM_T60_HIGH))
    }
    this.lines = new Float64Array(total)
    this.positions = new Int32Array(LINES)
    this.diffuserLengths = Int32Array.from([...DIFFUSER_MS, ...DIFFUSER_MS], frames)
    this.diffuserStarts = new Int32Array(this.diffuserLengths.length)
    let diffused = 0
    for (let stage = 0; stage < this.diffuserLengths.length; stage++) {
      this.diffuserStarts[stage] = diffused
      diffused += this.diffuserLengths[stage]
    }
    this.diffusers = new Float64Array(diffused)
    this.diffuserPositions = new Int32Array(this.diffuserLengths.length)
    const onePole = (hz: number) => 1 - Math.exp(-2 * Math.PI * Math.min(hz, sampleRate / 2) / sampleRate)
    this.crossover = onePole(ROOM_CROSSOVER_HZ)
    this.tone = onePole(ROOM_TONE_HZ)
    this.tailFrames = Math.ceil(2 * ROOM_T60_LOW * sampleRate)
  }

  /** Silence: forget everything the room holds. */
  clear() {
    this.lines.fill(0)
    this.diffusers.fill(0)
    this.splits.fill(0)
    this.toneLeft = this.toneRight = 0
  }

  /**
   * Run `length` frames of the stereo send from `offset` through the room,
   * adding its return to `output`, scaled by a gain that starts at `gain` and
   * moves by `gainStep` each frame (1 and 0 unless the returns are fading).
   */
  process(send: Float32Array[], output: Float32Array[], offset: number, length: number, gain: number, gainStep: number) {
    const lines = this.lines, starts = this.starts, lengths = this.lengths, positions = this.positions
    const taps = this.taps, mixed = this.mixed, splits = this.splits
    const lowGains = this.lowGains, highGains = this.highGains, crossover = this.crossover, tone = this.tone
    const sendLeft = send[0], sendRight = send[1] ?? send[0]
    const outLeft = output[0], outRight = output[1]
    for (let i = offset; i < offset + length; i++) {
      const left = this.diffuse(sendLeft[i], 0)
      const right = this.diffuse(sendRight[i], DIFFUSER_GAIN.length)
      for (let line = 0; line < LINES; line++) {
        const value = lines[starts[line] + positions[line]]
        taps[line] = value
        // The highs lose more each pass than the lows.
        const low = splits[line] += crossover * (value - splits[line])
        mixed[line] = lowGains[line] * low + highGains[line] * (value - low)
      }
      hadamard(mixed)
      for (let line = 0; line < LINES; line++) {
        const position = positions[line]
        lines[starts[line] + position] = mixed[line] * NORMALISE + ((line & 1) ? right : left)
        positions[line] = position + 1 === lengths[line] ? 0 : position + 1
      }
      // Two orthogonal sign patterns: uncorrelated sides.
      const wetLeft = (taps[0] - taps[1] + taps[2] - taps[3] + taps[4] - taps[5] + taps[6] - taps[7]) * TAP_GAIN
      const wetRight = (taps[0] + taps[1] - taps[2] - taps[3] + taps[4] + taps[5] - taps[6] - taps[7]) * TAP_GAIN
      this.toneLeft += tone * (wetLeft - this.toneLeft)
      this.toneRight += tone * (wetRight - this.toneRight)
      const level = gain + gainStep * (i - offset)
      outLeft[i] += this.toneLeft * level
      if (outRight) outRight[i] += this.toneRight * level
    }
  }

  /** One channel's four Schroeder allpasses in series: `first` is its first stage (0 left, 4 right). */
  private diffuse(input: number, first: number) {
    const buffer = this.diffusers, positions = this.diffuserPositions
    let value = input
    for (let stage = 0; stage < DIFFUSER_GAIN.length; stage++) {
      const which = first + stage
      const position = positions[which]
      const index = this.diffuserStarts[which] + position
      const delayed = buffer[index]
      const fed = value + DIFFUSER_GAIN[stage] * delayed
      buffer[index] = fed
      value = delayed - DIFFUSER_GAIN[stage] * fed
      positions[which] = position + 1 === this.diffuserLengths[which] ? 0 : position + 1
    }
    return value
  }
}

/** In-place unnormalised 8-point Walsh–Hadamard transform. */
function hadamard(values: Float64Array) {
  for (let size = 1; size < LINES; size <<= 1) {
    for (let start = 0; start < LINES; start += size << 1) {
      for (let index = start; index < start + size; index++) {
        const a = values[index], b = values[index + size]
        values[index] = a + b
        values[index + size] = a - b
      }
    }
  }
}
