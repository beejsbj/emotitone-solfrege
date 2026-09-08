import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { setActivePinia } from "pinia";
import { createTestPinia } from "../helpers/test-utils";
import { usePatternsStore } from "@/stores/patterns";
import { useInstrumentStore } from "@/stores/instrument";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { isPrewarmed, prewarmSoundSamples } from "@/services/superdoughAudio";
import type { LogNote, Pattern, PatternNote } from "@/types/patterns";

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn().mockReturnValue(true),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  getAudioContext: vi.fn(),
  playStrudelCode: vi.fn().mockResolvedValue(undefined),
  stopStrudelPlayback: vi.fn(),
}));

function createPatternNote(overrides: Partial<PatternNote> = {}): PatternNote {
  return {
    id: "pattern-note-1",
    note: "C4",
    scaleDegree: 1,
    scaleIndex: 0,
    octave: 4,
    frequency: 261.63,
    velocity: 0.8,
    pressTime: 1000,
    releaseTime: 1400,
    duration: 400,
    ...overrides,
  };
}

function createLogNote(overrides: Partial<LogNote> = {}): LogNote {
  return {
    id: "log-note-1",
    note: "D4",
    key: "C",
    mode: "major",
    scaleDegree: 2,
    scaleIndex: 1,
    solfege: {
      name: "Re",
      number: 2,
      emotion: "curious",
      description: "Bright forward motion",
      texture: "glossy",
    },
    octave: 4,
    frequency: 293.66,
    instrument: "piano",
    bpm: 120,
    velocity: 0.8,
    pressTime: 1500,
    releaseTime: 1800,
    duration: 300,
    sessionId: "session-1",
    isStartingNewPattern: true,
    ...overrides,
  };
}

function createPattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: "saved-pattern-1",
    name: "Saved Pattern",
    notes: [
      createPatternNote(),
      createPatternNote({
        id: "pattern-note-2",
        note: "E4",
        scaleDegree: 3,
        scaleIndex: 2,
        frequency: 329.63,
        pressTime: 1450,
        releaseTime: 1800,
        duration: 350,
      }),
    ],
    duration: 800,
    noteCount: 2,
    key: "C",
    mode: "major",
    instrument: "piano",
    bpm: 120,
    createdAt: Date.now(),
    isSaved: true,
    isDefault: false,
    ...overrides,
  };
}

function dispatchLoggedNote(
  store: ReturnType<typeof usePatternsStore>,
  noteId: string,
  noteName: string,
  solfegeIndex: number
) {
  store.handleNotePressed({
    detail: {
      noteId,
      noteName,
      solfegeIndex,
      octave: 4,
      frequency: 293.66,
      instrument: "piano",
      note: createLogNote().solfege,
    },
  } as CustomEvent);

  store.handleNoteReleased({
    detail: { noteId },
  } as CustomEvent);
}

function sequenceDateNow(
  spy: ReturnType<typeof vi.spyOn>,
  values: number[]
) {
  const queue = [...values];
  const fallback = queue[queue.length - 1] ?? 0;
  spy.mockReset();
  spy.mockImplementation(() => queue.shift() ?? fallback);
}

describe("Patterns Store", () => {
  let patternsStore: ReturnType<typeof usePatternsStore>;
  let visualConfigStore: ReturnType<typeof useVisualConfigStore>;
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(isPrewarmed).mockReturnValue(true);
    vi.mocked(prewarmSoundSamples).mockResolvedValue(undefined);
    dateNowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-03-16T12:00:00Z").getTime());
    setActivePinia(createTestPinia());
    visualConfigStore = useVisualConfigStore();
    patternsStore = usePatternsStore();
    visualConfigStore.updateConfig("codeStrip", { bpm: 120 });
    patternsStore.clearAllNotes();
    patternsStore.savedPatterns = [];
  });

  afterEach(() => {
    patternsStore?.removeEventListeners();
    dateNowSpy?.mockRestore();
  });

  it("treats loaded base notes and live notes as one current sketch", () => {
    const pattern = createPattern({
      notes: [createPatternNote()],
      noteCount: 1,
      duration: 400,
    });

    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    patternsStore.loggedNotes.push(createLogNote());

    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual([
      "C4",
      "D4",
    ]);
    expect(patternsStore.currentSketchMeta.instrument).toBe("piano");
    expect(patternsStore.currentSketchMeta.bpm).toBe(120);
  });

  it("uses the ready fallback in loaded metadata when pattern warmup fails", async () => {
    const instrumentStore = useInstrumentStore();
    instrumentStore.currentInstrument = "piano";
    instrumentStore.readyInstruments.add("piano");
    vi.mocked(isPrewarmed).mockReturnValue(false);
    vi.mocked(prewarmSoundSamples).mockRejectedValueOnce(
      new Error("preset unavailable")
    );
    const pattern = createPattern({ instrument: "gm_flute" });
    patternsStore.savedPatterns.push(pattern);

    patternsStore.loadPatternAsBase(pattern.id);
    await vi.waitFor(() => {
      expect(instrumentStore.lastWarmupErrorInstrument).toBe("gm_flute");
    });

    expect(instrumentStore.currentInstrument).toBe("piano");
    expect(patternsStore.currentSketchMeta.instrument).toBe("piano");
  });

  it("saves the combined sketch when sending a continued pattern", () => {
    const pattern = createPattern();

    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    patternsStore.loggedNotes.push(
      createLogNote({
        id: "log-note-2",
        note: "G4",
        scaleDegree: 5,
        scaleIndex: 4,
        frequency: 392,
      })
    );

    const previousCount = patternsStore.savedPatterns.length;
    patternsStore.sendCurrentPattern();

    expect(patternsStore.savedPatterns).toHaveLength(previousCount + 1);

    const savedPattern = patternsStore.savedPatterns.at(-1);
    expect(savedPattern?.notes.map((note) => note.note)).toEqual([
      "C4",
      "E4",
      "G4",
    ]);
    expect(savedPattern?.instrument).toBe("piano");
    expect(patternsStore.loadedBaseNotes).toEqual([]);
    expect(patternsStore.loggedNotes).toEqual([]);
  });

  it("imports finalized Melograph takes as separate selectable Patterns", () => {
    const takeOne = [createPatternNote({ id: "take-1-note", note: "C4" })];
    const takeTwo = [
      createPatternNote({ id: "take-2-a", note: "D4", scaleIndex: 1 }),
      createPatternNote({ id: "take-2-b", note: "E4", scaleIndex: 2 }),
    ];

    const ids = patternsStore.importPatternCandidates(
      [
        {
          name: "Hummed take 1",
          notes: takeOne,
          source: {
            kind: "melograph",
            schemaVersion: 1,
            tracker: "praat-ac",
            takeNumber: 1,
          },
        },
        {
          name: "Hummed take 2",
          notes: takeTwo,
          source: {
            kind: "melograph",
            schemaVersion: 1,
            tracker: "praat-ac",
            takeNumber: 2,
          },
        },
      ],
      { key: "C", mode: "major", instrument: "piano", bpm: 96 },
    );

    expect(ids).toHaveLength(2);
    expect(patternsStore.savedPatterns.slice(-2).map((pattern) => pattern.name)).toEqual([
      "Hummed take 1",
      "Hummed take 2",
    ]);
    expect(patternsStore.savedPatterns.slice(-2).map((pattern) => pattern.isSaved)).toEqual([
      false,
      false,
    ]);
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual(["C4"]);
    expect(patternsStore.currentSketchMeta.bpm).toBe(96);

    patternsStore.loadPatternAsBase(ids[1]);
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual([
      "D4",
      "E4",
    ]);
    expect(patternsStore.focusedPattern?.source).toEqual({
      kind: "melograph",
      schemaVersion: 1,
      tracker: "praat-ac",
      takeNumber: 2,
    });
  });

  it("does not record visual-only Melograph preview events", () => {
    const eventDetail = {
      source: "melograph-live",
      record: false,
      noteId: "preview-1",
      noteName: "C4",
      solfegeIndex: 0,
      octave: 4,
      frequency: 261.63,
      instrument: "piano",
      note: createLogNote().solfege,
    };

    patternsStore.handleNotePressed({ detail: eventDetail } as CustomEvent);
    patternsStore.handleNoteReleased({ detail: eventDetail } as CustomEvent);

    expect(patternsStore.loggedNotes).toEqual([]);
  });

  it("lets Return save a one-note hummed Pattern", () => {
    const [patternId] = patternsStore.importPatternCandidates(
      [{
        name: "Hummed pattern",
        notes: [createPatternNote()],
        source: {
          kind: "melograph",
          schemaVersion: 1,
          tracker: "praat-ac",
          takeNumber: 1,
        },
      }],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
    );
    const previousCount = patternsStore.savedPatterns.length;

    patternsStore.sendCurrentPattern();

    expect(patternsStore.savedPatterns).toHaveLength(previousCount);
    expect(
      patternsStore.savedPatterns.find((pattern) => pattern.id === patternId),
    ).toEqual(expect.objectContaining({ isSaved: true, noteCount: 1 }));
    expect(patternsStore.currentSketchNotes).toEqual([]);
  });

  it("does not save an ordinary keyboard sketch shorter than three notes", () => {
    patternsStore.loggedNotes = [
      createLogNote({ id: "short-a" }),
      createLogNote({ id: "short-b", isStartingNewPattern: false }),
    ];

    patternsStore.sendCurrentPattern();

    expect(patternsStore.savedPatterns).toEqual([]);
    expect(patternsStore.currentSketchNotes).toEqual([]);
  });

  it("clears safely when every note is removed from a hummed take", () => {
    const [patternId] = patternsStore.importPatternCandidates(
      [{
        name: "Hummed pattern",
        notes: [createPatternNote()],
        source: {
          kind: "melograph",
          schemaVersion: 1,
          tracker: "praat-ac",
          takeNumber: 1,
        },
      }],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
    );
    patternsStore.removeLastFromCurrentSketch();

    expect(() => patternsStore.sendCurrentPattern()).not.toThrow();
    expect(patternsStore.currentSketchNotes).toEqual([]);
    expect(
      patternsStore.savedPatterns.find((pattern) => pattern.id === patternId),
    ).toEqual(expect.objectContaining({ isSaved: false }));
  });

  it("does not grant the imported short-pattern exception after context changes", () => {
    patternsStore.importPatternCandidates(
      [{
        name: "Hummed pattern",
        notes: [createPatternNote()],
        source: {
          kind: "melograph",
          schemaVersion: 1,
          tracker: "praat-ac",
          takeNumber: 1,
        },
      }],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
    );
    visualConfigStore.updateConfig("codeStrip", { bpm: 90 });
    patternsStore.loggedNotes = [
      createLogNote({ id: "new-context-a", bpm: 90 }),
      createLogNote({
        id: "new-context-b",
        bpm: 90,
        isStartingNewPattern: false,
      }),
    ];
    const previousCount = patternsStore.savedPatterns.length;

    patternsStore.sendCurrentPattern();

    expect(patternsStore.savedPatterns).toHaveLength(previousCount);
  });

  it("does not copy imported provenance onto a new-context keyboard sketch", () => {
    patternsStore.importPatternCandidates(
      [{
        name: "Hummed pattern",
        notes: [createPatternNote()],
        source: {
          kind: "melograph",
          schemaVersion: 1,
          tracker: "praat-ac",
          takeNumber: 1,
        },
      }],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
    );
    visualConfigStore.updateConfig("codeStrip", { bpm: 90 });
    patternsStore.loggedNotes = [
      createLogNote({ id: "new-context-a", bpm: 90 }),
      createLogNote({ id: "new-context-b", bpm: 90, isStartingNewPattern: false }),
      createLogNote({ id: "new-context-c", bpm: 90, isStartingNewPattern: false }),
    ];

    patternsStore.sendCurrentPattern();

    expect(patternsStore.savedPatterns.at(-1)?.source).toBeUndefined();
  });

  it("saves an edited hummed take as a separate sourced Pattern", () => {
    patternsStore.importPatternCandidates(
      [{
        name: "Hummed pattern",
        notes: [
          createPatternNote({ id: "original-a" }),
          createPatternNote({ id: "original-b", note: "D4", scaleIndex: 1 }),
        ],
        source: {
          kind: "melograph",
          schemaVersion: 1,
          tracker: "praat-ac",
          takeNumber: 1,
        },
      }],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
    );
    const previousCount = patternsStore.savedPatterns.length;

    patternsStore.removeLastFromCurrentSketch();
    patternsStore.sendCurrentPattern();

    expect(patternsStore.savedPatterns).toHaveLength(previousCount + 1);
    expect(patternsStore.savedPatterns.at(-1)).toEqual(expect.objectContaining({
      isSaved: true,
      noteCount: 1,
      source: expect.objectContaining({ kind: "melograph", takeNumber: 1 }),
    }));
  });

  it("derives edited-take provenance from the loaded pattern, not focus", () => {
    patternsStore.importPatternCandidates(
      [{
        name: "Hummed pattern",
        notes: [
          createPatternNote({ id: "source-a" }),
          createPatternNote({ id: "source-b", note: "D4", scaleIndex: 1 }),
        ],
        source: {
          kind: "melograph",
          schemaVersion: 1,
          tracker: "praat-ac",
          takeNumber: 4,
        },
      }],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
    );
    patternsStore.savedPatterns.push(createPattern({ id: "other-pattern" }));
    patternsStore.setFocusedPattern("other-pattern");
    patternsStore.removeLastFromCurrentSketch();

    patternsStore.sendCurrentPattern();

    expect(patternsStore.savedPatterns.at(-1)?.source).toEqual(
      expect.objectContaining({ kind: "melograph", takeNumber: 4 }),
    );
  });

  it("discards edits from the previous take when explicitly switching takes", () => {
    const ids = patternsStore.importPatternCandidates(
      [
        {
          name: "Take 1",
          notes: [createPatternNote({ id: "take-one" })],
          source: { kind: "melograph", schemaVersion: 1, tracker: "praat-ac", takeNumber: 1 },
        },
        {
          name: "Take 2",
          notes: [createPatternNote({ id: "take-two", note: "E4", scaleIndex: 2 })],
          source: { kind: "melograph", schemaVersion: 1, tracker: "praat-ac", takeNumber: 2 },
        },
      ],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
    );
    patternsStore.loggedNotes.push(createLogNote({ id: "take-one-edit" }));

    patternsStore.loadPatternAsBase(ids[1], { discardWorkingNotes: true });

    expect(patternsStore.loggedNotes).toEqual([]);
    expect(patternsStore.currentSketchNotes.map((note) => note.id)).toEqual(["take-two"]);
  });

  it("keeps live notes supplied by an in-flight import", () => {
    const liveNote = createLogNote({ id: "during-analysis" });

    patternsStore.importPatternCandidates(
      [{
        name: "Hummed pattern",
        notes: [createPatternNote({ id: "hummed-note" })],
        source: { kind: "melograph", schemaVersion: 1, tracker: "praat-ac", takeNumber: 1 },
      }],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
      { workingNotes: [liveNote] },
    );

    expect(patternsStore.loggedNotes.map((note) => note.id)).toEqual(["during-analysis"]);
    expect(patternsStore.currentSketchNotes.map((note) => note.id)).toEqual([
      "hummed-note",
      "during-analysis",
    ]);
  });

  it("removes live notes before loaded base notes when undoing the current sketch", () => {
    const pattern = createPattern({
      notes: [createPatternNote()],
      noteCount: 1,
      duration: 400,
    });

    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    patternsStore.loggedNotes.push(createLogNote());

    patternsStore.removeLastFromCurrentSketch();
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual([
      "C4",
    ]);

    patternsStore.removeLastFromCurrentSketch();
    expect(patternsStore.currentSketchNotes).toEqual([]);
  });

  it("normalizes the seam between a loaded pattern and resumed live notes", () => {
    const pattern = createPattern({
      notes: [
        createPatternNote({
          id: "base-note-1",
          note: "C4",
          pressTime: 0,
          releaseTime: 400,
          duration: 400,
        }),
      ],
      noteCount: 1,
      duration: 400,
    });

    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    patternsStore.loggedNotes.push(
      createLogNote({
        id: "log-note-2",
        note: "D4",
        pressTime: 30_000,
        releaseTime: 30_300,
        duration: 300,
      })
    );

    expect(patternsStore.currentSketchNotes.map((note) => note.pressTime)).toEqual([
      0,
      400,
    ]);
  });

  it("keeps a dynamic pattern by promoting it into saved patterns", () => {
    const dynamicPattern = createPattern({
      id: "dynamic-pattern-a-c",
      isSaved: false,
      createdAt: Date.now(),
    });

    patternsStore.loggedNotes = [
      createLogNote({
        id: "a",
        note: "C4",
        scaleDegree: 1,
        scaleIndex: 0,
        pressTime: 1000,
        releaseTime: 1200,
        duration: 200,
      }),
      createLogNote({
        id: "b",
        note: "E4",
        scaleDegree: 3,
        scaleIndex: 2,
        pressTime: 1300,
        releaseTime: 1500,
        duration: 200,
        isStartingNewPattern: false,
      }),
      createLogNote({
        id: "c",
        note: "G4",
        scaleDegree: 5,
        scaleIndex: 4,
        pressTime: 1600,
        releaseTime: 1800,
        duration: 200,
        isStartingNewPattern: false,
      }),
    ];

    expect(patternsStore.dynamicPatterns[0]?.id).toBe(dynamicPattern.id);

    patternsStore.keepPattern(dynamicPattern.id);

    expect(patternsStore.savedPatterns).toHaveLength(1);
    expect(patternsStore.savedPatterns[0]?.id).toBe(dynamicPattern.id);
    expect(patternsStore.savedPatterns[0]?.isKept).toBe(true);
  });

  it("purges non-kept user patterns older than a week but keeps defaults and kept patterns", () => {
    patternsStore.savedPatterns = [
      createPattern({
        id: "old-user-pattern",
        createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        isKept: false,
      }),
      createPattern({
        id: "kept-pattern",
        createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        isKept: true,
      }),
    ];

    patternsStore.purgeOldPatterns();

    expect(patternsStore.savedPatterns.map((pattern) => pattern.id)).toEqual([
      "kept-pattern",
    ]);
    expect(patternsStore.patterns.some((pattern) => pattern.isDefault)).toBe(true);
  });

  it("starts a new pattern when BPM changes between notes", () => {
    sequenceDateNow(dateNowSpy, [
      1000,
      1001,
      1200,
      1201,
      1300,
      1301,
      1500,
      1501,
    ]);

    dispatchLoggedNote(patternsStore, "note-a", "C4", 0);
    visualConfigStore.updateConfig("codeStrip", { bpm: 90 });
    dispatchLoggedNote(patternsStore, "note-b", "D4", 1);

    expect(patternsStore.loggedNotes[0]?.bpm).toBe(120);
    expect(patternsStore.loggedNotes[1]?.bpm).toBe(90);
    expect(patternsStore.loggedNotes[1]?.isStartingNewPattern).toBe(true);
    expect(patternsStore.currentSketchMeta.bpm).toBe(90);
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual(["D4"]);
  });

  it("uses a tempo-aware silence boundary instead of waiting 30 seconds", () => {
    sequenceDateNow(dateNowSpy, [
      1000,
      1001,
      1200,
      1201,
      4300,
      4301,
      4500,
      4501,
    ]);

    dispatchLoggedNote(patternsStore, "note-a", "C4", 0);
    dispatchLoggedNote(patternsStore, "note-b", "D4", 1);

    expect(patternsStore.loggedNotes[1]?.isStartingNewPattern).toBe(true);
  });

  it("keeps loaded-base sketches single-context when BPM changes before continuing", () => {
    const pattern = createPattern({
      bpm: 108,
      notes: [createPatternNote({ note: "C4" })],
      noteCount: 1,
      duration: 400,
    });

    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);

    visualConfigStore.updateConfig("codeStrip", { bpm: 90 });

    sequenceDateNow(dateNowSpy, [
      1000,
      1001,
      1200,
      1201,
      1300,
      1301,
      1500,
      1501,
      1600,
      1601,
      1800,
      1801,
      1900,
      1901,
    ]);

    dispatchLoggedNote(patternsStore, "note-a", "D4", 1);
    dispatchLoggedNote(patternsStore, "note-b", "E4", 2);
    dispatchLoggedNote(patternsStore, "note-c", "G4", 4);

    expect(patternsStore.currentSketchMeta.bpm).toBe(90);
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual([
      "D4",
      "E4",
      "G4",
    ]);

    patternsStore.sendCurrentPattern();

    const savedPattern = patternsStore.savedPatterns.at(-1);
    expect(savedPattern?.notes.map((note) => note.note)).toEqual([
      "D4",
      "E4",
      "G4",
    ]);
    expect(savedPattern?.bpm).toBe(90);
  });

  it("deletes a user pattern and clears it from the active desk", () => {
    const pattern = createPattern();
    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    const fallbackPattern = patternsStore.patterns.at(-2);

    expect(patternsStore.deletePattern(pattern.id)).toBe(true);
    expect(patternsStore.savedPatterns).not.toContainEqual(pattern);
    expect(patternsStore.focusedPatternId).toBe(fallbackPattern?.id);
    expect(patternsStore.focusedPattern).toEqual(fallbackPattern);
    expect(patternsStore.loadedBasePatternId).toBeNull();
    expect(patternsStore.loadedBaseNotes).toEqual([]);
    expect(patternsStore.isStripCleared).toBe(true);
  });

  it("does not delete default library patterns", () => {
    const defaultPattern = patternsStore.patterns.find((pattern) => pattern.isDefault);
    expect(defaultPattern).toBeDefined();

    expect(patternsStore.deletePattern(defaultPattern!.id)).toBe(false);
    expect(patternsStore.patterns).toContainEqual(defaultPattern);
  });
});
