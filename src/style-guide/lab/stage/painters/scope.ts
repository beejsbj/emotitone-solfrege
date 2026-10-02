import { scopeScale } from "../labHilbert";
import { scopePoints, soundLevel, tracePolygon } from "./shared";
import type { LabFrame, ScopePainter } from "./types";

/*
 * Scope directions D–F. Each reads the same production Hilbert pair, centre
 * and radius; they disagree only about what a waveform should look like.
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
 * Scope D · Groove. The waveform is cut into a record: a three-turn spiral
 * groove whose wiggle is the signal, on a label in the pitch's deep colour.
 * It turns at 33⅓ only while sound plays; silence leaves a still record.
 */
export function createGrooveScope(): ScopePainter {
  let turn = 0;
  return {
    paint(frame) {
      const { ctx, composition, reducedMotion, dt, tokens } = frame;
      const { centerX: cx, centerY: cy } = composition;
      const R = composition.hilbertRadius * 0.55;
      const level = soundLevel(frame);
      if (!reducedMotion && level > 0.01) turn += dt * (33.333 / 60) * Math.PI * 2;
      if (!frame.notes.length && level <= 0.01 && !frame.wave) return;
      ctx.save();
      ctx.fillStyle = tokens.ink2;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.04, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = frame.noteColor(frame.leadNote, { l: 0.5, c: 0.8 });
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = tokens.ink;
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
      const x = frame.wave?.x;
      const samples = 720;
      ctx.strokeStyle = frame.noteColor(frame.leadNote, { l: 1.1 });
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const angle = turn + t * Math.PI * 2 * 3;
        const wiggle = x && !reducedMotion ? scopeScale(x[Math.floor(t * (x.length - 1))]) * R * 0.09 : 0;
        const r = R * (0.36 + 0.62 * t) + wiggle;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    },
    clear() {},
  };
}

/**
 * Scope E · Brush. The loop painted in one calligraphic stroke: a flat nib at
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

/**
 * Scope F · Waveform Bars. The sound as a level meter you can read: the signal
 * binned into bars across the scope's diameter, mirrored about its centre
 * line, with Ivory peak caps that fall slowly. Time reads left to right.
 */
export function createBarScope(): ScopePainter {
  const BARS = 40;
  let peaks = new Array<number>(BARS).fill(0);
  return {
    paint(frame) {
      const { ctx, composition, dt, reducedMotion, tokens } = frame;
      const { centerX: cx, centerY: cy } = composition;
      const width = Math.min(composition.usable.width - 32, composition.hilbertRadius * 1.6);
      const half = composition.hilbertRadius * 0.6;
      const x = frame.wave?.x;
      const step = width / BARS;
      ctx.save();
      for (let i = 0; i < BARS; i++) {
        let value = 0;
        if (x && !reducedMotion) {
          const from = Math.floor((i / BARS) * x.length);
          const to = Math.floor(((i + 1) / BARS) * x.length);
          for (let j = from; j < to; j++) value = Math.max(value, Math.abs(scopeScale(x[j])));
        } else if (frame.notes.length) {
          value = 0.25;
        }
        const height = value * half;
        peaks[i] = Math.max(height, peaks[i] - dt * half * 0.8);
        const left = cx - width / 2 + i * step;
        ctx.fillStyle = frame.noteColor(frame.leadNote);
        ctx.fillRect(left, cy - height, step * 0.62, height * 2);
        if (peaks[i] > 1) {
          ctx.fillStyle = tokens.ivory;
          ctx.fillRect(left, cy - peaks[i] - 3, step * 0.62, 2);
          ctx.fillRect(left, cy + peaks[i] + 1, step * 0.62, 2);
        }
      }
      ctx.restore();
    },
    clear() { peaks = new Array<number>(BARS).fill(0); },
  };
}

