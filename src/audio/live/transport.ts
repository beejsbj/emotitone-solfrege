/**
 * SPIKE (BJS-484, not for merge): the Looper transport on the audio thread.
 *
 * One bar grid owned by the render clock. Members are plain event tables
 * (bars within one rate-1 period), so the audio thread never parses, never
 * waits on the main thread and never commits a lookahead window: a change
 * posted from the main thread takes effect at the next render quantum, or at
 * an exact future bar.
 */

export interface TransportNote {
  /** Onset in bars from the member's period start, at rate 1. */
  begin: number
  /** Gate in bars, at rate 1. */
  duration: number
  pitch: number
  instrumentId: string
  noteId: string
}

export interface TransportMemberSpec {
  id: string
  notes: TransportNote[]
  lengthBars: number
  offsetBars: number
  rate: number
  muted: boolean
  /** Output bus, so a lab can capture each member separately. */
  bus?: number
}

export type TransportBoundary = 'immediate' | { bar: number }

export type TransportChange =
  | { type: 'join'; member: TransportMemberSpec }
  | { type: 'leave'; memberId: string }
  | { type: 'update'; memberId: string; patch: Partial<Pick<TransportMemberSpec, 'muted' | 'offsetBars' | 'rate'>> }
  | { type: 'solo'; memberId: string | null }
  | { type: 'tempo'; bpm: number }

export type TransportCommand =
  | { type: 'transport-start'; requestId: number; bpm: number }
  | { type: 'transport-stop'; requestId: number }
  | { type: 'transport-change'; requestId: number; change: TransportChange; boundary: TransportBoundary }

export interface TransportAnchor { frame: number; bar: number; bpm: number }

export type TransportResponse =
  | { type: 'transport-applied'; requestId: number; arrivalFrame: number; arrivalBar: number | null;
      appliedFrame: number; appliedBar: number | null; late: boolean }
  | { type: 'transport-anchor'; anchors: TransportAnchor[] }

/** What the render core must do at an exact frame. */
export type TransportAction =
  | { kind: 'note'; frame: number; durationFrames: number; memberId: string; bus: number; bar: number
      note: TransportNote }
  | { kind: 'silence'; frame: number; memberId: string }

interface Member extends TransportMemberSpec { order: number[] }
interface Pending { requestId: number; bar: number; arrivalFrame: number; arrivalBar: number; change: TransportChange }

const EPSILON = 1e-9

export class AudioTransport {
  private anchors: TransportAnchor[] = []
  private members = new Map<string, Member>()
  private soloId: string | null = null
  private pending: Pending[] = []
  private running = false

  constructor(private sampleRate: number, private send: (response: TransportResponse) => void) {}

  get isRunning() { return this.running }
  get memberCount() { return this.members.size }

  barAt(frame: number): number {
    const anchor = this.anchorForFrame(frame)
    return anchor.bar + (frame - anchor.frame) * anchor.bpm / 240 / this.sampleRate
  }

  frameAt(bar: number): number {
    const anchor = this.anchorForBar(bar)
    return anchor.frame + (bar - anchor.bar) * 240 * this.sampleRate / anchor.bpm
  }

  private anchorForFrame(frame: number) {
    let found = this.anchors[0]
    for (const anchor of this.anchors) if (anchor.frame <= frame + EPSILON) found = anchor
    return found
  }

  private anchorForBar(bar: number) {
    let found = this.anchors[0]
    for (const anchor of this.anchors) if (anchor.bar <= bar + EPSILON) found = anchor
    return found
  }

  private publishAnchors(anchors = this.anchors) { this.send({ type: 'transport-anchor', anchors: anchors.map(a => ({ ...a })) }) }

  /** Commands arrive between render quanta; `frame` is the next frame to render. */
  command(command: TransportCommand, frame: number, silence: (memberId: string, frame: number) => void) {
    if (command.type === 'transport-start') {
      this.anchors = [{ frame, bar: 0, bpm: command.bpm }]
      this.running = true
      this.publishAnchors()
      this.send({ type: 'transport-applied', requestId: command.requestId, arrivalFrame: frame, arrivalBar: null,
        appliedFrame: frame, appliedBar: 0, late: false })
      return
    }
    if (command.type === 'transport-stop') {
      this.running = false
      this.pending = []
      for (const id of this.members.keys()) silence(id, frame)
      this.members.clear()
      this.soloId = null
      this.send({ type: 'transport-applied', requestId: command.requestId, arrivalFrame: frame, arrivalBar: null,
        appliedFrame: frame, appliedBar: null, late: false })
      return
    }
    const { change, boundary, requestId } = command
    if (!this.running) {
      // Before start, membership is simply staged for bar 0.
      this.apply(change, frame, silence)
      this.send({ type: 'transport-applied', requestId, arrivalFrame: frame, arrivalBar: null,
        appliedFrame: frame, appliedBar: null, late: false })
      return
    }
    const arrivalBar = this.barAt(frame)
    const requested = boundary === 'immediate' ? arrivalBar : boundary.bar
    // A bar already passed cannot be honoured retroactively; apply now and say so.
    const late = requested < arrivalBar - EPSILON
    const bar = Math.max(requested, arrivalBar)
    if (bar <= arrivalBar + EPSILON) {
      this.apply(change, frame, silence)
      if (change.type === 'tempo') this.publishAnchors()
      this.send({ type: 'transport-applied', requestId, arrivalFrame: frame, arrivalBar, appliedFrame: frame,
        appliedBar: arrivalBar, late })
      return
    }
    this.pending.push({ requestId, bar, arrivalFrame: frame, arrivalBar, change })
    this.pending.sort((a, b) => a.bar - b.bar)
    if (change.type === 'tempo') {
      // A future tempo is known now: publish the piecewise map before it bites,
      // so the UI never extrapolates past it and has to step backwards.
      this.publishAnchors(this.previewTempo(bar, change.bpm))
    }
  }

  private previewTempo(bar: number, bpm: number): TransportAnchor[] {
    return [...this.anchors.filter(a => a.bar < bar - EPSILON), { frame: this.frameAt(bar), bar, bpm }]
  }

  private apply(change: TransportChange, frame: number, silence: (memberId: string, frame: number) => void, atBar?: number) {
    switch (change.type) {
      case 'join': {
        const order = change.member.notes.map((_, index) => index)
          .sort((a, b) => change.member.notes[a].begin - change.member.notes[b].begin)
        this.members.set(change.member.id, { ...change.member, order })
        return
      }
      case 'leave': this.members.delete(change.memberId); return
      case 'update': {
        const member = this.members.get(change.memberId)
        if (!member) return
        Object.assign(member, change.patch)
        if (change.patch.muted) silence(member.id, frame)
        return
      }
      case 'solo': {
        this.soloId = change.memberId
        if (change.memberId !== null) for (const id of this.members.keys()) if (id !== change.memberId) silence(id, frame)
        return
      }
      case 'tempo': {
        const bar = atBar ?? (this.running ? this.barAt(frame) : 0)
        this.anchors = [...this.anchors.filter(a => a.frame < frame - EPSILON), { frame, bar, bpm: change.bpm }]
        return
      }
    }
  }

  private audible(member: Member) { return !member.muted && (this.soloId === null || this.soloId === member.id) }

  /**
   * Everything that starts in [firstFrame, endFrame): note onsets from the
   * effective membership and silences from mute/solo, at exact frames.
   * Pending changes inside the quantum split it, in bar order.
   */
  collect(firstFrame: number, endFrame: number, out: TransportAction[]) {
    if (!this.running) return
    let from = firstFrame
    while (from < endFrame) {
      const next = this.pending[0]
      const changeFrame = next ? this.frameAt(next.bar) : Infinity
      const to = Math.min(endFrame, Math.max(from, changeFrame))
      if (to > from) this.collectSpan(from, to, out)
      if (!next || changeFrame >= endFrame) break
      this.pending.shift()
      const exact = Math.max(from, changeFrame)
      const silences: TransportAction[] = []
      this.apply(next.change, exact, (memberId, at) => silences.push({ kind: 'silence', frame: at, memberId }), next.bar)
      out.push(...silences)
      this.send({ type: 'transport-applied', requestId: next.requestId, arrivalFrame: next.arrivalFrame,
        arrivalBar: next.arrivalBar, appliedFrame: exact, appliedBar: next.bar, late: false })
      if (next.change.type === 'tempo') this.publishAnchors()
      from = exact
    }
  }

  private collectSpan(from: number, to: number, out: TransportAction[]) {
    const b0 = this.barAt(from), b1 = this.barAt(to)
    for (const member of this.members.values()) {
      if (!this.audible(member) || !member.notes.length) continue
      const period = member.lengthBars / member.rate
      const firstLoop = Math.floor((b0 - member.offsetBars) / period) - 1
      const lastLoop = Math.floor((b1 - member.offsetBars) / period)
      for (let loop = firstLoop; loop <= lastLoop; loop++) {
        const loopStart = member.offsetBars + loop * period
        for (const index of member.order) {
          const note = member.notes[index]
          const bar = loopStart + note.begin / member.rate
          if (bar < b0 - EPSILON) continue
          if (bar >= b1 - EPSILON) break
          const frame = this.frameAt(bar)
          out.push({ kind: 'note', frame, bar, memberId: member.id, bus: member.bus ?? 0, note,
            durationFrames: this.frameAt(bar + note.duration / member.rate) - frame })
        }
      }
    }
  }
}
