import { drawMarkOnCanvas, type MarkName } from "@/components/primatives/marks";
import type { ActiveNote } from "@/types/music";
import { randomMark } from "./shared";
import type { FlecksPainter, LabFrame } from "./types";

/*
 * Flecks directions D–F. Still attack-only, still the whole Mark family
 * chosen at random, still nothing in flight under Reduced Motion. They change
 * where an attack's Marks come from and how they leave.
 */

interface Fleck {
  x: number; y: number; vx: number; vy: number;
  age: number; life: number; size: number; angle: number; spin: number;
  mark: MarkName; color: string;
  /** Orbiters: angle and radius around the scope until release. */
  orbit?: { angle: number; radius: number; speed: number; release: number };
}

function drawFleck(ctx: CanvasRenderingContext2D, fleck: Fleck, alpha: number, scale = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fleck.color;
  ctx.translate(fleck.x, fleck.y);
  ctx.rotate(fleck.angle);
  ctx.scale(scale, scale);
  drawMarkOnCanvas(ctx, fleck.mark, fleck.size);
  ctx.restore();
}

/**
 * Flecks D · Body Spray. Marks burst out of the note's own body, away from the
 * Stage centre, slow down and fade: the attack visibly belongs to that note.
 */
export function createSprayFlecks(): FlecksPainter {
  let flecks: Fleck[] = [];
  return {
    attack(frame: LabFrame, note: ActiveNote) {
      const body = frame.bodyAt(note.noteId);
      const { composition } = frame;
      const origin = body ?? { x: composition.centerX, y: composition.centerY, r: 20 };
      const away = Math.atan2(origin.y - composition.centerY, origin.x - composition.centerX);
      const color = frame.noteColor(note);
      for (let i = 0; i < 9; i++) {
        const angle = away + (Math.random() - 0.5) * 1.6;
        const speed = 90 + Math.random() * 140;
        flecks.push({
          x: origin.x + Math.cos(angle) * origin.r * 0.8,
          y: origin.y + Math.sin(angle) * origin.r * 0.8,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          age: 0, life: 0.9 + Math.random() * 0.5, size: 5 + Math.random() * 3,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 6,
          mark: randomMark(), color,
        });
      }
      if (flecks.length > 140) flecks = flecks.slice(-140);
    },
    paint(frame) {
      const { ctx, dt } = frame;
      flecks = flecks.filter((fleck) => {
        fleck.age += dt;
        if (fleck.age >= fleck.life) return false;
        const drag = 0.9 ** (dt * 60);
        fleck.vx *= drag; fleck.vy *= drag;
        fleck.x += fleck.vx * dt; fleck.y += fleck.vy * dt;
        fleck.angle += fleck.spin * dt;
        drawFleck(ctx, fleck, 1 - fleck.age / fleck.life);
        return true;
      });
    },
    clear() { flecks = []; },
  };
}

/**
 * Flecks E · Orbiters. An attack's Marks fall into orbit around the scope for
 * a beat, then fly off on their tangent and fade, like the scope flinging them.
 */
export function createOrbitFlecks(): FlecksPainter {
  let flecks: Fleck[] = [];
  return {
    attack(frame: LabFrame, note: ActiveNote) {
      const { composition } = frame;
      const color = frame.noteColor(note);
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < 6; i++) {
        flecks.push({
          x: composition.centerX, y: composition.centerY, vx: 0, vy: 0,
          age: 0, life: 1.9, size: 6, angle: 0, spin: 2,
          mark: randomMark(), color,
          orbit: {
            angle: base + (i / 6) * Math.PI * 2,
            radius: composition.hilbertRadius * (0.62 + Math.random() * 0.12),
            speed: 2.6 + Math.random() * 0.6,
            release: 0.9 + Math.random() * 0.3,
          },
        });
      }
      if (flecks.length > 120) flecks = flecks.slice(-120);
    },
    paint(frame) {
      const { ctx, dt, composition } = frame;
      flecks = flecks.filter((fleck) => {
        fleck.age += dt;
        if (fleck.age >= fleck.life) return false;
        const orbit = fleck.orbit!;
        if (fleck.age < orbit.release) {
          orbit.angle += orbit.speed * dt;
          fleck.x = composition.centerX + Math.cos(orbit.angle) * orbit.radius;
          fleck.y = composition.centerY + Math.sin(orbit.angle) * orbit.radius;
          // Leaving orbit: carry the tangential velocity it had.
          fleck.vx = -Math.sin(orbit.angle) * orbit.speed * orbit.radius;
          fleck.vy = Math.cos(orbit.angle) * orbit.speed * orbit.radius;
        } else {
          fleck.x += fleck.vx * dt; fleck.y += fleck.vy * dt;
        }
        fleck.angle += fleck.spin * dt;
        const fade = fleck.age < orbit.release ? 1 : 1 - (fleck.age - orbit.release) / (fleck.life - orbit.release);
        drawFleck(ctx, fleck, Math.max(0, fade));
        return true;
      });
    },
    clear() { flecks = []; },
  };
}

/**
 * Flecks F · Stamp Hit. One big Mark stamped onto the note's body on the
 * attack, landing with the system's elastic bounce and an Ink offset, then
 * lifting away. One fleck per note: an accent, not confetti.
 */
export function createStampFlecks(): FlecksPainter {
  let stamps: Fleck[] = [];
  const bounce = (t: number) => {
    // Overshoot then settle: the shared tactile grammar, compressed into 220ms.
    const p = Math.min(1, t / 0.22);
    return 1 + 0.45 * (1 - p) * Math.cos(p * Math.PI * 1.5);
  };
  return {
    attack(frame: LabFrame, note: ActiveNote) {
      const body = frame.bodyAt(note.noteId);
      const { composition } = frame;
      stamps.push({
        x: (body?.x ?? composition.centerX) + (Math.random() - 0.5) * 16,
        y: (body?.y ?? composition.centerY) - (body?.r ?? 20) * 0.9,
        vx: 0, vy: 0, age: 0, life: 0.9, size: Math.max(14, (body?.r ?? 20) * 0.8),
        angle: (Math.random() - 0.5) * 0.6, spin: 0,
        mark: randomMark(), color: frame.noteColor(note, { l: 1.15 }),
      });
      if (stamps.length > 24) stamps = stamps.slice(-24);
    },
    paint(frame) {
      const { ctx, dt, tokens } = frame;
      stamps = stamps.filter((stamp) => {
        stamp.age += dt;
        if (stamp.age >= stamp.life) return false;
        const scale = bounce(stamp.age);
        const alpha = stamp.age < 0.55 ? 1 : 1 - (stamp.age - 0.55) / (stamp.life - 0.55);
        const shadow = { ...stamp, x: stamp.x + 3, y: stamp.y + 3, color: tokens.ink };
        drawFleck(ctx, shadow, alpha, scale);
        drawFleck(ctx, stamp, alpha, scale);
        return true;
      });
    },
    clear() { stamps = []; },
  };
}
