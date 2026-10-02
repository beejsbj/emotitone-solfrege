import { scopePoints, soundLevel } from "./shared";
import type { LabFrame, ScopePainter } from "./types";

/*
 * Scope · Phosphor: a beam trace on Ink that decays the way phosphor does.
 * Nothing is filled or blurred.
 */

const PERSISTENCE_HALF_LIFE = 0.11;

/** Scope A · Phosphor: a hot core beam in its own glow, with decaying persistence. */
export function createPhosphorScope(): ScopePainter {
  let tube: HTMLCanvasElement | null = null;
  let tubeCtx: CanvasRenderingContext2D | null = null;

  const ensureTube = (frame: LabFrame) => {
    const canvas = frame.ctx.canvas;
    if (!tube) {
      tube = document.createElement("canvas");
      tubeCtx = tube.getContext("2d");
    }
    if (tube.width !== canvas.width || tube.height !== canvas.height) {
      tube.width = canvas.width;
      tube.height = canvas.height;
    }
    const dpr = canvas.width / frame.width;
    tubeCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    return tubeCtx!;
  };

  const ring = (ctx: CanvasRenderingContext2D, frame: LabFrame, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(frame.composition.centerX, frame.composition.centerY, frame.composition.hilbertRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  return {
    paint(frame) {
      const { ctx, composition, reducedMotion, dt } = frame;
      const level = soundLevel(frame);
      const hot = frame.noteColor(frame.leadNote, { l: 1.18, c: 0.8 });
      const glow = frame.noteColor(frame.leadNote, { l: 1.05, alpha: 0.5 });
      if (reducedMotion) {
        tubeCtx?.clearRect(0, 0, tube?.width ?? 0, tube?.height ?? 0);
        if (frame.notes.length) ring(ctx, frame, glow);
        return;
      }
      const tubeCtx2 = ensureTube(frame);
      // Phosphor decay: the old trace loses half its light every half-life.
      tubeCtx2.save();
      tubeCtx2.globalCompositeOperation = "destination-out";
      tubeCtx2.fillStyle = `rgba(0,0,0,${1 - 0.5 ** (dt / PERSISTENCE_HALF_LIFE)})`;
      tubeCtx2.fillRect(0, 0, frame.width, frame.height);
      tubeCtx2.restore();

      const points = scopePoints(frame, 2);
      if (points.length && (level > 0.01 || frame.notes.length)) {
        tubeCtx2.save();
        tubeCtx2.globalCompositeOperation = "lighter";
        tubeCtx2.lineJoin = "round";
        tubeCtx2.beginPath();
        points.forEach((p, i) => (i ? tubeCtx2.lineTo(p.x, p.y) : tubeCtx2.moveTo(p.x, p.y)));
        tubeCtx2.strokeStyle = glow;
        tubeCtx2.globalAlpha = 0.35 + level * 0.4;
        tubeCtx2.lineWidth = 3 + level * 3;
        tubeCtx2.stroke();
        tubeCtx2.strokeStyle = hot;
        tubeCtx2.globalAlpha = 0.55 + level * 0.45;
        tubeCtx2.lineWidth = 0.8 + level * 0.8;
        tubeCtx2.stroke();
        tubeCtx2.restore();
      } else if (!frame.wave && frame.notes.length) {
        // No running audio yet: a resting beam ring, like production's still fallback.
        ring(tubeCtx2, frame, glow);
      } else if (frame.wave) {
        // An idle beam parks as a dim spot at the centre.
        tubeCtx2.save();
        tubeCtx2.fillStyle = frame.noteColor(frame.leadNote, { l: 1.2, alpha: 0.35 });
        tubeCtx2.beginPath();
        tubeCtx2.arc(composition.centerX, composition.centerY, 1.6, 0, Math.PI * 2);
        tubeCtx2.fill();
        tubeCtx2.restore();
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(tube!, 0, 0);
      ctx.restore();
    },
    clear() {
      tubeCtx?.clearRect(0, 0, tube?.width ?? 0, tube?.height ?? 0);
    },
  };
}
