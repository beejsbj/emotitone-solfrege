import { scopePoints, soundLevel, tracePolygon } from "./shared";
import type { LabFrame, ScopePainter } from "./types";

/*
 * Scope · Brush. Reads the same production Hilbert pair, centre and radius.
 */

const restingRing = (frame: LabFrame) => {
  const { ctx, composition } = frame;
  if (!frame.notes.length) return;
  ctx.save();
  ctx.strokeStyle = frame.noteColor(frame.leadNote);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(composition.centerX, composition.centerY, composition.hilbertRadius * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

/**
 * Scope · Brush. The loop painted in one calligraphic stroke: a flat nib at
 * a fixed angle makes the line thick and thin as the waveform turns, like a
 * hand-lettered poster. Each frame is a fresh stroke; no trail.
 */
export function createBrushScope(): ScopePainter {
  const NIB = -0.6; // radians: the pen's fixed angle
  return {
    paint(frame) {
      const { ctx, reducedMotion } = frame;
      if (reducedMotion || !frame.wave) { restingRing(frame); return; }
      const points = scopePoints(frame, 3);
      if (!points.length || (soundLevel(frame) <= 0.01 && !frame.notes.length)) return;
      const width = 3 + soundLevel(frame) * 9;
      const nibX = Math.cos(NIB) * width / 2;
      const nibY = Math.sin(NIB) * width / 2;
      ctx.save();
      ctx.fillStyle = frame.noteColor(frame.leadNote);
      // Each segment is a parallelogram swept by the nib: wide across it, thin along it.
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        tracePolygon(ctx, [
          { x: a.x - nibX, y: a.y - nibY }, { x: a.x + nibX, y: a.y + nibY },
          { x: b.x + nibX, y: b.y + nibY }, { x: b.x - nibX, y: b.y - nibY },
        ]);
        ctx.fill();
      }
      ctx.restore();
    },
    clear() {},
  };
}
