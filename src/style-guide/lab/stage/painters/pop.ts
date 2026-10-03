import type { PreparedBlobFrame } from "@/types/canvas";
import { LedRaster } from "./led";
import { bodyPitch } from "./shared";
import type { BlobsPainter, LabFrame } from "./types";

/*
 * Blobs · Pop. The vibe of Burooj's reference (2026-10-03), not its
 * structure: a note's identity and its sounding are separate. A small core in
 * the pitch's colour sits in an Ink collar for as long as the body exists;
 * the sounding is a firm flat disc that pops out of the core on the attack
 * (fast, with the shared bounce), holds while the note sounds, and folds back
 * into the core on release. The orbit clips the disc, so it opens inward
 * toward the scope as a half-moon instead of spilling off a phone's edge.
 * Three materials: Lit (a faint glow), Paper (a hard Ink offset), Dot (lit
 * LEDs on the shared grid).
 */

type Material = "lit" | "paper" | "dot";

const POP_S = 0.12;
const DISC = 1.4; // disc radius as a multiple of the production body radius
const CORE = 0.36;

/** Overshoot then settle, like the system's elastic press. */
const popIn = (t: number) => {
  if (t >= 1) return 1;
  const s = 1.9;
  const u = t - 1;
  return 1 + u * u * ((s + 1) * u + s);
};

/** How open the disc is: popping in on attack, folding back on release. */
function openness(body: PreparedBlobFrame, reducedMotion: boolean) {
  if (body.blob.isFadingOut) {
    if (reducedMotion) return 0;
    // The disc is gone before the core finishes fading.
    return Math.max(0, (body.opacity - 0.45) / 0.55);
  }
  return reducedMotion ? 1 : popIn(Math.min(1, body.elapsed / POP_S));
}

/** Clip to the inside of the circle-of-fifths orbit. */
function clipToOrbit(ctx: CanvasRenderingContext2D, frame: LabFrame) {
  const { centerX, centerY, orbitRadiusX, orbitRadiusY } = frame.composition;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, orbitRadiusX, orbitRadiusY, 0, 0, Math.PI * 2);
  ctx.clip();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  ctx.fill();
}

function createPop(material: Material): BlobsPainter {
  const raster = material === "dot" ? new LedRaster() : null;
  return {
    paint(frame: LabFrame, bodies) {
      const { ctx, tokens, reducedMotion } = frame;
      const visible = bodies.filter((body) => body.opacity > 0.01);
      const led = raster?.begin(frame, true) ?? null;

      visible.forEach((body) => {
        const { x, y } = body.blob;
        const r = body.scaledRadius;
        const open = openness(body, reducedMotion);
        const discR = r * DISC * open;
        const coreR = r * CORE;

        if (led) {
          led.save();
          clipToOrbit(led, frame);
          led.fillStyle = body.primaryColor;
          led.globalAlpha = body.opacity;
          disc(led, x, y, discR);
          led.restore();
          // The collar is a ring of unlit LEDs; the core is a brighter cluster.
          led.save();
          led.globalCompositeOperation = "destination-out";
          led.lineWidth = raster!.cell * 0.9;
          led.beginPath();
          led.arc(x, y, coreR + raster!.cell * 0.6, 0, Math.PI * 2);
          led.stroke();
          led.restore();
          led.fillStyle = frame.noteColor(bodyPitch(body), { l: 1.25 });
          led.globalAlpha = body.opacity;
          disc(led, x, y, coreR);
          led.globalAlpha = 1;
          return;
        }

        ctx.save();
        ctx.globalAlpha = body.opacity;
        if (discR > 0.5) {
          ctx.save();
          clipToOrbit(ctx, frame);
          if (material === "paper") {
            ctx.fillStyle = tokens.ink;
            disc(ctx, x + 5, y + 5, discR);
          } else {
            ctx.shadowColor = body.primaryColor;
            ctx.shadowBlur = 22;
          }
          ctx.fillStyle = body.primaryColor;
          disc(ctx, x, y, discR);
          ctx.restore();
        }
        if (material === "paper") {
          ctx.fillStyle = tokens.ink;
          disc(ctx, x + 3, y + 3, coreR + 3);
        }
        ctx.fillStyle = tokens.ink;
        disc(ctx, x, y, coreR + 3.5);
        ctx.fillStyle = body.primaryColor;
        disc(ctx, x, y, coreR);
        ctx.restore();
      });

      if (raster) raster.present(frame);
    },
  };
}

export const createLitPop = () => createPop("lit");
export const createPaperPop = () => createPop("paper");
export const createDotPop = () => createPop("dot");
