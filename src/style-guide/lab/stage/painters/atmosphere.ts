import { soundLevel, tracePolygon, type Point } from "./shared";
import type { AtmospherePainter, LabFrame } from "./types";

/*
 * Atmosphere · Diffused Band. The poster's tilted highlight band as a soft
 * wash of light in the sounding pitch's own hue: Ink-3 in silence, deep pitch
 * colour once it plays, its height following the envelope. It keeps the
 * accepted clock: a slow breath in silence handing over to the shared
 * envelope once sound plays.
 *
 * Burooj: "Diffused spotlight and band are both lit vibes" (2026-10-03);
 * "Drop spotlight. Band is just better" and "I'm against complement"
 * (2026-10-05); "Kill paper. We are going with lit" (2026-10-06). The cut
 * band lives on design/lab-stage-paper.
 */

const LEAN = -0.105; // ≈ -6°, the poster's highlight-band lean
const SOFT_SCALE = 1 / 12;
const SOFT_BLUR = 2.2; // px at the reduced scale; ≈ 26px on the Stage

/**
 * Paint shapes small, soften them, and scale them up: diffusion without a
 * per-frame full-size blur.
 */
function createSoftLayer() {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  return (frame: LabFrame, draw: (soft: CanvasRenderingContext2D) => void) => {
    const w = Math.max(2, Math.ceil(frame.width * SOFT_SCALE));
    const h = Math.max(2, Math.ceil(frame.height * SOFT_SCALE));
    if (!canvas) {
      canvas = document.createElement("canvas");
      ctx = canvas.getContext("2d");
    }
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const soft = ctx!;
    soft.setTransform(1, 0, 0, 1, 0, 0);
    soft.clearRect(0, 0, w, h);
    soft.filter = `blur(${SOFT_BLUR}px)`;
    soft.setTransform(SOFT_SCALE, 0, 0, SOFT_SCALE, 0, 0);
    draw(soft);
    soft.filter = "none";
    frame.ctx.save();
    frame.ctx.imageSmoothingEnabled = true;
    frame.ctx.imageSmoothingQuality = "high";
    frame.ctx.drawImage(canvas, 0, 0, frame.width, frame.height);
    frame.ctx.restore();
  };
}

export function createDiffusedBand(): AtmospherePainter {
  const soften = createSoftLayer();
  return {
    paint(frame) {
      const { ctx, width, height, composition, tokens, reducedMotion, elapsed } = frame;
      ctx.fillStyle = tokens.ink;
      ctx.fillRect(0, 0, width, height);
      if (composition.suspended) return;
      const { usable, centerX: cx, centerY: cy } = composition;
      const level = soundLevel(frame);
      const breath = reducedMotion ? 0 : (Math.sin((elapsed * Math.PI * 2) / 10) + 1) / 2;
      const size = Math.min(usable.width, usable.height);
      const half = size * (level > 0.01 ? 0.15 + level * 0.09 : 0.14 + breath * 0.012);
      const reach = usable.width * 0.62 + 60;
      const lean = LEAN * reach;
      const band: Point[] = [
        { x: cx - reach, y: cy - half - lean },
        { x: cx + reach, y: cy - half + lean },
        { x: cx + reach, y: cy + half + lean },
        { x: cx - reach, y: cy + half - lean },
      ];
      soften(frame, (soft) => {
        soft.fillStyle = level > 0.01 ? frame.noteColor(frame.leadNote, { l: 0.55, c: 0.78 }) : tokens.ink3;
        tracePolygon(soft, band);
        soft.fill();
      });
    },
  };
}
