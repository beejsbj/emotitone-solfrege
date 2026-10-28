/**
 * The reel swipe (BJS-572): a sideways drag across the pattern reel moves to
 * the neighbouring reel. It is a page turn, not a throw off an edge:
 *
 *  - the reel follows the finger the whole way, in either direction;
 *  - it turns once the drag has covered a quarter of the reel's width, or on
 *    a quick sideways throw of at least 24px (0.5 px/ms over the last 100ms);
 *  - it decides its axis with the reel's own vertical drag through one
 *    function, `swipeAxis` (past 6px, the larger axis wins; a tie waits for
 *    the next move), so the two never both take one touch;
 *  - it never starts within 20px of either side of the viewport, where iOS
 *    Safari's edge swipe goes back a page;
 *  - it never reaches for the screen's edge: the Looper Dial's flick (left
 *    edge, removes) and the Edge Notice's sweep (right edge, dismisses) are
 *    throws off the glass from their own surfaces above the deck, and the
 *    reel swipe only ever starts on the reel strip.
 *
 * Pure: positions and times in, an answer out. The caller owns the pointer.
 */
export const REEL_SWIPE_SLOP_PX = 6;
export const REEL_SWIPE_TURN_RATIO = .25;
export const REEL_SWIPE_THROW_PX = 24;
export const REEL_SWIPE_SPEED_PX_PER_MS = .5;
export const REEL_SWIPE_WINDOW_MS = 100;
const SIDEWAYS_RATIO = 1.5;
/** Past the last reel the strip gives a little, then stops. */
const END_RESISTANCE = .25;

/** Touches that start this close to either side of the viewport belong to the browser's edge swipe. */
export const REEL_SWIPE_EDGE_PX = 20;

export type ReelSwipeAxis = "pending" | "sideways" | "vertical";

/**
 * Which way a touch is going, from how far it has moved: undecided until one
 * axis is past the slop, then the larger axis, and a tie undecided. The reel
 * switch and the reel's own vertical drag both decide by this, on the same
 * moves, so one touch can never be both a reel turn and a reel scroll.
 */
export function swipeAxis(dx: number, dy: number): ReelSwipeAxis {
  const x = Math.abs(dx);
  const y = Math.abs(dy);
  if (Math.max(x, y) <= REEL_SWIPE_SLOP_PX || x === y) return "pending";
  return x > y ? "sideways" : "vertical";
}

/** The touch starts within the viewport's edge band (Safari's back swipe). */
export function startsAtViewportEdge(x: number, viewportWidth: number): boolean {
  return x < REEL_SWIPE_EDGE_PX || x > viewportWidth - REEL_SWIPE_EDGE_PX;
}

export interface ReelSwipe {
  /** Which way the touch is going; decided once, past the slop. */
  axis(x: number, y: number): ReelSwipeAxis;
  sample(x: number, t: number): void;
  /** How far the reel follows the finger: resisted where there is no reel to go to. */
  follow(x: number, can: { previous: boolean; next: boolean }): number;
  /** Where the release lands: -1 the previous reel, 1 the next, 0 back where it was. */
  release(x: number, y: number, t: number, width: number): -1 | 0 | 1;
}

export function trackReelSwipe(start: { x: number; y: number; t: number }): ReelSwipe {
  let decided: ReelSwipeAxis = "pending";
  const samples = [{ x: start.x, t: start.t }];

  return {
    axis(x, y) {
      if (decided === "pending") decided = swipeAxis(x - start.x, y - start.y);
      return decided;
    },
    sample(x, t) {
      samples.push({ x, t });
      while (samples.length > 2 && t - samples[1].t > REEL_SWIPE_WINDOW_MS) samples.shift();
    },
    follow(x, can) {
      const dx = x - start.x;
      // A leftward drag reaches for the next reel, a rightward one the previous.
      const open = dx < 0 ? can.next : can.previous;
      return open ? dx : dx * END_RESISTANCE;
    },
    release(x, y, t, width) {
      if (decided !== "sideways") return 0;
      const dx = x - start.x;
      const travel = Math.abs(dx);
      if (travel < Math.abs(y - start.y) * SIDEWAYS_RATIO) return 0;
      const from = samples.find((sample) => t - sample.t <= REEL_SWIPE_WINDOW_MS) ?? samples[samples.length - 1];
      const speed = Math.abs(x - from.x) / Math.max(1, t - from.t);
      const thrown = travel >= REEL_SWIPE_THROW_PX && speed >= REEL_SWIPE_SPEED_PX_PER_MS
        && Math.sign(x - from.x) === Math.sign(dx);
      if (travel < width * REEL_SWIPE_TURN_RATIO && !thrown) return 0;
      return dx < 0 ? 1 : -1;
    },
  };
}
