import { MARK_NAMES, type MarkName } from "@/components/primatives/marks";
import { createHarmonicVibration, createStringDamping } from "@/utils/visualEffects";
import type { VibratingStringConfig } from "@/types/visual";
import type { HarmonicGeometryScene, PreparedBlobFrame } from "@/types/canvas";
import { scopeScale } from "../labHilbert";
import type { LabFrame } from "./types";

export interface Point { x: number; y: number }

export const hash = (text: string) =>
  Array.from(text).reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);

/** Deterministic 0–1 sequence for stable per-body geometry. */
export function seeded(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    return state / 0x100000000;
  };
}

export const randomMark = (): MarkName =>
  MARK_NAMES[Math.floor(Math.random() * MARK_NAMES.length)] ?? "disk";

/** The production scope polyline: Hilbert pair scaled by the accepted sigmoid. */
export function scopePoints(frame: LabFrame, step = 1): Point[] {
  const { wave, composition } = frame;
  if (!wave) return [];
  const points: Point[] = [];
  const radius = composition.hilbertRadius;
  for (let i = 0; i < wave.x.length; i += step) {
    points.push({
      x: composition.centerX + scopeScale(wave.x[i]) * radius,
      y: composition.centerY + scopeScale(wave.y[i]) * radius,
    });
  }
  return points;
}

/** Production String physics: the same harmonic vibration and end damping. */
export function stringOffset(string: VibratingStringConfig, elapsed: number, y: number, height: number) {
  return createHarmonicVibration(elapsed, string.frequency, string.amplitude, y, string.phase)
    * createStringDamping(y / Math.max(1, height));
}

/** Sound level, 0 in silence; the Stage's accepted envelope, not a new analysis. */
export const soundLevel = (frame: LabFrame) => (frame.audio.hasSignal ? frame.audio.envelope : 0);

/** Convex hull, counter-clockwise (Andrew's monotone chain). */
export function hull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Minimum spanning tree edges by index (Prim), for one connected Merge body. */
export function spanningTree(points: Point[]): [number, number][] {
  if (points.length < 2) return [];
  const inTree = new Set([0]);
  const edges: [number, number][] = [];
  while (inTree.size < points.length) {
    let best: [number, number] | null = null;
    let bestDistance = Infinity;
    inTree.forEach((i) => {
      points.forEach((p, j) => {
        if (inTree.has(j)) return;
        const d = Math.hypot(p.x - points[i].x, p.y - points[i].y);
        if (d < bestDistance) { bestDistance = d; best = [i, j]; }
      });
    });
    if (!best) break;
    edges.push(best);
    inTree.add((best as [number, number])[1]);
  }
  return edges;
}

export function tracePolygon(ctx: CanvasRenderingContext2D, points: Point[], dx = 0, dy = 0) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy)));
  ctx.closePath();
}

/** A stop-motion clock: the same value for every frame inside one step. */
export const stepped = (seconds: number, fps: number) => Math.floor(seconds * fps) / fps;

/** Exact pitch of a body from its sounding frequency, for tuned Music Color. */
export function bodyPitch(body: PreparedBlobFrame) {
  const midi = Math.round(69 + 12 * Math.log2(Math.max(1, body.blob.frequency) / 440));
  return { pitchClassIndex: ((midi % 12) + 12) % 12, octave: Math.floor(midi / 12) - 1 };
}

/**
 * Publish the direction's relationship paths the way the production field
 * renderer does, so the unchanged lettering authority can place intervals on
 * them and Merge can centre its chord.
 */
export function publishConnections(
  scene: HarmonicGeometryScene | null,
  pairs: [PreparedBlobFrame, PreparedBlobFrame][],
  mode: "merge" | "web",
) {
  if (!scene) return;
  scene.connectionMode = mode;
  scene.renderedConnections = pairs.map(([a, b]) => {
    const dx = b.blob.x - a.blob.x;
    const dy = b.blob.y - a.blob.y;
    const length = Math.hypot(dx, dy) || 1;
    const start = a.scaledRadius / length;
    const end = 1 - b.scaledRadius / length;
    const points = Array.from({ length: 12 }, (_, i) => {
      const t = start + (end - start) * (i / 11);
      return { x: a.blob.x + dx * t, y: a.blob.y + dy * t };
    });
    return {
      material: mode,
      notePair: [a.key, b.key] as [string, string],
      points,
      colors: [a.primaryColor, b.primaryColor] as [string, string],
      opacity: Math.min(a.opacity, b.opacity),
    };
  });
  const visible = [...new Map(pairs.flat().map((body) => [body.key, body])).values()];
  scene.mergeCenter = mode === "merge" && visible.length
    ? {
        x: visible.reduce((sum, body) => sum + body.blob.x, 0) / visible.length,
        y: visible.reduce((sum, body) => sum + body.blob.y, 0) / visible.length,
      }
    : undefined;
}

/** Analyzed interval pairs, resolved to the bodies on screen. */
export function scenePairs(scene: HarmonicGeometryScene | null, bodies: readonly PreparedBlobFrame[]) {
  if (!scene) return [];
  const byKey = new Map(bodies.map((body) => [body.key, body]));
  return [...scene.boundaryEdges, ...scene.interiorEdges]
    .map((edge) => [byKey.get(edge.fromNoteId), byKey.get(edge.toNoteId)])
    .filter((pair): pair is [PreparedBlobFrame, PreparedBlobFrame] => Boolean(pair[0] && pair[1]));
}
