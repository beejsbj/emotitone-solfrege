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

/** Knob ranges of the Shape tab; persisted Shapes are clamped to these. */
export const SHAPE_KNOB_RANGES = {
  cutoff: { min: 200, max: 12000 },
  resonance: { min: 0, max: 12 },
  attack: { min: 0.001, max: 0.5 },
  release: { min: 0.01, max: 2.5 },
  room: { min: 0, max: 1 },
  delay: { min: 0, max: 1 },
} as const satisfies Record<keyof Shape, { min: number; max: number }>;

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

/**
 * Validate an untrusted (e.g. persisted) Shape: finite knob values clamped to
 * their ranges, envelope stages null or finite. Returns null when malformed.
 */
export function sanitizeShape(value: unknown): Shape | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const knob = (key: keyof Shape) => {
    const input = raw[key];
    if (typeof input !== "number" || !Number.isFinite(input)) return undefined;
    const { min, max } = SHAPE_KNOB_RANGES[key];
    return Math.min(max, Math.max(min, input));
  };
  const stage = (key: "attack" | "release") => (raw[key] === null ? null : knob(key));
  const shape = {
    cutoff: knob("cutoff"),
    resonance: knob("resonance"),
    room: knob("room"),
    delay: knob("delay"),
    attack: stage("attack"),
    release: stage("release"),
  };
  if (Object.values(shape).some((entry) => entry === undefined)) return null;
  return canonicalShape(shape as Shape);
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
