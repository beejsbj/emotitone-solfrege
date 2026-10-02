import { drawMarkOnCanvas, type MarkName } from "@/components/primatives/marks";
import { resolveAmbientLevel } from "@/composables/canvas/stageRuntime";
import type { ActiveNote } from "@/types/music";
import { randomMark, scopePoints, stringOffset } from "./shared";
import type { AtmospherePainter, FlecksPainter, LabFrame, ScopePainter, StringsPainter } from "./types";

/*
 * The digital family: the Stage as a dot-matrix panel. Every LED layer
 * shares one grid pitch from the Stage size, so layers line up when they
 * are combined. A layer draws into its own low-resolution buffer, which is
 * scaled up and cut into dots; only lit pixels survive.
 */

const DECAY_HALF_LIFE = 0.09;

export const ledCell = (frame: LabFrame) =>
  Math.max(6, Math.min(10, Math.round(Math.min(frame.width, frame.composition.usable.height || frame.height) / 56)));

function dotTile(cell: number, dpr: number, fill: string, background: string | null) {
  const size = Math.round(cell * dpr);
  const tile = document.createElement("canvas");
  tile.width = tile.height = size;
  const ctx = tile.getContext("2d")!;
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, size, size); }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
  ctx.fill();
  return tile;
}

/** One LED layer: a decaying low-resolution buffer presented as lit dots only. */
class LedRaster {
  private buffer: HTMLCanvasElement | null = null;
  private bufferCtx: CanvasRenderingContext2D | null = null;
  private mask: CanvasPattern | null = null;
  private maskKey = "";
  cell = 8;

  begin(frame: LabFrame, decay: boolean) {
    this.cell = ledCell(frame);
    const cols = Math.ceil(frame.width / this.cell);
    const rows = Math.ceil(frame.height / this.cell);
    if (!this.buffer) {
      this.buffer = document.createElement("canvas");
      this.bufferCtx = this.buffer.getContext("2d");
    }
    if (this.buffer.width !== cols || this.buffer.height !== rows) {
      this.buffer.width = cols;
      this.buffer.height = rows;
    }
    const ctx = this.bufferCtx!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (decay && !frame.reducedMotion) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${1 - 0.5 ** (frame.dt / DECAY_HALF_LIFE)})`;
      ctx.fillRect(0, 0, cols, rows);
      ctx.restore();
    } else {
      ctx.clearRect(0, 0, cols, rows);
    }
    ctx.setTransform(1 / this.cell, 0, 0, 1 / this.cell, 0, 0);
    return ctx;
  }

  present(frame: LabFrame) {
    const { ctx } = frame;
    const dpr = ctx.canvas.width / frame.width;
    const key = `${this.cell}:${dpr}`;
    if (key !== this.maskKey) {
      this.maskKey = key;
      this.mask = ctx.createPattern(dotTile(this.cell, dpr, "#000", null), "repeat");
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffer!, 0, 0, this.buffer!.width * this.cell * dpr, this.buffer!.height * this.cell * dpr);
    if (this.mask) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = this.mask;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.restore();
  }

  clear() { this.bufferCtx?.clearRect(0, 0, this.buffer?.width ?? 0, this.buffer?.height ?? 0); }
}

/** Atmosphere C · Unlit Panel: the dot grid itself; its backlight breathes and rises with sound. */
export function createPanelAtmosphere(): AtmospherePainter {
  let pattern: CanvasPattern | null = null;
  let key = "";
  return {
    paint(frame) {
      const { ctx, width, height, tokens } = frame;
      ctx.fillStyle = tokens.ink;
      ctx.fillRect(0, 0, width, height);
      const level = resolveAmbientLevel(frame.audio, frame.elapsed, frame.reducedMotion);
      const dpr = ctx.canvas.width / width;
      const cell = ledCell(frame);
      // Two backlight steps only: hardware, not a gradient.
      const fill = level > 0.86 ? tokens.ink4 : tokens.ink3;
      const nextKey = `${cell}:${dpr}:${fill}`;
      if (nextKey !== key) {
        key = nextKey;
        pattern = ctx.createPattern(dotTile(cell, dpr, fill, null), "repeat");
      }
      if (!pattern) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    },
  };
}

/** Strings C · LED Columns: each string a column of dots, displaced a whole pixel at a time. */
export function createColumnStrings(): StringsPainter {
  const raster = new LedRaster();
  return {
    paint(frame, strings) {
      const led = raster.begin(frame, false);
      const { composition, elapsed, reducedMotion } = frame;
      const h = composition.usable.height;
      led.lineWidth = raster.cell * 0.9;
      led.lineCap = "square";
      strings.forEach((string) => {
        if (string.opacity <= 0.001) return;
        const sounding = string.isActive && string.amplitude > 0.5;
        led.strokeStyle = string.color;
        led.globalAlpha = sounding ? 1 : Math.min(1, string.opacity * 1.3);
        led.beginPath();
        for (let y = 0; y <= h; y += raster.cell) {
          const x = string.x + (reducedMotion ? 0 : stringOffset(string, elapsed, y, h));
          if (y === 0) led.moveTo(x, y); else led.lineTo(x, y);
        }
        led.stroke();
      });
      led.globalAlpha = 1;
      raster.present(frame);
    },
  };
}

/** Scope C · Dot Trace: the loop rasterised onto the grid; decaying LEDs give it a trail. */
export function createDotScope(): ScopePainter {
  const raster = new LedRaster();
  return {
    paint(frame) {
      const led = raster.begin(frame, true);
      const { composition, reducedMotion } = frame;
      led.strokeStyle = frame.noteColor(frame.leadNote, { l: 1.3, c: 0.85 });
      led.lineWidth = raster.cell * 1.05;
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
      raster.present(frame);
    },
    clear() { raster.clear(); },
  };
}

interface Pop { x: number; y: number; age: number; mark: MarkName; color: string }

/** Flecks C · Pixel Marks: a Mark glyph lights on the grid for a moment, then decays. */
export function createPixelFlecks(): FlecksPainter {
  const raster = new LedRaster();
  let pops: Pop[] = [];
  return {
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
        });
      }
      if (pops.length > 60) pops = pops.slice(-60);
    },
    paint(frame) {
      const led = raster.begin(frame, true);
      pops = pops.filter((pop) => {
        pop.age += frame.dt;
        if (pop.age > 0.4) return false;
        led.save();
        led.fillStyle = pop.color;
        led.translate(pop.x, pop.y);
        drawMarkOnCanvas(led, pop.mark, 3.4 * raster.cell);
        led.restore();
        return true;
      });
      raster.present(frame);
    },
    clear() { pops = []; raster.clear(); },
  };
}
