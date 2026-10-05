import { soundLevel, stepped, tracePolygon, type Point } from "./shared";
import type { AtmospherePainter, LabFrame } from "./types";

/*
 * Atmosphere: the poster's tilted band in two materials and two hues.
 * Burooj, 2026-10-03: "Diffused spotlight and band are both lit vibes. And
 * their non diffused are paper." 2026-10-05: "Drop spotlight. Band is just
 * better. Should atmosphere be the complimentary color" — so the band comes
 * in the sounding pitch's own hue and in its complementary accent (the same
 * authority's hue turned 180°). Lit paints it softened, Paper with a hard
 * edge on the stop-motion clock. It keeps the accepted clock: a slow breath
 * in silence handing over to the shared envelope once sound plays.
 */

const LEAN = -0.105; // ≈ -6°, the poster's highlight-band lean
const CUT_FPS = 12;
const SOFT_SCALE = 1 / 12;
const SOFT_BLUR = 2.2; // px at the reduced scale; ≈ 26px on the Stage

type Material = "lit" | "paper";
/** Same: the sounding pitch's hue. Complement: its accent, hue + 180° (the tritone's hue). */
type Hue = "same" | "complement";

const ground = (frame: LabFrame) => {
  frame.ctx.fillStyle = frame.tokens.ink;
  frame.ctx.fillRect(0, 0, frame.width, frame.height);
};

/** Paper moves on the stop-motion clock; light moves continuously. */
const clock = (frame: LabFrame, material: Material) =>
  frame.reducedMotion ? 0 : material === "paper" ? stepped(frame.elapsed, CUT_FPS) : frame.elapsed;

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

/** Paint directly for paper, softened for light. */
function createPainter(material: Material, draw: (ctx: CanvasRenderingContext2D, frame: LabFrame) => void): AtmospherePainter {
  const soften = material === "lit" ? createSoftLayer() : null;
  return {
    paint(frame) {
      ground(frame);
      if (frame.composition.suspended) return;
      if (soften) soften(frame, (soft) => draw(soft, frame));
      else draw(frame.ctx, frame);
    },
  };
}

/** The poster's tilted highlight band: Ink-3 in silence, the sounding pitch's deep colour once it plays. */
function bandShape(material: Material, hue: Hue) {
  return (ctx: CanvasRenderingContext2D, frame: LabFrame) => {
    const { composition, tokens } = frame;
    const { usable, centerX: cx, centerY: cy } = composition;
    const level = soundLevel(frame);
    const breath = (Math.sin((clock(frame, material) * Math.PI * 2) / 10) + 1) / 2;
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
    const color = hue === "complement" ? frame.noteAccent : frame.noteColor;
    ctx.fillStyle = level > 0.01
      ? color(frame.leadNote, { l: material === "lit" ? 0.55 : 0.5, c: 0.78 })
      : tokens.ink3;
    tracePolygon(ctx, band);
    ctx.fill();
  };
}

export const createDiffusedBand = (hue: Hue) => createPainter("lit", bandShape("lit", hue));
export const createCutBand = (hue: Hue) => createPainter("paper", bandShape("paper", hue));
