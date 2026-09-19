import { createCanvas } from "@napi-rs/canvas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBlobFieldRenderer } from "@/composables/canvas/useBlobFieldRenderer";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { MAJOR_SOLFEGE } from "@/data";
import { useHarmonicGeometryRenderer } from "@/composables/canvas/useHarmonicGeometryRenderer";
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

  it("publishes mode-specific join paths, clearing them when connections turn off", () => {
    const frames = chordFrames(20).slice(0, 2);
    frames[1].primaryColor = "rgb(0, 255, 0)";
    const notes = frames.map(frame => ({ noteId: frame.key, noteName: "C4", solfegeIndex: 0,
      solfege: frame.blob.note, frequency: 261.63, octave: 4, mode: "major" as const, key: "C" as const }));
    const config = { ...DEFAULT_CONFIG.blobs, connectionMode: "web" as const, showChordLabel: true };
    const scene = useHarmonicGeometryRenderer().buildScene({ isVisible: true, displayedNotes: notes,
      intervalEdges: [{ fromNoteId: "0", toNoteId: "1", fromIndex: 0, toIndex: 1, interval: "3M" }],
      chordLabel: "CM", emotionalDescription: "Bright" }, new Map(frames.map(frame => [frame.key, frame.blob])), config, 1000, 600)!;
    const ctx = createCanvas(1000, 600).getContext("2d") as unknown as CanvasRenderingContext2D;
    const renderer = useBlobFieldRenderer();
    expect(renderer.renderBlobField(ctx, frames, config, scene)).toBe(true);
    expect(scene.renderedConnections).toHaveLength(1);
    expect(scene.renderedConnections![0].colors).toEqual(frames.map(frame => frame.primaryColor));
    expect(scene.renderedConnections![0].points.length).toBeGreaterThan(2);
    expect(scene.renderedConnections![0].opacity).toBeGreaterThan(0);
    renderer.renderBlobField(ctx, frames, { ...config, webOpacity: 0 }, scene);
    expect(scene.renderedConnections![0].opacity).toBe(0);
    renderer.renderBlobField(ctx, frames, { ...config, connectionMode: "merge" }, scene);
    expect(scene.renderedConnections![0].material).toBe("merge");
    expect(scene.mergeCenter).toBeDefined();
    renderer.renderBlobField(ctx, frames, { ...config, connectionMode: "off" }, scene);
    expect(scene.renderedConnections).toEqual([]);
    expect(scene.mergeCenter).toBeUndefined();
    renderer.dispose();
  });

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

  it("retains sparse join identities through complete fusion and anchors the chord inside material", () => {
    const frames = chordFrames(28);
    // A compact triangle; increasing radii below fully erases its neck outlines.
    const positions = [[140, 120], [260, 120], [200, 220]];
    const setRadius = (radius: number) => frames.forEach((frame, i) => {
      const [x, y] = positions[i]; frame.blob.x = x; frame.blob.y = y;
      frame.scaledRadius = radius; frame.blob.baseRadius = radius;
      frame.contour = Array.from({ length: 48 }, (_, j) => ({
        x: x + radius * Math.cos(j / 48 * Math.PI * 2), y: y + radius * Math.sin(j / 48 * Math.PI * 2),
      }));
    });
    setRadius(28);
    const notes = frames.map(frame => ({ noteId: frame.key, noteName: "C4", solfegeIndex: 0,
      solfege: frame.blob.note, frequency: 261.63, octave: 4, mode: "major" as const, key: "C" as const }));
    const config = { ...DEFAULT_CONFIG.blobs, connectionMode: "merge" as const, showIntervalLabels: true, showChordLabel: true };
    const scene = useHarmonicGeometryRenderer().buildScene({ isVisible: true, displayedNotes: notes,
      intervalEdges: [[0, 1], [0, 2], [1, 2]].map(([fromIndex, toIndex]) => ({
        fromIndex, toIndex, fromNoteId: String(fromIndex), toNoteId: String(toIndex), interval: "3M" })),
      chordLabel: "CM", emotionalDescription: "Bright" }, new Map(frames.map(frame => [frame.key, frame.blob])), config, 400, 320)!;
    const ctx = createCanvas(400, 320).getContext("2d") as unknown as CanvasRenderingContext2D;
    const renderer = useBlobFieldRenderer();
    renderer.renderBlobField(ctx, frames, config, scene);
    const pairs = scene.renderedConnections!.map(path => path.notePair);
    expect(pairs).toHaveLength(2);
    setRadius(90);
    ctx.clearRect(0, 0, 400, 320);
    renderer.renderBlobField(ctx, frames, { ...config, fusionStrength: 1 }, scene);
    expect(scene.renderedConnections!.map(path => path.notePair)).toEqual(pairs);
    expect(scene.renderedConnections!.every(path => path.material === "merge")).toBe(true);
    const { x, y } = scene.mergeCenter!;
    expect(x).toBeGreaterThan(140); expect(x).toBeLessThan(260);
    expect(y).toBeGreaterThan(120); expect(y).toBeLessThan(220);
    expect(ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3]).toBeGreaterThan(100);
    renderer.dispose();
  });
});
