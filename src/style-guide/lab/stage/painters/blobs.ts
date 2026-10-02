import type { PreparedBlobFrame } from "@/types/canvas";
import { bodyPitch, hash, seeded, tracePolygon, type Point } from "./shared";
import type { BlobsPainter, LabFrame } from "./types";

/*
 * Blob directions: the note bodies alone. Positions, lifecycle, release and
 * exact-pitch colour come from production prepared frames; each direction
 * only decides what a body is. None of them blur.
 */

const visibleOf = (bodies: readonly PreparedBlobFrame[]) =>
  bodies.filter((body) => body.opacity > 0.01 && body.contour.length > 3);

/** The body's own production contour, scaled about its centre. */
const contourAt = (body: PreparedBlobFrame, scale: number): Point[] =>
  body.contour.map((p) => ({ x: body.blob.x + (p.x - body.blob.x) * scale, y: body.blob.y + (p.y - body.blob.y) * scale }));

/**
 * Blobs A · Cut Facets. A 7–9 sided cut riding the production contour, so it
 * still breathes; flat facet shading in Ink and Ivory, its colour off-register
 * from an Ivory keyline like the poster.
 */
export const facetsBlobs: BlobsPainter = {
  paint(frame: LabFrame, bodies) {
    const { ctx, tokens } = frame;
    visibleOf(bodies).forEach((body) => {
      const random = seeded(hash(body.key));
      const sides = 7 + Math.floor(random() * 3);
      const contour = contourAt(body, 1.22);
      const points = Array.from({ length: sides }, (_, k) => {
        const at = (k + (random() - 0.5) * 0.55) / sides;
        return contour[Math.floor((((at % 1) + 1) % 1) * contour.length) % contour.length];
      });
      const r = body.scaledRadius;
      const apex = { x: body.blob.x + (random() - 0.5) * r * 0.5, y: body.blob.y + (random() - 0.5) * r * 0.5 };
      ctx.save();
      ctx.globalAlpha = body.opacity;
      ctx.fillStyle = body.primaryColor;
      tracePolygon(ctx, points);
      ctx.fill();
      points.forEach((point, index) => {
        const tone = index % 3;
        if (tone === 1) return;
        ctx.fillStyle = tone === 0 ? tokens.ink : tokens.ivory;
        ctx.globalAlpha = body.opacity * (tone === 0 ? 0.22 : 0.12);
        tracePolygon(ctx, [apex, point, points[(index + 1) % points.length]]);
        ctx.fill();
      });
      ctx.globalAlpha = body.opacity * 0.75;
      ctx.strokeStyle = tokens.ivory;
      ctx.lineWidth = 1.25;
      tracePolygon(ctx, points, -3, -2);
      ctx.stroke();
      ctx.restore();
    });
  },
};

/**
 * Blobs B · Solfège Coin. The body says which note it is: a flat disc on its
 * own breathing contour, its solfège syllable struck into it in Jazz type.
 */
export const coinBlobs: BlobsPainter = {
  paint(frame: LabFrame, bodies) {
    const { ctx, tokens } = frame;
    visibleOf(bodies).forEach((body) => {
      const r = body.scaledRadius * 1.3;
      ctx.save();
      ctx.globalAlpha = body.opacity;
      ctx.fillStyle = tokens.ink;
      tracePolygon(ctx, contourAt(body, 1.3), 3, 3);
      ctx.fill();
      ctx.fillStyle = body.primaryColor;
      tracePolygon(ctx, contourAt(body, 1.3));
      ctx.fill();
      // A struck rim: one ring inset from the edge, in the coin's own ink.
      ctx.strokeStyle = tokens.ink;
      ctx.globalAlpha = body.opacity * 0.35;
      ctx.lineWidth = 1.5;
      tracePolygon(ctx, contourAt(body, 1.08));
      ctx.stroke();
      ctx.globalAlpha = body.opacity;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.max(13, Math.round(r * 0.66))}px ${tokens.display}`;
      // Ivory struck over a hard Ink offset reads on every pitch colour.
      ctx.fillStyle = tokens.ink;
      ctx.fillText(body.blob.note.name, body.blob.x + 1.5, body.blob.y + 2.5);
      ctx.fillStyle = tokens.ivory;
      ctx.fillText(body.blob.note.name, body.blob.x, body.blob.y + 1);
      ctx.restore();
    });
  },
};

/**
 * Blobs C · Key Slip. The body is the same thing you pressed: a leaning cut
 * Key in its pitch colour with a hard Ink offset, so the Stage and the
 * Keyboard are one material. It breathes by its contour's reach.
 */
export const keyBlobs: BlobsPainter = {
  paint(frame: LabFrame, bodies) {
    const { ctx, tokens } = frame;
    visibleOf(bodies).forEach((body) => {
      const reach = body.contour.reduce((max, p) => Math.max(max, Math.hypot(p.x - body.blob.x, p.y - body.blob.y)), 0);
      const w = reach * 1.15;
      const h = reach * 1.6;
      const lean = h * 0.12;
      const { x, y } = body.blob;
      const slip = [
        { x: x - w / 2 + lean, y: y - h / 2 },
        { x: x + w / 2 + lean, y: y - h / 2 + 2 },
        { x: x + w / 2 - lean, y: y + h / 2 },
        { x: x - w / 2 - lean, y: y + h / 2 - 2 },
      ];
      ctx.save();
      ctx.globalAlpha = body.opacity;
      ctx.fillStyle = tokens.ink;
      tracePolygon(ctx, slip, 5, 5);
      ctx.fill();
      ctx.fillStyle = body.primaryColor;
      tracePolygon(ctx, slip);
      ctx.fill();
      ctx.restore();
    });
  },
};

/**
 * Blobs D · Register Rings. Register made visible: a flat core with one ring
 * per scientific octave (C4 has four), the outer ring riding the production
 * contour. High notes read as many fine rings, low notes as a few wide ones.
 */
export const ringBlobs: BlobsPainter = {
  paint(frame: LabFrame, bodies) {
    const { ctx } = frame;
    visibleOf(bodies).forEach((body) => {
      const { octave } = bodyPitch(body);
      const rings = Math.max(1, Math.min(8, octave));
      const outer = contourAt(body, 1.1);
      const core = 0.34;
      ctx.save();
      ctx.globalAlpha = body.opacity;
      ctx.fillStyle = body.primaryColor;
      tracePolygon(ctx, contourAt(body, core));
      ctx.fill();
      ctx.strokeStyle = body.primaryColor;
      ctx.lineWidth = 1.6;
      for (let i = 1; i <= rings; i++) {
        const scale = core + ((1.1 - core) * i) / rings;
        tracePolygon(ctx, i === rings ? outer : contourAt(body, scale));
        ctx.stroke();
      }
      ctx.restore();
    });
  },
};
