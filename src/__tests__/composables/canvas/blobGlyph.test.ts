import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { describe, expect, it, vi } from "vitest";
import { createBlobGlyphPainter, deformGlyphPoint, traceGlyphMask, type BlobGlyphOptions } from "@/composables/canvas/blobGlyph";

GlobalFonts.registerFromPath("src/assets/fonts/lets-jazz-regular.otf", "Blob Jazz Test");
const options: BlobGlyphOptions = {
  size: 38, font: '38px "Blob Jazz Test"', ivory: "#f2efe5", ink: "#161510",
  color: "#78aa92", shape: { stretch: 0, bend: 0 }, seed: 21, role: "chord",
};
const context = (width = 100, height = 100) => createCanvas(width, height).getContext("2d") as unknown as CanvasRenderingContext2D;
const factory = (width: number, height: number) => context(width, height);

function painted(text: string, overrides: Partial<BlobGlyphOptions> = {}) {
  const ctx = context();
  ctx.translate(50, 50);
  expect(createBlobGlyphPainter(factory).paint(ctx, text, { ...options, ...overrides })).toBe(true);
  return ctx.getImageData(0, 0, 100, 100).data;
}

function holes(data: Uint8ClampedArray, width = 100) {
  const visited = new Uint8Array(data.length / 4);
  let count = 0;
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] >= 128) continue;
    const queue = [start];
    visited[start] = 1;
    let boundary = false;
    for (let i = 0; i < queue.length; i++) {
      const index = queue[i], x = index % width, y = Math.floor(index / width);
      if (!x || !y || x === width - 1 || y === visited.length / width - 1) boundary = true;
      for (const neighbor of [index - width, index + width, ...(x ? [index - 1] : []), ...(x < width - 1 ? [index + 1] : [])]) {
        if (neighbor < 0 || neighbor >= visited.length || visited[neighbor] || data[neighbor * 4 + 3] >= 128) continue;
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    if (!boundary && queue.length > 2) count++;
  }
  return count;
}

describe("blob glyph material", () => {
  it("traces outer boundaries and holes without joining diagonal components", () => {
    const mask = new Uint8ClampedArray(7 * 7 * 4);
    for (let y = 1; y < 5; y++) for (let x = 1; x < 5; x++) {
      if (x === 1 || x === 4 || y === 1 || y === 4) mask[(y * 7 + x) * 4 + 3] = 255;
    }
    mask[(5 * 7 + 5) * 4 + 3] = 255;
    const loops = traceGlyphMask(mask, 7, 7);
    expect(loops).toHaveLength(3);
    expect(loops.flat().every(point => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  it("keeps Jazz counters open after inflation, smoothing and maximum deformation", () => {
    for (const [size, role] of [[38, "chord"], [18, "emotion"], [16, "interval"]] as const) {
      for (const shape of [{ stretch: 0, bend: 0 }, { stretch: 1, bend: -1 }, { stretch: -1, bend: 1 }]) {
        const state = { shape, size, role, font: `${size}px "Blob Jazz Test"` };
        expect(holes(painted("O", state)), `O at ${size}px`).toBe(1);
        expect(holes(painted("B", state)), `B at ${size}px`).toBe(2);
      }
    }
  });

  it("preserves case-sensitive musical qualifiers as distinct silhouettes", () => {
    for (const size of [16, 18, 38]) {
      const overrides = { size, font: `${size}px "Blob Jazz Test"`, role: "interval" as const };
      expect(painted("M", overrides)).not.toEqual(painted("m", overrides));
      expect(painted("#", overrides)).not.toEqual(painted("b", overrides));
    }
  });

  it("keeps the small lowercase a/e counters in chord and emotion text", () => {
    for (const [size, role] of [[38, "chord"], [18, "emotion"]] as const) {
      for (const text of ["a", "e"]) {
        expect(holes(painted(text, { size, role, font: `${size}px "Blob Jazz Test"` })), `${text} at ${size}px`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("changes actual edge pixels with shape and is deterministic without a clock", () => {
    const neutral = painted("Cm7");
    expect(painted("Cm7")).toEqual(neutral);
    const strained = painted("Cm7", { shape: { stretch: 1, bend: -1 } });
    expect(strained).not.toEqual(neutral);
    expect(painted("Cm7", { shape: { stretch: 1, bend: -1 } })).toEqual(strained);
  });

  it("bounds non-affine displacement and handles invalid geometry inputs", () => {
    for (const role of ["chord", "emotion", "interval"] as const) {
      const bound = role === "chord" ? 2 : 0.7;
      for (const x of [-100, -3, 0, 3, 100]) for (const y of [-100, -3, 0, 3, 100]) {
        const point = deformGlyphPoint({ x, y }, { ...options, role, shape: { stretch: Infinity, bend: 1000 }, seed: NaN });
        expect(Math.abs(point.x - x)).toBeLessThanOrEqual(bound);
        expect(Math.abs(point.y - y)).toBeLessThanOrEqual(bound);
      }
    }
    const displacements = [-12, -6, 0, 6, 12].map(y => deformGlyphPoint({ x: 0, y }, options).x);
    expect(displacements[0] - 2 * displacements[1] + displacements[2]).not.toBeCloseTo(0, 4);
  });

  it("reads a mask only on cache misses, not for live shape/color/seed changes", () => {
    let reads = 0;
    const make = vi.fn((width: number, height: number) => {
      const ctx = context(width, height);
      const read = ctx.getImageData.bind(ctx);
      ctx.getImageData = (...args: Parameters<CanvasRenderingContext2D["getImageData"]>) => {
        reads++;
        return read(...args);
      };
      return ctx;
    });
    const painter = createBlobGlyphPainter(make), ctx = context();
    for (let index = 0; index < 10; index++) painter.paint(ctx, "C", {
      ...options, shape: { stretch: index / 10, bend: 0 }, seed: index, color: `rgb(${index}, 100, 100)`,
    });
    expect(make).toHaveBeenCalledTimes(1);
    expect(reads).toBe(1);
    painter.clear();
    painter.paint(ctx, "C", options);
    expect(reads).toBe(2);
  });

  it("bounds the outline cache to 128 font/glyph variants", () => {
    const make = vi.fn(factory), painter = createBlobGlyphPainter(make), ctx = context();
    for (let index = 0; index < 129; index++) painter.paint(ctx, "C", { ...options, font: `${options.font}, "cache-${index}"` });
    expect(make).toHaveBeenCalledTimes(129);
    painter.paint(ctx, "C", { ...options, font: `${options.font}, "cache-0"` });
    expect(make).toHaveBeenCalledTimes(130);
    painter.paint(ctx, "C", { ...options, font: `${options.font}, "cache-128"` });
    expect(make).toHaveBeenCalledTimes(130);
  });

  it("restores the caller's canvas state and adds no shadow or stroke", () => {
    const ctx = context();
    ctx.fillStyle = "#ff0000";
    ctx.strokeStyle = "#00ff00";
    ctx.font = "17px serif";
    ctx.globalAlpha = 0.4;
    ctx.translate(50, 50);
    const matrix = ctx.getTransform();
    const stroke = vi.spyOn(ctx, "stroke"), fillText = vi.spyOn(ctx, "fillText");
    createBlobGlyphPainter(factory).paint(ctx, "C", options);
    // Native canvas's gradient getter remains stale after restore; actual paint
    // state is authoritative, matching browser CanvasRenderingContext2D behavior.
    ctx.fillRect(-50, -50, 2, 2);
    expect(Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3)).toEqual([255, 0, 0]);
    expect(ctx.strokeStyle).toBe("#00ff00");
    expect(ctx.font).toBe("17px serif");
    expect(ctx.globalAlpha).toBeCloseTo(0.4);
    expect(ctx.getTransform()).toEqual(matrix);
    expect(stroke).not.toHaveBeenCalled();
    expect(fillText).not.toHaveBeenCalled();
  });

  it("falls back cleanly when scratch contexts are unavailable", () => {
    const painter = createBlobGlyphPainter(() => null), ctx = context();
    expect(painter.paint(ctx, "C", options)).toBe(false);
    expect(painter.paint(ctx, " ", options)).toBe(true);
    expect(painter.paint(ctx, "C", { ...options, size: NaN })).toBe(false);
  });
});
