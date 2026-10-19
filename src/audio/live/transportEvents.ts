/**
 * Transport note events, worklet to main thread, without per-event objects.
 *
 * The audio thread writes numeric records into a preallocated pool of
 * Float64Array batches and transfers each filled batch; the main thread
 * decodes it and transfers the buffer back for reuse. Public string ids are
 * created on the main thread from the numeric fields.
 *
 * Sizing: 64 batches of 72 records. While the main thread keeps up, a batch
 * is posted every render quantum that has events. Once eight batches are
 * unreturned (about 23 ms of a stalled main thread), the writer stops posting
 * part-filled batches and fills each one before taking the next, so a stall
 * can absorb 56 full batches plus the eight in flight: at least 4,032 edges.
 * That is the supported maximum over a 1,000 ms stall (about 2,000 notes a
 * second, far above what 64 voices can sustain). Beyond it the writer never
 * allocates or blocks: it marks overflow, drops records, and once a batch is
 * free again writes an authoritative snapshot of every active transport note
 * so the consumer can release the absent ones and add the present ones.
 */

export const TRANSPORT_EVENT_FIELDS = 7
export const TRANSPORT_BATCH_EVENTS = 72
export const TRANSPORT_BATCH_COUNT = 64
export const TRANSPORT_MAX_IN_FLIGHT = 8

export const TransportEventKind = {
  /** A note will sound at `frame` (announced up to the lookahead ahead). */
  Attack: 1,
  /** The note's gate ends (or a forced fade starts) at `frame`. */
  Release: 2,
  /** An announced note will not sound after all. */
  Cancel: 3,
  /** Overflow recovery: `serial` holds the number of Active records that follow. */
  SnapshotBegin: 4,
  /** One active note in a snapshot, with its onset frame. */
  Active: 5,
} as const
export type TransportEventKind = typeof TransportEventKind[keyof typeof TransportEventKind]

/**
 * Field order of one record: kind, serial, generation, note index, frame,
 * bar, length. Length is the release in seconds on release records and the
 * gate in frames on attack and active records.
 */

export interface TransportEventBatch {
  type: 'transport-events'
  buffer: ArrayBuffer
  count: number
}

const BATCH_BYTES = TRANSPORT_EVENT_FIELDS * TRANSPORT_BATCH_EVENTS * Float64Array.BYTES_PER_ELEMENT

/** Audio-thread side. Never allocates after construction except a view per recycled buffer. */
export class TransportEventWriter {
  private free: Float64Array[] = []
  private current: Float64Array | undefined
  private count = 0
  private inFlight = 0
  /** Set when a record had to be dropped; cleared once a snapshot is written. */
  overflowed = false

  constructor(batches = TRANSPORT_BATCH_COUNT) {
    for (let index = 0; index < batches; index++) this.free.push(new Float64Array(BATCH_BYTES / 8))
  }

  /** Records that fit without blocking: the current batch's room plus every free batch. */
  get capacity(): number {
    return (this.current ? TRANSPORT_BATCH_EVENTS - this.count : 0) + this.free.length * TRANSPORT_BATCH_EVENTS
  }

  get batchesInFlight(): number { return this.inFlight }

  write(kind: TransportEventKind, serial: number, generation: number, noteIndex: number,
    frame: number, bar: number, length: number, post: (batch: TransportEventBatch) => void): boolean {
    if (this.overflowed && kind !== TransportEventKind.SnapshotBegin && kind !== TransportEventKind.Active) return false
    if (this.current && this.count === TRANSPORT_BATCH_EVENTS) this.post(post)
    if (!this.current) {
      const next = this.free.pop()
      if (!next) { this.overflowed = true; return false }
      this.current = next
      this.count = 0
    }
    const base = this.count * TRANSPORT_EVENT_FIELDS
    const records = this.current
    records[base] = kind
    records[base + 1] = serial
    records[base + 2] = generation
    records[base + 3] = noteIndex
    records[base + 4] = frame
    records[base + 5] = bar
    records[base + 6] = length
    this.count++
    return true
  }

  /** End of a render quantum or command: hand the batch over unless the consumer is stalled. */
  flush(post: (batch: TransportEventBatch) => void) {
    if (!this.current || !this.count) return
    if (this.inFlight < TRANSPORT_MAX_IN_FLIGHT || this.count === TRANSPORT_BATCH_EVENTS) this.post(post)
  }

  /** The consumer returned a decoded batch. */
  recycle(buffer: ArrayBuffer) {
    if (buffer.byteLength !== BATCH_BYTES) return
    this.inFlight = Math.max(0, this.inFlight - 1)
    this.free.push(new Float64Array(buffer))
  }

  private post(post: (batch: TransportEventBatch) => void) {
    const records = this.current!
    const count = this.count
    this.current = undefined
    this.count = 0
    this.inFlight++
    post({ type: 'transport-events', buffer: records.buffer as ArrayBuffer, count })
  }
}

export interface DecodedTransportEvent {
  kind: TransportEventKind
  serial: number
  generation: number
  noteIndex: number
  frame: number
  bar: number
  length: number
}

/** Main-thread side: visit each record of a batch in order. */
export function readTransportEvents(batch: Pick<TransportEventBatch, 'buffer' | 'count'>,
  visit: (event: DecodedTransportEvent) => void) {
  const records = new Float64Array(batch.buffer)
  for (let index = 0; index < batch.count; index++) {
    const base = index * TRANSPORT_EVENT_FIELDS
    visit({
      kind: records[base] as TransportEventKind,
      serial: records[base + 1],
      generation: records[base + 2],
      noteIndex: records[base + 3],
      frame: records[base + 4],
      bar: records[base + 5],
      length: records[base + 6],
    })
  }
}
