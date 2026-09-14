import type { LiveSampleZone } from './types'

const DECIMATION_TAPS = 63
const HALF_FILTER = (DECIMATION_TAPS - 1) / 2
const TAPS = 8
const FIRST_TAP = 1 - TAPS / 2
const PHASES = 256
const RATE_STEPS = 16
const sinc = (x: number) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)

// Tables are computed once at module installation, before the worklet accepts
// notes. There is no trigonometry, coefficient allocation, or filter design in
// either the voice constructor or the sample loop.
const decimation = new Float64Array(DECIMATION_TAPS)
let decimationSum = 0
for (let tap = 0; tap < DECIMATION_TAPS; tap++) {
  const window = .42 - .5 * Math.cos(2 * Math.PI * tap / (DECIMATION_TAPS - 1))
    + .08 * Math.cos(4 * Math.PI * tap / (DECIMATION_TAPS - 1))
  decimation[tap] = .45 * sinc(.45 * (tap - HALF_FILTER)) * window
  decimationSum += decimation[tap]
}
for (let tap = 0; tap < DECIMATION_TAPS; tap++) decimation[tap] /= decimationSum

const coefficients = new Float32Array(RATE_STEPS * PHASES * TAPS)
for (let rate = 0; rate < RATE_STEPS; rate++) {
  const cutoff = 1 / (1 + rate / (RATE_STEPS - 1))
  for (let phase = 0; phase < PHASES; phase++) {
    let sum = 0
    const start = (rate * PHASES + phase) * TAPS
    for (let tap = 0; tap < TAPS; tap++) {
      const distance = FIRST_TAP + tap - phase / PHASES
      const window = Math.abs(distance) < TAPS / 2 ? .5 + .5 * Math.cos(Math.PI * distance / (TAPS / 2)) : 0
      coefficients[start + tap] = cutoff * sinc(cutoff * distance) * window
      sum += coefficients[start + tap]
    }
    for (let tap = 0; tap < TAPS; tap++) coefficients[start + tap] /= sum
  }
}

function read(data: Float32Array, index: number, loopStart: number, loopEnd: number, inLoop: boolean): number {
  if (inLoop && (index < loopStart || index >= loopEnd)) {
    const length = loopEnd - loopStart
    index = loopStart + ((index - loopStart) % length + length) % length
  }
  if (index < 0 || index >= data.length) return 0
  const left = Math.floor(index)
  const fraction = index - left
  return fraction === 0 ? data[left] : data[left] + ((data[left + 1] ?? data[left]) - data[left]) * fraction
}

/** Selection-time anti-alias pyramid. Each level has half as many frames and
 * the same source duration. Extra PCM is bounded by the original PCM size plus
 * rounding; original cached samples remain untouched and attached.
 */
function* mipmapSteps(channels: Float32Array[], loopStartFrame: number, loopEndFrame: number, maxLevels: number): Generator<void, Float32Array[][]> {
  const levels: Float32Array[][] = []
  let previous = channels
  let loopStart = loopStartFrame
  let loopEnd = loopEndFrame
  // Tiny buffers have no useful additional octave. Limiting to 16 levels also
  // bounds pathological imported banks independently of playback pitch.
  while (previous[0]?.length > 1 && levels.length < Math.min(16, maxLevels)) {
    const length = Math.ceil(previous[0].length / 2)
    const next: Float32Array[] = []
    for (const data of previous) {
      const output = new Float32Array(length)
      for (let frame = 0; frame < length; frame++) {
        const center = frame * 2
        const inLoop = loopEnd > loopStart && center >= loopStart && center < loopEnd
        let value = 0
        const first = center - HALF_FILTER
        if (first >= 0 && first + DECIMATION_TAPS <= data.length &&
            (!inLoop || (first >= loopStart && first + DECIMATION_TAPS <= loopEnd))) {
          for (let tap = 0; tap < DECIMATION_TAPS; tap++) value += data[first + tap] * decimation[tap]
        } else {
          for (let tap = 0; tap < DECIMATION_TAPS; tap++) {
            value += read(data, first + tap, loopStart, loopEnd, inLoop) * decimation[tap]
          }
        }
        output[frame] = value
        if (frame > 0 && frame % 32768 === 0) yield
      }
      next.push(output)
    }
    levels.push(next)
    previous = next
    loopStart /= 2
    loopEnd /= 2
  }
  return levels
}

export function prepareSampleMipmaps(channels: Float32Array[], loopStartFrame = 0, loopEndFrame = 0, maxLevels = 16): Float32Array[][] {
  const steps = mipmapSteps(channels, loopStartFrame, loopEndFrame, maxLevels)
  let result = steps.next()
  while (!result.done) result = steps.next()
  return result.value
}

/** Yield selection-time filtering in bounded chunks so loading UI and existing
 * audio input callbacks can run between chunks. The DSP never calls this. */
export async function prepareSampleMipmapsAsync(channels: Float32Array[], loopStartFrame = 0, loopEndFrame = 0, maxLevels = 16): Promise<Float32Array[][]> {
  const steps = mipmapSteps(channels, loopStartFrame, loopEndFrame, maxLevels)
  let result = steps.next()
  while (!result.done) {
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    result = steps.next()
  }
  return result.value
}

export interface SampleResampler {
  sample(channel: number, originalPosition: number): number
  /** Mix a linear envelope span, returning frames consumed before a one-shot ends. */
  mix(left: Float32Array, right: Float32Array | undefined, offset: number, length: number, originalPosition: number, gain: number, gainStep: number): number
}

/** Select an already filtered octave once per voice, then interpolate with a
 * bounded 8-tap polyphase filter. Original-rate integer reads are exact.
 */
export function createSampleResampler(zone: LiveSampleZone, increment: number): SampleResampler {
  const level = Math.min(zone.mipmaps?.length ?? 0, Math.max(0, Math.floor(Math.log2(increment))))
  const factor = 2 ** level
  const channels = level ? zone.mipmaps![level - 1] : zone.channels
  const rate = increment / factor
  const rateIndex = Math.min(RATE_STEPS - 1, Math.max(0, Math.ceil((rate - 1) * (RATE_STEPS - 1))))
  const loopStart = (zone.loopStartFrame ?? 0) / factor
  const loopEnd = (zone.loopEndFrame ?? 0) / factor
  const looping = loopEnd > loopStart && loopStart >= 0
  const leftChannel = channels[0]
  const rightChannel = channels[1] ?? leftChannel
  const mono = leftChannel === rightChannel
  const inverseFactor = 1 / factor
  const rateOffset = rateIndex * PHASES * TAPS
  return {
    mix(outputLeft, outputRight, offset, length, originalPosition, gain, gainStep) {
      const count = looping ? length : Math.max(0, Math.min(length, Math.ceil((zone.channels[0].length - originalPosition) / increment)))
      for (let frame = 0; frame < count; frame++) {
        let position = originalPosition * inverseFactor
        if (looping && position >= loopEnd) position = loopStart + (position - loopStart) % (loopEnd - loopStart)
        const left = Math.floor(position)
        const fraction = position - left
        let leftValue: number
        let rightValue: number
        if (rateIndex === 0 && fraction === 0) {
          leftValue = leftChannel[left]
          rightValue = mono ? leftValue : rightChannel[left]
        } else {
          const index = rateOffset + Math.floor(fraction * PHASES) * TAPS
          const first = left + FIRST_TAP
          const inLoop = looping && position >= loopStart
          if (first >= 0 && first + TAPS <= leftChannel.length &&
              (!inLoop || (first >= loopStart && first + TAPS <= loopEnd))) {
            const c0 = coefficients[index], c1 = coefficients[index + 1], c2 = coefficients[index + 2], c3 = coefficients[index + 3]
            const c4 = coefficients[index + 4], c5 = coefficients[index + 5], c6 = coefficients[index + 6], c7 = coefficients[index + 7]
            leftValue = leftChannel[first] * c0 + leftChannel[first + 1] * c1 + leftChannel[first + 2] * c2 + leftChannel[first + 3] * c3
              + leftChannel[first + 4] * c4 + leftChannel[first + 5] * c5 + leftChannel[first + 6] * c6 + leftChannel[first + 7] * c7
            rightValue = mono ? leftValue : rightChannel[first] * c0 + rightChannel[first + 1] * c1 + rightChannel[first + 2] * c2 + rightChannel[first + 3] * c3
              + rightChannel[first + 4] * c4 + rightChannel[first + 5] * c5 + rightChannel[first + 6] * c6 + rightChannel[first + 7] * c7
          } else {
            leftValue = 0
            rightValue = 0
            for (let tap = 0; tap < TAPS; tap++) {
              const coefficient = coefficients[index + tap]
              leftValue += read(leftChannel, first + tap, loopStart, loopEnd, inLoop) * coefficient
              if (!mono) rightValue += read(rightChannel, first + tap, loopStart, loopEnd, inLoop) * coefficient
            }
            if (mono) rightValue = leftValue
          }
        }
        outputLeft[offset + frame] += leftValue * gain
        if (outputRight) outputRight[offset + frame] += rightValue * gain
        originalPosition += increment
        gain += gainStep
      }
      return count
    },
    sample(channel, originalPosition) {
      const data = channels[Math.min(channel, channels.length - 1)]
      let position = originalPosition / factor
      if (looping && position >= loopEnd) position = loopStart + (position - loopStart) % (loopEnd - loopStart)
      if (position < 0 || position >= data.length) return 0
      const left = Math.floor(position)
      const fraction = position - left
      const inLoop = looping && position >= loopStart
      if (rateIndex === 0 && fraction === 0) return data[left]
      const phase = Math.min(PHASES - 1, Math.floor(fraction * PHASES))
      const offset = (rateIndex * PHASES + phase) * TAPS
      const first = left + FIRST_TAP
      // Almost every read is interior. Avoid per-tap wrapping, flooring and
      // function calls there; only loop/sample boundaries need the slow path.
      if (first >= 0 && first + TAPS <= data.length &&
          (!inLoop || (first >= loopStart && first + TAPS <= loopEnd))) {
        return data[first] * coefficients[offset] + data[first + 1] * coefficients[offset + 1]
          + data[first + 2] * coefficients[offset + 2] + data[first + 3] * coefficients[offset + 3]
          + data[first + 4] * coefficients[offset + 4] + data[first + 5] * coefficients[offset + 5]
          + data[first + 6] * coefficients[offset + 6] + data[first + 7] * coefficients[offset + 7]
      }
      let value = 0
      for (let tap = 0; tap < TAPS; tap++) {
        value += read(data, left + FIRST_TAP + tap, loopStart, loopEnd, inLoop) * coefficients[offset + tap]
      }
      return value
    },
  }
}
