import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, type EffectScope } from "vue";
import type {
  ActiveNote,
  BlobConfig,
  BlobRelationshipConfig,
} from "@/types";
import { useHarmonicAnalysis } from "@/composables/useHarmonicAnalysis";
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

  it("defaults blob relationships off with labels hidden", () => {
    expect(DEFAULT_CONFIG.blobs.connectionMode).toBe("off");
    expect(DEFAULT_CONFIG.blobs.showChordLabel).toBe(false);
    expect(DEFAULT_CONFIG.blobs.showIntervalLabels).toBe(false);
    expect(DEFAULT_CONFIG.blobs.showEmotionLabel).toBe(false);
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
  });

  it.each([
    [["C4", "E4", "G4"], "CM"],
    [["A3", "C4", "F4"], "FM/A"],
    [["C4", "F4", "A4"], "FM/C"],
    [["C3", "E4", "A4"], "Am/C"],
    [["A4", "C3", "E4"], "Am/C"],
  ])("detects the expected bass-qualified triad: %s", (noteNames, expectedLabel) => {
    const { snapshot, notePlayed } = createAnalysis();

    (noteNames as string[]).forEach((noteName, index) =>
      notePlayed(createActiveNote(`note-${index}`, noteName, noteName))
    );

    expect(snapshot.value.chordLabel).toBe(expectedLabel);
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

  it("updates the inversion when the actual bass changes", () => {
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

  it("hydrates notes that are already held when harmonic geometry is enabled", async () => {
    const c4 = createActiveNote("note-c4", "C4", "Do");
    const e4 = createActiveNote("note-e4", "E4", "Mi");
    harmonicTestState.blobConfig!.value = {
      ...harmonicTestState.blobConfig!.value,
      connectionMode: "off",
    };
    const { snapshot } = createAnalysis(() => [c4, e4]);

    expect(snapshot.value.displayedNotes).toEqual([]);

    harmonicTestState.blobConfig!.value = {
      ...harmonicTestState.blobConfig!.value,
      connectionMode: "merge",
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
