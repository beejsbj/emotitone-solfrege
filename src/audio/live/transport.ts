/**
 * The pattern transport on the audio thread (BJS-485; design in
 * docs/research/worklet-engine.md §2).
 *
 * One bar grid owned by the render clock. Members are flat event tables built
 * on the main thread from note data, so the audio thread never parses and
 * never waits on the main thread. A change takes effect at the next render
 * quantum or at an exact future bar.
 *
 * Note onsets are collected a short lookahead ahead of rendering and
 * announced at once, so visual edges reach the main thread before the note is
 * heard even on outputs with almost no latency. A later change that removes
 * an announced onset cancels it; an onset that survives a change keeps its
 * serial, so nothing is announced twice.
 */
import type { LiveShaping } from '../liveShaping'
import { barAtFrame, bpmAtFrame, frameAtBar, framesPerBar, type TempoAnchor } from './tempoMap'
import { TransportEventKind, TransportEventWriter, type TransportEventBatch } from './transportEvents'

/**
 * One member's notes as columns, sorted by `begin`. Positions are bars at
 * rate 1 from the start of the member's period; expression times are bars
 * after the note's onset, so curves stretch with tempo and rate.
 */
export interface TransportMemberTable {
  /** The member (phrase) id. */
  id: string
  /** Unique per built table; the main thread resolves note identity from it. */
  generation: number
  instrumentId: string
  /** Authored loop length in bars, not padded to whole bars. */
  lengthBars: number
  /** The member's own Shape filter and sends. */
  shaping: LiveShaping
  begin: Float64Array
  /** Audible gate in bars at rate 1 (recorded clip applied). */
  gate: Float64Array
  pitch: Float32Array
  velocity: Float32Array
  attack: Float32Array
  decay: Float32Array
  sustain: Float32Array
  release: Float32Array
  /** Per note: first point and point count in the pitch curve columns. */
  pitchStart: Uint32Array
  pitchCount: Uint32Array
  pitchTime: Float32Array
  pitchCents: Float32Array
  gainStart: Uint32Array
  gainCount: Uint32Array
  gainTime: Float32Array
  gainValue: Float32Array
}

export interface TransportMemberSpec {
  table: TransportMemberTable
  offsetBars: number
  /** 0.5, 1 or 2 in the Looper; any positive rate is accepted. */
  rate: number
  muted: boolean
}

export type TransportBoundary = 'immediate' | { bar: number }

export type TransportChange =
  | { type: 'join'; member: TransportMemberSpec }
  | { type: 'leave'; memberId: string }
  | { type: 'update'; memberId: string; patch: Partial<Pick<TransportMemberSpec, 'muted' | 'offsetBars' | 'rate'>> }
  | { type: 'solo'; memberId: string | null }
  | { type: 'tempo'; bpm: number }

export type TransportCommand =
  | { type: 'transport-start'; requestId: number; run: number; bpm: number }
  | { type: 'transport-stop'; requestId: number }
  | { type: 'transport-change'; requestId: number; change: TransportChange; boundary: TransportBoundary }
  | { type: 'transport-recycle'; buffer: ArrayBuffer }

export interface TransportReceipt {
  type: 'transport-applied'
  requestId: number
  arrivalFrame: number
  appliedFrame: number
  /** Null when the transport was not running (staged before Start, or Stop). */
  appliedBar: number | null
  /** The requested bar had already passed when the command arrived. */
  late: boolean
}

export type TransportResponse =
  | TransportReceipt
  | { type: 'transport-anchors'; run: number; anchors: TempoAnchor[]; provisional: boolean }
  | TransportEventBatch

export const TRANSPORT_LOOKAHEAD_SECONDS = .05
const MAX_BPM = 1000

export interface TransportMember {
  id: string
  table: TransportMemberTable
  offsetBars: number
  rate: number
  muted: boolean
}

/** A collected onset, or a silence at an exact frame. Recycled, never discarded. */
export interface TransportOnset {
  kind: 'note' | 'silence'
  serial: number
  member: TransportMember | null
  noteIndex: number
  loop: number
  /** First render frame of the onset: the exact frame, rounded up. */
  frame: number
  exactFrame: number
  bar: number
  gateFrames: number
  /** Frames per table bar at the onset's tempo and rate: expression time base. */
  framesPerTableBar: number
}

interface Pending { requestId: number; bar: number; arrivalFrame: number; change: TransportChange }

/** What the transport asks of the render core. */
export interface TransportHost {
  /** Fade the sounding voices of one member (or all, for null) from `frame`. */
  silence(memberId: string | null, frame: number): void
}

const validChange = (change: TransportChange) => {
  switch (change.type) {
    case 'join': {
      const { table, offsetBars, rate } = change.member
      return Number.isFinite(offsetBars) && Number.isFinite(rate) && rate > 0
        && Number.isFinite(table.lengthBars) && table.lengthBars > 0
    }
    case 'update': {
      const { offsetBars, rate } = change.patch
      return (offsetBars === undefined || Number.isFinite(offsetBars))
        && (rate === undefined || (Number.isFinite(rate) && rate > 0))
    }
    case 'tempo': return Number.isFinite(change.bpm) && change.bpm >= 1 && change.bpm <= MAX_BPM
    default: return true
  }
}

export class AudioTransport {
  private anchors: TempoAnchor[] = []
  private members = new Map<string, TransportMember>()
  private soloId: string | null = null
  private pending: Pending[] = []
  private running = false
  private run = 0
  /** Collected, announced onsets in frame order. */
  private queue: TransportOnset[] = []
  /** Announced onsets withdrawn by a change; re-collected identically or cancelled. */
  private retracted: TransportOnset[] = []
  private spare: TransportOnset[] = []
  private collectedUntil = 0
  private serial = 0
  /** Frames of lookahead in which onsets are collected and announced. */
  readonly lookahead: number
  private readonly post = (batch: TransportEventBatch) => this.send(batch)

  constructor(private sampleRate: number, private send: (response: TransportResponse) => void,
    readonly events: TransportEventWriter, private host: TransportHost) {
    this.lookahead = Math.round(TRANSPORT_LOOKAHEAD_SECONDS * sampleRate)
  }

  get isRunning() { return this.running }
  get memberCount() { return this.members.size }
  get tempoAnchors(): readonly TempoAnchor[] { return this.anchors }

  barAt(frame: number) { return barAtFrame(this.anchors, frame, this.sampleRate) }

  /** The next queued onset or silence due at or before `frame`, removed from the queue. */
  takeDue(frame: number): TransportOnset | undefined {
    const next = this.queue[0]
    if (!next || next.frame > frame) return undefined
    return this.queue.shift()
  }

  /** First frame at which the queue needs the render loop's attention. */
  get nextFrame(): number { return this.queue[0]?.frame ?? Infinity }

  /** Return a processed onset to the pool. */
  recycle(onset: TransportOnset) {
    onset.member = null
    this.spare.push(onset)
  }

  /** Every announced onset that has not started, for an overflow snapshot. */
  forEachAnnounced(visit: (onset: TransportOnset) => void) {
    for (const onset of this.queue) if (onset.kind === 'note') visit(onset)
    for (const onset of this.retracted) visit(onset)
  }

  private write(kind: TransportEventKind, onset: TransportOnset) {
    this.events.write(kind, onset.serial, onset.member!.table.generation, onset.noteIndex,
      onset.frame, onset.bar, onset.gateFrames, this.post)
  }

  private receipt(requestId: number, arrivalFrame: number, appliedFrame: number, appliedBar: number | null, late: boolean) {
    this.send({ type: 'transport-applied', requestId, arrivalFrame, appliedFrame, appliedBar, late })
  }

  private publishAnchors(provisional = false) {
    let anchors = this.anchors.map(anchor => ({ ...anchor }))
    if (provisional) {
      // Requested future tempos are known now. Publish the piecewise map before
      // it bites, so the UI never extrapolates past a change and steps back.
      for (const pending of this.pending) if (pending.change.type === 'tempo') {
        const frame = frameAtBar(anchors, pending.bar, this.sampleRate)
        anchors = [...anchors.filter(anchor => anchor.bar < pending.bar), { frame, bar: pending.bar, bpm: pending.change.bpm }]
      }
    }
    this.send({ type: 'transport-anchors', run: this.run, anchors, provisional })
  }

  /** Commands arrive between render quanta; `frame` is the next frame to render. */
  command(command: TransportCommand, frame: number) {
    switch (command.type) {
      case 'transport-recycle': this.events.recycle(command.buffer); return
      case 'transport-start': {
        if (!Number.isFinite(command.bpm) || command.bpm < 1 || command.bpm > MAX_BPM) return
        if (this.running) this.halt(frame, false)
        this.anchors = [{ frame, bar: 0, bpm: command.bpm }]
        this.run = command.run
        this.running = true
        this.collectedUntil = frame
        this.publishAnchors()
        this.receipt(command.requestId, frame, frame, 0, false)
        this.collectTo(frame + this.lookahead)
        return
      }
      case 'transport-stop':
        this.halt(frame, true)
        this.receipt(command.requestId, frame, frame, null, false)
        return
      case 'transport-change': {
        const { change, boundary, requestId } = command
        if (!validChange(change)) return
        if (!this.running) {
          // Before Start, membership is staged for bar 0.
          this.apply(change, frame, (memberId, at) => this.host.silence(memberId, at))
          this.receipt(requestId, frame, frame, null, false)
          return
        }
        const arrivalBar = this.barAt(frame)
        const requested = boundary === 'immediate' ? arrivalBar : boundary.bar
        // A bar already passed is never honoured retroactively: apply now and say so.
        const late = boundary !== 'immediate' && requested < arrivalBar - 1e-9
        if (requested <= arrivalBar + 1e-9) {
          this.applyNow(change, frame)
          this.receipt(requestId, frame, frame, arrivalBar, late)
          return
        }
        let index = this.pending.findIndex(entry => entry.bar > requested)
        if (index < 0) index = this.pending.length
        this.pending.splice(index, 0, { requestId, bar: requested, arrivalFrame: frame, change })
        // An onset already collected at or after the boundary belongs to the
        // new membership: withdraw it until the change applies.
        const boundaryFrame = frameAtBar(this.anchors, requested, this.sampleRate)
        if (boundaryFrame < this.collectedUntil) {
          this.retractFrom(boundaryFrame)
          this.collectedUntil = boundaryFrame
        }
        if (change.type === 'tempo') this.publishAnchors(true)
        return
      }
    }
  }

  /** Stop: cancel announced onsets, fade every member's voices, forget membership. */
  private halt(frame: number, clearMembers: boolean) {
    for (const onset of this.queue) if (onset.kind === 'note') this.write(TransportEventKind.Cancel, onset)
    for (const onset of this.retracted) this.write(TransportEventKind.Cancel, onset)
    for (const onset of this.queue) this.recycle(onset)
    for (const onset of this.retracted) this.recycle(onset)
    this.queue.length = 0
    this.retracted.length = 0
    this.host.silence(null, frame)
    this.pending = []
    this.soloId = null
    this.running = false
    if (clearMembers) this.members.clear()
  }

  private applyNow(change: TransportChange, frame: number) {
    // Any immediate change can alter what sounds from `frame` on. Withdraw the
    // lookahead, apply, and collect again; survivors keep their serials.
    this.retractFrom(frame)
    this.collectedUntil = frame
    this.apply(change, frame, (memberId, at) => this.host.silence(memberId, at))
    if (change.type === 'tempo') this.publishAnchors()
    this.collectTo(frame + this.lookahead)
  }

  private apply(change: TransportChange, frame: number, silence: (memberId: string, frame: number) => void) {
    switch (change.type) {
      case 'join': {
        const { table, offsetBars, rate, muted } = change.member
        // Replacing a member lets its sounding notes finish their gates.
        this.members.set(table.id, { id: table.id, table, offsetBars, rate, muted })
        return
      }
      case 'leave': this.members.delete(change.memberId); return
      case 'update': {
        const member = this.members.get(change.memberId)
        if (!member) return
        const { muted, offsetBars, rate } = change.patch
        if (offsetBars !== undefined) member.offsetBars = offsetBars
        if (rate !== undefined) member.rate = rate
        if (muted !== undefined) {
          if (muted && !member.muted) silence(member.id, frame)
          member.muted = muted
        }
        return
      }
      case 'solo': {
        this.soloId = change.memberId !== null && this.members.has(change.memberId) ? change.memberId : null
        if (this.soloId !== null) for (const id of this.members.keys()) if (id !== this.soloId) silence(id, frame)
        return
      }
      case 'tempo': {
        if (!this.running) {
          if (this.anchors.length) this.anchors = [{ ...this.anchors[0], bpm: change.bpm }]
          return
        }
        const bar = this.barAt(frame)
        this.anchors = [...this.anchors.filter(anchor => anchor.frame < frame), { frame, bar, bpm: change.bpm }]
        return
      }
    }
  }

  /**
   * Apply bar-boundary changes inside [firstFrame, endFrame) and keep the
   * lookahead full. Called once per render quantum before rendering it.
   */
  beginQuantum(firstFrame: number, endFrame: number) {
    if (!this.running) return
    while (this.pending.length) {
      const next = this.pending[0]
      const boundaryFrame = frameAtBar(this.anchors, next.bar, this.sampleRate)
      if (boundaryFrame >= endFrame) break
      this.pending.shift()
      const at = Math.max(firstFrame, boundaryFrame)
      // Collection stopped at this boundary, so everything before it is queued.
      this.apply(next.change, at, (memberId, silenceAt) => this.enqueueSilence(memberId, silenceAt))
      this.receipt(next.requestId, next.arrivalFrame, at, next.bar, false)
      if (next.change.type === 'tempo') this.publishAnchors(this.pending.some(entry => entry.change.type === 'tempo'))
      this.collectedUntil = Math.max(this.collectedUntil, at)
    }
    this.collectTo(endFrame + this.lookahead)
  }

  private take(): TransportOnset {
    return this.spare.pop() ?? { kind: 'note', serial: 0, member: null, noteIndex: 0, loop: 0, frame: 0,
      exactFrame: 0, bar: 0, gateFrames: 0, framesPerTableBar: 0 }
  }

  /** Frame order; at one frame a silence comes first, so a note exactly on a
   * boundary belongs to the new state. */
  private insert(onset: TransportOnset) {
    const before = (queued: TransportOnset) => queued.exactFrame < onset.exactFrame
      || (queued.exactFrame === onset.exactFrame && (queued.kind === 'silence' || onset.kind === 'note'))
    let low = 0
    let high = this.queue.length
    while (low < high) {
      const middle = (low + high) >> 1
      if (before(this.queue[middle])) low = middle + 1
      else high = middle
    }
    this.queue.splice(low, 0, onset)
  }

  private enqueueSilence(memberId: string, frame: number) {
    const onset = this.take()
    onset.kind = 'silence'
    onset.member = this.members.get(memberId) ?? null
    onset.serial = 0
    onset.exactFrame = frame
    onset.frame = Math.ceil(frame - 1e-6)
    this.insert(onset)
  }

  private retractFrom(frame: number) {
    for (let index = this.queue.length - 1; index >= 0; index--) {
      const onset = this.queue[index]
      if (onset.kind !== 'note' || onset.exactFrame < frame) continue
      this.queue.splice(index, 1)
      this.retracted.push(onset)
    }
  }

  private audible(member: TransportMember) {
    return !member.muted && (this.soloId === null || this.soloId === member.id)
  }

  private collectTo(target: number) {
    const boundary = this.pending.length ? frameAtBar(this.anchors, this.pending[0].bar, this.sampleRate) : Infinity
    const to = Math.min(target, boundary)
    if (to > this.collectedUntil) {
      for (const member of this.members.values()) if (this.audible(member)) this.collectMember(member, this.collectedUntil, to)
      this.collectedUntil = to
    }
    // Withdrawn onsets whose time has been collected again without them are gone.
    for (let index = this.retracted.length - 1; index >= 0; index--) {
      const onset = this.retracted[index]
      if (onset.exactFrame >= this.collectedUntil) continue
      this.retracted.splice(index, 1)
      this.write(TransportEventKind.Cancel, onset)
      this.recycle(onset)
    }
  }

  private collectMember(member: TransportMember, from: number, to: number) {
    const { table, offsetBars, rate } = member
    const count = table.begin.length
    if (!count) return
    const b0 = this.barAt(from)
    const b1 = this.barAt(to)
    const period = table.lengthBars / rate
    const firstLoop = Math.floor((b0 - offsetBars) / period) - 1
    const lastLoop = Math.floor((b1 - offsetBars) / period)
    for (let loop = firstLoop; loop <= lastLoop; loop++) {
      const loopStart = offsetBars + loop * period
      // First note at or after b0 in this pass (begin is sorted).
      let low = 0
      let high = count
      const fromBegin = (b0 - loopStart) * rate - 1e-9
      while (low < high) {
        const middle = (low + high) >> 1
        if (table.begin[middle] < fromBegin) low = middle + 1
        else high = middle
      }
      for (let index = low; index < count; index++) {
        const bar = loopStart + table.begin[index] / rate
        const exactFrame = frameAtBar(this.anchors, bar, this.sampleRate)
        if (exactFrame < from) continue
        if (exactFrame >= to) break
        this.collectOnset(member, index, loop, bar, exactFrame)
      }
    }
  }

  private collectOnset(member: TransportMember, noteIndex: number, loop: number, bar: number, exactFrame: number) {
    const frame = Math.ceil(exactFrame - 1e-6)
    const { table, rate } = member
    // A survivor of a change keeps its announced serial.
    for (let index = 0; index < this.retracted.length; index++) {
      const old = this.retracted[index]
      if (old.member === member && old.noteIndex === noteIndex && old.loop === loop && old.frame === frame) {
        this.retracted.splice(index, 1)
        this.insert(old)
        return
      }
    }
    const onset = this.take()
    onset.kind = 'note'
    onset.serial = ++this.serial
    onset.member = member
    onset.noteIndex = noteIndex
    onset.loop = loop
    onset.frame = frame
    onset.exactFrame = exactFrame
    onset.bar = bar
    // A tempo change during the note does not rescale its gate (design §Risks).
    onset.gateFrames = Math.max(1, Math.round(frameAtBar(this.anchors, bar + table.gate[noteIndex] / rate, this.sampleRate) - exactFrame))
    onset.framesPerTableBar = framesPerBar(bpmAtFrame(this.anchors, exactFrame), this.sampleRate) / rate
    this.insert(onset)
    this.write(TransportEventKind.Attack, onset)
  }
}
