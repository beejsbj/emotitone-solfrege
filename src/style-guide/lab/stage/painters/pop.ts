import type { PreparedBlobFrame } from "@/types/canvas";
import { stepped } from "./shared";
import type { BlobsPainter, LabFrame } from "./types";

/*
 * Blobs · Disc. The reference blob's aesthetic and motion (Burooj,
 * 2026-10-03: "It will be a full disk/blob. No core."): one full, firm, flat
 * disc per note that pops in on the attack, holds dead still, and shrinks away
 * on release without fading.
 *
 * The motion belongs to production: the Pop Look sets the body knobs
 * (scale in 100ms with production's overshoot, scale and fade out in 200ms, no
 * vibration), and these painters read the prepared radius. In Lit the disc is
 * production's own field under that Look, halo included, so it has no painter
 * here. Paper only decides the material.
 */

const visibleOf = (bodies: readonly PreparedBlobFrame[]) => bodies.filter((body) => body.opacity > 0.02);

/** Paper: a flat disc over a hard Ink offset, its size advancing on the 12fps cut clock. */
export function createPaperDisc(): BlobsPainter {
  const held = new Map<string, { step: number; r: number }>();
  return {
    paint(frame: LabFrame, bodies) {
      const { ctx, tokens, elapsed, reducedMotion } = frame;
      const step = reducedMotion ? 0 : Math.round(stepped(elapsed, 12) * 12);
      const visible = visibleOf(bodies);
      [...held.keys()].forEach((key) => { if (!visible.some((body) => body.key === key)) held.delete(key); });
      visible.forEach((body) => {
        // Cut paper moves in steps: keep the radius until the next 12fps step.
        const last = held.get(body.key);
        const r = last && last.step === step ? last.r : body.scaledRadius;
        held.set(body.key, { step, r });
        if (r < 0.5) return;
        ctx.fillStyle = tokens.ink;
        ctx.beginPath(); ctx.arc(body.blob.x + 4, body.blob.y + 4, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body.primaryColor;
        ctx.beginPath(); ctx.arc(body.blob.x, body.blob.y, r, 0, Math.PI * 2); ctx.fill();
      });
    },
  };
}
