import { CHROMATIC_NOTES } from "@/data";
import type { HarmonicGeometryScene, PreparedBlobFrame } from "@/types/canvas";
import { bodyPitch, publishConnections, tracePolygon, type Point } from "./shared";
import type { ConnectionsPainter, LabFrame } from "./types";

/*
 * Connections · Chord Shape. The chord is the polygon its notes make on the
 * circle of fifths the bodies already orbit. Every major triad is the same
 * triangle turned; minor is its mirror; augmented is equilateral. The shape
 * is the lesson.
 *
 * Burooj, 2026-10-05: "Make the circle of fifth circle thingy invisible. So
 * only the shape shows up. The note letter itself will show within the
 * center of the blob." The dial is gone; each body carries its note letter,
 * drawn above the bodies by the overlay pass.
 */

/** The pitch's letter, from its exact sounding frequency: C, G, F♯. */
const letterOf = (body: PreparedBlobFrame) =>
  CHROMATIC_NOTES[bodyPitch(body).pitchClassIndex].replace("#", "♯");

function twoTone(ctx: CanvasRenderingContext2D, a: PreparedBlobFrame, b: PreparedBlobFrame, width: number, alpha: number) {
  const mid = { x: (a.blob.x + b.blob.x) / 2, y: (a.blob.y + b.blob.y) / 2 };
  ctx.save();
  ctx.lineWidth = width;
  ctx.lineCap = "butt";
  ctx.globalAlpha = alpha * Math.min(a.opacity, b.opacity);
  ctx.strokeStyle = a.primaryColor;
  ctx.beginPath(); ctx.moveTo(a.blob.x, a.blob.y); ctx.lineTo(mid.x, mid.y); ctx.stroke();
  ctx.strokeStyle = b.primaryColor;
  ctx.beginPath(); ctx.moveTo(mid.x, mid.y); ctx.lineTo(b.blob.x, b.blob.y); ctx.stroke();
  ctx.restore();
}

export function createChordShapePainter(): ConnectionsPainter {
  return {
    paint(frame: LabFrame, bodies, scene: HarmonicGeometryScene | null, mode) {
      const { ctx, composition } = frame;
      const { centerX: cx, centerY: cy } = composition;
      const visible = bodies.filter((body) => body.opacity > 0.01);

      if (!visible.length) return;
      // Order by angle around the dial's centre: the polygon follows the circle.
      const ordered = [...visible].sort((a, b) =>
        Math.atan2(a.blob.y - cy, a.blob.x - cx) - Math.atan2(b.blob.y - cy, b.blob.x - cx));
      const points: Point[] = ordered.map((body) => ({ x: body.blob.x, y: body.blob.y }));

      if (ordered.length > 2 && mode === "merge") {
        const centroid = points.reduce((sum, p) => ({ x: sum.x + p.x / points.length, y: sum.y + p.y / points.length }), { x: 0, y: 0 });
        // The chord's body: flat facets from the centre, each in its vertex's colour.
        ordered.forEach((body, index) => {
          const next = ordered[(index + 1) % ordered.length];
          const mid = { x: (body.blob.x + next.blob.x) / 2, y: (body.blob.y + next.blob.y) / 2 };
          const prev = ordered[(index - 1 + ordered.length) % ordered.length];
          const prevMid = { x: (body.blob.x + prev.blob.x) / 2, y: (body.blob.y + prev.blob.y) / 2 };
          ctx.save();
          // Flat, opaque, deep: the chord is cut from its members' colour, not tinted glass.
          ctx.globalAlpha = body.opacity;
          ctx.fillStyle = frame.noteColor(bodyPitch(body), { l: 0.42, c: 0.85 });
          tracePolygon(ctx, [centroid, prevMid, { x: body.blob.x, y: body.blob.y }, mid]);
          ctx.fill();
          ctx.restore();
        });
      }

      const perimeter = ordered.length > 2
        ? ordered.map((body, i) => [body, ordered[(i + 1) % ordered.length]] as [PreparedBlobFrame, PreparedBlobFrame])
        : ordered.length === 2 ? [[ordered[0], ordered[1]] as [PreparedBlobFrame, PreparedBlobFrame]] : [];
      const diagonals: [PreparedBlobFrame, PreparedBlobFrame][] = [];
      for (let i = 0; i < ordered.length; i++) {
        for (let j = i + 2; j < ordered.length; j++) {
          if (!(i === 0 && j === ordered.length - 1)) diagonals.push([ordered[i], ordered[j]]);
        }
      }
      publishConnections(scene, mode === "web" ? [...perimeter, ...diagonals] : perimeter, mode);

      if (ordered.length === 2) {
        twoTone(ctx, ordered[0], ordered[1], 3, 0.95);
      } else if (ordered.length > 2) {
        ordered.forEach((body, index) => twoTone(ctx, body, ordered[(index + 1) % ordered.length], 3, 0.95));
        if (mode === "web") diagonals.forEach(([a, b]) => twoTone(ctx, a, b, 1.25, 0.6));
      }

    },
    overlay(frame: LabFrame, bodies) {
      const { ctx, tokens } = frame;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      bodies.forEach((body) => {
        if (body.opacity <= 0.02 || body.scaledRadius < 6) return;
        const letter = letterOf(body);
        ctx.font = `700 ${Math.max(12, Math.round(body.scaledRadius * 0.95))}px ${tokens.display}`;
        ctx.globalAlpha = body.opacity;
        // Ivory over a hard Ink offset reads on every pitch colour.
        ctx.fillStyle = tokens.ink;
        ctx.fillText(letter, body.blob.x + 1.5, body.blob.y + 3);
        ctx.fillStyle = tokens.ivory;
        ctx.fillText(letter, body.blob.x, body.blob.y + 1.5);
      });
      ctx.restore();
    },
    clear() {},
  };
}
