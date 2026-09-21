import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { setActivePinia } from "pinia";
import { createTestPinia } from "../helpers/test-utils";
import { usePatternsStore } from "@/stores/patterns";
import { useInstrumentStore } from "@/stores/instrument";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { isPrewarmed, prewarmSoundSamples } from "@/services/superdoughAudio";
import type { LogNote, Pattern, PatternNote } from "@/types/patterns";

const audioContext = vi.hoisted(() => ({
  state: "running",
  get currentTime() { return performance.now() / 1000; },
}));

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  stopNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn().mockReturnValue(true),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  getAudioContext: vi.fn(() => audioContext),
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

  it("records delayed notes with their attack-time key and mode context", () => {
    const musicStore = useMusicStore();
    musicStore.setKey("G");
    musicStore.setMode("minor");

    patternsStore.handleNotePressed({
      detail: {
        noteId: "delayed-chord-note",
        noteName: "E4",
        solfegeIndex: 2,
        octave: 4,
        frequency: 329.63,
        instrument: "piano",
        note: createLogNote().solfege,
        key: "C",
        mode: "major",
      },
    } as CustomEvent);
    patternsStore.handleNoteReleased({
      detail: { noteId: "delayed-chord-note" },
    } as CustomEvent);

    expect(patternsStore.loggedNotes[0]).toMatchObject({
      key: "C",
      mode: "major",
    });
  });

  it("records a scheduled Style pulse with its captured instrument", () => {
    useInstrumentStore().currentInstrument = "gm_flute";

    patternsStore.handleNotePressed({
      detail: {
        noteId: "styled-piano-note",
        noteName: "E4",
        solfegeIndex: 2,
        octave: 4,
        frequency: 329.63,
        instrument: "piano",
        source: "live-play-style",
        note: createLogNote().solfege,
      },
    } as CustomEvent);
    patternsStore.handleNoteReleased({
      detail: { noteId: "styled-piano-note", source: "live-play-style" },
    } as CustomEvent);

    expect(patternsStore.loggedNotes[0]?.instrument).toBe("piano");
  });

  it("keeps completed styled notes in onset order when releases arrive in reverse", () => {
    const startedAt = Date.now();
    const scheduled = [
      { noteId: "style-g", noteName: "G4", solfegeIndex: 4, timestamp: startedAt + 30 },
      { noteId: "style-e", noteName: "E4", solfegeIndex: 2, timestamp: startedAt + 65 },
      { noteId: "style-c", noteName: "C4", solfegeIndex: 0, timestamp: startedAt + 100 },
    ];

    for (const detail of scheduled) {
      patternsStore.handleNotePressed({
        detail: {
          ...detail,
          octave: 4,
          frequency: 440,
          instrument: "piano",
          source: "live-play-style",
          note: createLogNote().solfege,
        },
      } as CustomEvent);
    }
    const releaseTimes = new Map([
      ["style-c", startedAt + 200],
      ["style-e", startedAt + 300],
      ["style-g", startedAt + 1000],
    ]);
    for (const noteId of ["style-c", "style-e", "style-g"]) {
      patternsStore.handleNoteReleased({
        detail: { noteId, timestamp: releaseTimes.get(noteId) },
      } as CustomEvent);
    }

    expect(patternsStore.loggedNotes.map((note) => note.note)).toEqual(["G4", "E4", "C4"]);
    expect(patternsStore.loggedNotes.map((note) => note.isStartingNewPattern)).toEqual([true, false, false]);
    expect(patternsStore.dynamicPatterns[0]?.duration).toBe(970);

    patternsStore.sendCurrentPattern();
    const saved = patternsStore.savedPatterns.at(-1)!;
    expect(saved.duration).toBe(970);
    patternsStore.loadPatternAsBase(saved.id, { discardWorkingNotes: true });
    patternsStore.handleNotePressed({
      detail: {
        noteId: "appended-d",
        noteName: "D4",
        solfegeIndex: 1,
        octave: 4,
        frequency: 293.66,
        instrument: "piano",
        source: "live-play-style",
        note: createLogNote().solfege,
        timestamp: startedAt + 1200,
      },
    } as CustomEvent);
    patternsStore.handleNoteReleased({
      detail: { noteId: "appended-d", timestamp: startedAt + 1400 },
    } as CustomEvent);
    expect(patternsStore.currentSketchNotes.at(-1)?.pressTime).toBe(startedAt + 1000);
  });

  it("counts a context boundary revealed by reverse completion order", () => {
    const startedAt = Date.now();
    const press = (detail: { noteId: string; noteName: string; timestamp: number; key: "C" | "G" }) => {
      patternsStore.handleNotePressed({
        detail: {
          ...detail,
          solfegeIndex: 0,
          octave: 4,
          frequency: 440,
          instrument: "piano",
          source: "live-play-style",
          mode: "major",
          note: createLogNote().solfege,
        },
      } as CustomEvent);
    };

    press({ noteId: "later-g", noteName: "G4", timestamp: startedAt + 100, key: "G" });
    press({ noteId: "earlier-c", noteName: "C4", timestamp: startedAt + 30, key: "C" });
    patternsStore.handleNoteReleased({
      detail: { noteId: "later-g", timestamp: startedAt + 300 },
    } as CustomEvent);
    patternsStore.handleNoteReleased({
      detail: { noteId: "earlier-c", timestamp: startedAt + 250 },
    } as CustomEvent);

    expect(patternsStore.loggedNotes.map((note) => note.note)).toEqual(["C4", "G4"]);
    expect(patternsStore.loggedNotes.map((note) => note.isStartingNewPattern)).toEqual([true, true]);
    expect(patternsStore.currentTakeGeneration).toBe(1);
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

  it("restores every displayed musical control when loading a pattern", async () => {
    const musicStore = useMusicStore();
    const instrumentStore = useInstrumentStore();
    const keyboardStore = useKeyboardDrawerStore();
    const pattern = createPattern({
      key: "D",
      mode: "minor",
      instrument: "gm_flute",
      bpm: 96,
      notes: [createPatternNote({ note: "D5", octave: 5, scaleIndex: 0 })],
    });
    patternsStore.savedPatterns.push(pattern);

    patternsStore.loadPatternAsBase(pattern.id);

    expect(musicStore.currentKey).toBe("D");
    expect(musicStore.currentMode).toBe("minor");
    expect(visualConfigStore.config.codeStrip.bpm).toBe(96);
    expect(keyboardStore.keyboardConfig.mainOctave).toBe(5);
    await vi.waitFor(() => {
      expect(instrumentStore.currentInstrument).toBe("gm_flute");
    });
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

  it("imports finalized pitch-analysis takes as separate selectable Patterns", () => {
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
            kind: "pitch-analysis",
            schemaVersion: 1,
            tracker: "praat-ac",
            takeNumber: 1,
          },
        },
        {
          name: "Hummed take 2",
          notes: takeTwo,
          source: {
            kind: "pitch-analysis",
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
      kind: "pitch-analysis",
      schemaVersion: 1,
      tracker: "praat-ac",
      takeNumber: 2,
    });
  });

  it("does not record visual-only pitch-analysis preview events", () => {
    const eventDetail = {
      source: "live-pitch",
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
          kind: "pitch-analysis",
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

  it("keeps the short-pattern exception for legacy imported provenance", () => {
    patternsStore.importPatternCandidates(
      [{
        name: "Legacy hummed pattern",
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

    expect(() => patternsStore.sendCurrentPattern()).not.toThrow();
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
          kind: "pitch-analysis",
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
          kind: "pitch-analysis",
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
          kind: "pitch-analysis",
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
          kind: "pitch-analysis",
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
      source: expect.objectContaining({ kind: "pitch-analysis", takeNumber: 1 }),
    }));
  });

  it("saves a transformed imported take without overwriting its source candidate", async () => {
    const musicStore = useMusicStore();
    const [sourceId] = patternsStore.importPatternCandidates(
      [{
        name: "Hummed triad",
        notes: [
          createPatternNote({ id: "source-c", note: "C4", scaleIndex: 0 }),
          createPatternNote({ id: "source-e", note: "E4", scaleIndex: 2 }),
          createPatternNote({ id: "source-g", note: "G4", scaleIndex: 4 }),
        ],
        source: {
          kind: "pitch-analysis",
          schemaVersion: 1,
          tracker: "praat-ac",
          takeNumber: 1,
        },
      }],
      { key: "C", mode: "major", instrument: "piano", bpm: 120 },
    );
    await nextTick();

    musicStore.setKey("D");
    await nextTick();
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual([
      "D4",
      "F#4",
      "A4",
    ]);

    patternsStore.sendCurrentPattern();

    const source = patternsStore.savedPatterns.find((pattern) => pattern.id === sourceId);
    expect(source).toEqual(expect.objectContaining({ key: "C", isSaved: false }));
    expect(source?.notes.map((note) => note.note)).toEqual(["C4", "E4", "G4"]);
    expect(patternsStore.savedPatterns.at(-1)).toEqual(expect.objectContaining({
      key: "D",
      isSaved: true,
      source: expect.objectContaining({ kind: "pitch-analysis", takeNumber: 1 }),
    }));
    expect(patternsStore.savedPatterns.at(-1)?.notes.map((note) => note.note)).toEqual([
      "D4",
      "F#4",
      "A4",
    ]);
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
          kind: "pitch-analysis",
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
      expect.objectContaining({ kind: "pitch-analysis", takeNumber: 4 }),
    );
  });

  it("discards edits from the previous take when explicitly switching takes", () => {
    const ids = patternsStore.importPatternCandidates(
      [
        {
          name: "Take 1",
          notes: [createPatternNote({ id: "take-one" })],
          source: { kind: "pitch-analysis", schemaVersion: 1, tracker: "praat-ac", takeNumber: 1 },
        },
        {
          name: "Take 2",
          notes: [createPatternNote({ id: "take-two", note: "E4", scaleIndex: 2 })],
          source: { kind: "pitch-analysis", schemaVersion: 1, tracker: "praat-ac", takeNumber: 2 },
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
        source: { kind: "pitch-analysis", schemaVersion: 1, tracker: "praat-ac", takeNumber: 1 },
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

  it("keeps focus synchronized when the current dynamic pattern ID evolves", async () => {
    patternsStore.loggedNotes = [
      createLogNote({ id: "a", isStartingNewPattern: true }),
      createLogNote({ id: "b", isStartingNewPattern: false }),
      createLogNote({ id: "c", isStartingNewPattern: false }),
    ];
    await Promise.resolve();
    const threeNoteId = patternsStore.dynamicPatterns[0]?.id;
    expect(patternsStore.focusedPatternId).toBe(threeNoteId);

    patternsStore.loggedNotes.push(
      createLogNote({ id: "d", isStartingNewPattern: false }),
    );
    await Promise.resolve();

    const fourNoteId = patternsStore.dynamicPatterns[0]?.id;
    expect(fourNoteId).not.toBe(threeNoteId);
    expect(patternsStore.focusedPatternId).toBe(fourNoteId);
    expect(patternsStore.focusedPattern?.id).toBe(fourNoteId);
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
    expect(patternsStore.currentTakeGeneration).toBe(1);
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
    expect(patternsStore.currentTakeGeneration).toBe(1);
  });

  it("advances the take lifecycle for context and forced boundaries, not ordinary notes", () => {
    const musicStore = useMusicStore();
    const instrumentStore = useInstrumentStore();

    dispatchLoggedNote(patternsStore, "note-a", "C4", 0);
    expect(patternsStore.currentTakeGeneration).toBe(0);

    musicStore.setKey("D");
    dispatchLoggedNote(patternsStore, "note-b", "D4", 0);
    expect(patternsStore.currentTakeGeneration).toBe(1);

    musicStore.setMode("minor");
    dispatchLoggedNote(patternsStore, "note-c", "E4", 1);
    expect(patternsStore.currentTakeGeneration).toBe(2);

    instrumentStore.currentInstrument = "gm_flute";
    dispatchLoggedNote(patternsStore, "note-d", "F4", 2);
    expect(patternsStore.currentTakeGeneration).toBe(3);

    patternsStore.setNextNoteAsNewPattern();
    dispatchLoggedNote(patternsStore, "note-e", "G4", 3);
    expect(patternsStore.currentTakeGeneration).toBe(4);

    dispatchLoggedNote(patternsStore, "note-f", "A4", 4);
    expect(patternsStore.currentTakeGeneration).toBe(4);
  });

  it("advances once on Send and not again for the first note of its empty take", () => {
    dispatchLoggedNote(patternsStore, "note-a", "C4", 0);

    patternsStore.sendCurrentPattern();
    expect(patternsStore.currentTakeGeneration).toBe(1);

    dispatchLoggedNote(patternsStore, "note-b", "D4", 1);
    expect(patternsStore.currentTakeGeneration).toBe(1);
  });

  it("does not treat a compatible loaded-base continuation as a fresh take", () => {
    const pattern = createPattern({
      notes: [createPatternNote({ note: "C4" })],
      noteCount: 1,
      duration: 400,
    });
    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);

    dispatchLoggedNote(patternsStore, "note-a", "D4", 1);

    expect(patternsStore.loggedNotes[0]?.isStartingNewPattern).toBe(true);
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual(["C4", "D4"]);
    expect(patternsStore.currentTakeGeneration).toBe(0);
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
    expect(patternsStore.currentTakeGeneration).toBe(1);

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

  it("persists renamed user and default patterns without duplicating defaults", () => {
    const userPattern = createPattern();
    patternsStore.savedPatterns.push(userPattern);
    const defaultPattern = patternsStore.patterns.find((pattern) => pattern.isDefault)!;

    expect(patternsStore.renamePattern(userPattern.id, "  Night Sketch  ")).toBe(true);
    expect(patternsStore.renamePattern(defaultPattern.id, "Little Constellation")).toBe(true);

    expect(patternsStore.patterns.find((pattern) => pattern.id === userPattern.id)?.name)
      .toBe("Night Sketch");
    expect(patternsStore.patterns.filter((pattern) => pattern.id === defaultPattern.id))
      .toHaveLength(1);
    expect(patternsStore.patterns.find((pattern) => pattern.id === defaultPattern.id)?.name)
      .toBe("Little Constellation");
    expect(patternsStore.savedPatterns.find((pattern) => pattern.id === defaultPattern.id))
      .toMatchObject({ name: "Little Constellation", isDefault: true });

    const savedDefault = patternsStore.savedPatterns.find(
      (pattern) => pattern.id === defaultPattern.id,
    )!;
    savedDefault.key = "D";
    savedDefault.instrument = "gm_trumpet";
    savedDefault.notes = [];
    const resolvedDefault = patternsStore.patterns.find(
      (pattern) => pattern.id === defaultPattern.id,
    )!;
    expect(resolvedDefault).toMatchObject({
      name: "Little Constellation",
      key: defaultPattern.key,
      instrument: defaultPattern.instrument,
      notes: defaultPattern.notes,
    });
  });

  it("does not turn a renamed live phrase into a shared-note saved snapshot", () => {
    patternsStore.loggedNotes = [
      createLogNote({
        id: "live-a",
        pressTime: 1000,
        releaseTime: 1200,
        isStartingNewPattern: true,
      }),
      createLogNote({
        id: "live-b",
        pressTime: 1300,
        releaseTime: 1500,
        isStartingNewPattern: false,
      }),
      createLogNote({
        id: "live-c",
        pressTime: 1600,
        releaseTime: 1800,
        isStartingNewPattern: false,
      }),
    ];
    const dynamicId = patternsStore.dynamicPatterns[0]?.id;
    if (!dynamicId) throw new Error("Missing dynamic pattern");

    expect(patternsStore.renamePattern(dynamicId, "Unsafe snapshot")).toBe(false);
    expect(patternsStore.savedPatterns).toEqual([]);

    patternsStore.loggedNotes.push(createLogNote({
      id: "live-d",
      pressTime: 1900,
      releaseTime: 2100,
      isStartingNewPattern: false,
    }));
    expect(patternsStore.loggedNotes.map((note) => note.id)).toEqual([
      "live-a",
      "live-b",
      "live-c",
      "live-d",
    ]);
    expect(patternsStore.dynamicPatterns[0]?.notes.map((note) => note.id)).toEqual([
      "live-a",
      "live-b",
      "live-c",
      "live-d",
    ]);
  });

  it("dynamically updates loaded pattern instrument, key, mode, and octave when controls change", async () => {
    const musicStore = useMusicStore();
    const instrumentStore = useInstrumentStore();
    const keyboardStore = useKeyboardDrawerStore();
    const pattern = createPattern({
      key: "E",
      mode: "minor",
      instrument: "piano",
      bpm: 120,
      notes: [
        createPatternNote({ note: "E4", octave: 4, scaleIndex: 0, scaleDegree: 1 }),
        createPatternNote({ note: "G4", octave: 4, scaleIndex: 2, scaleDegree: 3 }),
        createPatternNote({ note: "B4", octave: 4, scaleIndex: 4, scaleDegree: 5 }),
      ],
    });
    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);

    expect(patternsStore.currentSketchMeta.instrument).toBe("piano");
    expect(patternsStore.currentSketchMeta.key).toBe("E");
    expect(patternsStore.currentSketchMeta.mode).toBe("minor");

    // 1. Change instrument before playing any live note
    await instrumentStore.setInstrument("gm_flute");
    await nextTick();
    expect(patternsStore.currentSketchMeta.instrument).toBe("gm_flute");

    // 2. Change key
    musicStore.setKey("G");
    await nextTick();
    expect(patternsStore.currentSketchMeta.key).toBe("G");
    // Transposed from E (+3 semitones): E4 -> G4, G4 -> A#4, B4 -> D5
    expect(patternsStore.currentSketchNotes.map((n) => n.note)).toEqual(["G4", "A#4", "D5"]);

    // 3. Change mode
    musicStore.setMode("major");
    await nextTick();
    expect(patternsStore.currentSketchMeta.mode).toBe("major");
    expect(patternsStore.currentSketchNotes.map((n) => n.note)).toEqual(["G4", "B4", "D5"]);

    // 4. Change octave without mutating the stored source pattern
    keyboardStore.setMainOctave(5);
    await nextTick();
    expect(patternsStore.currentSketchNotes.map((n) => n.note)).toEqual(["G5", "B5", "D6"]);
    expect(pattern.notes.map((n) => n.note)).toEqual(["E4", "G4", "B4"]);
  });

  it("preserves tonic-relative register when a mode change crosses C", async () => {
    const musicStore = useMusicStore();
    const pattern = createPattern({
      key: "C#",
      mode: "minor",
      notes: [
        createPatternNote({ note: "C#4", octave: 4, scaleIndex: 0, scaleDegree: 1 }),
        createPatternNote({
          id: "leading-tone",
          note: "B4",
          octave: 4,
          scaleIndex: 6,
          scaleDegree: 7,
        }),
      ],
    });
    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    await nextTick();

    musicStore.setMode("major");
    await nextTick();
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual(["C#4", "C5"]);
    expect(patternsStore.currentSketchNotes[1]?.octave).toBe(5);

    musicStore.setMode("minor");
    await nextTick();
    expect(patternsStore.currentSketchNotes.map((note) => note.note)).toEqual(["C#4", "B4"]);
    expect(patternsStore.currentSketchNotes[1]?.octave).toBe(4);
  });

  it("preserves tonic-relative register for tritone mode changes", async () => {
    const musicStore = useMusicStore();
    const pattern = createPattern({
      key: "D",
      mode: "minor pentatonic",
      notes: [
        createPatternNote({ note: "D4", octave: 4, scaleIndex: 0, scaleDegree: 1 }),
        createPatternNote({
          id: "minor-pentatonic-fifth",
          note: "C5",
          octave: 5,
          scaleIndex: 4,
          scaleDegree: 5,
        }),
      ],
    });
    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    await nextTick();

    musicStore.setMode("chromatic");
    await nextTick();
    expect(patternsStore.currentSketchNotes[1]).toEqual(expect.objectContaining({
      note: "F#4",
      octave: 4,
    }));

    musicStore.setMode("minor pentatonic");
    await nextTick();
    expect(patternsStore.currentSketchNotes[1]).toEqual(expect.objectContaining({
      note: "C5",
      octave: 5,
    }));
  });

  it("preserves retained scale degrees through sparse-mode octave changes", async () => {
    const musicStore = useMusicStore();
    const keyboardStore = useKeyboardDrawerStore();
    const pattern = createPattern({
      key: "C",
      mode: "major",
      notes: [
        createPatternNote({ note: "C4", octave: 4, scaleIndex: 0, scaleDegree: 1 }),
        createPatternNote({
          id: "major-seventh",
          note: "B4",
          octave: 4,
          scaleIndex: 6,
          scaleDegree: 7,
        }),
      ],
    });
    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    await nextTick();

    musicStore.setMode("major pentatonic");
    await nextTick();
    keyboardStore.setMainOctave(5);
    await nextTick();
    expect(patternsStore.currentSketchNotes[1]).toEqual(expect.objectContaining({
      note: "B5",
      scaleIndex: 6,
      scaleDegree: 7,
    }));

    musicStore.setMode("major");
    await nextTick();
    expect(patternsStore.currentSketchNotes[1]).toEqual(expect.objectContaining({
      note: "B5",
      octave: 5,
      scaleIndex: 6,
    }));

    musicStore.setMode("major pentatonic");
    await nextTick();
    musicStore.setKey("D");
    await nextTick();
    expect(patternsStore.currentSketchNotes[1]).toEqual(expect.objectContaining({
      note: "C#6",
      scaleIndex: 6,
    }));

    musicStore.setMode("major");
    await nextTick();
    expect(patternsStore.currentSketchNotes[1]?.note).toBe("C#6");
  });

  it("uses the previous octave knob value for legacy loaded metadata", async () => {
    const musicStore = useMusicStore();
    const keyboardStore = useKeyboardDrawerStore();
    const pattern = createPattern({
      key: "B",
      mode: "major",
      notes: [
        createPatternNote({ note: "B4", octave: 4, scaleIndex: 0, scaleDegree: 1 }),
      ],
    });
    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);
    await nextTick();
    delete patternsStore.loadedBaseMeta!.octave;

    musicStore.setKey("C");
    await nextTick();
    expect(patternsStore.currentSketchNotes[0]?.note).toBe("C5");

    keyboardStore.setMainOctave(5);
    await nextTick();
    expect(patternsStore.currentSketchNotes[0]).toEqual(expect.objectContaining({
      note: "C6",
      octave: 6,
    }));
  });

  it("keeps a loaded pattern's trailing rest when Return saves a transformed copy", () => {
    const chorus = patternsStore.patterns.find(
      (pattern) => pattern.name === "Warrior of the Mind (Chorus)",
    );
    if (!chorus) throw new Error("Missing Warrior chorus default");

    patternsStore.loadPatternAsBase(chorus.id);
    expect(patternsStore.currentSketchDuration).toBe(7920);

    patternsStore.sendCurrentPattern();

    expect(patternsStore.savedPatterns.at(-1)?.duration).toBe(7920);
  });

  it("appends live notes after a loaded pattern's trailing rest", () => {
    const chorus = patternsStore.patterns.find(
      (pattern) => pattern.name === "Warrior of the Mind (Chorus)",
    );
    if (!chorus) throw new Error("Missing Warrior chorus default");
    patternsStore.loadPatternAsBase(chorus.id);
    patternsStore.loggedNotes.push(createLogNote({
      id: "appended-note",
      note: "E4",
      key: "E",
      mode: "major",
      instrument: "gm_violin",
      bpm: 125,
      scaleIndex: 0,
      scaleDegree: 1,
      pressTime: 30_000,
      releaseTime: 30_480,
      duration: 480,
    }));

    const appended = patternsStore.currentSketchNotes.at(-1);
    expect(appended).toEqual(expect.objectContaining({
      pressTime: 7920,
      releaseTime: 8400,
    }));
    expect(patternsStore.currentSketchDuration).toBe(8400);

    patternsStore.sendCurrentPattern();
    expect(patternsStore.savedPatterns.at(-1)?.duration).toBe(8400);
  });

  it("shrinks loaded phrase duration when Backspace removes its final note", () => {
    const twinkle = patternsStore.patterns.find(
      (pattern) => pattern.id === "pattern-twinkle-1",
    );
    if (!twinkle) throw new Error("Missing Twinkle default");
    patternsStore.loadPatternAsBase(twinkle.id);
    expect(patternsStore.currentSketchDuration).toBe(10_000);

    patternsStore.removeLastFromCurrentSketch();
    expect(patternsStore.currentSketchDuration).toBe(8_750);

    patternsStore.sendCurrentPattern();
    expect(patternsStore.savedPatterns.at(-1)?.duration).toBe(8_750);
  });

  it("retains authored trailing silence after Backspace removes a loaded note", () => {
    const pattern = createPattern({
      duration: 2_500,
      notes: [
        createPatternNote({
          id: "first",
          pressTime: 0,
          releaseTime: 500,
          duration: 500,
        }),
        createPatternNote({
          id: "second",
          note: "D4",
          scaleIndex: 1,
          pressTime: 500,
          releaseTime: 2_000,
          duration: 1_500,
        }),
      ],
    });
    patternsStore.savedPatterns.push(pattern);
    patternsStore.loadPatternAsBase(pattern.id);

    patternsStore.removeLastFromCurrentSketch();

    expect(patternsStore.currentSketchDuration).toBe(1_000);
    expect(patternsStore.loadedBaseMeta?.trailingSilence).toBe(500);
  });
});
