/**
 * The pattern transport on the audio thread (BJS-485, BJS-491; design in
 * docs/research/worklet-engine.md §2).
 *
 * One bar grid owned by the render clock. Members are flat event tables built
 * on the main thread from note data, so the audio thread never parses and
 * never waits on the main thread. A change takes effect at the next render
 * quantum or at an exact future bar; a batch of changes takes effect together.
 *
 * Note onsets are collected a short lookahead ahead of rendering and
 * announced at once, so visual edges reach the main thread before the note is
 * heard even on outputs with almost no latency. Collection runs on past a
 * pending bar change against a preview of the state that change will make, so
 * notes on and after the bar are announced a full lookahead ahead too. A later
 * change that removes an announced onset cancels it; an onset that survives a
 * change keeps its serial, so nothing is announced twice.
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
  /** Loop length in bars at rate 1: the authored length, or whole bars when the caller rounds. */
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

/** One change; a batch applies several at the same frame (a key or mode bend retunes every member at once). */
export type TransportSingleChange =
  | { type: 'join'; member: TransportMemberSpec }
  /** Swap a member's table (a bend or pin), keeping its offset, rate and mute; ignored for a non-member. */
  | { type: 'replace'; table: TransportMemberTable }
  | { type: 'leave'; memberId: string }
  | { type: 'update'; memberId: string; patch: Partial<Pick<TransportMemberSpec, 'muted' | 'offsetBars' | 'rate'>> }
  | { type: 'solo'; memberId: string | null }
  | { type: 'tempo'; bpm: number }

export type TransportChange = TransportSingleChange | { type: 'batch'; changes: TransportSingleChange[] }

export type TransportCommand =
  /** `bar` (default 0) is the bar at the start frame: a recovered run continues where it stopped. */
  | { type: 'transport-start'; requestId: number; run: number; bpm: number; bar?: number }
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
  /**
   * It never applied: Stop (or a restart) dropped it before its bar, a later
   * leave withdrew the join it carried, or it was refused.
   */
  cancelled?: true
  /** The change was invalid (a bad tempo, offset, rate or length, or a bad batch part). */
  refused?: true
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

/** Membership, solo and clock: the real state, or a preview of it after pending changes. */
interface TransportState {
  members: Map<string, TransportMember>
  soloId: string | null
  anchors: TempoAnchor[]
}

/** What the transport asks of the render core. */
export interface TransportHost {
  /** Fade the sounding voices of one member (or all, for null) from `frame`. */
  silence(memberId: string | null, frame: number): void
}

const validSingle = (change: TransportSingleChange) => {
  switch (change.type) {
    case 'join': {
      const { table, offsetBars, rate } = change.member
      return Number.isFinite(offsetBars) && Number.isFinite(rate) && rate > 0
        && Number.isFinite(table.lengthBars) && table.lengthBars > 0
    }
    case 'replace': return Number.isFinite(change.table.lengthBars) && change.table.lengthBars > 0
    case 'update': {
      const { offsetBars, rate } = change.patch
      return (offsetBars === undefined || Number.isFinite(offsetBars))
        && (rate === undefined || (Number.isFinite(rate) && rate > 0))
    }
    case 'tempo': return Number.isFinite(change.bpm) && change.bpm >= 1 && change.bpm <= MAX_BPM
    case 'leave': case 'solo': return true
    default: return false
  }
}
// A batch is all or nothing: one invalid part refuses the whole batch.
const validChange = (change: TransportChange) => change.type === 'batch'
  ? Array.isArray(change.changes) && change.changes.length > 0 && change.changes.every(validSingle)
  : validSingle(change)

/** The last tempo a change sets, if any. */
const tempoOf = (change: TransportChange): number | undefined => {
  if (change.type === 'tempo') return change.bpm
  if (change.type !== 'batch') return undefined
  let bpm: number | undefined
  for (const part of change.changes) if (part.type === 'tempo') bpm = part.bpm
  return bpm
}

const noSilence = () => {}

export class AudioTransport {
  private state: TransportState = { members: new Map(), soloId: null, anchors: [] }
  private pending: Pending[] = []
  /** The preview in force at `collectedUntil` and the pending changes it includes; reset by any change. */
  private frontier: { state: TransportState; applied: number } | undefined
  private running = false
  private run = 0
  /** Collected, announced onsets in frame order. */
  private queue: TransportOnset[] = []
  /** Announced onsets withdrawn by a change; re-collected identically or cancelled. */
  private retracted: TransportOnset[] = []
  private spare: TransportOnset[] = []
  private collectedUntil = 0
  private serial = 0
  /** Increments whenever the tempo map changes, so the core can re-place grid-locked pulses. */
  private anchorVersion = 0
  /** Frames of lookahead in which onsets are collected and announced. */
  readonly lookahead: number
  private readonly post = (batch: TransportEventBatch) => this.send(batch)

  constructor(private sampleRate: number, private send: (response: TransportResponse) => void,
    readonly events: TransportEventWriter, private host: TransportHost) {
    this.lookahead = Math.round(TRANSPORT_LOOKAHEAD_SECONDS * sampleRate)
  }

  get isRunning() { return this.running }
  get memberCount() { return this.state.members.size }
  get tempoAnchors(): readonly TempoAnchor[] { return this.state.anchors }
  get tempoVersion() { return this.anchorVersion }

  barAt(frame: number) { return barAtFrame(this.state.anchors, frame, this.sampleRate) }
  frameAt(bar: number) { return frameAtBar(this.state.anchors, bar, this.sampleRate) }

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

  private receipt(requestId: number, arrivalFrame: number, appliedFrame: number, appliedBar: number | null, late: boolean,
    cancelled = false, refused = false) {
    this.send({ type: 'transport-applied', requestId, arrivalFrame, appliedFrame, appliedBar, late,
      ...(cancelled ? { cancelled: true as const } : {}), ...(refused ? { refused: true as const } : {}) })
  }

  private publishAnchors(provisional = false) {
    this.anchorVersion++
    let anchors = this.state.anchors.map(anchor => ({ ...anchor }))
    if (provisional) {
      // Requested future tempos are known now. Publish the piecewise map before
      // it bites, so the UI never extrapolates past a change and steps back.
      for (const pending of this.pending) {
        const bpm = tempoOf(pending.change)
        if (bpm === undefined) continue
        const frame = frameAtBar(anchors, pending.bar, this.sampleRate)
        anchors = [...anchors.filter(anchor => anchor.bar < pending.bar), { frame, bar: pending.bar, bpm }]
      }
    }
    this.send({ type: 'transport-anchors', run: this.run, anchors, provisional })
  }

  /** Commands arrive between render quanta; `frame` is the next frame to render. */
  command(command: TransportCommand, frame: number) {
    switch (command.type) {
      case 'transport-recycle': this.events.recycle(command.buffer); return
      case 'transport-start': {
        const bar = command.bar ?? 0
        if (!Number.isFinite(command.bpm) || command.bpm < 1 || command.bpm > MAX_BPM || !Number.isFinite(bar)) return
        if (this.running) this.halt(frame, false)
        this.state.anchors = [{ frame, bar, bpm: command.bpm }]
        this.frontier = undefined
        this.run = command.run
        this.running = true
        this.collectedUntil = frame
        this.publishAnchors()
        this.receipt(command.requestId, frame, frame, bar, false)
        this.collectTo(frame + this.lookahead)
        return
      }
      case 'transport-stop':
        this.halt(frame, true)
        this.receipt(command.requestId, frame, frame, null, false)
        return
      case 'transport-change': {
        const { change, boundary, requestId } = command
        // Every request is answered, an invalid one too, so no caller waits forever.
        if (!validChange(change) || (boundary !== 'immediate' && !Number.isFinite(boundary?.bar))) {
          this.receipt(requestId, frame, frame, null, false, true, true)
          return
        }
        if (!this.running) {
          // Before Start, membership is staged for the start bar.
          this.apply(this.state, change, frame, (memberId, at) => this.host.silence(memberId, at))
          this.receipt(requestId, frame, frame, null, false)
          return
        }
        const arrivalBar = this.barAt(frame)
        const requested = boundary === 'immediate' ? arrivalBar : boundary.bar
        // A bar already passed is never honoured retroactively: apply now and say so.
        const late = boundary !== 'immediate' && requested < arrivalBar - 1e-9
        if (requested <= arrivalBar + 1e-9) {
          this.applyNow(change, frame, requestId)
          this.receipt(requestId, frame, frame, arrivalBar, late)
          return
        }
        let index = this.pending.findIndex(entry => entry.bar > requested)
        if (index < 0) index = this.pending.length
        this.pending.splice(index, 0, { requestId, bar: requested, arrivalFrame: frame, change })
        this.frontier = undefined
        // An onset already collected at or after the boundary was collected
        // without this change: withdraw it and collect again with it.
        const boundaryFrame = this.boundaryFrame(requested)
        if (boundaryFrame < this.collectedUntil) {
          this.retractFrom(boundaryFrame)
          this.collectedUntil = Math.max(frame, boundaryFrame)
        }
        if (tempoOf(change) !== undefined) this.publishAnchors(true)
        this.collectTo(frame + this.lookahead)
        return
      }
    }
  }

  /** The frame of a future bar once every earlier pending tempo has applied. */
  private boundaryFrame(bar: number) {
    let anchors = this.state.anchors
    for (const pending of this.pending) {
      if (pending.bar >= bar) break
      const bpm = tempoOf(pending.change)
      if (bpm === undefined) continue
      anchors = [...anchors.filter(anchor => anchor.bar < pending.bar),
        { frame: frameAtBar(anchors, pending.bar, this.sampleRate), bar: pending.bar, bpm }]
    }
    return frameAtBar(anchors, bar, this.sampleRate)
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
    // Every request is answered: a caller awaiting a pending change's receipt must not hang.
    for (const pending of this.pending) this.receipt(pending.requestId, pending.arrivalFrame, frame, null, false, true)
    this.pending = []
    this.frontier = undefined
    this.state.soloId = null
    this.running = false
    if (clearMembers) this.state.members.clear()
  }

  private applyNow(change: TransportChange, frame: number, requestId: number) {
    // Any immediate change can alter what sounds from `frame` on. Withdraw the
    // lookahead, apply, and collect again; survivors keep their serials.
    this.retractFrom(frame)
    this.collectedUntil = frame
    this.frontier = undefined
    this.apply(this.state, change, frame, (memberId, at) => this.host.silence(memberId, at))
    this.foldIntoPendingJoins(change, requestId, frame)
    if (tempoOf(change) !== undefined) this.publishAnchors(this.pending.some(entry => tempoOf(entry.change) !== undefined))
    this.collectTo(frame + this.lookahead)
  }

  /**
   * A member whose join (or re-join) waits for its bar is already a member to
   * the caller. A change that names it, applied now, also reaches every join
   * of it submitted before that change: an update patches the join's
   * settings, a replace swaps its table, a leave or a newer join withdraws it
   * (its receipt says cancelled). So a mute, bend or pin tapped after "join at the next
   * bar" holds when the member arrives, and later submissions win.
   * Returns the earliest bar whose pending change was altered.
   */
  private foldIntoPendingJoins(change: TransportChange, requestId: number, frame: number): number {
    let earliest = Infinity
    for (const part of change.type === 'batch' ? change.changes : [change]) {
      const id = part.type === 'update' || part.type === 'leave' ? part.memberId
        : part.type === 'replace' ? part.table.id : part.type === 'join' ? part.member.table.id : undefined
      if (id === undefined) continue
      for (let index = this.pending.length - 1; index >= 0; index--) {
        const entry = this.pending[index]
        if (entry.requestId > requestId) continue
        const parts = entry.change.type === 'batch' ? entry.change.changes : [entry.change]
        if (!parts.some(own => own.type === 'join' && own.member.table.id === id)) continue
        const folded: TransportSingleChange[] = []
        for (const own of parts) {
          if (own.type !== 'join' || own.member.table.id !== id) folded.push(own)
          else if (part.type === 'update') folded.push({ type: 'join', member: { ...own.member, ...part.patch } })
          else if (part.type === 'replace') folded.push({ type: 'join', member: { ...own.member, table: part.table } })
          // A leave or a later join withdraws it: the later submission wins.
        }
        earliest = Math.min(earliest, entry.bar)
        if (!folded.length) {
          this.pending.splice(index, 1)
          this.receipt(entry.requestId, entry.arrivalFrame, frame, null, false, true)
        } else entry.change = folded.length === 1 && entry.change.type !== 'batch' ? folded[0] : { type: 'batch', changes: folded }
      }
    }
    if (earliest !== Infinity) this.frontier = undefined
    return earliest
  }

  private apply(state: TransportState, change: TransportChange, frame: number,
    silence: (memberId: string, frame: number) => void) {
    if (change.type === 'batch') {
      for (const part of change.changes) this.applySingle(state, part, frame, silence)
    } else this.applySingle(state, change, frame, silence)
  }

  private applySingle(state: TransportState, change: TransportSingleChange, frame: number,
    silence: (memberId: string, frame: number) => void) {
    switch (change.type) {
      case 'join': {
        const { table, offsetBars, rate, muted } = change.member
        const previous = state.members.get(table.id)
        // Replacing a member lets its sounding notes finish their gates; a
        // replacement that mutes it fades them, as an update would.
        if (previous && muted && !previous.muted) silence(table.id, frame)
        state.members.set(table.id, { id: table.id, table, offsetBars, rate, muted })
        return
      }
      case 'replace': {
        const member = state.members.get(change.table.id)
        // A new object: onsets queued before this frame still name the old table.
        if (member) state.members.set(member.id, { ...member, table: change.table })
        return
      }
      case 'leave':
        state.members.delete(change.memberId)
        if (state.soloId === change.memberId) state.soloId = null
        return
      case 'update': {
        const member = state.members.get(change.memberId)
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
        // A member not here yet (its join waits for its bar, or is still on its
        // way from a bank load) can be soloed: the others fade now and it
        // sounds alone when it arrives. Its leave clears the solo.
        state.soloId = change.memberId
        if (state.soloId !== null) for (const id of state.members.keys()) if (id !== state.soloId) silence(id, frame)
        return
      }
      case 'tempo': {
        if (!this.running) {
          if (state.anchors.length) state.anchors = [{ ...state.anchors[0], bpm: change.bpm }]
          return
        }
        const bar = barAtFrame(state.anchors, frame, this.sampleRate)
        state.anchors = [...state.anchors.filter(anchor => anchor.frame < frame), { frame, bar, bpm: change.bpm }]
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
      const boundaryFrame = this.frameAt(next.bar)
      if (boundaryFrame >= endFrame) break
      this.pending.shift()
      this.frontier = undefined
      const at = Math.max(firstFrame, boundaryFrame)
      // Onsets on and after the boundary were collected against the preview of
      // this change; onsets before it are already queued.
      this.apply(this.state, next.change, at, (memberId, silenceAt) => this.enqueueSilence(memberId, silenceAt))
      const folded = this.foldIntoPendingJoins(next.change, next.requestId, at)
      if (folded !== Infinity) {
        // A later join was collected with its old settings: collect it again.
        const foldedFrame = Math.max(at, this.boundaryFrame(folded))
        if (foldedFrame < this.collectedUntil) {
          this.retractFrom(foldedFrame)
          this.collectedUntil = foldedFrame
        }
      }
      this.receipt(next.requestId, next.arrivalFrame, at, next.bar, false)
      if (tempoOf(next.change) !== undefined) {
        this.publishAnchors(this.pending.some(entry => tempoOf(entry.change) !== undefined))
      }
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
    onset.member = this.state.members.get(memberId) ?? null
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

  private audible(state: TransportState, member: TransportMember) {
    return !member.muted && (state.soloId === null || state.soloId === member.id)
  }

  /** A preview copy: members are copied so a pending update never touches the real ones. */
  private copy(state: TransportState): TransportState {
    const members = new Map<string, TransportMember>()
    for (const [id, member] of state.members) members.set(id, { ...member })
    return { members, soloId: state.soloId, anchors: state.anchors.slice() }
  }

  private collectTo(target: number) {
    if (target > this.collectedUntil) {
      // Start from the state in force at the frontier: the real state, or a
      // preview that includes the pending changes whose bars lie behind it.
      let state = this.frontier?.state ?? this.state
      let applied = this.frontier?.applied ?? 0
      let from = this.collectedUntil
      for (;;) {
        while (applied < this.pending.length) {
          const bar = this.pending[applied].bar
          const boundary = frameAtBar(state.anchors, bar, this.sampleRate)
          if (boundary > from) break
          if (state === this.state) state = this.copy(state)
          while (applied < this.pending.length && this.pending[applied].bar === bar) {
            this.apply(state, this.pending[applied++].change, boundary, noSilence)
          }
        }
        const boundary = applied < this.pending.length
          ? frameAtBar(state.anchors, this.pending[applied].bar, this.sampleRate) : Infinity
        const to = Math.min(target, boundary)
        for (const member of state.members.values()) if (this.audible(state, member)) this.collectMember(state, member, from, to)
        from = to
        if (to >= target) break
      }
      this.collectedUntil = target
      this.frontier = state === this.state ? undefined : { state, applied }
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

  private collectMember(state: TransportState, member: TransportMember, from: number, to: number) {
    const { table, offsetBars, rate } = member
    const count = table.begin.length
    if (!count) return
    const b0 = barAtFrame(state.anchors, from, this.sampleRate)
    const b1 = barAtFrame(state.anchors, to, this.sampleRate)
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
        const exactFrame = frameAtBar(state.anchors, bar, this.sampleRate)
        if (exactFrame < from) continue
        if (exactFrame >= to) break
        this.collectOnset(state, member, index, loop, bar, exactFrame)
      }
    }
  }

  private collectOnset(state: TransportState, member: TransportMember, noteIndex: number, loop: number, bar: number,
    exactFrame: number) {
    const frame = Math.ceil(exactFrame - 1e-6)
    const { table, rate } = member
    // A tempo change during the note does not rescale its gate (design §Risks).
    const gateFrames = Math.max(1, Math.round(frameAtBar(state.anchors, bar + table.gate[noteIndex] / rate, this.sampleRate) - exactFrame))
    const framesPerTableBar = framesPerBar(bpmAtFrame(state.anchors, exactFrame), this.sampleRate) / rate
    // A survivor of a change keeps its announced serial. Identity is the
    // member, its table, the note, the pass and the frame: a preview's member
    // copy and the real member it becomes are the same note source. A change
    // of gate or stretch (a tempo or rate change after the onset was
    // announced) is a different note: the old one is cancelled and this one
    // announced, so sound and consumers get the new length.
    for (let index = 0; index < this.retracted.length; index++) {
      const old = this.retracted[index]
      if (old.member!.id !== member.id || old.member!.table !== table || old.noteIndex !== noteIndex
        || old.loop !== loop || old.frame !== frame) continue
      this.retracted.splice(index, 1)
      if (old.gateFrames === gateFrames && old.framesPerTableBar === framesPerTableBar) {
        old.member = member
        this.insert(old)
        return
      }
      // Withdraw the old announcement first, so no consumer holds both.
      this.write(TransportEventKind.Cancel, old)
      this.recycle(old)
      break
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
    onset.gateFrames = gateFrames
    onset.framesPerTableBar = framesPerTableBar
    this.insert(onset)
    this.write(TransportEventKind.Attack, onset)
  }
}
