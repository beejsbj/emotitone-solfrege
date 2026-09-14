import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { layoutIntervalLettering, paintIntervalLettering } from "@/composables/canvas/intervalLettering";
import type { HarmonicConnectionPath, HarmonicGeometryLabel } from "@/types/canvas";

const label: HarmonicGeometryLabel = { x: 0, y: 0, size: "md", lines: ["-3M"], notePair: ["e", "c"] };
const path: HarmonicConnectionPath = {
  notePair: ["c", "e"], points: [{ x: 30, y: 100 }, { x: 370, y: 100 }], colors: ["#ff0000", "#00ff00"], opacity: 1,
};

describe("filament interval lettering", () => {
  it("uses the actual path midpoint and leaves signed musical text unchanged", () => {
    const layout = layoutIntervalLettering(label, path, 30)!;
    expect(layout.box.x).toBe(200); expect(layout.box.y).toBe(100);
    expect(layout.label.lines).toEqual(["-3M"]);
    expect(layout.angle).toBe(0);
  });

  it.each([false, true])("follows a steep tangent without turning upside down (reverse %s)", reverse => {
    const points = [{ x: 100, y: 30 }, { x: 150, y: 300 }];
    const layout = layoutIntervalLettering(label, { ...path, points: reverse ? points.reverse() : points }, 30)!;
    expect(layout.angle).toBeCloseTo(Math.atan2(270, 50));
    expect(layout.angle).toBeGreaterThan(0.55);
  });

  it("ignores degenerate paths without producing NaN geometry", () => {
    expect(layoutIntervalLettering(label, { ...path, points: [] }, 30)).toBeNull();
    expect(layoutIntervalLettering(label, { ...path, points: [{ x: 1, y: 1 }, { x: 1, y: 1 }] }, 30)).toBeNull();
  });

  it("falls back when there is no room for text plus visible connection ends", () => {
    expect(layoutIntervalLettering(label, { ...path, points: [{ x: 0, y: 0 }, { x: 20, y: 0 }] }, 30)).toBeNull();
  });

  it("honors zero Web strength without hiding independently enabled interval text", () => {
    const ctx = createCanvas(400, 200).getContext("2d") as unknown as CanvasRenderingContext2D;
    paintIntervalLettering(ctx, layoutIntervalLettering(label, { ...path, opacity: 0 }, 60)!, {
      opacity: 1, font: "sans-serif", ink: "#0a0908", ivory: "#f4efe6",
    });
    expect(ctx.getImageData(50, 100, 1, 1).data[3]).toBe(0);
    expect(ctx.getImageData(170, 80, 60, 40).data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  });

  it("draws coloured ends with an unpainted gap, preserving the underlying Stage", () => {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = "#123456"; ctx.fillRect(0, 0, 400, 200);
    paintIntervalLettering(ctx, layoutIntervalLettering(label, path, 60)!, {
      opacity: 1, font: "sans-serif", ink: "#0a0908", ivory: "#f4efe6",
    });
    const pixel = (x: number) => [...ctx.getImageData(x, 100, 1, 1).data];
    expect(pixel(172)).toEqual([18, 52, 86, 255]);
    expect(pixel(228)).toEqual([18, 52, 86, 255]);
    expect(pixel(50)[0]).toBeGreaterThan(pixel(50)[1]);
    expect(pixel(350)[1]).toBeGreaterThan(pixel(350)[0]);
  });
});
