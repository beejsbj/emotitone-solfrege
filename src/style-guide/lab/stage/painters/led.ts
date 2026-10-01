import { drawMarkOnCanvas, type MarkName } from "@/components/primatives/marks";
import { resolveAmbientLevel } from "@/composables/canvas/stageRuntime";
import type { ActiveNote } from "@/types/music";
import { randomMark, scopePoints, stringOffset } from "./shared";
import type { LabFrame, StageDirectionPainter } from "./types";

/*
 * Direction C · LED Matrix. The digital reading: the Stage is a dot-matrix
 * panel. Unlit LEDs are the chassis; every layer only lights pixels, and a
 * pixel's light decays by itself. Bodies and lettering stay smooth above it.
 */

interface Pixel { x: number; y: number; age: number; mark: MarkName; color: string; size: number }

const HOLD_S = 0.22;
const DECAY_HALF_LIFE = 0.09;

export function createLedPainter(): StageDirectionPainter {
  let buffer: HTMLCanvasElement | null = null;
  let bufferCtx: CanvasRenderingContext2D | null = null;
  let mask: CanvasPattern | null = null;
  let maskKey = "";
  let cell = 8;
  let pops: Pixel[] = [];

  const ensure = (frame: LabFrame) => {
    cell = Math.max(6, Math.min(10, Math.round(Math.min(frame.width, frame.composition.usable.height || frame.height) / 56)));
    const cols = Math.ceil(frame.width / cell);
    const rows = Math.ceil(frame.height / cell);
    if (!buffer) {
      buffer = document.createElement("canvas");
      bufferCtx = buffer.getContext("2d");
    }
    if (buffer.width !== cols || buffer.height !== rows) {
      buffer.width = cols;
      buffer.height = rows;
    }
    const dpr = frame.ctx.canvas.width / frame.width;
    const key = `${cell}:${dpr}:${frame.tokens.ink}`;
    if (key !== maskKey) {
      maskKey = key;
      const size = Math.round(cell * dpr);
      const tile = document.createElement("canvas");
      tile.width = tile.height = size;
      const tileCtx = tile.getContext("2d")!;
      tileCtx.fillStyle = frame.tokens.ink;
      tileCtx.fillRect(0, 0, size, size);
      tileCtx.globalCompositeOperation = "destination-out";
      tileCtx.beginPath();
      tileCtx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
      tileCtx.fill();
      mask = frame.ctx.createPattern(tile, "repeat");
    }
    bufferCtx!.setTransform(1 / cell, 0, 0, 1 / cell, 0, 0);
    return bufferCtx!;
  };

  return {
    atmosphere(frame) {
      const { ctx, width, height, tokens } = frame;
      const led = ensure(frame);
      ctx.fillStyle = tokens.ink;
      ctx.fillRect(0, 0, width, height);
      // Decay every lit pixel back toward the unlit LED.
      led.save();
      led.globalCompositeOperation = "source-over";
      const level = resolveAmbientLevel(frame.audio, frame.elapsed, frame.reducedMotion);
      // The unlit panel is the atmosphere: its backlight breathes in silence and rises with sound.
      led.globalAlpha = frame.reducedMotion ? 1 : 1 - 0.5 ** (frame.dt / DECAY_HALF_LIFE);
      led.fillStyle = level > 0.86 ? tokens.ink4 : tokens.ink3;
      led.fillRect(0, 0, width, height);
      led.restore();
    },

    strings(frame, strings) {
      const led = ensure(frame);
      const { composition, elapsed, reducedMotion } = frame;
      const h = composition.usable.height;
      led.save();
      led.lineWidth = cell * 0.9;
      led.lineCap = "square";
      strings.forEach((string) => {
        if (string.opacity <= 0.001) return;
        const sounding = string.isActive && string.amplitude > 0.5;
        led.strokeStyle = string.color;
        led.globalAlpha = sounding ? 1 : Math.min(1, string.opacity * 1.3);
        led.beginPath();
        for (let y = 0; y <= h; y += cell) {
          const x = string.x + (reducedMotion ? 0 : stringOffset(string, elapsed, y, h));
          if (y === 0) led.moveTo(x, y); else led.lineTo(x, y);
        }
        led.stroke();
      });
      led.restore();
    },

    scope(frame) {
      const led = ensure(frame);
      const { composition, reducedMotion } = frame;
      const hot = frame.noteColor(frame.leadNote, { l: 1.3, c: 0.85 });
      led.save();
      led.strokeStyle = hot;
      led.lineWidth = cell * 1.05;
      led.lineJoin = "round";
      if (reducedMotion || !frame.wave) {
        if (frame.notes.length) {
          led.beginPath();
          led.arc(composition.centerX, composition.centerY, composition.hilbertRadius * 0.5, 0, Math.PI * 2);
          led.stroke();
        }
      } else {
        const points = scopePoints(frame, 2);
        if (points.length && (frame.audio.envelope > 0.01 || frame.notes.length)) {
          led.beginPath();
          points.forEach((p, i) => (i ? led.lineTo(p.x, p.y) : led.moveTo(p.x, p.y)));
          led.stroke();
        }
      }
      led.restore();

      // Present the panel on the back canvas, beneath bodies and lettering: square pixels scaled up, then the LED mask turns each into a dot.
      const { ctx, width, height } = frame;
      const dpr = ctx.canvas.width / width;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(buffer!, 0, 0, buffer!.width * cell * dpr, buffer!.height * cell * dpr);
      if (mask) {
        ctx.fillStyle = mask;
        ctx.fillRect(0, 0, width * dpr, height * dpr);
      }
      ctx.restore();
    },

    attack(frame, note: ActiveNote) {
      const { usable } = frame.composition;
      const color = frame.noteColor(note, { l: 1.25, c: 0.85 });
      for (let i = 0; i < 5; i++) {
        pops.push({
          x: usable.x + 20 + Math.random() * Math.max(0, usable.width - 40),
          y: usable.y + 20 + Math.random() * Math.max(0, usable.height - 40),
          age: 0,
          mark: randomMark(),
          color,
          size: 2.2,
        });
      }
      if (pops.length > 60) pops = pops.slice(-60);
    },

    flecks(frame) {
      const led = ensure(frame);
      // A pop lights its glyph for a moment; the panel's own decay does the rest.
      pops = pops.filter((pop) => {
        pop.age += frame.dt;
        if (pop.age > HOLD_S) return false;
        led.save();
        led.fillStyle = pop.color;
        led.translate(pop.x, pop.y);
        drawMarkOnCanvas(led, pop.mark, pop.size * cell);
        led.restore();
        return true;
      });
    },

    clear() {
      pops = [];
      bufferCtx?.clearRect(0, 0, buffer?.width ?? 0, buffer?.height ?? 0);
    },
  };
}
