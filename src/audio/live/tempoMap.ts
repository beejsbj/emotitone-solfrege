/**
 * The transport's clock: a piecewise tempo map anchored to audio frames.
 *
 * Shared by the worklet (which owns it) and the main thread (which reads the
 * published anchors for UIBeat and lookahead). Pure, allocation-free lookups.
 * One bar is four beats.
 */
export interface TempoAnchor {
  /** Audio frame (AudioContext sample index) at which this tempo begins. */
  frame: number
  /** Transport bar at `frame`. */
  bar: number
  bpm: number
}

export const BEATS_PER_BAR = 4

/** Frames per bar at `bpm`. */
export function framesPerBar(bpm: number, sampleRate: number): number {
  return BEATS_PER_BAR * 60 * sampleRate / bpm
}

/**
 * The anchor in force at `value` (upper bound: an anchor exactly at `value`
 * wins). Before the first anchor the first tempo extrapolates backwards, so
 * positions before Start are negative bars.
 */
function anchorIndex(anchors: readonly TempoAnchor[], value: number, key: 'frame' | 'bar'): number {
  let low = 0
  let high = anchors.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (anchors[middle][key] <= value) low = middle + 1
    else high = middle
  }
  return Math.max(0, low - 1)
}

export function barAtFrame(anchors: readonly TempoAnchor[], frame: number, sampleRate: number): number {
  const anchor = anchors[anchorIndex(anchors, frame, 'frame')]
  return anchor.bar + (frame - anchor.frame) / framesPerBar(anchor.bpm, sampleRate)
}

export function frameAtBar(anchors: readonly TempoAnchor[], bar: number, sampleRate: number): number {
  const anchor = anchors[anchorIndex(anchors, bar, 'bar')]
  return anchor.frame + (bar - anchor.bar) * framesPerBar(anchor.bpm, sampleRate)
}

export function bpmAtFrame(anchors: readonly TempoAnchor[], frame: number): number {
  return anchors[anchorIndex(anchors, frame, 'frame')].bpm
}

/**
 * Where a looping member's note sounds on the shared bar grid (#140's grid):
 * `offset + loop × (length / rate) + begin / rate`.
 */
export function placedBar(offsetBars: number, lengthBars: number, rate: number, loop: number, beginBars: number): number {
  return offsetBars + loop * (lengthBars / rate) + beginBars / rate
}
