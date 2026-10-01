import { drawMarkOnCanvas, type MarkName } from "@/components/primatives/marks";
import type { ActiveNote } from "@/types/music";
import { hash, randomMark, scopePoints, seeded, soundLevel, stepped, stringOffset, tracePolygon, type Point } from "./shared";
import type { LabFrame, StageDirectionPainter } from "./types";

/*
 * Direction B · Paste-Up. Music cuts paper instead of emitting light. The
 * Stage is a poster being pasted up while you play: flat Music Color cut on
 * a stop-motion clock, a tilted highlight band, torn strips, and chads that
 * fall off the bottom instead of fading.
 */

const CUT_FPS = 12;
const LEAN = -0.105; // ≈ -6°, the poster's highlight-band lean
const OFFSET = 5;

interface Chad {
  x: number; y: number; vx: number; vy: number; angle: number; spin: number;
  size: number; mark: MarkName; color: string; age: number;
}

interface Cut { points: Point[]; color: string; shade: string; rotation: number }

export function createPasteUpPainter(): StageDirectionPainter {
  let lastCutStep = -1;
  let cuts: Cut[] = [];
  let quietFor = 0;
  let chads: Chad[] = [];

  const band = (frame: LabFrame) => {
    const { composition, elapsed, reducedMotion } = frame;
    const { usable, centerX: cx, centerY: cy } = composition;
    const level = soundLevel(frame);
    const t = reducedMotion ? 0 : stepped(elapsed, CUT_FPS);
    // Silence keeps the accepted slow breath; sound takes the height over.
    const breath = reducedMotion ? 0 : (Math.sin((t * Math.PI * 2) / 10) + 1) / 2;
    const size = Math.min(usable.width, usable.height);
    const half = size * (level > 0.01 ? 0.15 + level * 0.09 : 0.14 + breath * 0.012);
    const reach = usable.width * 0.62 + 40;
    const lean = LEAN * reach;
    return [
      { x: cx - reach, y: cy - half - lean },
      { x: cx + reach, y: cy - half + lean },
      { x: cx + reach, y: cy + half + lean },
      { x: cx - reach, y: cy + half - lean },
    ];
  };

  return {
    atmosphere(frame) {
      const { ctx, width, height, tokens, composition } = frame;
      ctx.fillStyle = tokens.ink;
      ctx.fillRect(0, 0, width, height);
      if (composition.suspended) return;
      const level = soundLevel(frame);
      ctx.save();
      // Ink paper in silence; the sounding pitch's colour, deep and flat, once it plays.
      ctx.fillStyle = level > 0.01
        ? frame.noteColor(frame.leadNote, { l: 0.5, c: 0.72 })
        : tokens.ink3;
      tracePolygon(ctx, band(frame));
      ctx.fill();
      ctx.restore();
    },

    strings(frame, strings) {
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
          const shudder = reducedMotion ? 0 : stringOffset(string, t, y, h);
          const x = string.x + shudder + (y - h / 2) * 0.05;
          // Torn edges: each strip keeps its own ragged profile.
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

    scope(frame) {
      const { ctx, composition, elapsed, reducedMotion, dt, tokens } = frame;
      const level = soundLevel(frame);
      if (reducedMotion) {
        cuts = [];
        if (!frame.notes.length) return;
        const r = composition.hilbertRadius * 0.42;
        ctx.save();
        ctx.fillStyle = tokens.ink;
        ctx.beginPath(); ctx.arc(composition.centerX + OFFSET, composition.centerY + OFFSET, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = frame.noteColor(frame.leadNote);
        ctx.beginPath(); ctx.arc(composition.centerX, composition.centerY, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        return;
      }
      quietFor = level > 0.01 || frame.notes.length ? 0 : quietFor + dt;
      const step = Math.floor(elapsed * CUT_FPS);
      if (step !== lastCutStep) {
        lastCutStep = step;
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
      const { centerX: cx, centerY: cy } = composition;
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

    attack(frame, note: ActiveNote) {
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

    flecks(frame) {
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

    clear() {
      cuts = [];
      chads = [];
      lastCutStep = -1;
    },
  };
}
