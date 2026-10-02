import { drawMarkOnCanvas, type MarkName } from "@/components/primatives/marks";
import type { ActiveNote } from "@/types/music";
import { hash, randomMark, scopePoints, seeded, soundLevel, stepped, stringOffset, tracePolygon, type Point } from "./shared";
import type { FlecksPainter, LabFrame, ScopePainter, StringsPainter } from "./types";

/*
 * The paper family: music cuts flat Music Color paper on a stop-motion
 * clock, with the poster's lean and hard Ink offsets. Paper never fades;
 * it is peeled away or falls off.
 */

const CUT_FPS = 12;
const OFFSET = 5;

/** Scope B · Paper Cut: each step cuts the loop out as a flat sheet; the last three stack. */
export function createCutScope(): ScopePainter {
  interface Cut { points: Point[]; color: string; shade: string; rotation: number }
  let lastStep = -1;
  let cuts: Cut[] = [];
  let quietFor = 0;

  return {
    paint(frame) {
      const { ctx, composition, elapsed, reducedMotion, dt, tokens } = frame;
      const level = soundLevel(frame);
      const { centerX: cx, centerY: cy } = composition;
      if (reducedMotion) {
        cuts = [];
        if (!frame.notes.length) return;
        const r = composition.hilbertRadius * 0.42;
        ctx.save();
        ctx.fillStyle = tokens.ink;
        ctx.beginPath(); ctx.arc(cx + OFFSET, cy + OFFSET, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = frame.noteColor(frame.leadNote);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        return;
      }
      quietFor = level > 0.01 || frame.notes.length ? 0 : quietFor + dt;
      const step = Math.floor(elapsed * CUT_FPS);
      if (step !== lastStep) {
        lastStep = step;
        const points = scopePoints(frame, 8);
        if (points.length && quietFor === 0) {
          cuts.push({
            points,
            color: frame.noteColor(frame.leadNote),
            shade: frame.noteColor(frame.leadNote, { l: 0.62 }),
            rotation: (Math.random() - 0.5) * 0.08,
          });
          cuts = cuts.slice(-3);
        } else if (quietFor > 0.3 && cuts.length) {
          // Silence peels the stack away one sheet per step.
          cuts.shift();
        }
      }
      cuts.forEach((cut, index) => {
        const top = index === cuts.length - 1;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(top ? 0 : cut.rotation * (cuts.length - index));
        ctx.translate(-cx, -cy);
        ctx.fillStyle = tokens.ink;
        tracePolygon(ctx, cut.points, OFFSET, OFFSET);
        ctx.fill("evenodd");
        ctx.fillStyle = top ? cut.color : cut.shade;
        tracePolygon(ctx, cut.points);
        ctx.fill("evenodd");
        ctx.restore();
      });
    },
    clear() { cuts = []; lastStep = -1; },
  };
}

/** Strings B · Torn Strips: ragged paper strips that shudder on the stop-motion clock. */
export const stripStrings: StringsPainter = {
  paint(frame, strings) {
    const { ctx, composition, elapsed, reducedMotion } = frame;
    const h = composition.usable.height;
    const t = reducedMotion ? 0 : stepped(elapsed, CUT_FPS);
    strings.forEach((string, index) => {
      if (string.opacity <= 0.001) return;
      const sounding = string.isActive && string.amplitude > 0.5;
      const random = seeded(hash(`strip-${index}`));
      const width = sounding ? 5 : 2.5;
      const left: Point[] = [];
      const right: Point[] = [];
      for (let y = 0; y <= h; y += 14) {
        const x = string.x + (reducedMotion ? 0 : stringOffset(string, t, y, h)) + (y - h / 2) * 0.05;
        left.push({ x: x - width / 2 - random() * 1.4, y });
        right.push({ x: x + width / 2 + random() * 1.4, y });
      }
      const outline = [...left, ...right.reverse()];
      ctx.save();
      ctx.globalAlpha = sounding ? 1 : Math.min(1, string.opacity * 1.4);
      if (sounding) {
        ctx.fillStyle = frame.tokens.ink;
        tracePolygon(ctx, outline, OFFSET * 0.6, OFFSET * 0.6);
        ctx.fill();
      }
      ctx.fillStyle = string.color;
      tracePolygon(ctx, outline);
      ctx.fill();
      ctx.restore();
    });
  },
};

interface Chad {
  x: number; y: number; vx: number; vy: number; angle: number; spin: number;
  size: number; mark: MarkName; color: string; age: number;
}

/** Flecks B · Chads: cut Marks pop from the scope and tumble off the bottom; never fade. */
export function createChadFlecks(): FlecksPainter {
  let chads: Chad[] = [];
  return {
    attack(frame: LabFrame, note: ActiveNote) {
      const { composition } = frame;
      const color = frame.noteColor(note);
      for (let i = 0; i < 8; i++) {
        chads.push({
          x: composition.centerX + (Math.random() - 0.5) * composition.hilbertRadius * 0.6,
          y: composition.centerY + (Math.random() - 0.5) * composition.hilbertRadius * 0.3,
          vx: (Math.random() - 0.5) * 180,
          vy: -140 - Math.random() * 220,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 9,
          size: 6 + Math.random() * 4,
          mark: randomMark(),
          color,
          age: 0,
        });
      }
      if (chads.length > 120) chads = chads.slice(-120);
    },
    paint(frame) {
      const { ctx, dt, composition, tokens } = frame;
      const floor = composition.usable.y + composition.usable.height + 24;
      chads = chads.filter((chad) => {
        chad.age += dt;
        chad.vy += 620 * dt;
        chad.vx *= 0.985;
        chad.x += chad.vx * dt;
        chad.y += chad.vy * dt;
        chad.angle += chad.spin * dt;
        // Paper doesn't fade: a chad leaves by falling behind the deck.
        if (chad.y > floor || chad.age > 4) return false;
        // Tumbling paper flips edge-on, so its width breathes with the spin.
        const flip = Math.max(0.18, Math.abs(Math.cos(chad.angle * 1.7)));
        ctx.save();
        ctx.translate(chad.x, chad.y);
        ctx.rotate(chad.angle);
        ctx.scale(flip, 1);
        ctx.fillStyle = tokens.ink;
        ctx.translate(2, 2);
        drawMarkOnCanvas(ctx, chad.mark, chad.size);
        ctx.translate(-2, -2);
        ctx.fillStyle = chad.color;
        drawMarkOnCanvas(ctx, chad.mark, chad.size);
        ctx.restore();
        return true;
      });
    },
    clear() { chads = []; },
  };
}
