import { drawMarkOnCanvas, type MarkName } from "@/components/primatives/marks";
import { resolveAmbientLevel } from "@/composables/canvas/stageRuntime";
import type { ActiveNote } from "@/types/music";
import { randomMark, scopePoints, soundLevel, stringOffset } from "./shared";
import type { AtmospherePainter, FlecksPainter, LabFrame, ScopePainter, StringsPainter } from "./types";

/*
 * The light family: beam traces on Ink that decay the way phosphor does.
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

/** Atmosphere A · Graticule: Ink ground; a scope reticle whose edge-light answers the music. */
export const graticuleAtmosphere: AtmospherePainter = {
  paint(frame) {
    const { ctx, width, height, composition, tokens } = frame;
    ctx.fillStyle = tokens.ink;
    ctx.fillRect(0, 0, width, height);
    if (composition.suspended) return;
    const level = resolveAmbientLevel(frame.audio, frame.elapsed, frame.reducedMotion);
    const lit = Math.max(0, (level - 0.64) / 0.36);
    const { centerX: cx, centerY: cy, usable } = composition;
    const r = Math.min(composition.hilbertRadius, Math.min(usable.width, usable.height) * 0.46);
    ctx.save();
    ctx.strokeStyle = frame.noteColor(frame.leadNote, { l: 1.15, c: 0.55, alpha: 0.07 + lit * 0.16 });
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(usable.x + 14, cy); ctx.lineTo(usable.x + usable.width - 14, cy);
    ctx.moveTo(cx, usable.y + 14); ctx.lineTo(cx, usable.y + usable.height - 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    const step = r / 5;
    for (let i = -12; i <= 12; i++) {
      if (!i) continue;
      const x = cx + i * step;
      const y = cy + i * step;
      if (x > usable.x + 14 && x < usable.x + usable.width - 14) { ctx.moveTo(x, cy - 3); ctx.lineTo(x, cy + 3); }
      if (y > usable.y + 14 && y < usable.y + usable.height - 14) { ctx.moveTo(cx - 3, y); ctx.lineTo(cx + 3, y); }
    }
    ctx.stroke();
    ctx.restore();
  },
};

/** Strings A · Long Exposure: the envelope of a string's extremes with the live string burning inside. */
export const exposureStrings: StringsPainter = {
  paint(frame, strings) {
    const { ctx, composition, elapsed, reducedMotion } = frame;
    const h = composition.usable.height;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    strings.forEach((string) => {
      if (string.opacity <= 0.001) return;
      ctx.strokeStyle = string.color;
      const sounding = string.isActive && string.amplitude > 0.5 && !reducedMotion;
      if (sounding) {
        const reach = (y: number) => Math.abs(string.amplitude) * Math.sin((y / h) * Math.PI) * 1.15;
        ctx.globalAlpha = string.opacity * 0.16;
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const y = (i / 64) * h;
          if (i === 0) ctx.moveTo(string.x + reach(y), y); else ctx.lineTo(string.x + reach(y), y);
        }
        for (let i = 64; i >= 0; i--) {
          const y = (i / 64) * h;
          ctx.lineTo(string.x - reach(y), y);
        }
        ctx.closePath();
        ctx.fillStyle = string.color;
        ctx.fill();
      }
      ctx.globalAlpha = string.opacity * (sounding ? 0.95 : 0.55);
      ctx.lineWidth = sounding ? 1.4 : 0.75;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const y = (i / 100) * h;
        const x = string.x + (reducedMotion ? 0 : stringOffset(string, elapsed, y, h));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.restore();
  },
};

interface Spark {
  x: number; y: number; vx: number; vy: number;
  age: number; life: number; size: number; spin: number; angle: number;
  mark: MarkName; color: string;
}

/** Flecks A · Sparks: Marks thrown off the scope's ring, streaking outward and decaying. */
export function createSparkFlecks(): FlecksPainter {
  let sparks: Spark[] = [];
  return {
    attack(frame, note: ActiveNote) {
      const { composition } = frame;
      const color = frame.noteColor(note, { l: 1.25, c: 0.8 });
      const ring = composition.hilbertRadius * 0.55;
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 90;
        sparks.push({
          x: composition.centerX + Math.cos(angle) * ring,
          y: composition.centerY + Math.sin(angle) * ring,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: 1.4 + Math.random() * 0.8,
          size: 6 + Math.random() * 4,
          spin: (Math.random() - 0.5) * 3,
          angle: Math.random() * Math.PI * 2,
          mark: randomMark(),
          color,
        });
      }
      if (sparks.length > 140) sparks = sparks.slice(-140);
    },
    paint(frame) {
      const { ctx, dt } = frame;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      sparks = sparks.filter((spark) => {
        spark.age += dt;
        if (spark.age >= spark.life) return false;
        const drag = 0.9 ** (dt * 60);
        spark.vx *= drag;
        spark.vy *= drag;
        const px = spark.x;
        const py = spark.y;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.angle += spark.spin * dt;
        // Phosphor decay, not a linear fade: bright, then a long dim tail.
        ctx.globalAlpha = Math.exp(-spark.age * 1.8);
        ctx.strokeStyle = spark.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px - spark.vx * 0.1, py - spark.vy * 0.06);
        ctx.lineTo(spark.x, spark.y);
        ctx.stroke();
        ctx.fillStyle = spark.color;
        ctx.save();
        ctx.translate(spark.x, spark.y);
        ctx.rotate(spark.angle);
        drawMarkOnCanvas(ctx, spark.mark, spark.size);
        ctx.restore();
        return true;
      });
      ctx.restore();
    },
    clear() { sparks = []; },
  };
}
