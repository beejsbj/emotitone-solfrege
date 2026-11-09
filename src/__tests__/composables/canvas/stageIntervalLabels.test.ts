import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { Note } from "@tonaljs/tonal";
import { createPinia, setActivePinia } from "pinia";
import { effectScope, type EffectScope } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHarmonicAnalysis } from "@/composables/useHarmonicAnalysis";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { useBlobRenderer } from "@/composables/canvas/useBlobRenderer";
import {
  getBlobFieldConnectionGeometry,
  getBlobWebConnections,
  getBlobWebConnectionWidth,
  useBlobFieldRenderer,
} from "@/composables/canvas/useBlobFieldRenderer";
import { useHarmonicGeometryRenderer } from "@/composables/canvas/useHarmonicGeometryRenderer";
import { fullStageRect, resolveStageComposition } from "@/composables/canvas/stageRuntime";
import { getScaleForMode } from "@/data";
import { STAGE_BODY_SIZE_BASE_RATIO } from "@/services/stageAppearance";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { ActiveNote } from "@/types/music";

GlobalFonts.registerFromPath("src/assets/fonts/lets-jazz-regular.otf", "Lets Jazz");

const LETTERS = "CDEFGAB";
const major = getScaleForMode("major").solfege;

/** A C-major chord-row attack, as the Keyboard publishes it. */
function chordNote(name: string): ActiveNote {
  const degree = LETTERS.indexOf(name[0]);
  return {
    noteId: `${name}-attack`,
    noteName: name,
    pitchClassIndex: Note.chroma(name),
    solfegeIndex: degree,
    solfege: major[degree],
    frequency: Note.freq(name)!,
    octave: Note.octave(name)!,
    mode: "major",
    key: "C",
  };
}

const pairKey = (pair: readonly string[]) => [...pair].sort().join("::");

/**
 * One Stage frame through the production pieces, in production order: real
 * analysis and stores, circle-of-fifths bodies, the scene, the Merge/Web
 * field, then the lettering authority. Reduced Motion holds bodies still.
 */
function playOnStage(names: string[], mode: "merge" | "web", width = 1000, height = 650) {
  useVisualConfigStore().config.blobs.connectionMode = mode;
  const { blobConfig } = useVisualConfig();
  const config = blobConfig.value;
  const analysis = scope.run(() => useHarmonicAnalysis())!;
  const bodies = useBlobRenderer();
  const geometry = useHarmonicGeometryRenderer();
  const field = useBlobFieldRenderer();
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  const notes = names.map(chordNote);
  notes.forEach((note) => {
    analysis.notePlayed(note);
    bodies.createBlob(note.solfege, note.frequency, 0, 0, width, height, config,
      note.noteId, note.key, note.mode, note.octave, note.noteName);
  });
  const usable = fullStageRect(width, height);
  const composition = resolveStageComposition(usable,
    Math.max(config.minSize, Math.min(config.maxSize, Math.min(width, height) * STAGE_BODY_SIZE_BASE_RATIO)),
    useVisualConfig().hilbertScopeConfig.value.sizeRatio,
    config.baseSizeRatio / STAGE_BODY_SIZE_BASE_RATIO);
  bodies.reprojectBlobs(composition, config, true);
  bodies.prepareBlobs(ctx, config, { reducedMotion: true, bounds: usable, elapsed: 1 });
  const frames = bodies.getPreparedBlobFrames();
  const snapshot = analysis.snapshot.value;
  const scene = geometry.buildScene(snapshot, bodies.activeBlobs, config, width, height)!;
  field.renderBlobField(ctx, frames, config, scene);
  const material = canvas.toBuffer("image/png");
  const text = vi.spyOn(ctx, "fillText");
  geometry.renderLabels(ctx, scene, config, { now: 1000, reducedMotion: true, bounds: usable });
  const painted = text.mock.calls.map(([value]) => value);
  // A label's text is the analysis's own interval name, never recomputed.
  const analyzed = snapshot.intervalEdges.map((edge) => edge.interval);
  const intervals = painted.filter((value) => analyzed.includes(value));

  const materialWithoutScene = () => {
    ctx.clearRect(0, 0, width, height);
    useBlobFieldRenderer().renderBlobField(ctx, frames, config, null);
    return canvas.toBuffer("image/png");
  };
  return { snapshot, scene, frames, material, materialWithoutScene, intervals, analyzed };
}

let scope: EffectScope;

beforeEach(() => {
  setActivePinia(createPinia());
  scope = effectScope();
  // The field renderer's private surfaces must be real rasters.
  const createElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag, options) =>
    tag === "canvas"
      ? createCanvas(1, 1) as unknown as HTMLCanvasElement
      : createElement(tag, options));
  // Orbit offsets and drift are random; centre them so placement is exact.
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  scope.stop();
  vi.restoreAllMocks();
});

describe("Stage interval labels (BJS-468)", () => {
  it.each([
    ["C major", ["C4", "E4", "G4"], ["M3", "m3", "P5"]],
    ["A minor", ["A3", "C4", "E4"], ["m3", "M3", "P5"]],
    ["G7", ["G3", "B3", "D4", "F4"], ["M3", "P5", "m7", "m3", "d5", "m3"]],
  ])("Merge anchors and letters every analyzed interval of %s", (_name, names, expected) => {
    const stage = playOnStage(names, "merge");
    expect([...stage.analyzed].sort()).toEqual([...expected].sort());

    // One latent path per analyzed pair, not only the n − 1 material joins.
    const published = stage.scene.renderedConnections!;
    expect(published.map((path) => pairKey(path.notePair)).sort()).toEqual(
      stage.snapshot.intervalEdges.map((edge) => pairKey([edge.fromNoteId, edge.toNoteId])).sort());
    expect(published.every((path) => path.material === "merge")).toBe(true);

    // The anchors draw nothing: Merge material is byte-identical without them.
    expect(stage.materialWithoutScene().equals(stage.material)).toBe(true);
    expect(stage.scene.mergeCenter).toBeDefined();

    // At a roomy Stage every label fits, so the collision rules drop none.
    expect([...stage.intervals].sort()).toEqual([...expected].sort());
  });

  // Web already drew a strand for every pair and letters its perimeter; the
  // diagonals of a four-note chord stay unlabelled strands, as before.
  it.each([
    ["C major", ["C4", "E4", "G4"], ["M3", "m3", "P5"]],
    ["G7", ["G3", "B3", "D4", "F4"], ["P5", "m3", "d5", "m7"]],
  ])("Web keeps one fine strand per analyzed pair for %s, unchanged", (_name, names, lettered) => {
    const stage = playOnStage(names, "web");
    const strands = getBlobWebConnections(stage.frames, stage.scene).map((connection) => ({
      pair: pairKey([connection.from.key, connection.to.key]),
      points: getBlobFieldConnectionGeometry(connection, getBlobWebConnectionWidth(connection),
        1, 0, connection.role === "boundary" ? 0.46 : 0.3).centerline,
    }));
    const published = stage.scene.renderedConnections!;
    expect(published).toHaveLength(stage.analyzed.length);
    expect(published.every((path) => path.material === "web")).toBe(true);
    expect(published.map((path) => path.points)).toEqual(strands.map((strand) => strand.points));
    expect(published.map((path) => pairKey(path.notePair))).toEqual(strands.map((strand) => strand.pair));
    expect([...stage.intervals].sort()).toEqual([...lettered].sort());
  });
});
