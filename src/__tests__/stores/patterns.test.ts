import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { setActivePinia } from "pinia";
import { createTestPinia } from "../helpers/test-utils";
import { usePatternsStore } from "@/stores/patterns";
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
      fleckShape: "circle",
      texture: "glossy",
    },
    octave: 4,
    frequency: 293.66,
    instrument: "piano",
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
    createdAt: 1000,
    isSaved: true,
    isDefault: false,
    ...overrides,
  };
}

describe("Patterns Store", () => {
  let patternsStore: ReturnType<typeof usePatternsStore>;

  beforeEach(() => {
    setActivePinia(createTestPinia());
    patternsStore = usePatternsStore();
    patternsStore.clearAllNotes();
    patternsStore.savedPatterns = [];
  });

  afterEach(() => {
    patternsStore.removeEventListeners();
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
});
