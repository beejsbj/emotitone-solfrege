import type { HarmonicGeometryScene, PreparedBlobFrame } from "@/types/canvas";
import { publishConnections, scenePairs, spanningTree } from "./shared";
import type { GeometryDirectionPainter, LabFrame } from "./types";

/*
 * Geometry C · Resonance. A sounding note is a source that rings outward at
 * a rate in proportion to its pitch. There are no connecting lines. In Web,
 * every note rings on its own and their crossings are the relationship: a
 * fifth makes a slow regular lattice (3:2), a dissonance crosses irregularly.
 * In Merge the chord rings as one body from its centre, each ring taking the
 * next member's colour.
 */

interface Ring { r: number; color: string }
interface Source { phase: number; rings: Ring[]; turn: number }

const BASE_RATE = 0.85; // rings per second for the lowest sounding note
const SPEED = 64; // px per second
const CHORD = "chord";

export function createResonancePainter(): GeometryDirectionPainter {
  const sources = new Map<string, Source>();
  const sourceFor = (key: string) => {
    let source = sources.get(key);
    if (!source) { source = { phase: 1, rings: [], turn: 0 }; sources.set(key, source); }
    return source;
  };

  const emit = (
    ctx: CanvasRenderingContext2D,
    source: Source,
    x: number,
    y: number,
    rate: number,
    start: number,
    reach: number,
    colors: string[],
    opacity: number,
    dt: number,
    emitting: boolean,
  ) => {
    if (emitting) {
      source.phase += rate * dt;
      while (source.phase >= 1) {
        source.phase -= 1;
        source.rings.push({ r: start, color: colors[source.turn++ % colors.length] });
      }
    }
    source.rings = source.rings
      .map((ring) => ({ ...ring, r: ring.r + SPEED * dt }))
      .filter((ring) => ring.r < reach);
    source.rings.forEach((ring) => {
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = opacity * 0.9 * (1 - ring.r / reach) ** 1.2;
      ctx.beginPath(); ctx.arc(x, y, ring.r, 0, Math.PI * 2); ctx.stroke();
    });
  };

  return {
    bodies(frame: LabFrame, bodies, scene: HarmonicGeometryScene | null, mode) {
      const { ctx, dt, reducedMotion } = frame;
      const visible = bodies.filter((body) => body.opacity > 0.01);
      const sounding = visible.filter((body) => !body.blob.isFadingOut);
      const lowest = Math.min(...sounding.map((body) => body.blob.frequency), Infinity);
      const core = (body: PreparedBlobFrame) => Math.max(5, body.scaledRadius * 0.34);
      const tree = spanningTree(visible.map((body) => ({ x: body.blob.x, y: body.blob.y })))
        .map(([a, b]) => [visible[a], visible[b]] as [PreparedBlobFrame, PreparedBlobFrame]);
      publishConnections(scene, mode === "merge" ? tree : scenePairs(scene, visible), mode);

      const live = new Set(visible.map((body) => body.key));
      if (mode === "merge" && visible.length > 1) live.add(CHORD);
      [...sources.keys()].forEach((key) => { if (!live.has(key)) sources.delete(key); });

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 2;
      if (reducedMotion) {
        visible.forEach((body) => {
          [1.8, 2.8, 3.8].forEach((scale, i) => {
            ctx.strokeStyle = body.primaryColor;
            ctx.globalAlpha = body.opacity * (0.55 - i * 0.14);
            ctx.beginPath(); ctx.arc(body.blob.x, body.blob.y, core(body) * scale, 0, Math.PI * 2); ctx.stroke();
          });
        });
      } else if (mode === "merge" && visible.length > 1) {
        const cx = visible.reduce((sum, body) => sum + body.blob.x, 0) / visible.length;
        const cy = visible.reduce((sum, body) => sum + body.blob.y, 0) / visible.length;
        const reach = Math.max(...visible.map((body) => Math.hypot(body.blob.x - cx, body.blob.y - cy))) * 1.35 + 40;
        const ordered = [...visible].sort((a, b) => a.blob.frequency - b.blob.frequency);
        emit(ctx, sourceFor(CHORD), cx, cy, BASE_RATE * 1.4, 8, reach,
          ordered.map((body) => body.primaryColor),
          Math.max(...visible.map((body) => body.opacity)), dt, sounding.length > 0);
      } else {
        visible.forEach((body) => {
          const reach = Math.max(body.scaledRadius * 3.2, ...visible.map((other) =>
            Math.hypot(other.blob.x - body.blob.x, other.blob.y - body.blob.y) + 30));
          emit(ctx, sourceFor(body.key), body.blob.x, body.blob.y,
            BASE_RATE * (body.blob.frequency / (Number.isFinite(lowest) ? lowest : body.blob.frequency)),
            core(body), reach, [body.primaryColor], body.opacity, dt, !body.blob.isFadingOut);
        });
      }
      ctx.restore();

      // Cores sit above the field, flat and opaque.
      visible.forEach((body) => {
        ctx.save();
        ctx.globalAlpha = body.opacity;
        ctx.fillStyle = body.primaryColor;
        ctx.beginPath();
        ctx.arc(body.blob.x, body.blob.y, core(body), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    },
    clear() { sources.clear(); },
  };
}
