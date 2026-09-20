import { createCanvas } from "@napi-rs/canvas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { MAJOR_SOLFEGE } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useBlobRenderer } from "@/composables/canvas/useBlobRenderer";
import { useBlobFieldRenderer } from "@/composables/canvas/useBlobFieldRenderer";
import { resolveStageComposition } from "@/composables/canvas/stageRuntime";

vi.unmock("@/composables/useVisualConfig");

// Exercise the prepared lifecycle state and real material together; registry
// membership alone cannot prove that a held note remains visible.
describe("prepared note body visibility", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, options) =>
      tag === "canvas" ? createCanvas(1, 1) as unknown as HTMLCanvasElement : createElement(tag, options),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["merge", "web"] as const)("keeps a single held note visible in %s at phone body sizes", (mode) => {
    for (const bodySizeScale of [0.5, 1]) {
      const config = { ...DEFAULT_CONFIG.blobs, connectionMode: mode, baseSizeRatio: 0.1 * bodySizeScale };
      const canvas = createCanvas(390, 400);
      const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
      const bodies = useBlobRenderer();
      const field = useBlobFieldRenderer();
      const usable = { x: 0, y: 0, width: 390, height: 400 };
      const composition = resolveStageComposition(usable, 75, 0.6, bodySizeScale);
      vi.mocked(Date.now).mockReturnValue(1000);
      bodies.createBlob(MAJOR_SOLFEGE[0], 261.63, 0, 0, 390, 400, config, "held-c4", "C", "major", 4, "C4");
      for (const elapsed of [150, 400, 1000, 5000, 30000]) {
        vi.mocked(Date.now).mockReturnValue(1000 + elapsed);
        ctx.clearRect(0, 0, 390, 400);
        bodies.reprojectBlobs(composition, config, false);
        bodies.prepareBlobs(ctx, config, { bounds: usable });
        const frames = bodies.getPreparedBlobFrames();
        expect(frames).toHaveLength(1);
        if (!field.renderBlobField(ctx, frames, config, null)) bodies.renderBlobs(ctx, elapsed, config, {}, true);
        const data = ctx.getImageData(0, 0, 390, 400).data;
        let maxAlpha = 0;
        for (let i = 3; i < data.length; i += 4) maxAlpha = Math.max(maxAlpha, data[i]);
        expect(maxAlpha, `${mode}, size ${bodySizeScale}, held ${elapsed}ms, radius ${frames[0].scaledRadius}`).toBeGreaterThan(16);
      }
      field.dispose();
    }
  });
});
