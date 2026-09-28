import { describe, expect, it } from "vitest";
import { getTake, shelveBook } from "@/domain/phraseBook";
import { migrateLegacyPatterns } from "@/domain/phraseMigration";
import { NEUTRAL_SHAPE } from "@/services/shape";
import type { LogNote, Pattern, PatternNote } from "@/types/patterns";
import type { PhraseContext } from "@/types/phrases";

const NOW = Date.UTC(2026, 8, 26);
const LIVE: PhraseContext = {
  key: "C",
  mode: "major",
  instrument: "piano",
  bpm: 120,
  shape: { ...NEUTRAL_SHAPE },
  octave: 4,
};

function note(id: string, pressTime: number): PatternNote {
  return {
    id,
    note: "C4",
    scaleDegree: 1,
    scaleIndex: 0,
    octave: 4,
    pressTime,
    releaseTime: pressTime + 200,
    duration: 200,
  };
}

function logNote(id: string, pressTime: number, isStartingNewPattern = false): LogNote {
  return {
    ...note(id, pressTime),
    key: "G",
    mode: "major",
    solfege: { name: "Do", number: 1, emotion: "home", description: "", texture: "" } as LogNote["solfege"],
    instrument: "kalimba",
    bpm: 90,
    sessionId: "s",
    isStartingNewPattern,
  };
}

function pattern(overrides: Partial<Pattern>): Pattern {
  return {
    id: "saved-1",
    name: "Saved",
    notes: [note("a", 5000), note("b", 5300), note("c", 5600)],
    key: "C",
    mode: "major",
    instrument: "piano",
    bpm: 100,
    createdAt: NOW - 1000,
    ...overrides,
  };
}

const options = {
  libraryIds: new Set(["pattern-twinkle-1"]),
  liveContext: LIVE,
  now: NOW,
};

describe("legacy pattern migration", () => {
  it("returns null when there is nothing to migrate", () => {
    expect(migrateLegacyPatterns(null, options)).toBeNull();
    expect(migrateLegacyPatterns({ loggedNotes: [], savedPatterns: [] }, options)).toBeNull();
    expect(migrateLegacyPatterns({ savedPatterns: "nope" }, options)).toBeNull();
  });

  it("moves sent patterns to Kept, unsent imports to Recent, and renamed defaults to the library", () => {
    const book = migrateLegacyPatterns({
      savedPatterns: [
        pattern({ id: "sent", isSaved: true }),
        pattern({ id: "hummed", isSaved: false, name: "Take 1" }),
        pattern({ id: "pattern-twinkle-1", name: "Little Star", isDefault: true }),
      ],
    }, options)!;
    const shelves = shelveBook(book, []);
    expect(shelves.kept.map((phrase) => phrase.id)).toEqual(["sent"]);
    expect(shelves.recent.map((phrase) => phrase.id)).toEqual(["hummed"]);
    expect(book.libraryNames).toEqual({ "pattern-twinkle-1": "Little Star" });
    expect(shelves.kept[0].notes[0].pressTime).toBe(0);
  });

  it("splits the note log into Recent phrases by its own boundaries", () => {
    const log = [
      logNote("n1", NOW - 9000, true), logNote("n2", NOW - 8700), logNote("n3", NOW - 8400),
      logNote("n4", NOW - 4000, true), logNote("n5", NOW - 3700), // too short: dropped
      logNote("n6", NOW - 2000, true), logNote("n7", NOW - 1700), logNote("n8", NOW - 1400),
    ];
    const book = migrateLegacyPatterns({ loggedNotes: log }, options)!;
    const recent = shelveBook(book, []).recent;
    expect(recent).toHaveLength(2);
    expect(recent[0].notes.map((entry) => entry.id)).toEqual(["n6", "n7", "n8"]);
    expect(recent[0].context).toMatchObject({ key: "G", instrument: "kalimba", bpm: 90 });
  });

  it("does not duplicate a log slice that was already kept", () => {
    const log = [logNote("n1", NOW - 900, true), logNote("n2", NOW - 600), logNote("n3", NOW - 300)];
    const book = migrateLegacyPatterns({
      loggedNotes: log,
      savedPatterns: [pattern({ id: "dynamic-pattern-n1-n3", isSaved: true, isKept: true })],
    }, options)!;
    const shelves = shelveBook(book, []);
    expect(shelves.recent).toEqual([]);
    expect(shelves.kept).toHaveLength(1);
  });

  it("opens on an empty take in the live context and keeps old phrases", () => {
    const book = migrateLegacyPatterns({
      savedPatterns: [pattern({ id: "old", isSaved: false, createdAt: NOW - 8 * 24 * 3600 * 1000 })],
      loggedNotes: [logNote("n1", NOW - 900, true)],
    }, options)!;
    expect(getTake(book).notes).toEqual([]);
    expect(getTake(book).context).toEqual(LIVE);
    expect(shelveBook(book, []).recent.map((phrase) => phrase.id)).toEqual(["old"]);
  });
});
