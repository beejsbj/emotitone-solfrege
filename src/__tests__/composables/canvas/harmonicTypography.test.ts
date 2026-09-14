import { describe, expect, it, vi } from "vitest";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { createHarmonicTypography } from "@/composables/canvas/harmonicTypography";
import type { HarmonicGeometryScene } from "@/types/canvas";

GlobalFonts.registerFromPath("src/assets/fonts/lets-jazz-regular.otf", "Lets Jazz");
function setup(width = 320, height = 240, title = "Cmaj9") {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  const scene: HarmonicGeometryScene = {
    viewport: { width, height }, points: [], orderedPoints: [],
    centroid: { x: width / 2, y: height / 2 }, radius: 80,
    boundaryEdges: [], interiorEdges: [], auxiliaryLabels: [],
    primaryLabel: { x: width / 2, y: height / 2, size: "lg",
      lines: [title, "Warm and wistful, spacious"], roles: ["chord", "emotion"] },
  };
  const draw = createHarmonicTypography();
  const render = (now: number, reducedMotion = false) => {
    ctx.clearRect(0, 0, width, height);
    draw(ctx, scene, 1, true, { now, reducedMotion });
    return canvas.toBuffer("image/png");
  };
  return { canvas, ctx, scene, draw, render };
}

describe("musical canvas typography", () => {
  it.each([0, 12])("keeps a dyad interval visible beside a long emotion phrase (offset %s)", (offset) => {
    const { ctx, scene, render } = setup(390, 330);
    scene.primaryLabel!.lines = ["Bright, joyful optimism & Home, rest, stability"];
    scene.primaryLabel!.roles = ["emotion"];
    scene.auxiliaryLabels = [{ x: 195 + offset, y: 165,
      lines: ["3M"], roles: ["interval"], size: "md", angle: 0.2 }];
    const text = vi.spyOn(ctx, "fillText");
    render(1000, true);
    expect(text).toHaveBeenCalledWith("3M", 0, 0);
  });

  it.each(["CM", "Csus4", "Caug"])("settles %s once and stays still", (title) => {
    const { render } = setup(320, 240, title);
    const entrance = render(1000);
    const settled = render(2000);
    expect(entrance.equals(settled)).toBe(false);
    expect(render(2500).equals(settled)).toBe(true);
  });

  it("renders the settled arrangement immediately for Reduced Motion", () => {
    const { render } = setup();
    const initial = render(1000, true);
    expect(render(1100, true).equals(initial)).toBe(true);
    expect(render(2000).equals(initial)).toBe(true);
  });

  it.each([0, 320])("keeps long annotations inside the canvas near x=%s", (x) => {
    const { scene, ctx, render } = setup();
    scene.primaryLabel!.x = x;
    scene.primaryLabel!.y = 0;
    scene.primaryLabel!.lines = ["Cmaj13#11/G", "Strength, confidence, dominance and forward motion"];
    render(1000, true);
    const data = ctx.getImageData(0, 0, 320, 240).data;
    let painted = 0;
    for (let y = 0; y < 240; y++) for (let x = 0; x < 320; x++) {
      if (!data[(y * 320 + x) * 4 + 3]) continue;
      painted++;
      expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(319);
      expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(239);
    }
    expect(painted).toBeGreaterThan(100);
  });

  it("resets entrances after labels disappear and preserves drawing state", () => {
    const { render, draw, ctx, scene } = setup();
    ctx.globalAlpha = 0.7;
    ctx.font = "12px monospace";
    const entrance = render(1000);
    render(2000);
    draw(ctx, null, 1, true);
    expect(render(3000).equals(entrance)).toBe(true);
    expect(ctx.globalAlpha).toBeCloseTo(0.7);
    expect(ctx.font).toBe("12px monospace");
    draw(ctx, scene, 0, true);
    expect(render(4000).equals(entrance)).toBe(true);
  });
});
