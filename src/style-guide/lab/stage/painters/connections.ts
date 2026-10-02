import type { HarmonicGeometryScene, PreparedBlobFrame } from "@/types/canvas";
import { publishConnections, scenePairs, spanningTree, tracePolygon, type Point } from "./shared";
import type { ConnectionsPainter, LabFrame } from "./types";

/*
 * Connection directions: the Merge/Web relationships alone. Merge draws one
 * connected body (the spanning tree between bodies); Web draws every analyzed
 * pair. Each publishes the path it drew, so lettering lands on it.
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

/** How rough an interval sounds, 0 (unison/octave) to 1 (minor second, tritone). */
const ROUGHNESS = [0, 1, 0.7, 0.35, 0.3, 0.15, 1, 0.1, 0.3, 0.35, 0.7, 0.9];
const roughness = (a: PreparedBlobFrame, b: PreparedBlobFrame) => ROUGHNESS[semitones(a, b) % 12];

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

/**
 * Connections A · Two-tone Bands. Colour meets at a slanted cut, never a
 * blend. Merge pastes the bodies into one piece with wide bands; Web tapes
 * each pair with a thin strip.
 */
export function createBandConnections(): ConnectionsPainter {
  return {
    paint(frame: LabFrame, bodies, scene, mode) {
      const { ctx } = frame;
      const pairs = pairsFor(bodies, scene, mode);
      publishConnections(scene, pairs, mode);
      pairs.forEach(([a, b]) => {
        const width = mode === "merge" ? Math.min(a.scaledRadius, b.scaledRadius) * 1.7 : 4;
        const dx = b.blob.x - a.blob.x;
        const dy = b.blob.y - a.blob.y;
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length;
        const uy = dy / length;
        const nx = -uy * (width / 2);
        const ny = ux * (width / 2);
        const slant = width * 0.6;
        const mid = { x: a.blob.x + dx / 2, y: a.blob.y + dy / 2 };
        const seamA = { x: mid.x + nx + ux * slant, y: mid.y + ny + uy * slant };
        const seamB = { x: mid.x - nx - ux * slant, y: mid.y - ny - uy * slant };
        ctx.save();
        ctx.globalAlpha = Math.min(a.opacity, b.opacity);
        ctx.fillStyle = a.primaryColor;
        tracePolygon(ctx, [{ x: a.blob.x + nx, y: a.blob.y + ny }, seamA, seamB, { x: a.blob.x - nx, y: a.blob.y - ny }]);
        ctx.fill();
        ctx.fillStyle = b.primaryColor;
        tracePolygon(ctx, [seamA, { x: b.blob.x + nx, y: b.blob.y + ny }, { x: b.blob.x - nx, y: b.blob.y - ny }, seamB]);
        ctx.fill();
        ctx.restore();
      });
    },
    clear() {},
  };
}

/**
 * Connections D · String Ties. Each relationship is a taut string between two
 * bodies that vibrates as roughly as the interval sounds: a fifth barely
 * trembles, a tritone or a second shivers fast and wide.
 */
export function createTieConnections(): ConnectionsPainter {
  return {
    paint(frame: LabFrame, bodies, scene, mode) {
      const { ctx, elapsed, reducedMotion } = frame;
      const pairs = pairsFor(bodies, scene, mode);
      publishConnections(scene, pairs, mode);
      pairs.forEach(([a, b]) => {
        const s = span(a, b);
        const rough = roughness(a, b);
        const amplitude = reducedMotion ? 0 : 1 + rough * 7;
        const speed = 4 + rough * 22;
        const steps = 32;
        ctx.save();
        ctx.lineWidth = mode === "merge" ? 3.5 : 2.4;
        ctx.globalAlpha = Math.min(a.opacity, b.opacity);
        [a, b].forEach((owner, half) => {
          ctx.strokeStyle = owner.primaryColor;
          ctx.beginPath();
          for (let i = half * (steps / 2); i <= (half + 1) * (steps / 2); i++) {
            const t = i / steps;
            const bow = Math.sin(t * Math.PI) * Math.sin(elapsed * speed + t * Math.PI * 2) * amplitude;
            const x = s.from.x + (s.to.x - s.from.x) * t + s.nx * bow;
            const y = s.from.y + (s.to.y - s.from.y) * t + s.ny * bow;
            if (i === half * (steps / 2)) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        ctx.restore();
      });
    },
    clear() {},
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
 * Connections E · Slur Arcs. Relationships are engraved slurs, the curved
 * mark that ties notes in notation: tapered Ivory crescents bowing away from
 * the Stage centre, taller for wider intervals. They pair with the Stave.
 */
export function createSlurConnections(): ConnectionsPainter {
  return {
    paint(frame: LabFrame, bodies, scene, mode) {
      const { ctx, tokens, composition } = frame;
      const pairs = pairsFor(bodies, scene, mode);
      const paths = pairs.map(([a, b]) => {
        const s = span(a, b);
        const mid = { x: (s.from.x + s.to.x) / 2, y: (s.from.y + s.to.y) / 2 };
        // Bow away from the Stage centre, so slurs sit outside the chord.
        const away = (mid.x - composition.centerX) * s.nx + (mid.y - composition.centerY) * s.ny >= 0 ? 1 : -1;
        const height = (10 + semitones(a, b) * 3.2) * away;
        return { a, b, s, ...slurPoints(s.from, s.to, s.nx, s.ny, height, (mode === "merge" ? 5 : 3.5) * away) };
      });
      publishConnections(scene, pairs, mode);
      if (scene?.renderedConnections) {
        // Lettering follows the arc the slur actually draws.
        scene.renderedConnections.forEach((connection, i) => { if (paths[i]) connection.points = paths[i].outer; });
      }
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

/**
 * Connections F · Stitches. The bodies are paper sewn together: a running
 * stitch of Ivory thread along each relationship with one cross-stitch per
 * semitone of the interval. Merge sews with doubled thread.
 */
export function createStitchConnections(): ConnectionsPainter {
  return {
    paint(frame: LabFrame, bodies, scene, mode) {
      const { ctx, tokens } = frame;
      const pairs = pairsFor(bodies, scene, mode);
      publishConnections(scene, pairs, mode);
      pairs.forEach(([a, b]) => {
        const s = span(a, b);
        if (s.length < 8) return;
        ctx.save();
        ctx.globalAlpha = Math.min(a.opacity, b.opacity);
        ctx.strokeStyle = tokens.ivory2;
        ctx.lineCap = "round";
        ctx.lineWidth = mode === "merge" ? 2.2 : 1.4;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(s.from.x, s.from.y);
        ctx.lineTo(s.to.x, s.to.y);
        ctx.stroke();
        ctx.setLineDash([]);
        const crosses = Math.max(1, semitones(a, b) % 12 || 12);
        for (let i = 1; i <= crosses; i++) {
          const t = i / (crosses + 1);
          const x = s.from.x + (s.to.x - s.from.x) * t;
          const y = s.from.y + (s.to.y - s.from.y) * t;
          const half = 4.5;
          ctx.strokeStyle = i <= crosses / 2 ? a.primaryColor : b.primaryColor;
          ctx.beginPath();
          ctx.moveTo(x + (s.nx - s.ux) * half, y + (s.ny - s.uy) * half);
          ctx.lineTo(x - (s.nx - s.ux) * half, y - (s.ny - s.uy) * half);
          ctx.moveTo(x + (s.nx + s.ux) * half, y + (s.ny + s.uy) * half);
          ctx.lineTo(x - (s.nx + s.ux) * half, y - (s.ny + s.uy) * half);
          ctx.stroke();
        }
        ctx.restore();
      });
    },
    clear() {},
  };
}
