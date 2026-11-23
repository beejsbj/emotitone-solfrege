/**
 * The flick: a fast, mostly sideways throw toward a screen edge, as far as the
 * room allows. The Looper Dial is thrown off the left edge (it removes); the
 * Heads-up is its mirror, swept off the right edge (it dismisses).
 *
 * "Far enough" is measured against the room the finger has: 48px, or all the
 * way to the glass's edge (within 4px of it), whichever comes first. A press
 * near the edge has little room, so the speed at the end and the sideways
 * split are what keep a tap or a slow drag out. Never a vertical swipe.
 *
 * Pure: positions and times in, an answer out. The caller owns the pointer.
 */
export type FlickEdge = "left" | "right";

export const FLICK_PX = 48;
export const FLICK_EDGE_PX = 4;
export const FLICK_SPEED_PX_PER_MS = 0.5;
export const FLICK_WINDOW_MS = 100;
/** Mostly sideways: the throw's sideways travel is at least this times its vertical. */
const FLICK_SIDEWAYS_RATIO = 1.5;

export interface FlickOptions {
  /** The least room a throw needs, however close to the edge it starts (past a tap's slop). */
  minRoomPx: number;
  /** The glass's width, for a throw to the right edge; the window's by default. */
  viewportWidth?: number;
}

export interface FlickTracker {
  /** Travel toward the edge since the press: positive toward it, negative away. */
  travel(x: number): number;
  /** Record a position, for the throw's speed at its end. */
  sample(x: number, t: number): void;
  /** Whether a pointer at (x, y) at time t has been thrown off the edge. */
  isFlick(x: number, y: number, t: number): boolean;
}

/** Follow one press, from where and when it went down, for a throw toward `edge`. */
export function trackFlick(
  edge: FlickEdge,
  start: { x: number; y: number; t: number },
  { minRoomPx, viewportWidth }: FlickOptions,
): FlickTracker {
  const toward = (dx: number) => (edge === "left" ? -dx : dx);
  const width = viewportWidth ?? (typeof window === "undefined" ? Infinity : window.innerWidth);
  const roomToEdge = edge === "left" ? start.x - FLICK_EDGE_PX : width - start.x - FLICK_EDGE_PX;
  const reach = Math.min(FLICK_PX, Math.max(minRoomPx, roomToEdge));
  const samples = [{ t: start.t, x: start.x }];

  return {
    travel: (x) => toward(x - start.x),
    sample(x, t) {
      samples.push({ t, x });
      while (samples.length > 2 && t - samples[1].t > FLICK_WINDOW_MS) samples.shift();
    },
    isFlick(x, y, t) {
      const travel = toward(x - start.x);
      if (travel < reach || travel < Math.abs(y - start.y) * FLICK_SIDEWAYS_RATIO) return false;
      const from = samples.find((sample) => t - sample.t <= FLICK_WINDOW_MS) ?? samples[samples.length - 1];
      const elapsed = Math.max(1, t - from.t);
      return toward(x - from.x) / elapsed >= FLICK_SPEED_PX_PER_MS;
    },
  };
}
