import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, type EffectScope } from "vue";
import { createCanvas } from "@napi-rs/canvas";
import type {
  ActiveBlob,
  ActiveNote,
  BlobConfig,
  BlobRelationshipConfig,
} from "@/types";
import { useHarmonicAnalysis } from "@/composables/useHarmonicAnalysis";
import { useHarmonicGeometryRenderer } from "@/composables/canvas/useHarmonicGeometryRenderer";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";

type TestBlobConfig = BlobRelationshipConfig & Pick<BlobConfig, "isEnabled">;

const harmonicTestState = vi.hoisted(() => ({
  baseConfig: {
    isEnabled: true,
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
  } satisfies TestBlobConfig,
  blobConfig: null as {
    value: TestBlobConfig;
  } | null,
}));

vi.mock("@/composables/useVisualConfig", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  const blobConfig = ref({
    ...harmonicTestState.baseConfig,
  });
  harmonicTestState.blobConfig = blobConfig;

  return {
    useVisualConfig: () => ({
      blobConfig,
    }),
  };
});

function createActiveNote(
  noteId: string,
  noteName: string,
  solfegeName: string,
  emotion = "Radiant"
): ActiveNote {
  const octave = Number(noteName.at(-1) ?? 4);

  return {
    solfegeIndex: 0,
    solfege: {
      name: solfegeName,
      number: 1,
      emotion,
      description: `${solfegeName} note`,
      texture: "soft",
      intervalName: "1P",
      semitones: 0,
    },
    frequency: 440,
    octave,
    noteId,
    noteName,
    mode: "major",
    key: "C",
  };
}

describe("useHarmonicAnalysis", () => {
  let scope: EffectScope;

  const createAnalysis = (
    getActiveNotes: () => readonly ActiveNote[] = () => []
  ) => {
    scope = effectScope();
    return scope.run(() => useHarmonicAnalysis(getActiveNotes))!;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    harmonicTestState.blobConfig!.value = {
      ...harmonicTestState.baseConfig,
    };
  });

  afterEach(() => {
    scope?.stop();
    vi.useRealTimers();
  });

  it("defaults to visible harmonic connections and chord explanations", () => {
    expect(DEFAULT_CONFIG.blobs.connectionMode).toBe("merge");
    expect(DEFAULT_CONFIG.blobs.showChordLabel).toBe(true);
    expect(DEFAULT_CONFIG.blobs.showIntervalLabels).toBe(true);
    expect(DEFAULT_CONFIG.blobs.showEmotionLabel).toBe(false);
  });

  it.each([
    [["C4", "F4", "G4"], "Csus4"],
    [["C4", "E4", "G#4"], "Caug"],
  ])("retains %s entrance metadata through real analysis and every headline/emotion visibility mode", async (names, symbol) => {
    const { snapshot, notePlayed } = createAnalysis();
    const notes = (names as string[]).map((name, index) => createActiveNote(`note-${index}`, name, name));
    const blobs = new Map<string, ActiveBlob>(notes.map((note, index) => [note.noteId, {
      x: 150 + index * 50, y: 150, note: note.solfege, frequency: note.frequency,
      startTime: 0, baseRadius: 40, opacity: 1, isFadingOut: false,
      driftVx: 0, driftVy: 0, vibrationPhase: 0, scale: 1,
      mode: note.mode, key: note.key, octave: note.octave,
    }]));
    notes.forEach(notePlayed);
    // Cover all four combinations, then re-enable both after hiding the emotion.
    for (const [showChordLabel, showEmotionLabel] of [[true, true], [false, true], [false, false], [true, false], [true, true]]) {
      Object.assign(harmonicTestState.blobConfig!.value, { showChordLabel, showEmotionLabel, showIntervalLabels: false });
      await nextTick();
      const config = harmonicTestState.blobConfig!.value;
      const renderer = useHarmonicGeometryRenderer();
      const scene = renderer.buildScene(snapshot.value, blobs, config, 400, 300)!;
      expect(scene.chordSymbol).toBe(symbol);
      expect(snapshot.value.chordLabel).toBe(showChordLabel ? symbol : null);
      expect(scene.primaryLabel?.roles ?? []).toEqual([
        ...(showChordLabel ? ["chord"] : []), ...(showEmotionLabel ? ["emotion"] : []),
      ]);
      if (!showChordLabel && !showEmotionLabel) continue;
      const paint = (chordSymbol: string) => {
        const canvas = createCanvas(400, 300);
        const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
        renderer.renderLabels(ctx, { ...scene, chordSymbol }, config, { now: 1000, reducedMotion: false });
        return canvas.toBuffer("image/png");
      };
      // Same visible content, different classification: suspended/augmented
      // entrances must not silently become the ordinary settled-chord gesture.
      expect(paint(scene.chordSymbol!).equals(paint("CM"))).toBe(false);
    }
  });

  it("keeps event-driven harmonic history visible until its timing window expires", async () => {
    const { snapshot, notePlayed, noteReleased } = createAnalysis();
    const c4 = createActiveNote("note-c4", "C4", "Do", "Grounded");
    const e4 = createActiveNote("note-e4", "E4", "Mi", "Radiant");

    notePlayed(c4);
    notePlayed(e4);

    expect(snapshot.value.isVisible).toBe(true);
    expect(snapshot.value.displayedNotes).toHaveLength(2);
    expect(snapshot.value.intervalEdges).toHaveLength(1);
    expect(snapshot.value.intervalEdges[0].interval).toBe("3M");
    expect(snapshot.value.emotionalDescription).toBe("Grounded & Radiant");

    noteReleased(c4.noteId);
    vi.advanceTimersByTime(360);
    await nextTick();
    expect(snapshot.value.isVisible).toBe(true);

    noteReleased(e4.noteId);
    vi.advanceTimersByTime(359);
    await nextTick();
    expect(snapshot.value.isVisible).toBe(true);

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(snapshot.value.isVisible).toBe(false);
    expect(snapshot.value.displayedNotes).toEqual([]);
  });

  it.each([
    [["C4", "E4", "G4"], "Bright and settled"],
    [["F#3", "A#3", "C#4"], "Bright and settled"],
    [["E3", "G3", "C4"], "Bright and settled"],
    [["C4", "Eb4", "G4"], "Tender and reflective"],
    [["C4", "E4", "G4", "Bb4"], "Restless, reaching onward"],
    [["C4", "E4", "G4", "B4"], "Warm and wistful"],
    [["C4", "Eb4", "G4", "Bb4"], "Mellow and reflective"],
    [["C4", "E4", "G4", "B4", "D5"], "Warm and wistful, spacious"],
    [["C4", "Eb4", "G4", "Bb4", "D5"], "Mellow and reflective, spacious"],
    [["C4", "E4", "G4", "A4"], "Sweet and settled"],
    [["C4", "D4", "G4"], "Airy and open"],
    [["C4", "F4", "G4"], "Open, waiting to settle"],
    [["C4", "Eb4", "Gb4"], "Uneasy and searching"],
    [["C4", "E4", "G#4"], "Dreamy and unsettled"],
    [["C4", "C#4", "D4"], "Close friction, restless energy"],
  ])("describes sounding chord families with the chord label hidden: %s", (names, expected) => {
    harmonicTestState.blobConfig!.value.showChordLabel = false;
    const { snapshot, notePlayed } = createAnalysis();
    (names as string[]).forEach((name, index) =>
      notePlayed(createActiveNote(`note-${index}`, name, name))
    );
    expect(snapshot.value.chordLabel).toBeNull();
    expect(snapshot.value.emotionalDescription).toBe(expected);
  });

  it("starts a fresh harmonic gesture when the same notes are replayed", () => {
    const { snapshot, notePlayed, noteReleased } = createAnalysis();
    const firstC = createActiveNote("first-c4", "C4", "Do");
    const firstE = createActiveNote("first-e4", "E4", "Mi");

    notePlayed(firstC);
    notePlayed(firstE);
    noteReleased(firstC.noteId);
    noteReleased(firstE.noteId);

    notePlayed(createActiveNote("second-c4", "C4", "Do"));
    notePlayed(createActiveNote("second-e4", "E4", "Mi"));

    expect(snapshot.value.displayedNotes.map((note) => note.noteId)).toEqual([
      "second-c4",
      "second-e4",
    ]);
    expect(snapshot.value.intervalEdges).toHaveLength(1);
    expect(snapshot.value.isVisible).toBe(true);
  });

  it("replaces released pitch history after a new leading pitch starts", () => {
    const { snapshot, notePlayed, noteReleased } = createAnalysis();
    const firstC = createActiveNote("first-c4", "C4", "Do");
    const firstE = createActiveNote("first-e4", "E4", "Mi");

    notePlayed(firstC);
    notePlayed(firstE);
    noteReleased(firstC.noteId);
    noteReleased(firstE.noteId);

    notePlayed(createActiveNote("second-g4", "G4", "Sol"));
    notePlayed(createActiveNote("second-c4", "C4", "Do"));
    notePlayed(createActiveNote("second-e4", "E4", "Mi"));

    expect(snapshot.value.displayedNotes.map((note) => note.noteId)).toEqual([
      "second-g4",
      "second-c4",
      "second-e4",
    ]);
    expect(snapshot.value.intervalEdges).toHaveLength(3);
  });

  it("keeps harmonic relationships available when interval labels are hidden", async () => {
    harmonicTestState.blobConfig!.value = {
      ...harmonicTestState.blobConfig!.value,
      analysisNoteLimit: 2,
      showChordLabel: false,
      showIntervalLabels: false,
      showEmotionLabel: false,
    };

    const { snapshot, notePlayed } = createAnalysis();

    notePlayed(createActiveNote("note-c4", "C4", "Do"));
    notePlayed(createActiveNote("note-e4", "E4", "Mi"));
    notePlayed(createActiveNote("note-g4", "G4", "So"));
    await nextTick();

    expect(snapshot.value.displayedNotes.map((note) => note.noteName)).toEqual([
      "E4",
      "G4",
    ]);
    expect(snapshot.value.intervalEdges).toHaveLength(1);
    expect(snapshot.value.chordLabel).toBe(null);
    expect(snapshot.value.emotionalDescription).toBe("");
  });

  it.each([
    [["C4", "E4", "G4"], "CM"],
    [["G4", "C4", "E4"], "CM"],
    [["E4", "G4", "C4"], "CM"],
    [["F3", "A3", "C4"], "FM"],
    [["G3", "B3", "D4"], "GM"],
    [["A3", "C4", "E4"], "Am"],
  ])("detects a root-position triad independent of press order: %s", (noteNames, expectedLabel) => {
    const { snapshot, notePlayed } = createAnalysis();

    (noteNames as string[]).forEach((noteName, index) =>
      notePlayed(createActiveNote(`note-${index}`, noteName, noteName))
    );

    expect(snapshot.value.chordLabel).toBe(expectedLabel);
    expect(snapshot.value.displayedNotes.map((note) => note.noteName)).toEqual(noteNames);
  });

  it.each([
    [["A3", "C4", "F4"], "FM/A"],
    [["C4", "F4", "A4"], "FM/C"],
    [["C3", "E4", "A4"], "Am/C"],
    [["A4", "C3", "E4"], "Am/C"],
    [["E4", "A4", "C#10"], "AM/E"],
    [["C#10", "A4", "E4"], "AM/E"],
    [["E4", "A4", "C#-2"], "AM/C#"],
    [["C#10", "A4", "E-2"], "AM/E"],
  ])("detects the expected bass-qualified triad: %s", (noteNames, expectedLabel) => {
    const { snapshot, notePlayed } = createAnalysis();

    (noteNames as string[]).forEach((noteName, index) =>
      notePlayed(createActiveNote(`note-${index}`, noteName, noteName))
    );

    expect(snapshot.value.chordLabel).toBe(expectedLabel);
    expect(snapshot.value.displayedNotes.map((note) => note.noteName)).toEqual(noteNames);
  });

  it.each([
    ["E3", "G4", "C5"],
    ["C5", "E3", "G4"],
    ["G4", "C5", "E3"],
  ])("detects an E-inversion by actual bass independent of press order: %s, %s, %s", (...noteNames) => {
    const { snapshot, notePlayed } = createAnalysis();

    noteNames.forEach((noteName, index) =>
      notePlayed(createActiveNote(`note-${index}`, noteName, noteName))
    );

    expect(snapshot.value.chordLabel).toBe("CM/E");
  });

  it("detects second inversion with G below C and E", () => {
    const { snapshot, notePlayed } = createAnalysis();

    notePlayed(createActiveNote("g3", "G3", "G"));
    notePlayed(createActiveNote("c4", "C4", "C"));
    notePlayed(createActiveNote("e4", "E4", "E"));

    expect(snapshot.value.chordLabel).toBe("CM/G");
  });

  it("keeps ordinary seventh-chord detection ahead of an alternate slash spelling", () => {
    const { snapshot, notePlayed } = createAnalysis();

    ["A3", "C4", "E4", "G4"].forEach((noteName, index) =>
      notePlayed(createActiveNote(`note-${index}`, noteName, noteName))
    );

    expect(snapshot.value.chordLabel).toBe("Am7");
  });

  it("hydrates notes that are already held when Note Bodies are enabled", async () => {
    const c4 = createActiveNote("note-c4", "C4", "Do");
    const e4 = createActiveNote("note-e4", "E4", "Mi");
    harmonicTestState.blobConfig!.value = {
      ...harmonicTestState.blobConfig!.value,
      isEnabled: false,
    };
    const { snapshot } = createAnalysis(() => [c4, e4]);

    expect(snapshot.value.displayedNotes).toEqual([]);

    harmonicTestState.blobConfig!.value = {
      ...harmonicTestState.blobConfig!.value,
      isEnabled: true,
    };
    await nextTick();

    expect(snapshot.value.displayedNotes.map((note) => note.noteId)).toEqual([
      "note-c4",
      "note-e4",
    ]);
    expect(snapshot.value.isVisible).toBe(true);
  });

  it("keeps trimmed held notes active until their real release", () => {
    harmonicTestState.blobConfig!.value = {
      ...harmonicTestState.blobConfig!.value,
      analysisNoteLimit: 2,
    };
    const { snapshot, notePlayed, noteReleased } = createAnalysis();
    const a = createActiveNote("a", "C4", "Do");
    const b = createActiveNote("b", "E4", "Mi");
    const c = createActiveNote("c", "G4", "Sol");
    const d = createActiveNote("d", "B4", "Ti");

    notePlayed(a);
    notePlayed(b);
    notePlayed(c);
    expect(snapshot.value.displayedNotes.map((note) => note.noteId)).toEqual([
      "b",
      "c",
    ]);

    noteReleased("b");
    noteReleased("c");
    notePlayed(d);

    expect(snapshot.value.displayedNotes.map((note) => note.noteId)).toEqual([
      "a",
      "d",
    ]);
    expect(snapshot.value.intervalEdges).toHaveLength(1);
  });

  it("forgets released analysis anchors after their blobs expire", () => {
    const { snapshot, notePlayed, noteReleased, noteExpired } = createAnalysis();
    const c4 = createActiveNote("note-c4", "C4", "Do");
    const e4 = createActiveNote("note-e4", "E4", "Mi");
    const g4 = createActiveNote("note-g4", "G4", "Sol");

    notePlayed(c4);
    notePlayed(e4);
    notePlayed(g4);
    noteReleased(e4.noteId);
    noteExpired(e4.noteId);

    expect(snapshot.value.displayedNotes.map((note) => note.noteId)).toEqual([
      "note-c4",
      "note-g4",
    ]);
    expect(snapshot.value.intervalEdges).toHaveLength(1);
    expect(snapshot.value.isVisible).toBe(true);
  });
});
