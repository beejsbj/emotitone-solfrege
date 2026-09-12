import { createCanvas } from "@napi-rs/canvas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBlobFieldRenderer } from "@/composables/canvas/useBlobFieldRenderer";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { MAJOR_SOLFEGE } from "@/data";
import type { PreparedBlobFrame } from "@/types/canvas";

function chordFrames(radius: number): PreparedBlobFrame[] {
  return [[100, 100], [500, 300], [900, 500]].map(([x, y], index) => ({
    key: String(index),
    blob: {
      x, y, note: MAJOR_SOLFEGE[index * 2], frequency: 261.63,
      startTime: 0, baseRadius: radius, opacity: 1, isFadingOut: false,
      driftVx: 0, driftVy: 0, vibrationPhase: 0, scale: 1,
      mode: "major", key: "C", octave: 4,
    },
    contour: Array.from({ length: 48 }, (_, segment) => {
      const angle = segment / 48 * Math.PI * 2;
      return { x: x + radius * Math.cos(angle), y: y + radius * Math.sin(angle) };
    }),
    primaryColor: "rgb(255, 0, 0)",
    scaledRadius: radius, opacity: 1, glowIntensity: 0, elapsed: 1,
  }));
}

// Count visible connected regions after the real raster/blur/threshold pipeline.
// A planner returning N-1 edges cannot detect a junction erased by that pipeline.
function visibleRegions(data: Uint8ClampedArray, width: number, height: number) {
  const visited = new Uint8Array(width * height);
  let regions = 0;
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] < 16) continue;
    const queue = [start];
    visited[start] = 1;
    for (let index = 0; index < queue.length; index++) {
      const pixel = queue[index];
      const neighbors = [pixel - width, pixel + width];
      if (pixel % width > 0) neighbors.push(pixel - 1);
      if (pixel % width < width - 1) neighbors.push(pixel + 1);
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= visited.length || visited[neighbor]) continue;
        if (data[neighbor * 4 + 3] < 16) continue;
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    // Ignore subpixel edge specks, not separated blob bodies or ribbons.
    if (queue.length > 100) regions++;
  }
  return regions;
}

describe("Merge field pixels", () => {
  beforeEach(() => {
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, options) =>
      tag === "canvas"
        ? createCanvas(1, 1) as unknown as HTMLCanvasElement
        : createElement(tag, options),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    { radius: 10, fieldSoftness: 30, fusionStrength: 0 },
    { radius: 40, fieldSoftness: 12, fusionStrength: 0.4 },
  ])("keeps all chord blobs connected at $radius px radius", (settings) => {
    const canvas = createCanvas(1000, 600);
    const context = canvas.getContext("2d");
    const renderer = useBlobFieldRenderer();
    const frames = chordFrames(settings.radius);
    const rendered = renderer.renderBlobField(
      context as unknown as CanvasRenderingContext2D,
      frames,
      {
        ...DEFAULT_CONFIG.blobs, ...settings, connectionMode: "merge",
        blurRadius: 0, glowEnabled: false,
      },
      null,
    );

    expect(rendered).toBe(true);
    expect(visibleRegions(context.getImageData(0, 0, 1000, 600).data, 1000, 600)).toBe(1);
    // One region is insufficient if a body was simply omitted. Each chord
    // member must still have visible material within its softened footprint.
    const reach = settings.radius + settings.fieldSoftness;
    for (const { blob } of frames) {
      const footprint = context.getImageData(
        blob.x - reach, blob.y - reach, reach * 2, reach * 2,
      );
      expect(footprint.data.some((value, index) => index % 4 === 3 && value >= 16)).toBe(true);
    }
    renderer.dispose();
  });
});
