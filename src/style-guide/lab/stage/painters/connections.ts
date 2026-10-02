import type { HarmonicGeometryScene, PreparedBlobFrame } from "@/types/canvas";
import { hull, publishConnections, scenePairs, spanningTree, tracePolygon, type Point } from "./shared";
import type { ConnectionsPainter, LabFrame } from "./types";

/*
 * Connection helpers and Slur Arcs: the Merge/Web relationships alone. Each
 * direction publishes the path it drew, so lettering lands on it.
 */

type Pair = [PreparedBlobFrame, PreparedBlobFrame];

const visibleOf = (bodies: readonly PreparedBlobFrame[]) => bodies.filter((body) => body.opacity > 0.01);

export function pairsFor(bodies: readonly PreparedBlobFrame[], scene: HarmonicGeometryScene | null, mode: "merge" | "web"): Pair[] {
  const visible = visibleOf(bodies);
  if (mode === "web") return scenePairs(scene, visible);
  return spanningTree(visible.map((body) => ({ x: body.blob.x, y: body.blob.y })))
    .map(([a, b]) => [visible[a], visible[b]] as Pair);
}

/** Semitones between two bodies, from their sounding frequencies. */
const semitones = (a: PreparedBlobFrame, b: PreparedBlobFrame) =>
  Math.abs(Math.round(12 * Math.log2(b.blob.frequency / a.blob.frequency)));


/** The edge-to-edge segment between two bodies. */
function span(a: PreparedBlobFrame, b: PreparedBlobFrame) {
  const dx = b.blob.x - a.blob.x;
  const dy = b.blob.y - a.blob.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return {
    from: { x: a.blob.x + ux * a.scaledRadius, y: a.blob.y + uy * a.scaledRadius },
    to: { x: b.blob.x - ux * b.scaledRadius, y: b.blob.y - uy * b.scaledRadius },
    ux, uy, nx: -uy, ny: ux,
    length: Math.max(0, length - a.scaledRadius - b.scaledRadius),
  };
}

/** The tapered-crescent outline of an engraved slur from `from` to `to`, bowing by `height`. */
function slurPoints(from: Point, to: Point, nx: number, ny: number, height: number, thick: number): { outer: Point[]; inner: Point[] } {
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const bow = Math.sin(t * Math.PI);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    outer.push({ x: x + nx * height * bow, y: y + ny * height * bow });
    inner.push({ x: x + nx * (height - thick) * bow, y: y + ny * (height - thick) * bow });
  }
  return { outer, inner };
}

/**
 * Connections · Slur Arcs. Relationships are engraved slurs, notation's mark
 * for notes that belong together: tapered Ivory crescents, taller for wider
 * intervals, bowing away from the chord. Web slurs every analyzed pair. Merge
 * runs one scalloped phrase of slurs around the chord's outside, so the notes
 * read as one enclosed body.
 */
export function createSlurConnections(): ConnectionsPainter {
  return {
    paint(frame: LabFrame, bodies, scene, mode) {
      const { ctx, tokens } = frame;
      const visible = visibleOf(bodies);
      let pairs: Pair[];
      if (mode === "merge" && visible.length > 2) {
        const corners = hull(visible.map((body) => ({ x: body.blob.x, y: body.blob.y })));
        const at = (p: Point) => visible.find((body) => body.blob.x === p.x && body.blob.y === p.y)!;
        pairs = corners.map((p, i) => [at(p), at(corners[(i + 1) % corners.length])] as Pair);
      } else {
        pairs = pairsFor(bodies, scene, mode);
      }
      const centre = visible.length
        ? { x: visible.reduce((sum, b) => sum + b.blob.x, 0) / visible.length, y: visible.reduce((sum, b) => sum + b.blob.y, 0) / visible.length }
        : { x: frame.composition.centerX, y: frame.composition.centerY };
      const thick = mode === "merge" ? 5 : 3.5;
      const paths = pairs.map(([a, b]) => {
        const s = span(a, b);
        const mid = { x: (s.from.x + s.to.x) / 2, y: (s.from.y + s.to.y) / 2 };
        // Bow away from the chord's centre, so slurs sit outside it.
        const away = (mid.x - centre.x) * s.nx + (mid.y - centre.y) * s.ny >= 0 ? 1 : -1;
        const height = (10 + semitones(a, b) * 3.2) * away;
        return { a, b, ...slurPoints(s.from, s.to, s.nx, s.ny, height, thick * away) };
      });
      publishConnections(scene, pairs, mode);
      // Lettering follows the arc the slur actually draws.
      scene?.renderedConnections?.forEach((connection, i) => { if (paths[i]) connection.points = paths[i].outer; });
      paths.forEach(({ a, b, outer, inner }) => {
        ctx.save();
        ctx.globalAlpha = Math.min(a.opacity, b.opacity) * 0.92;
        ctx.fillStyle = tokens.ivory;
        tracePolygon(ctx, [...outer, ...inner.reverse()]);
        ctx.fill();
        ctx.restore();
      });
    },
    clear() {},
  };
}
