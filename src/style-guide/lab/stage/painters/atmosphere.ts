import { resolveAmbientLevel } from "@/composables/canvas/stageRuntime";
import { soundLevel, tracePolygon } from "./shared";
import type { AtmospherePainter, LabFrame } from "./types";

/*
 * Atmosphere directions D–F. Each keeps the accepted clock: a slow breath in
 * silence handing over to the shared envelope once sound plays. All are flat:
 * hard edges, no gradients.
 */

const ground = (frame: LabFrame) => {
  frame.ctx.fillStyle = frame.tokens.ink;
  frame.ctx.fillRect(0, 0, frame.width, frame.height);
};

/** 0 in silence's breath trough, rising through the envelope. */
const lift = (frame: LabFrame) =>
  Math.max(0, (resolveAmbientLevel(frame.audio, frame.elapsed, frame.reducedMotion) - 0.66) / 0.34);

/** The key's tonic as a note, so a ground colour can mean "home". */
const tonicOf = (frame: LabFrame) => {
  const key = frame.notes[0]?.key ?? "C";
  const index = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].indexOf(key);
  return { pitchClassIndex: Math.max(0, index), octave: 3 };
};

/**
 * Atmosphere D · Spotlight. A jazz-club spot: one hard-edged cone from above
 * the Stage onto the scope, in the sounding pitch's deep colour. It opens with
 * the envelope; in silence a dim house light breathes in Ink.
 */
export const spotlightAtmosphere: AtmospherePainter = {
  paint(frame) {
    ground(frame);
    const { ctx, composition, tokens } = frame;
    if (composition.suspended) return;
    const { centerX: cx, centerY: cy, usable, hilbertRadius } = composition;
    const sounding = soundLevel(frame) > 0.01;
    const open = 0.55 + lift(frame) * 0.45;
    const pool = Math.min(usable.width * 0.46, hilbertRadius * 0.95) * open;
    const top = usable.y - 10;
    ctx.save();
    ctx.fillStyle = sounding ? frame.noteColor(frame.leadNote, { l: 0.34, c: 0.7 }) : tokens.ink3;
    tracePolygon(ctx, [
      { x: cx - pool * 0.18, y: top },
      { x: cx + pool * 0.18, y: top },
      { x: cx + pool, y: cy },
      { x: cx - pool, y: cy },
    ]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy, pool, pool * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

/**
 * Atmosphere E · Tide Line. The Stage fills from the deck like a level: a flat
 * floor in the key's tonic colour (home), its crisp horizon rising with the
 * envelope and settling to a low tide in silence.
 */
export const tideAtmosphere: AtmospherePainter = {
  paint(frame) {
    ground(frame);
    const { ctx, composition } = frame;
    if (composition.suspended) return;
    const { usable } = composition;
    const level = 0.08 + lift(frame) * 0.5;
    const horizon = usable.y + usable.height * (1 - level);
    ctx.save();
    ctx.fillStyle = frame.noteColor(tonicOf(frame), { l: 0.42, c: 0.75 });
    ctx.fillRect(usable.x, horizon, usable.width, usable.y + usable.height - horizon);
    ctx.fillStyle = frame.noteColor(tonicOf(frame), { l: 0.7 });
    ctx.fillRect(usable.x, horizon, usable.width, 1.5);
    ctx.restore();
  },
};

/**
 * Atmosphere F · Halftone. The production wash printed instead of glowed: a
 * fixed screen of ink dots in the sounding pitch's colour, largest under the
 * scope and shrinking outward, their size following the envelope.
 */
export const halftoneAtmosphere: AtmospherePainter = {
  paint(frame) {
    ground(frame);
    const { ctx, composition } = frame;
    if (composition.suspended) return;
    const { centerX: cx, centerY: cy, usable } = composition;
    const pitch = 11;
    const reach = Math.max(usable.width, usable.height) * 0.72;
    const strength = 0.35 + lift(frame) * 0.65;
    ctx.save();
    ctx.fillStyle = frame.noteColor(frame.leadNote, { l: 0.55, c: 0.75 });
    for (let row = 0, y = usable.y + pitch / 2; y < usable.y + usable.height; row++, y += pitch * 0.87) {
      for (let x = usable.x + (row % 2 ? pitch / 2 : 0); x < usable.x + usable.width + pitch; x += pitch) {
        const falloff = 1 - Math.hypot(x - cx, (y - cy) * 1.2) / reach;
        const r = (pitch / 2) * 0.9 * falloff * strength;
        if (r < 0.35) continue;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};
