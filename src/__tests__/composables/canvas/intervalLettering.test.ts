import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it, vi } from "vitest";
import { layoutIntervalLettering, paintIntervalLettering } from "@/composables/canvas/intervalLettering";
import type { HarmonicConnectionPath, HarmonicGeometryLabel } from "@/types/canvas";

const label: HarmonicGeometryLabel = { x: 0, y: 0, size: "md", lines: ["-3M"], notePair: ["e", "c"] };
const path: HarmonicConnectionPath = {
  notePair: ["c", "e"], points: [{ x: 30, y: 100 }, { x: 370, y: 100 }], colors: ["#ff0000", "#00ff00"], opacity: 1,
};

describe("filament interval lettering", () => {
  it.each([false, true])("routes interval material through the shared silhouette painter (motion %s)", deform => {
    const ctx = createCanvas(400, 240).getContext("2d") as unknown as CanvasRenderingContext2D;
    const paintGlyph = vi.fn(() => true);
    const text = vi.spyOn(ctx, "fillText");
    paintIntervalLettering(ctx, layoutIntervalLettering(label, path, 32)!, {
      opacity: 1, font: "sans-serif", ink: "black", ivory: "white", deform, paintGlyph,
    });
    expect(paintGlyph.mock.calls.map(call => call[0]).join("")).toBe("-3M");
    expect(text).not.toHaveBeenCalled();
  });

  const deformation = (points: HarmonicConnectionPath["points"]) => {
    const ctx = createCanvas(400, 240).getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.font = "400 16px sans-serif";
    const layout = layoutIntervalLettering(label, { ...path, material: "merge", points },
      ctx.measureText(label.lines[0]).width)!;
    const translate = vi.spyOn(ctx, "translate"), rotate = vi.spyOn(ctx, "rotate");
    const fillText = vi.spyOn(ctx, "fillText");
    paintIntervalLettering(ctx, layout, {
      opacity: 1, font: "sans-serif", ink: "black", ivory: "white", deform: true,
    });
    return { translations: translate.mock.calls, rotations: rotate.mock.calls,
      glyphs: fillText.mock.calls.map(call => call[0]) };
  };

  it("flexes letters along actual geometry, deterministically and within padding", () => {
    const points = [{ x: 30, y: 120 }, { x: 200, y: 80 }, { x: 370, y: 120 }];
    const bent = deformation(points), straight = deformation(path.points);
    expect(deformation(points)).toEqual(bent);
    expect(bent.glyphs).toEqual(["-", "3", "M"]);
    expect(bent.translations.slice(1).some(([, y]) => Math.abs(y) > 0.1)).toBe(true);
    expect(straight.translations.slice(1).every(([, y]) => y === 0)).toBe(true);
    expect(bent.rotations.slice(1).some(([angle]) => Math.abs(angle) > 0.01)).toBe(true);
    expect(bent.rotations.slice(1).every(([angle]) => Math.abs(angle) <= 0.1)).toBe(true);
    expect(bent.translations.slice(1).every(([, y]) => Math.abs(y) <= 2)).toBe(true);
    expect(bent.translations.slice(1).map(([x]) => x))
      .toEqual(straight.translations.slice(1).map(([x]) => x));
  });

  it("keeps reversed necks reading in the same direction with the same deformation", () => {
    const points = [{ x: 30, y: 120 }, { x: 200, y: 80 }, { x: 370, y: 120 }];
    const forward = deformation(points), reversed = deformation([...points].reverse());
    expect(reversed.glyphs).toEqual(forward.glyphs);
    reversed.translations.forEach((point, i) => point.forEach((value, axis) =>
      expect(value).toBeCloseTo(forward.translations[i][axis])));
    reversed.rotations.forEach(([value], i) => expect(value).toBeCloseTo(forward.rotations[i][0]));
  });

  it.each([0, 0.01, 4])("keeps deformed short Merge joins finite at %s px", length => {
    const result = deformation([{ x: 100, y: 100 }, { x: 100 + length, y: 100 }]);
    expect(result.translations.flat().every(Number.isFinite)).toBe(true);
    expect(result.rotations.flat().every(Number.isFinite)).toBe(true);
    expect(result.glyphs.join("")).toBe("-3M");
  });

  it("never tips individual letters upside down at near-vertical joins", () => {
    const result = deformation([{ x: 100, y: 10 }, { x: 100, y: 120 }, { x: 102, y: 230 }]);
    const base = result.rotations[0][0];
    expect(result.rotations.slice(1).every(([angle]) => Math.abs(base + angle) <= Math.PI / 2)).toBe(true);
  });

  it.each([0, 12, 100])("retains Merge neck anchors at %s px, without a line or badge", length => {
    const merged = { ...path, material: "merge" as const,
      points: [{ x: 100 - length / 2, y: 100 }, { x: 100 + length / 2, y: 100 }] };
    const layout = layoutIntervalLettering(label, merged, 30)!;
    expect(layout).not.toBeNull();
    expect(layout.box.x).toBe(100); expect(layout.box.y).toBe(100);
    const ctx = createCanvas(200, 200).getContext("2d") as unknown as CanvasRenderingContext2D;
    const stroke = vi.spyOn(ctx, "stroke"); const fill = vi.spyOn(ctx, "fill");
    const text = vi.spyOn(ctx, "fillText");
    paintIntervalLettering(ctx, layout, { opacity: 1, font: "sans-serif", ink: "black", ivory: "white" });
    expect(stroke).not.toHaveBeenCalled(); expect(fill).not.toHaveBeenCalled();
    expect(text).toHaveBeenCalledWith("-3M", 0, 0);
  });

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
