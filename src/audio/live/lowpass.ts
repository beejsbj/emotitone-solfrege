import { OPEN_CUTOFF_HZ, type LiveShaping } from '../liveShaping'

/** Web Audio lowpass: Q is in dB, not the linear RBJ Q parameter. All state and
 * coefficient storage is created with the voice pool, never in process(). */
export class VoiceEffects {
  inUse = false
  private coefficients = new Float64Array(5)
  private targets = new Float64Array(5)
  private history = new Float64Array(8)
  private remaining = 0
  private room = 0
  private roomTarget = 0
  private delay = 0
  private delayTarget = 0
  constructor(private rate: number) {}
  reset(shape: LiveShaping) {
    this.history.fill(0)
    this.set(shape, false)
  }
  set(shape: LiveShaping, glide = true) {
    const cutoff = Math.max(0, Math.min(this.rate / 2, Math.fround(shape.cutoff)))
    const q = Math.fround(shape.resonance > 0 ? shape.resonance : 1)
    const target = this.targets
    if (shape.cutoff >= OPEN_CUTOFF_HZ) {
      target[0] = 1; target[1] = target[2] = target[3] = target[4] = 0
    } else if (cutoff === 0) {
      target.fill(0)
    } else if (cutoff === this.rate / 2) {
      target[0] = 1; target[1] = target[2] = target[3] = target[4] = 0
    } else {
      const theta = Math.PI * (2 * cutoff / this.rate)
      const cosine = Math.cos(theta)
      // Chromium's pow10 helper uses expf; preserve float rounding for frozen PCM.
      const resonance = Math.fround(Math.exp(Math.fround(q / 20 * Math.LN10)))
      const alpha = Math.sin(theta) / (2 * resonance)
      const inverse = 1 / (1 + alpha)
      target[0] = ((1 - cosine) / 2) * inverse
      target[1] = (1 - cosine) * inverse
      target[2] = target[0]
      target[3] = (-2 * cosine) * inverse
      target[4] = (1 - alpha) * inverse
    }
    this.roomTarget = Math.max(0, shape.room)
    this.delayTarget = Math.max(0, shape.delay)
    this.remaining = glide ? Math.max(1, Math.round(.015 * this.rate)) : 0
    if (!glide) {
      this.coefficients.set(target)
      this.room = this.roomTarget
      this.delay = this.delayTarget
    }
  }
  process(left: Float32Array, right: Float32Array, dry: Float32Array[], room: Float32Array[] | undefined,
    delay: Float32Array[] | undefined, offset: number, length: number) {
    const c = this.coefficients, h = this.history
    for (let i = 0; i < length; i++) {
      if (this.remaining) {
        for (let j = 0; j < 5; j++) c[j] += (this.targets[j] - c[j]) / this.remaining
        this.room += (this.roomTarget - this.room) / this.remaining
        this.delay += (this.delayTarget - this.delay) / this.remaining
        this.remaining--
      }
      for (let channel = 0; channel < dry.length; channel++) {
        const x = channel === 0 ? left[i] : right[i]
        const j = channel * 4
        const y = c[0] * x + c[1] * h[j] + c[2] * h[j + 1] - c[3] * h[j + 2] - c[4] * h[j + 3]
        const rounded = Math.fround(y)
        const filtered = Math.abs(rounded) < 1.1754943508222875e-38 ? 0 : rounded
        h[j + 1] = h[j]; h[j] = x; h[j + 3] = h[j + 2]; h[j + 2] = filtered
        dry[channel][offset + i] += filtered
        if (room?.[channel]) room[channel][offset + i] += filtered * this.room
        if (delay?.[channel]) delay[channel][offset + i] += filtered * this.delay
      }
    }
  }
}
