/**
 * The Looper's Stage seam: what the Stage reads from a running loop.
 *
 * The Looper part (`useLooperRenderer`) draws only from this read-only view.
 * The transport implements it; the Stage never reaches into the transport's
 * store, scheduler or clock. Production runs `NULL_LOOPER_STAGE_SOURCE` until
 * a transport supplies a real one through `UnifiedVisualEffects`.
 *
 * Units: every time is in loop milliseconds at the Looper's own `bpm`, the
 * tempo the members were laid down at. A live tempo change is the transport's
 * business: it shows up only as `positionMs()` advancing faster or slower.
 *
 * The Stage reads the source once per animation frame, so reads must be
 * cheap and must not allocate when nothing changed.
 */

export interface LooperStageNote {
  /** Pitch as it sounds now, e.g. "C4" or "F#3": already bent to the Looper's key and mode. */
  readonly note: string;
  /** Onset in loop ms, within [0, the member's length). */
  readonly pressTime: number;
  /** Length in loop ms. */
  readonly duration: number;
}

export interface LooperStageMember {
  /** Stable while the member plays; the Stage keys nothing else on it. */
  readonly id: string;
  /** Length in whole bars; the member cycles on the shared bar grid. */
  readonly bars: number;
  /** False when muted, or while another member is soloed. Silent members stay as faint light. */
  readonly audible: boolean;
  /** The member's notes, offset already applied. */
  readonly notes: readonly LooperStageNote[];
}

export interface LooperStageSource {
  /**
   * Playing members, oldest first (the oldest sits nearest the centre).
   * Return the same array instance until a member joins, leaves, mutes or
   * changes; the Stage rebuilds its field only when the instance changes.
   */
  readonly members: readonly LooperStageMember[];
  /** The tempo note times are expressed at. One bar is 240000 / bpm ms. */
  readonly bpm: number;
  /** Whether the loop is turning. Stopped, the Stage fades the light out. */
  readonly running: boolean;
  /** Transport position in loop ms: unwrapped, monotonic while running, frozen while stopped. */
  positionMs(): number;
  /**
   * Keys down right now, as growing notes placed in the turn (the longest
   * member): onset where the press landed, duration so far. May reuse one array.
   */
  heldNotes(): readonly LooperStageNote[];
  /**
   * The open take's released notes that have not joined yet, placed in the
   * turn. Same instance until they change, like `members`.
   */
  pendingNotes(): readonly LooperStageNote[];
}

const NO_MEMBERS: readonly LooperStageMember[] = Object.freeze([]);
const NO_NOTES: readonly LooperStageNote[] = Object.freeze([]);

/** No Looper: the Stage runs as it always has, and the part paints nothing. */
export const NULL_LOOPER_STAGE_SOURCE: LooperStageSource = Object.freeze({
  members: NO_MEMBERS,
  bpm: 120,
  running: false,
  positionMs: () => 0,
  heldNotes: () => NO_NOTES,
  pendingNotes: () => NO_NOTES,
});

/** One 4/4 bar in ms at `bpm`. */
export function looperBarMs(bpm: number): number {
  return 240_000 / Math.max(1, bpm);
}

/** One turn of the Looper: its longest member, in loop ms. 0 when nothing plays. */
export function looperTurnMs(source: Pick<LooperStageSource, "members" | "bpm">): number {
  let bars = 0;
  for (const member of source.members) if (member.bars > bars) bars = member.bars;
  return bars * looperBarMs(source.bpm);
}

/** 0..1 through a cycle of `periodMs` at `positionMs`. */
export function looperPhase(positionMs: number, periodMs: number): number {
  if (!(periodMs > 0)) return 0;
  return (((positionMs % periodMs) + periodMs) % periodMs) / periodMs;
}
