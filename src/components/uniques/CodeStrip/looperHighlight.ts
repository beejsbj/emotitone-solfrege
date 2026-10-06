/**
 * The Code Strip follows one member of the Looper's stack (research §5).
 *
 * The scheduler holds every playing pattern, and the Looper's haps are built
 * from note data, so they carry identity (`phraseId`) but no source
 * locations. This adapter keeps only the desk member's haps, maps their shared
 * bars to the member's local time `(bar - offset) * rate`, and finds each
 * one's event in the desk's displayed source by its onset weight. The generated
 * source and the member are the same plan (top-level weights are bars at the
 * phrase's own tempo), so onsets agree within rounding.
 *
 * The result feeds the stock highlight effect, which the rich Code Strip
 * extension reads: note progress from the mapped spans, rest progress and the
 * played trail from the mapped time.
 */
import type { Text } from "@codemirror/state";
import { parseCodeStripEvents, type ParsedCodeStripEvent } from "./strudelExtension";

export interface LooperDeskFollow {
  phraseId: string;
  /** Where phrase time 0 sits on the scheduler's bar clock. */
  offsetBars: number;
  rate: number;
  /** The member's whole-bar period at rate 1. */
  lengthBars: number;
}

type Numeric = number | { valueOf(): number };
interface LooperHap {
  whole?: { begin: Numeric; end: Numeric } | null;
  context?: { phraseId?: unknown };
  value?: unknown;
}

/** A number the stock highlight can compare (`begin.lt`) and the extension can read. */
function time(value: number) {
  return { valueOf: () => value, lt: (other: Numeric) => value < Number(other) };
}

const ONSET_TOLERANCE = 1e-3;
let cache: { doc: Text; events: ParsedCodeStripEvent[]; total: number } | null = null;

function parse(doc: Text) {
  if (cache?.doc !== doc) {
    const events = parseCodeStripEvents(doc);
    cache = { doc, events, total: events[events.length - 1]?.endWeight ?? 0 };
  }
  return cache;
}

function eventAt(events: ParsedCodeStripEvent[], position: number) {
  let best: ParsedCodeStripEvent | undefined;
  for (const event of events) {
    if (event.kind === "rest") continue;
    if (position < event.startWeight - ONSET_TOLERANCE || position >= event.endWeight - ONSET_TOLERANCE) continue;
    if (!best || Math.abs(event.startWeight - position) < Math.abs(best.startWeight - position)) best = event;
  }
  return best;
}

export function mapLooperHighlight(doc: Text, haps: readonly LooperHap[], atTime: number, follow: LooperDeskFollow) {
  const { events, total } = parse(doc);
  const length = follow.lengthBars;
  if (!total || !(length > 0)) return { haps: [], atTime: 0 };
  const local = (atTime - follow.offsetBars) * follow.rate;
  const cycle = Math.floor(local / length);
  // Past the source's own end (a whole-bar member pads silence) the strip rests at its end.
  const position = Math.min(local - cycle * length, total * (1 - 1e-9));
  const presented = [];
  for (const hap of haps) {
    if (hap.context?.phraseId !== follow.phraseId || !hap.whole) continue;
    const begin = (Number(hap.whole.begin) - follow.offsetBars) * follow.rate;
    const end = (Number(hap.whole.end) - follow.offsetBars) * follow.rate;
    const hapCycle = Math.floor(begin / length + 1e-9);
    const onset = begin - hapCycle * length;
    const event = eventAt(events, onset);
    if (!event) continue;
    const presentedBegin = hapCycle * total + onset;
    presented.push({
      whole: { begin: time(presentedBegin), end: time(presentedBegin + end - begin), duration: time(end - begin) },
      context: { locations: [{ start: event.from, end: event.to }] },
      value: hap.value,
    });
  }
  return { haps: presented, atTime: cycle * total + position };
}
