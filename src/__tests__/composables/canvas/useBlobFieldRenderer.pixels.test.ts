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

const triangle = [[140, 140], [820, 180], [560, 500]];

function framesAt(positions = triangle, radius = 40) {
  return positions.map(([x, y], index) => {
    const frame = chordFrames(radius)[index % 3];
    const dx = x - frame.blob.x;
    const dy = y - frame.blob.y;
    frame.key = String(index);
    frame.blob.x = x;
    frame.blob.y = y;
    frame.contour = frame.contour.map((point) => ({ x: point.x + dx, y: point.y + dy }));
    frame.primaryColor = ["rgb(255, 0, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 255)"][index % 3];
    return frame;
  });
}

function completeScene(frames: PreparedBlobFrame[]) {
  const points = frames.map((frame) => ({
    blob: frame.blob, note: { noteId: frame.key }, x: frame.blob.x, y: frame.blob.y,
  }));
  const edges = frames.flatMap((from, i) => frames.slice(i + 1).map((to) => ({
    fromNoteId: from.key, toNoteId: to.key,
  })));
  return { points, orderedPoints: points, boundaryEdges: edges, interiorEdges: [] } as unknown as
    import("@/types/canvas").HarmonicGeometryScene;
}

function render(frames: PreparedBlobFrame[], mode: "merge" | "web", options = {}) {
  const canvas = createCanvas(1000, 650);
  const context = canvas.getContext("2d");
  const renderer = useBlobFieldRenderer();
  renderer.renderBlobField(context as unknown as CanvasRenderingContext2D, frames, {
    ...DEFAULT_CONFIG.blobs, connectionMode: mode, blurRadius: 0, glowEnabled: false, ...options,
  }, completeScene(frames));
  renderer.dispose();
  return context;
}

function alphaAt(context: ReturnType<typeof render>, x: number, y: number) {
  return context.getImageData(Math.round(x), Math.round(y), 1, 1).data[3];
}

describe("Filled Merge and fine Web pixels", () => {
  beforeEach(() => {
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, options) =>
      tag === "canvas" ? createCanvas(1, 1) as unknown as HTMLCanvasElement : createElement(tag, options),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    { color: "rgb(0, 255, 255)", opacity: 1 },
    { color: "rgba(0, 255, 255, 1)", opacity: 1 },
    { color: "hsla(180, 100%, 50%, 1)", opacity: 1 },
    { color: "rgba(0, 255, 255, 1)", opacity: 0.35 },
  ])("preserves identical note colors across Merge at opacity $opacity ($color)", ({ color, opacity }) => {
    const frames = framesAt();
    frames.forEach((frame) => {
      frame.primaryColor = color;
      frame.opacity = opacity;
    });
    const context = render(frames, "merge", { fieldSoftness: 0 });

    // Sample between bodies, where only the radial color contributions exist.
    // Fading to transparent black darkens this interior even at full strength.
    for (const [x, y] of [[507, 273], [440, 220], [560, 350]]) {
      const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
      expect(red).toBeLessThanOrEqual(2);
      expect(green).toBeGreaterThanOrEqual(252);
      expect(blue).toBeGreaterThanOrEqual(252);
      expect(Math.abs(alpha - Math.round(opacity * 255))).toBeLessThanOrEqual(2);
    }
  });

  it.each([10, 40])("fills the whole triangular interior at radius %s, blending all three colors", (radius) => {
    const context = render(framesAt(triangle, radius), "merge");
    // Interior samples cover the face, not just the centroid or edge graph.
    for (const a of [0.15, 0.3, 0.5, 0.7]) {
      for (const b of [0.15, 0.3, 0.5, 0.7]) {
        if (a + b > 0.85) continue;
        const c = 1 - a - b;
        expect(alphaAt(context,
          a * triangle[0][0] + b * triangle[1][0] + c * triangle[2][0],
          a * triangle[0][1] + b * triangle[1][1] + c * triangle[2][1],
        )).toBeGreaterThan(230);
      }
    }
    const middle = context.getImageData(507, 273, 1, 1).data;
    for (const color of middle.slice(0, 3)) expect(color).toBeGreaterThan(30);
    expect(alphaAt(context, 50, 550)).toBe(0);
  });

  it("keeps the same triangle open in Web, with all three thin connections and distinct bodies", () => {
    const frames = framesAt();
    const context = render(frames, "web");
    expect(alphaAt(context, 507, 273)).toBe(0);
    for (const frame of frames) expect(alphaAt(context, frame.blob.x, frame.blob.y)).toBeGreaterThan(230);
    expect(visibleRegions(context.getImageData(0, 0, 1000, 650).data, 1000, 650)).toBe(1);
    // Mid-edge normal scans must each meet one strand, with no broad ribbon.
    for (const [from, to] of [[0, 1], [1, 2], [0, 2]]) {
      const [ax, ay] = triangle[from];
      const [bx, by] = triangle[to];
      const length = Math.hypot(bx - ax, by - ay);
      let visible = 0;
      for (let d = -60; d <= 60; d++) {
        if (alphaAt(context, (ax + bx) / 2 - (by - ay) / length * d,
          (ay + by) / 2 + (bx - ax) / length * d) >= 16) visible++;
      }
      expect(visible).toBeGreaterThan(0);
      expect(visible).toBeLessThanOrEqual(5);
    }
  });

  it("preserves the filled held chord when an outer released member fades", () => {
    const frames = framesAt([...triangle, [100, 530]]);
    frames[3].blob.isFadingOut = true;
    frames[3].opacity = 0.1;
    const context = render(frames, "merge");
    expect(alphaAt(context, 507, 273)).toBeGreaterThan(230);
    expect(alphaAt(context, 140, 490)).toBeLessThan(40);
  });

  it("fades the released corner into the surviving dyad without dimming it", () => {
    const frames = framesAt();
    frames[2].blob.isFadingOut = true;
    frames[2].opacity = 0.2;
    const context = render(frames, "merge");
    expect(alphaAt(context, 507, 273)).toBeGreaterThan(30);
    expect(alphaAt(context, 507, 273)).toBeLessThan(65);
    expect(alphaAt(context, 480, 160)).toBeGreaterThan(230);
    frames[2].opacity = 0;
    expect(alphaAt(render(frames, "merge"), 507, 273)).toBe(0);
  });

  it("fills four-note and dense chord interiors independently of frame order", () => {
    for (const count of [4, 12]) {
      const positions = Array.from({ length: count }, (_, i) => [
        500 + Math.cos(i / count * Math.PI * 2) * 300,
        325 + Math.sin(i / count * Math.PI * 2) * 220,
      ]);
      const frames = framesAt(positions);
      const forward = render(frames, "merge");
      const reverse = render([...frames].reverse(), "merge");
      for (const [x, y] of [[500, 325], [430, 300], [540, 360]]) {
        expect(alphaAt(forward, x, y)).toBeGreaterThan(230);
        const a = forward.getImageData(x, y, 1, 1).data;
        const b = reverse.getImageData(x, y, 1, 1).data;
        for (let i = 0; i < 4; i++) expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(3);
      }
    }
  });

  it.each([
    { radius: 5, fieldSoftness: 12 },
    { radius: 10, fieldSoftness: 30 },
    { radius: 20, fieldSoftness: 50 },
  ])("keeps small Web bodies visible at $radius px with softness $fieldSoftness", (settings) => {
    const frames = framesAt(triangle, settings.radius);
    const context = render(frames, "web", settings);
    for (const frame of frames) {
      expect(alphaAt(context, frame.blob.x, frame.blob.y)).toBeGreaterThan(230);
    }
    expect(alphaAt(context, 507, 273)).toBe(0);
    expect(visibleRegions(context.getImageData(0, 0, 1000, 650).data, 1000, 650)).toBe(1);
  });

  it("lets a held Web body retain its color beneath a coincident releasing body", () => {
    const frames = framesAt([[140, 140], [140, 140]]);
    frames[1].opacity = 0.1;
    frames[1].blob.isFadingOut = true;
    const center = render(frames, "web").getImageData(140, 140, 1, 1).data;
    expect([...center]).toEqual([255, 0, 0, 255]);
  });

  it.each(["merge", "web"] as const)("keeps %s material still when the prepared contours have no motion", (mode) => {
    const frames = framesAt();
    const first = render(frames, mode).getImageData(0, 0, 1000, 650).data;
    frames.forEach((frame) => { frame.elapsed += 30; });
    const later = render(frames, mode).getImageData(0, 0, 1000, 650).data;
    expect(later.every((value, index) => value === first[index])).toBe(true);
  });

  it("retains a filled face while pulling the free Merge edges into organic shoulders", () => {
    const frames = framesAt();
    const context = render(frames, "merge");
    // The top span bows inward rather than stretching into a straight polygon
    // edge. Its central face stays solid and the note lobes stay visible.
    expect(alphaAt(context, 480, 155)).toBeLessThan(16);
    expect(alphaAt(context, 507, 273)).toBeGreaterThan(230);
    for (const frame of frames) expect(alphaAt(context, frame.blob.x, frame.blob.y)).toBeGreaterThan(230);
  });

  it.each([
    { radius: 10, fieldSoftness: 6, fusionStrength: 0.4 },
    { radius: 10, fieldSoftness: 12, fusionStrength: 0.4 },
    { radius: 20, fieldSoftness: 6, fusionStrength: 0.4 },
  ])("keeps a near-edge interior note inside the organic Merge body at $radius px", (settings) => {
    const frames = framesAt([[140, 100], [820, 100], [820, 600], [140, 600], [480, 125]], settings.radius);
    const context = render(frames, "merge", settings);
    expect(visibleRegions(context.getImageData(0, 0, 1000, 650).data, 1000, 650)).toBe(1);
    for (const frame of frames) expect(alphaAt(context, frame.blob.x, frame.blob.y)).toBeGreaterThan(230);
    expect(alphaAt(context, 480, 155)).toBeGreaterThan(230);
  });

  it("does not carry root-surface paint across Merge/Web switches", () => {
    const renderer = useBlobFieldRenderer();
    const canvas = createCanvas(1000, 650);
    const context = canvas.getContext("2d");
    const frames = framesAt();
    for (const mode of ["merge", "web", "merge", "web"] as const) {
      context.clearRect(0, 0, 1000, 650);
      renderer.renderBlobField(context as unknown as CanvasRenderingContext2D, frames, {
        ...DEFAULT_CONFIG.blobs, connectionMode: mode, blurRadius: 0, glowEnabled: false,
      }, completeScene(frames));
      const actual = context.getImageData(0, 0, 1000, 650).data;
      const fresh = render(frames, mode).getImageData(0, 0, 1000, 650).data;
      expect(actual.every((value, index) => value === fresh[index])).toBe(true);
    }
    renderer.dispose();
  });

  it("respects zero Web strength while retaining the note bodies", () => {
    const context = render(framesAt(), "web", { webOpacity: 0 });
    expect(visibleRegions(context.getImageData(0, 0, 1000, 650).data, 1000, 650)).toBe(3);
  });

  it.each(["merge", "web"] as const)(
    "renders separate bodies at the public zero-strength endpoint in %s mode",
    (mode) => {
      const context = render(framesAt(), mode, {
        fusionStrength: 0,
        webOpacity: 0,
      });
      expect(visibleRegions(context.getImageData(0, 0, 1000, 650).data, 1000, 650))
        .toBe(3);
    },
  );
});
