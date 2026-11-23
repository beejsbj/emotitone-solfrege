/**
 * The echo (delay), inside the worklet (BJS-596).
 *
 * A stereo ring buffer with feedback that reproduces the native DelayNode
 * loop the app used to run after the worklet, sample for sample: the first
 * echo comes `time` after the send, and every later one a render quantum
 * after that again, because the native loop (DelayNode → feedback GainNode →
 * DelayNode) took one quantum to come round (audio-lab/effects/README.md).
 * Each turn is rounded to float32 as the native nodes rounded it.
 *
 * The buffer is allocated for the longest time a DelayNode allowed by default
 * (one second), so changing the time never allocates while rendering.
 */

/** A native DelayNode's default maximum delay time. */
export const MAX_ECHO_SECONDS = 1
/** The feedback is held below this, as the native graph held it. */
export const MAX_ECHO_FEEDBACK = .98
/** The extra frames each turn of the native feedback loop took: one render quantum. */
export const ECHO_LOOP_FRAMES = 128
/** An echo this far below the sound that made it (−120 dB) has died out. */
const SILENT = 1e-6

export class Echo {
  /** Frames after the last sound sent in until its echoes are 120 dB below it. */
  tailFrames = 0
  private readonly channels: Float32Array[]
  private readonly size: number
  private frames = 1
  private feedback = 0
  private write = 0

  constructor(private readonly sampleRate: number, time: number, feedback: number) {
    this.size = Math.ceil(MAX_ECHO_SECONDS * sampleRate) + ECHO_LOOP_FRAMES + 1
    this.channels = [new Float32Array(this.size), new Float32Array(this.size)]
    this.set(time, feedback)
  }

  /** The echo's time (seconds, at least a frame, at most a second) and feedback (0 to 0.98). False for a value that is not a number. */
  set(time: number, feedback: number): boolean {
    if (!Number.isFinite(time) || !Number.isFinite(feedback)) return false
    this.frames = Math.max(1, Math.min(this.size - ECHO_LOOP_FRAMES - 1, Math.round(time * this.sampleRate)))
    // The native feedback GainNode held its gain as a float32.
    this.feedback = Math.fround(Math.max(0, Math.min(MAX_ECHO_FEEDBACK, feedback)))
    const turns = this.feedback > 0 ? Math.ceil(Math.log(SILENT) / Math.log(this.feedback)) : 0
    this.tailFrames = this.frames + turns * (this.frames + ECHO_LOOP_FRAMES)
    return true
  }

  /** Silence: forget every echo still coming round. */
  clear() {
    for (const channel of this.channels) channel.fill(0)
  }

  /**
   * Feed `length` frames of the stereo send from `offset` into the loop,
   * adding what comes out to `output`, scaled by a gain that starts at `gain`
   * and moves by `gainStep` each frame (1 and 0 unless the returns are fading).
   */
  process(send: Float32Array[], output: Float32Array[], offset: number, length: number, gain: number, gainStep: number) {
    const size = this.size, frames = this.frames, feedback = this.feedback
    let write = this.write
    for (let c = 0; c < this.channels.length; c++) {
      const buffer = this.channels[c]
      const input = send[c] ?? send[0]
      const out = output[c]
      write = this.write
      let echo = write - frames
      if (echo < 0) echo += size
      let turn = echo - ECHO_LOOP_FRAMES
      if (turn < 0) turn += size
      for (let i = offset; i < offset + length; i++) {
        const sounding = buffer[echo]
        buffer[write] = input[i] + Math.fround(feedback * buffer[turn])
        // At gain 1 the product is the echo itself, bit for bit.
        if (out) out[i] += sounding * (gain + gainStep * (i - offset))
        if (++write === size) write = 0
        if (++echo === size) echo = 0
        if (++turn === size) turn = 0
      }
    }
    this.write = write
  }
}
