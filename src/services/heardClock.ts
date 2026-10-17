/**
 * The presentation clock of what the listener hears (BJS-563).
 *
 * `performance.now()` keeps running while the AudioContext is suspended or
 * interrupted (an iOS call, a backgrounded page), but the worklet renders
 * nothing and the sound stops. A highlight timed on the wall clock would race
 * ahead of the sound and, on resume, be waiting for it. This clock stands
 * still while the context is not running and continues from the same instant
 * when it runs again, so everything scheduled on it keeps its place relative
 * to the sound.
 *
 * Times from the wall clock (a note's `audibleAt`) are converted with
 * `fromPerformance`; a note announced before the pause is still ahead of the
 * frozen clock, and one announced after the resume lands on its own heard time.
 * The audio the output pipeline still held when the context stopped is not
 * modelled: the freeze is at the state change, a few milliseconds late.
 */
export type HeardClockContext = Pick<AudioContext, "state" | "addEventListener" | "removeEventListener">;

export interface HeardClock {
  /** The heard time in milliseconds: the wall clock minus every pause so far. */
  now(): number;
  /** A wall-clock time (such as a note's `audibleAt`) on this clock. */
  fromPerformance(time: number): number;
  /** Follow `context`; the clock keeps one context at a time. */
  attach(context: HeardClockContext): void;
  dispose(): void;
}

export function createHeardClock(wallNow: () => number = () => performance.now()): HeardClock {
  let context: HeardClockContext | undefined;
  /** When the current pause began, on the wall clock. */
  let pausedAt: number | null = null;
  /** The wall time of every pause that has ended. */
  let paused = 0;

  // The state is also read whenever the clock is, so a missed event cannot
  // leave it running through a pause it can see.
  function sync() {
    if (!context) return;
    const running = context.state === "running";
    if (!running && pausedAt === null) pausedAt = wallNow();
    else if (running && pausedAt !== null) {
      paused += wallNow() - pausedAt;
      pausedAt = null;
    }
  }

  function detach() {
    context?.removeEventListener?.("statechange", sync);
    context = undefined;
  }

  return {
    now() {
      sync();
      return (pausedAt ?? wallNow()) - paused;
    },
    fromPerformance(time) {
      sync();
      return time - paused;
    },
    attach(next) {
      if (next === context) return;
      detach();
      // A context the clock did not see stop is taken as running from here.
      pausedAt = null;
      context = next;
      context.addEventListener?.("statechange", sync);
      sync();
    },
    dispose: detach,
  };
}
