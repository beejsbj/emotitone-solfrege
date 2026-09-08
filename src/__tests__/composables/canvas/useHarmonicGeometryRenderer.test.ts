import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHarmonicGeometryRenderer } from "@/composables/canvas/useHarmonicGeometryRenderer";
import { mockCanvasContext } from "@/__tests__/helpers/test-utils";
import type {
  ActiveBlob,
  ActiveNote,
  BlobRelationshipConfig,
  HarmonicAnalysisSnapshot,
  HarmonicIntervalEdge,
} from "@/types";

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getPrimaryColor: vi.fn(() => "hsla(40, 80%, 60%, 1)"),
    getAccentColor: vi.fn(() => "hsla(20, 80%, 60%, 1)"),
    withAlpha: vi.fn(
      (color: string, opacity: number) => `${color} / ${opacity}`
    ),
  }),
}));

const baseConfig: BlobRelationshipConfig = {
  connectionMode: "merge",
  analysisHoldTime: 360,
  analysisNoteLimit: 7,
  showChordLabel: true,
  showIntervalLabels: true,
  showEmotionLabel: true,
  fieldSoftness: 1,
  fusionStrength: 0.4,
  webOpacity: 0.5,
  labelOpacity: 0.5,
};

function createNote(noteId: string, noteName: string): ActiveNote {
  return {
    solfegeIndex: 0,
    solfege: {
      name: noteName,
      number: 1,
      emotion: "Bright",
      description: `${noteName} note`,
      texture: "soft",
      intervalName: "1P",
      semitones: 0,
    },
    frequency: 440,
    octave: 4,
    noteId,
    noteName,
    mode: "major",
    key: "C",
  };
}

function createBlob(note: ActiveNote, x: number, y: number): ActiveBlob {
  return {
    x,
    y,
    note: note.solfege,
    frequency: note.frequency,
    startTime: 0,
    baseRadius: 40,
    opacity: 1,
    isFadingOut: false,
    driftVx: 0,
    driftVy: 0,
    vibrationPhase: 0,
    scale: 1,
    mode: note.mode,
    key: note.key,
    octave: note.octave,
  };
}

function createEdges(notes: ActiveNote[]): HarmonicIntervalEdge[] {
  const edges: HarmonicIntervalEdge[] = [];
  for (let fromIndex = 0; fromIndex < notes.length; fromIndex += 1) {
    for (let toIndex = fromIndex + 1; toIndex < notes.length; toIndex += 1) {
      edges.push({
        fromNoteId: notes[fromIndex].noteId,
        toNoteId: notes[toIndex].noteId,
        fromIndex,
        toIndex,
        interval: `${fromIndex}-${toIndex}`,
      });
    }
  }
  return edges;
}

function createSnapshot(notes: ActiveNote[]): HarmonicAnalysisSnapshot {
  return {
    isVisible: true,
    displayedNotes: notes,
    intervalEdges: createEdges(notes),
    chordLabel: "Cmaj7",
    emotionalDescription: "Bright",
  };
}

describe("useHarmonicGeometryRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not label a partial geometry after an analyzed blob disappears", () => {
    const notes = [createNote("c4", "C4"), createNote("e4", "E4")];
    const blobs = new Map<string, ActiveBlob>([
      [notes[0].noteId, createBlob(notes[0], 100, 100)],
    ]);
    const { buildScene } = useHarmonicGeometryRenderer();

    expect(buildScene(createSnapshot(notes), blobs, baseConfig, 400, 400)).toBe(
      null
    );
  });

  it("keeps the remaining geometry when one stale analyzed blob disappears", () => {
    const notes = [
      createNote("c4", "C4"),
      createNote("e4", "E4"),
      createNote("g4", "G4"),
    ];
    const blobs = new Map<string, ActiveBlob>([
      [notes[0].noteId, createBlob(notes[0], 100, 100)],
      [notes[2].noteId, createBlob(notes[2], 300, 100)],
    ]);
    const { buildScene } = useHarmonicGeometryRenderer();

    const scene = buildScene(createSnapshot(notes), blobs, baseConfig, 400, 400);

    expect(scene?.points.map((point) => point.note.noteId)).toEqual([
      "c4",
      "g4",
    ]);
    expect(scene?.primaryLabel).toBeNull();
    expect(scene?.auxiliaryLabels[0]?.lines).toEqual(["0-2"]);
  });

  it("keeps emotion labels independent from chord-label visibility", () => {
    const notes = [
      createNote("c4", "C4"),
      createNote("e4", "E4"),
      createNote("g4", "G4"),
    ];
    const blobs = new Map<string, ActiveBlob>([
      [notes[0].noteId, createBlob(notes[0], 100, 100)],
      [notes[1].noteId, createBlob(notes[1], 300, 100)],
      [notes[2].noteId, createBlob(notes[2], 200, 300)],
    ]);
    const { buildScene } = useHarmonicGeometryRenderer();

    const scene = buildScene(
      createSnapshot(notes),
      blobs,
      { ...baseConfig, showChordLabel: false },
      400,
      400
    );

    expect(scene?.primaryLabel?.lines).toEqual(["Bright"]);
  });

  it("keeps web relationships when interval labels are hidden", () => {
    const notes = [
      createNote("c4", "C4"),
      createNote("e4", "E4"),
      createNote("g4", "G4"),
      createNote("b4", "B4"),
    ];
    const blobs = new Map<string, ActiveBlob>([
      [notes[0].noteId, createBlob(notes[0], 100, 100)],
      [notes[1].noteId, createBlob(notes[1], 300, 100)],
      [notes[2].noteId, createBlob(notes[2], 300, 300)],
      [notes[3].noteId, createBlob(notes[3], 100, 300)],
    ]);
    const { buildScene } = useHarmonicGeometryRenderer();

    const scene = buildScene(
      createSnapshot(notes),
      blobs,
      {
        ...baseConfig,
        connectionMode: "web",
        showIntervalLabels: false,
      },
      400,
      400
    );

    expect(scene?.boundaryEdges).toHaveLength(4);
    expect(scene?.interiorEdges).toHaveLength(2);
    expect(scene?.auxiliaryLabels).toEqual([]);
  });

  it("sorts boundary points around their own centroid", () => {
    const notes = [
      createNote("a", "C4"),
      createNote("b", "D4"),
      createNote("c", "E4"),
      createNote("d", "F4"),
    ];
    const blobs = new Map<string, ActiveBlob>([
      ["a", createBlob(notes[0], 100, 80)],
      ["b", createBlob(notes[1], 310, 120)],
      ["c", createBlob(notes[2], 270, 280)],
      ["d", createBlob(notes[3], 80, 240)],
    ]);
    const { buildScene } = useHarmonicGeometryRenderer();

    const scene = buildScene(createSnapshot(notes), blobs, baseConfig, 400, 1000)!;

    scene.points.forEach((point) => {
      expect(point.angle).toBeCloseTo(
        Math.atan2(point.y - scene.centroid.y, point.x - scene.centroid.x)
      );
    });
  });

  it("creates and renders interval labels for triads", () => {
    const notes = [
      createNote("c4", "C4"),
      createNote("e4", "E4"),
      createNote("g4", "G4"),
    ];
    const blobs = new Map<string, ActiveBlob>([
      ["c4", createBlob(notes[0], 80, 80)],
      ["e4", createBlob(notes[1], 320, 80)],
      ["g4", createBlob(notes[2], 200, 320)],
    ]);
    const renderer = useHarmonicGeometryRenderer();
    const config = { ...baseConfig, connectionMode: "web" as const };
    const scene = renderer.buildScene(
      createSnapshot(notes),
      blobs,
      config,
      400,
      400
    );

    expect(scene?.auxiliaryLabels).toHaveLength(3);
    renderer.renderLabels(
      mockCanvasContext as unknown as CanvasRenderingContext2D,
      scene,
      config
    );
    expect(mockCanvasContext.fillText).toHaveBeenCalledTimes(5);
  });

  it("wraps long labels within the canvas width without compressing glyphs", () => {
    const notes = [createNote("c4", "C4"), createNote("e4", "E4")];
    const blobs = new Map<string, ActiveBlob>([
      ["c4", createBlob(notes[0], 80, 100)],
      ["e4", createBlob(notes[1], 240, 100)],
    ]);
    const renderer = useHarmonicGeometryRenderer();
    const snapshot = {
      ...createSnapshot(notes),
      emotionalDescription:
        "Strength, confidence, dominance & Forward motion, stepping up",
    };
    const scene = renderer.buildScene(snapshot, blobs, baseConfig, 320, 400);
    const context = {
      ...mockCanvasContext,
      canvas: { width: 320 },
    } as unknown as CanvasRenderingContext2D;
    vi.mocked(mockCanvasContext.measureText).mockImplementation((text) => ({
      width: String(text).length * 8,
    }) as TextMetrics);

    renderer.renderLabels(context, scene, baseConfig);

    const emotionLines = vi.mocked(mockCanvasContext.fillText).mock.calls
      .map(([line]) => String(line))
      .filter((line) => line !== "Cmaj7" && line !== "0-1");
    expect(emotionLines).toEqual([
      "Strength, confidence, dominance &",
      "Forward motion, stepping up",
    ]);
    expect(mockCanvasContext.fillText).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("honors zero opacity for labels", () => {
    const notes = [createNote("c4", "C4"), createNote("e4", "E4")];
    const blobs = new Map<string, ActiveBlob>([
      [notes[0].noteId, createBlob(notes[0], 100, 100)],
      [notes[1].noteId, createBlob(notes[1], 300, 100)],
    ]);
    const renderer = useHarmonicGeometryRenderer();
    const config = { ...baseConfig, labelOpacity: 0 };
    const scene = renderer.buildScene(
      createSnapshot(notes),
      blobs,
      config,
      400,
      400
    );
    const context = mockCanvasContext as unknown as CanvasRenderingContext2D;

    renderer.renderLabels(context, scene, config);

    expect(mockCanvasContext.fillText).not.toHaveBeenCalled();
    expect(mockCanvasContext.strokeText).not.toHaveBeenCalled();
  });
});
