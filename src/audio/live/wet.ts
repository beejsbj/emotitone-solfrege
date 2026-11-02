import { Echo } from './echo'
import { RoomReverb } from './room'
import { LIVE_DELAY_FEEDBACK, LIVE_DELAY_TIME_SECONDS } from '../liveShaping'
import { VOICE_RETIRE_SECONDS } from '../voicePolicy'

/**
 * The room and the echo, inside the worklet (BJS-596): one room and one echo
 * that every voice sends to (live notes and the Looper's members alike), as
 * the app's native buses were. Their returns join the dry mix before the
 * output limiter, so dry and wet are limited together and nothing at the
 * destination goes over full scale.
 *
 * - While nothing is sent and their tails have died away (−120 dB), neither
 *   runs: an idle room or echo costs a scan of its send, and leaves the dry mix
 *   untouched, bit for bit.
 * - A cut (Stop All's second tap, BJS-598; a mute under the "cut" tail policy)
 *   fades both returns to silence over VOICE_RETIRE_SECONDS, the cut voices'
 *   own release, then empties both on the frame it ends. The cut voices'
 *   release goes in before then and is faded and emptied with the rest. A cut
 *   stops loop voices only, so a held key may still be sending: from the cut's
 *   end the sends come back in over the same time, and its fresh tail (the
 *   echo 250 ms later) starts from silence rather than mid-waveform.
 * - A send sample that is not a number goes in as silence: in a feedback
 *   network it would otherwise circulate for as long as anything else is sent.
 */
export class WetEffects {
  readonly room: RoomReverb
  readonly echo: Echo
  /** Frames each return keeps running after its last send: 0 when it is idle and empty. */
  private roomLeft = 0
  private echoLeft = 0
  /** A cut in progress: its returns fall from `cutGain` at `cutFrom` to silence at `cutEnd`. */
  private cutFrom = 0
  private cutGain = 1
  private cutEnd: number | undefined
  /** After a cut emptied the effects: the frame the sends start coming back in from silence. */
  private sendsFrom: number | undefined
  private readonly cutFrames: number

  constructor(sampleRate: number) {
    this.room = new RoomReverb(sampleRate)
    this.echo = new Echo(sampleRate, LIVE_DELAY_TIME_SECONDS, LIVE_DELAY_FEEDBACK)
    this.cutFrames = Math.ceil(VOICE_RETIRE_SECONDS * sampleRate)
  }

  /** Whether the room or the echo still runs: something was sent, and its tail has not yet died away. */
  get active() { return this.roomLeft > 0 || this.echoLeft > 0 }

  /** Set the echo's time and feedback; a tail already ringing follows the new feedback. */
  setEcho(time: number, feedback: number) {
    if (this.echo.set(time, feedback) && this.echoLeft) this.echoLeft = this.echo.tailFrames
  }

  /** Fade both returns out from `frame`, then empty them (see the class comment). */
  cut(frame: number) {
    this.cutGain = this.returnGain(frame)
    this.cutFrom = frame
    this.cutEnd = frame + this.cutFrames
    // What is sent until the cut's end is emptied with the rest; the sends come back in after it.
    this.sendsFrom = undefined
  }

  /**
   * Run the room and the echo over one render: `room` and `delay` hold the
   * voices' sends for its `length` frames, starting at `firstFrame`; their
   * returns are added to `output`.
   */
  process(output: Float32Array[], room: Float32Array[], delay: Float32Array[], firstFrame: number, length: number) {
    if (this.cutEnd !== undefined && this.cutEnd <= firstFrame) this.empty()
    let offset = 0
    while (offset < length) {
      const frame = firstFrame + offset
      // A cut that ends inside this render empties the effects on its last frame: render up to it, then on.
      const cutEnd = this.cutEnd
      const span = cutEnd !== undefined && cutEnd < firstFrame + length ? cutEnd - frame : length - offset
      this.span(output, room, delay, offset, span, frame)
      offset += span
      if (firstFrame + offset === cutEnd) this.empty()
    }
  }

  private span(output: Float32Array[], room: Float32Array[], delay: Float32Array[], offset: number, length: number, frame: number) {
    const from = this.sendsFrom
    // Counted from the span's end, so a tail never stops short of its last send's.
    if (admit(room, offset, length, frame, from, this.cutFrames)) this.roomLeft = this.room.tailFrames + length
    if (admit(delay, offset, length, frame, from, this.cutFrames)) this.echoLeft = this.echo.tailFrames + length
    if (from !== undefined && frame + length >= from + this.cutFrames) this.sendsFrom = undefined
    if (!this.active) return
    const gain = this.returnGain(frame)
    const step = (this.returnGain(frame + length) - gain) / length
    if (this.roomLeft) {
      this.room.process(room, output, offset, length, gain, step)
      this.roomLeft = Math.max(0, this.roomLeft - length)
      // The tail is 120 dB down: let it go, and stop running.
      if (!this.roomLeft) this.room.clear()
    }
    if (this.echoLeft) {
      this.echo.process(delay, output, offset, length, gain, step)
      this.echoLeft = Math.max(0, this.echoLeft - length)
      if (!this.echoLeft) this.echo.clear()
    }
  }

  /** The returns' level at `frame`: 1, or on a cut's ramp to silence. */
  private returnGain(frame: number) {
    if (this.cutEnd === undefined) return 1
    return this.cutGain * Math.min(1, Math.max(0, (this.cutEnd - frame) / (this.cutEnd - this.cutFrom)))
  }

  /** An idle return is already empty (it was cleared when its tail died away). */
  private empty() {
    if (this.roomLeft) this.room.clear()
    if (this.echoLeft) this.echo.clear()
    this.roomLeft = this.echoLeft = 0
    this.sendsFrom = this.cutEnd
    this.cutEnd = undefined
  }
}

/**
 * Take one stereo send in over [offset, offset + length), which starts at
 * `frame`: a sample that is not a number becomes silence, and from `fadeFrom`
 * the send comes back in from silence over `fadeFrames`. Whether any sound is
 * left in it.
 */
function admit(bus: Float32Array[], offset: number, length: number, frame: number, fadeFrom: number | undefined, fadeFrames: number) {
  let sound = false
  for (const channel of bus) for (let i = offset; i < offset + length; i++) {
    const value = channel[i]
    if (value === 0) continue
    // NaN and ±Infinity: the only values for which this is not 0.
    if (value - value !== 0) { channel[i] = 0; continue }
    if (fadeFrom !== undefined) channel[i] = value * Math.min(1, Math.max(0, (frame + i - offset - fadeFrom) / fadeFrames))
    if (channel[i] !== 0) sound = true
  }
  return sound
}
