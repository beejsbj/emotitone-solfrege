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
 *   release goes in before then and is faded and emptied with the rest; new
 *   sound after it starts a fresh tail.
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
    if (carries(room, offset, length)) this.roomLeft = this.room.tailFrames
    if (carries(delay, offset, length)) this.echoLeft = this.echo.tailFrames
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
    this.cutEnd = undefined
  }
}

/** Whether a stereo bus holds any sound in [offset, offset + length). */
function carries(bus: Float32Array[], offset: number, length: number) {
  for (const channel of bus) for (let i = offset; i < offset + length; i++) if (channel[i] !== 0) return true
  return false
}
