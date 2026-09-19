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
  it("leaves both phone-triad joins readable around the central chord", () => {
    const { scene, ctx, render } = setup(390, 395, "CM");
    scene.connectionMode = "merge"; scene.mergeCenter = { x: 279, y: 153 };
    scene.auxiliaryLabels = [
      { x: 265, y: 167, size: "sm", lines: ["-3M"], notePair: ["e", "c"] },
      { x: 296, y: 175, size: "sm", lines: ["3m"], notePair: ["e", "g"] },
      { x: 244, y: 70, size: "sm", lines: ["5P"], notePair: ["c", "g"] },
    ];
    scene.renderedConnections = [
      { notePair: ["e", "c"], material: "merge", colors: ["red", "green"], opacity: 1,
        points: [{ x: 312, y: 263 }, { x: 279, y: 158 }, { x: 215, y: 73 }] },
      { notePair: ["e", "g"], material: "merge", colors: ["green", "blue"], opacity: 1,
        points: [{ x: 312, y: 263 }, { x: 308, y: 171 }, { x: 275, y: 89 }] },
    ];
    const text = vi.spyOn(ctx, "fillText"); render(1000, true);
    expect(text).toHaveBeenCalledWith("-3M", 0, 0);
    expect(text).toHaveBeenCalledWith("3m", 0, 0);
    expect(text.mock.calls.some(([s]) => s === "5P")).toBe(false);
  });

  it("does not overprint independently fitted Merge emotion rows at the bottom edge", () => {
    const { scene, ctx, render } = setup(400, 250, "CM");
    scene.connectionMode = "merge"; scene.mergeCenter = { x: 200, y: 150 };
    scene.primaryLabel!.lines[1] = Array(100).fill("X").join(" ");
    const baselines: number[] = [];
    vi.spyOn(ctx, "fillText").mockImplementation((text, x, y) => {
      if (text === "X" && x === 0 && y === 0) baselines.push(ctx.getTransform().f);
    });
    render(1000, true);
    const rows: number[] = [];
    baselines.sort((a, b) => a - b).forEach(y => {
      if (!rows.length || y - rows[rows.length - 1] > 8) rows.push(y);
    });
    expect(rows).toHaveLength(2);
    expect(rows[1] - rows[0]).toBeGreaterThanOrEqual(24);
  });

  it("fits Merge emotion independently without pushing an edge-adjacent chord off its centre", () => {
    const { scene, ctx, render } = setup(400, 300, "CM");
    scene.connectionMode = "merge";
    scene.mergeCenter = { x: 350, y: 200 };
    scene.primaryLabel!.lines[1] = "Bright, joyful optimism & Home, rest, stability";
    const translates = vi.spyOn(ctx, "translate");
    const text = vi.spyOn(ctx, "fillText");
    render(1000, true);
    expect(translates.mock.calls[0]).toEqual([350, 181]);
    expect(text.mock.calls.some(([s]) => s === "B")).toBe(true);
  });

  it("keeps the Merge chord at its material centre and intervals at fused joins", () => {
    const { ctx, scene, render } = setup(400, 300, "CM");
    scene.connectionMode = "merge";
    scene.mergeCenter = { x: 210, y: 140 };
    scene.auxiliaryLabels = [{ x: 0, y: 0, size: "md", lines: ["3M"], notePair: ["a", "b"] }];
    scene.renderedConnections = [{ notePair: ["a", "b"], material: "merge", colors: ["red", "green"], opacity: 1,
      points: [{ x: 85, y: 140 }, { x: 95, y: 140 }] }];
    const translates = vi.spyOn(ctx, "translate");
    const text = vi.spyOn(ctx, "fillText");
    const gradient = vi.spyOn(ctx, "createLinearGradient");
    const first = render(1000, true);
    expect(translates.mock.calls[0]).toEqual([90, 140]);
    // First chord line's midpoint is 19px below the group's origin.
    expect(translates.mock.calls[1]).toEqual([210, 121]);
    expect(text).toHaveBeenCalledWith("3M", 0, 0);
    expect(gradient).not.toHaveBeenCalled();
    expect(render(2000, true).equals(first)).toBe(true);
  });

  it("slides competing intervals along their filaments and stays still for Reduced Motion", () => {
    const { ctx, scene, render } = setup(400, 240);
    scene.primaryLabel = null;
    scene.auxiliaryLabels = [
      { x: 200, y: 100, size: "md", lines: ["3M"], notePair: ["a", "b"] },
      { x: 200, y: 100, size: "md", lines: ["5P"], notePair: ["c", "d"] },
    ];
    scene.renderedConnections = scene.auxiliaryLabels.map(label => ({ notePair: label.notePair!,
      colors: ["red", "green"], opacity: 1, points: [{ x: 30, y: 100 }, { x: 370, y: 100 }] }));
    const translate = vi.spyOn(ctx, "translate");
    const gradient = vi.spyOn(ctx, "createLinearGradient");
    const initial = render(1000, true);
    expect(gradient).toHaveBeenCalledTimes(2);
    expect(translate.mock.calls).toHaveLength(2);
    expect(Math.abs(translate.mock.calls[0][0] - translate.mock.calls[1][0])).toBeGreaterThan(40);
    expect(translate.mock.calls.every(([, y]) => y === 100)).toBe(true);
    expect(render(2000, true).equals(initial)).toBe(true);
  });

  it("pins Web lettering to its filament and moves a colliding emotion instead", () => {
    const { ctx, scene, render, draw } = setup(390, 330);
    scene.primaryLabel!.lines = ["Bright, joyful optimism & Home, rest, stability"];
    scene.primaryLabel!.roles = ["emotion"];
    scene.auxiliaryLabels = [{ x: 195, y: 165, size: "md", lines: ["-3M"], notePair: ["e", "c"] }];
    scene.renderedConnections = [{ notePair: ["c", "e"], colors: ["red", "green"], opacity: 1,
      points: [{ x: 40, y: 165 }, { x: 350, y: 165 }] }];
    const text = vi.spyOn(ctx, "fillText");
    const translate = vi.spyOn(ctx, "translate");
    const gradient = vi.spyOn(ctx, "createLinearGradient");
    render(1000, true);
    expect(text.mock.calls.filter(([s]) => s === "-3M")).toHaveLength(1);
    expect(translate.mock.calls[0]).toEqual([195, 165]);
    expect(translate.mock.calls[1][1]).not.toBe(165 - 32);
    expect(gradient).toHaveBeenCalledWith(40, 165, 350, 165);
    text.mockClear(); gradient.mockClear();
    draw(ctx, scene, 1, false, { now: 2000, reducedMotion: true });
    expect(text.mock.calls.some(([s]) => s === "-3M")).toBe(false);
    expect(gradient).not.toHaveBeenCalled();
  });

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

  it("keeps a crowded Web interval legible when the primary has no clear position", () => {
    const { ctx, scene, render } = setup(320, 100);
    scene.primaryLabel!.lines = ["Bright, joyful optimism & Home, rest, stability"];
    scene.primaryLabel!.roles = ["emotion"];
    scene.auxiliaryLabels = [{ x: 160, y: 50, size: "md", lines: ["3M"], notePair: ["c", "e"] }];
    scene.renderedConnections = [{ notePair: ["c", "e"], colors: ["red", "green"], opacity: 1,
      points: [{ x: 30, y: 50 }, { x: 290, y: 50 }] }];
    const text = vi.spyOn(ctx, "fillText");
    render(1000, true);
    expect(text.mock.calls.map(([s]) => s)).toEqual(["3M"]);
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
