import { resolveAmbientLevel } from "@/composables/canvas/stageRuntime";
import { soundLevel, tracePolygon, type Point } from "./shared";
import type { AtmospherePainter, LabFrame } from "./types";

/*
 * Atmosphere: diffused light shapes. Burooj, 2026-10-02: "Spotlight and
 * highlight bar are interesting. I wanna see a diffused version of them
 * instead of a hard edge." Each keeps the accepted clock: a slow breath in
 * silence handing over to the shared envelope once sound plays.
 */

const LEAN = -0.105; // ≈ -6°, the poster's highlight-band lean
const SOFT_SCALE = 1 / 12;
const SOFT_BLUR = 2.2; // px at the reduced scale; ≈ 26px on the Stage

const ground = (frame: LabFrame) => {
  frame.ctx.fillStyle = frame.tokens.ink;
  frame.ctx.fillRect(0, 0, frame.width, frame.height);
};

/** 0 at silence's breath trough, rising through the envelope. */
const lift = (frame: LabFrame) =>
  Math.max(0, (resolveAmbientLevel(frame.audio, frame.elapsed, frame.reducedMotion) - 0.66) / 0.34);

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

/**
 * Atmosphere A · Diffused Band. The poster's tilted highlight band, now a
 * soft-edged wash of light: Ink-3 in silence, the sounding pitch's deep
 * colour once it plays, its height following the envelope.
 */
export function createDiffusedBand(): AtmospherePainter {
  const soften = createSoftLayer();
  return {
    paint(frame) {
      ground(frame);
      const { composition, tokens, reducedMotion, elapsed } = frame;
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
        soft.fillStyle = level > 0.01 ? frame.noteColor(frame.leadNote, { l: 0.55, c: 0.8 }) : tokens.ink3;
        tracePolygon(soft, band);
        soft.fill();
      });
    },
  };
}

/**
 * Atmosphere B · Diffused Spotlight. A jazz-club spot from above onto the
 * scope, now a soft beam of light with a brighter pool where it lands, in the
 * sounding pitch's colour. It opens with the envelope; silence is a dim house
 * light in Ink.
 */
export function createDiffusedSpotlight(): AtmospherePainter {
  const soften = createSoftLayer();
  return {
    paint(frame) {
      ground(frame);
      const { composition, tokens } = frame;
      if (composition.suspended) return;
      const { centerX: cx, centerY: cy, usable, hilbertRadius } = composition;
      const sounding = soundLevel(frame) > 0.01;
      const open = 0.55 + lift(frame) * 0.45;
      const pool = Math.min(usable.width * 0.46, hilbertRadius * 0.95) * open;
      const top = usable.y - 40;
      soften(frame, (soft) => {
        soft.fillStyle = sounding ? frame.noteColor(frame.leadNote, { l: 0.45, c: 0.8 }) : tokens.ink3;
        tracePolygon(soft, [
          { x: cx - pool * 0.18, y: top },
          { x: cx + pool * 0.18, y: top },
          { x: cx + pool, y: cy },
          { x: cx - pool, y: cy },
        ]);
        soft.fill();
        soft.fillStyle = sounding ? frame.noteColor(frame.leadNote, { l: 0.62, c: 0.85 }) : tokens.ink4;
        soft.beginPath();
        soft.ellipse(cx, cy, pool, pool * 0.3, 0, 0, Math.PI * 2);
        soft.fill();
      });
    },
  };
}
