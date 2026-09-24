/**
 * Shape — the Shape tab's sound context as a comparable value.
 * Rounding matches the precision StrudelNotation prints, so two shapes that
 * generate identical code are the same pattern context.
 */

import type { Shape } from "@/types/instrument";
import { getLiveArticulation, type LiveArticulation } from "./liveArticulation";

export const NEUTRAL_SHAPE: Readonly<Shape> = Object.freeze({
  cutoff: 12000,
  resonance: 0,
  room: 0,
  delay: 0,
  attack: null,
  release: null,
});

const round = (value: number, digits: number) => Number(value.toFixed(digits));

/** Round every knob to the precision generated code carries. */
export function canonicalShape(shape: Shape): Shape {
  return {
    cutoff: Math.round(shape.cutoff),
    resonance: round(shape.resonance, 1),
    room: round(shape.room, 3),
    delay: round(shape.delay, 3),
    attack: shape.attack === null ? null : round(shape.attack, 3),
    release: shape.release === null ? null : round(shape.release, 2),
  };
}

/** Absent shape (legacy notes and patterns) is the neutral shape. */
export function isSameShape(left?: Shape | null, right?: Shape | null): boolean {
  const a = canonicalShape(left ?? NEUTRAL_SHAPE);
  const b = canonicalShape(right ?? NEUTRAL_SHAPE);
  return a.cutoff === b.cutoff
    && a.resonance === b.resonance
    && a.room === b.room
    && a.delay === b.delay
    && a.attack === b.attack
    && a.release === b.release;
}

/** The envelope a live note sounds with: Shape stages over natural ones. */
export function resolveLiveEnvelope(
  instrument: string,
  shape?: Pick<Shape, "attack" | "release"> | null,
): LiveArticulation {
  const natural = getLiveArticulation(instrument);
  return {
    attack: shape?.attack ?? natural.attack,
    decay: natural.decay,
    sustain: natural.sustain,
    release: shape?.release ?? natural.release,
  };
}
