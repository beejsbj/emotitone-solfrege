import type { PreparedBlobFrame } from "@/types/canvas";
import { bodyPitch, tracePolygon, type Point } from "./shared";
import type { BlobsPainter, LabFrame } from "./types";

/*
 * Blobs: the note bodies alone. Positions, lifecycle, release and exact-pitch
 * colour come from production prepared frames; the direction only decides
 * what a body is. No blur.
 */

const visibleOf = (bodies: readonly PreparedBlobFrame[]) =>
  bodies.filter((body) => body.opacity > 0.01 && body.contour.length > 3);

/** The body's own production contour, scaled about its centre. */
const contourAt = (body: PreparedBlobFrame, scale: number): Point[] =>
  body.contour.map((p) => ({ x: body.blob.x + (p.x - body.blob.x) * scale, y: body.blob.y + (p.y - body.blob.y) * scale }));

/**
 * Blobs · Register Rings. Register made visible: a flat core with one ring
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
