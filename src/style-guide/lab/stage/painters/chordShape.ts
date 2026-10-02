import { CHROMATIC_NOTES } from "@/data";
import type { HarmonicGeometryScene, PreparedBlobFrame } from "@/types/canvas";
import { bodyPitch, publishConnections, tracePolygon, type Point } from "./shared";
import type { BodiesPainter, LabFrame } from "./types";

/*
 * Geometry B · Chord Shape. The Circle of Fifths the bodies already orbit
 * becomes a visible dial of twelve stations, and the chord is the polygon
 * its notes make on it. Every major triad is the same triangle turned; minor
 * is its mirror; augmented is equilateral. The shape is the lesson.
 */

const FIFTHS = Array.from({ length: 12 }, (_, i) => CHROMATIC_NOTES[(i * 7) % 12]);

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

export function createChordShapePainter(): BodiesPainter {
  return {
    paint(frame: LabFrame, bodies, scene: HarmonicGeometryScene | null, mode) {
      const { ctx, composition, tokens } = frame;
      const { centerX: cx, centerY: cy, orbitRadiusX: rx, orbitRadiusY: ry } = composition;
      const visible = bodies.filter((body) => body.opacity > 0.01);
      const soundingClasses = new Set(frame.notes.map((note) => ((note.pitchClassIndex ?? 0) % 12 + 12) % 12));

      // The dial: chassis stations, lit only where a pitch sounds.
      ctx.save();
      ctx.font = `500 10px ${tokens.mono}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      FIFTHS.forEach((pitch, k) => {
        const angle = k * (Math.PI / 6) - Math.PI / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const sounding = soundingClasses.has(CHROMATIC_NOTES.indexOf(pitch));
        const inner = sounding ? 14 : 6;
        ctx.strokeStyle = sounding
          ? frame.noteColor({ pitchClassIndex: CHROMATIC_NOTES.indexOf(pitch), octave: 4 })
          : tokens.ivory4;
        ctx.lineWidth = sounding ? 2.5 : 1.25;
        ctx.beginPath();
        ctx.moveTo(cx + cos * (rx + 4), cy + sin * (ry + 4));
        ctx.lineTo(cx + cos * (rx + 4 + inner), cy + sin * (ry + 4 + inner));
        ctx.stroke();
        ctx.fillStyle = sounding ? tokens.ivory2 : tokens.ivory4;
        ctx.fillText(pitch.replace("#", "♯"), cx + cos * (rx + 30), cy + sin * (ry + 30));
      });
      ctx.restore();

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

      // Vertex jewels, cut clear of the lines by an Ink collar.
      ordered.forEach((body) => {
        const r = Math.max(6, body.scaledRadius * 0.3);
        ctx.save();
        ctx.globalAlpha = body.opacity;
        ctx.fillStyle = tokens.ink;
        ctx.beginPath(); ctx.arc(body.blob.x, body.blob.y, r + 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body.primaryColor;
        ctx.beginPath(); ctx.arc(body.blob.x, body.blob.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    },
    clear() {},
  };
}
