import { beforeEach, describe, expect, it } from "vitest";
import {
  closeTake,
  createPhraseBook,
  deletePhrase,
  DEFAULT_PHRASE_BOOK_CONFIG,
  ensureSingleTake,
  followControls,
  getTake,
  importPhrases,
  keepPhrase,
  keepTake,
  MIN_FRESH_PHRASE_NOTES,
  openPhrase,
  phraseContour,
  phraseTitle,
  pressNote,
  pruneRecent,
  releaseNote,
  renamePhrase,
  shelveBook,
  undoLastNote,
  type NewId,
} from "@/domain/phraseBook";
import { NEUTRAL_SHAPE } from "@/services/shape";
import type { PatternNote } from "@/types/patterns";
import type { HeldNote, Phrase, PhraseBook, PhraseContext } from "@/types/phrases";

const C_MAJOR: PhraseContext = {
  key: "C",
  mode: "major",
  instrument: "piano",
  bpm: 120,
  shape: { ...NEUTRAL_SHAPE },
  octave: 4,
};

// C major degrees → note names at octave 4
const DEGREES = ["C", "D", "E", "F", "G", "A", "B"];
const PITCH_CLASS = [0, 2, 4, 5, 7, 9, 11];

let counter = 0;
const newId: NewId = (prefix) => `${prefix}-${++counter}`;

let book: PhraseBook;
let held: Map<string, HeldNote>;
let clock: number;
let audioId = 0;

beforeEach(() => {
  counter = 0;
  audioId = 0;
  clock = 1_000_000;
  held = new Map();
  book = createPhraseBook(C_MAJOR, clock, newId);
});

function press(degree: number, context: PhraseContext = C_MAJOR, at = clock): string {
  const noteId = `audio-${++audioId}`;
  pressNote(book, held, {
    noteId,
    wallTime: at,
    context,
    note: `${DEGREES[degree]}4`,
    scaleDegree: degree + 1,
    scaleIndex: degree,
    pitchClassIndex: PITCH_CLASS[degree],
    octave: 4,
  }, DEFAULT_PHRASE_BOOK_CONFIG, newId);
  return noteId;
}

/** Tap a degree for 200ms, then leave a 100ms gap. */
function tap(degree: number, context: PhraseContext = C_MAJOR) {
  const noteId = press(degree, context);
  clock += 200;
  releaseNote(book, held, noteId, clock, {}, newId);
  clock += 100;
}

function play(degrees: number[], context: PhraseContext = C_MAJOR) {
  for (const degree of degrees) tap(degree, context);
}

function takeCount(target: PhraseBook = book) {
  return target.phrases.filter((phrase) => phrase.shelf === "take").length;
}

function libraryPhrase(overrides: Partial<Phrase> = {}): Phrase {
  const notes: PatternNote[] = [0, 2, 4].map((degree, index) => ({
    id: `lib-note-${index}`,
    note: `${DEGREES[degree]}4`,
    scaleDegree: degree + 1,
    scaleIndex: degree,
    pitchClassIndex: PITCH_CLASS[degree],
    octave: 4,
    pressTime: index * 500,
    releaseTime: index * 500 + 400,
    duration: 400,
  }));
  return {
    id: "library-arpeggio",
    shelf: "library",
    name: "Arpeggio",
    notes,
    context: { ...C_MAJOR },
    duration: 2000,
    createdAt: 0,
    ...overrides,
  };
}

describe("phrase book: exactly one take", () => {
  it("starts with an empty take", () => {
    expect(takeCount()).toBe(1);
    expect(getTake(book).notes).toEqual([]);
  });

  it("survives every operation with exactly one take", () => {
    const library = [libraryPhrase()];
    play([0, 1, 2]);
    expect(takeCount()).toBe(1);
    keepTake(book, clock, C_MAJOR, newId);
    expect(takeCount()).toBe(1);
    play([3, 4, 5]);
    closeTake(book, clock, C_MAJOR, newId);
    expect(takeCount()).toBe(1);
    openPhrase(book, "library-arpeggio", library, clock, newId);
    expect(takeCount()).toBe(1);
    const recentId = shelveBook(book, library).recent[0].id;
    openPhrase(book, recentId, library, clock, newId);
    expect(takeCount()).toBe(1);
    expect(deletePhrase(book, book.takeId)).toBe(false);
    expect(takeCount()).toBe(1);
  });

  it("repairs hydrated state with zero or several takes", () => {
    const broken: PhraseBook = { ...book, phrases: [], takeId: "missing" };
    ensureSingleTake(broken, C_MAJOR, clock, newId);
    expect(takeCount(broken)).toBe(1);

    const doubled: PhraseBook = {
      ...book,
      phrases: [
        { ...getTake(book), id: "a" },
        { ...getTake(book), id: "b" },
      ],
      takeId: "b",
    };
    ensureSingleTake(doubled, C_MAJOR, clock, newId);
    expect(takeCount(doubled)).toBe(1);
    expect(doubled.takeId).toBe("b");
    expect(doubled.phrases.find((phrase) => phrase.id === "a")?.shelf).toBe("recent");
  });
});

describe("phrase book: recording", () => {
  it("stores notes in phrase time, starting at zero", () => {
    play([0, 2, 4]);
    const notes = getTake(book).notes;
    expect(notes.map((note) => note.pressTime)).toEqual([0, 300, 600]);
    expect(getTake(book).duration).toBe(800);
  });

  it("keeps notes onset-sorted when releases arrive out of order", () => {
    const low = press(0);
    clock += 50;
    const high = press(4);
    clock += 100;
    releaseNote(book, held, high, clock, {}, newId);
    clock += 100;
    releaseNote(book, held, low, clock, {}, newId);
    expect(getTake(book).notes.map((note) => note.scaleIndex)).toEqual([0, 4]);
  });

  it("closes the take to Recent after a tempo-aware silence", () => {
    play([0, 1, 2]);
    const first = book.takeId;
    clock += 3000; // 1.5 bars at 120 BPM
    tap(4);
    expect(book.takeId).not.toBe(first);
    const shelves = shelveBook(book, []);
    expect(shelves.recent.map((phrase) => phrase.id)).toEqual([first]);
    expect(shelves.take.notes).toHaveLength(1);
  });

  it("does not treat a held note as silence", () => {
    play([0, 1]);
    const held1 = press(2);
    clock += 5000;
    tap(3);
    releaseNote(book, held, held1, clock, {}, newId);
    expect(shelveBook(book, []).recent).toEqual([]);
    expect(getTake(book).notes).toHaveLength(4);
  });

  it("opens a new take when a note arrives in a different context", () => {
    play([0, 1, 2]);
    const first = book.takeId;
    tap(0, { ...C_MAJOR, key: "D" });
    expect(book.takeId).not.toBe(first);
    expect(getTake(book).context.key).toBe("D");
    expect(shelveBook(book, []).recent[0].id).toBe(first);
  });

  it("drops a fresh take under the noise floor when it closes", () => {
    play([0, 1].slice(0, MIN_FRESH_PHRASE_NOTES - 1));
    clock += 5000;
    tap(4);
    expect(shelveBook(book, []).recent).toEqual([]);
  });

  it("lands a note in the phrase open at its press, even after Return", () => {
    play([0, 1, 2]);
    const kept = book.takeId;
    const hanging = press(3);
    keepTake(book, clock, C_MAJOR, newId);
    clock += 300;
    releaseNote(book, held, hanging, clock, {}, newId);
    expect(book.phrases.find((phrase) => phrase.id === kept)?.notes).toHaveLength(4);
    expect(getTake(book).notes).toEqual([]);
  });

  it("shifts the phrase when a scheduled onset lands before its origin", () => {
    const first = press(0);
    const early = press(2, C_MAJOR, clock - 40);
    clock += 200;
    releaseNote(book, held, first, clock, {}, newId);
    releaseNote(book, held, early, clock, {}, newId);
    const notes = getTake(book).notes;
    expect(Math.min(...notes.map((note) => note.pressTime))).toBe(0);
    expect(notes.map((note) => note.scaleIndex)).toEqual([2, 0]);
  });
});

describe("phrase book: nothing played is silently lost", () => {
  it("Return keeps the take without touching Recent", () => {
    play([0, 1, 2]);
    clock += 5000;
    play([3, 4, 5]); // first phrase is now in Recent
    const keptId = keepTake(book, clock, C_MAJOR, newId);
    const shelves = shelveBook(book, []);
    expect(shelves.recent).toHaveLength(1);
    expect(shelves.kept.map((phrase) => phrase.id)).toEqual([keptId]);
    expect(shelves.take.notes).toEqual([]);
  });

  it("Return on an empty take keeps nothing", () => {
    expect(keepTake(book, clock, C_MAJOR, newId)).toBeNull();
    expect(shelveBook(book, []).kept).toEqual([]);
  });

  it("loading a phrase sends the played take to Recent", () => {
    const library = [libraryPhrase()];
    play([0, 1, 2]);
    const played = book.takeId;
    openPhrase(book, "library-arpeggio", library, clock, newId);
    expect(shelveBook(book, library).recent.map((phrase) => phrase.id)).toEqual([played]);
  });

  it("expires Recent by age and by count, never Kept", () => {
    play([0, 1, 2]);
    keepTake(book, clock, C_MAJOR, newId);
    play([0, 1, 2]);
    closeTake(book, clock, C_MAJOR, newId);
    pruneRecent(book, clock + DEFAULT_PHRASE_BOOK_CONFIG.recentRetentionMs + 1);
    const shelves = shelveBook(book, []);
    expect(shelves.recent).toEqual([]);
    expect(shelves.kept).toHaveLength(1);

    for (let index = 0; index < 5; index += 1) {
      play([0, 1, 2]);
      closeTake(book, clock, C_MAJOR, newId);
    }
    pruneRecent(book, clock, { ...DEFAULT_PHRASE_BOOK_CONFIG, recentLimit: 3 });
    expect(shelveBook(book, []).recent).toHaveLength(3);
  });
});

describe("phrase book: loading", () => {
  it("forks Kept and Library phrases and never edits the source", () => {
    const library = [libraryPhrase()];
    openPhrase(book, "library-arpeggio", library, clock, newId);
    const take = getTake(book);
    expect(take.id).not.toBe("library-arpeggio");
    expect(take.derivedFrom).toEqual({ id: "library-arpeggio", name: "Arpeggio", shelf: "library" });
    play([4]);
    expect(library[0].notes).toHaveLength(3);
    expect(getTake(book).notes).toHaveLength(4);
  });

  it("discards an unplayed fork when it closes", () => {
    const library = [libraryPhrase()];
    openPhrase(book, "library-arpeggio", library, clock, newId);
    closeTake(book, clock, C_MAJOR, newId);
    expect(shelveBook(book, library).recent).toEqual([]);
  });

  it("keeps a played-over fork in Recent with its lineage", () => {
    const library = [libraryPhrase()];
    openPhrase(book, "library-arpeggio", library, clock, newId);
    play([4]);
    closeTake(book, clock, C_MAJOR, newId);
    const [recent] = shelveBook(book, library).recent;
    expect(recent.derivedFrom?.id).toBe("library-arpeggio");
    expect(recent.notes).toHaveLength(4);
  });

  it("moves a Recent phrase back to the take instead of copying it", () => {
    play([0, 1, 2]);
    const first = book.takeId;
    closeTake(book, clock, C_MAJOR, newId);
    play([3, 4, 5]);
    const second = book.takeId;

    openPhrase(book, first, [], clock, newId);
    expect(book.takeId).toBe(first);
    const shelves = shelveBook(book, []);
    expect(shelves.recent.map((phrase) => phrase.id)).toEqual([second]);
    expect(book.phrases).toHaveLength(2);

    // Swapping back and forth is an A/B, not a duplication.
    openPhrase(book, second, [], clock, newId);
    expect(book.phrases).toHaveLength(2);
    expect(shelveBook(book, []).recent.map((phrase) => phrase.id)).toEqual([first]);
  });

  it("seams the first live note at the phrase's end, however long you wait", () => {
    const library = [libraryPhrase()];
    openPhrase(book, "library-arpeggio", library, clock, newId);
    clock += 60_000;
    tap(4);
    const notes = getTake(book).notes;
    const last = notes[notes.length - 1];
    expect(last.pressTime).toBe(2000); // base duration incl. trailing silence
    expect(shelveBook(book, library).recent).toEqual([]);
  });

  it("Return on an untouched copy of a Kept phrase does not duplicate it", () => {
    play([0, 1, 2]);
    const kept = keepTake(book, clock, C_MAJOR, newId)!;
    openPhrase(book, kept, [], clock, newId);
    expect(keepTake(book, clock, C_MAJOR, newId)).toBe(kept);
    expect(shelveBook(book, []).kept).toHaveLength(1);
  });
});

describe("phrase book: controls", () => {
  it("an empty take adopts the controls", () => {
    followControls(book, held, { ...C_MAJOR, key: "E", instrument: "kalimba" });
    expect(getTake(book).context.key).toBe("E");
    expect(getTake(book).context.instrument).toBe("kalimba");
  });

  it("an untouched loaded take re-skins to the controls", () => {
    const library = [libraryPhrase()];
    openPhrase(book, "library-arpeggio", library, clock, newId);
    followControls(book, held, { ...C_MAJOR, key: "D", octave: 5 });
    const take = getTake(book);
    expect(take.context.key).toBe("D");
    expect(take.notes.map((note) => note.note)).toEqual(["D5", "F#5", "A5"]);
    expect(library[0].notes[0].note).toBe("C4");
  });

  it("a take being played into keeps its context", () => {
    play([0, 1]);
    expect(followControls(book, held, { ...C_MAJOR, key: "D" })).toBe(false);
    expect(getTake(book).context.key).toBe("C");
  });

  it("does not follow BPM", () => {
    const library = [libraryPhrase()];
    openPhrase(book, "library-arpeggio", library, clock, newId);
    followControls(book, held, { ...C_MAJOR, bpm: 90 });
    expect(getTake(book).context.bpm).toBe(120);
  });
});

describe("phrase book: shelves and editing", () => {
  it("orders every shelf newest first", () => {
    const library = [libraryPhrase()];
    const recentIds: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      play([0, 1, 2]);
      recentIds.push(book.takeId);
      clock += 1000;
      closeTake(book, clock, C_MAJOR, newId);
    }
    expect(shelveBook(book, library).recent.map((phrase) => phrase.id))
      .toEqual([...recentIds].reverse());
  });

  it("keeps a Recent phrase from the reel without disturbing the take", () => {
    play([0, 1, 2]);
    const first = book.takeId;
    closeTake(book, clock, C_MAJOR, newId);
    play([4]);
    const take = book.takeId;
    expect(keepPhrase(book, first, [], clock, newId)).toBe(first);
    expect(book.takeId).toBe(take);
    expect(shelveBook(book, []).kept.map((phrase) => phrase.id)).toEqual([first]);
  });

  it("keeping a Library phrase stores a copy", () => {
    const library = [libraryPhrase()];
    const id = keepPhrase(book, "library-arpeggio", library, clock, newId)!;
    expect(id).not.toBe("library-arpeggio");
    expect(shelveBook(book, library).kept[0].name).toBe("Arpeggio");
  });

  it("renames stored phrases and overlays library names", () => {
    const library = [libraryPhrase()];
    expect(renamePhrase(book, book.takeId, "  Morning  ", library)).toBe(true);
    expect(getTake(book).name).toBe("Morning");
    expect(renamePhrase(book, "library-arpeggio", "Broken chord", library)).toBe(true);
    expect(shelveBook(book, library).library[0].name).toBe("Broken chord");
    expect(library[0].name).toBe("Arpeggio");
    expect(renamePhrase(book, book.takeId, "   ", library)).toBe(false);
  });

  it("Backspace removes the last note, played or loaded, keeping trailing silence", () => {
    const library = [libraryPhrase()];
    openPhrase(book, "library-arpeggio", library, clock, newId);
    undoLastNote(book);
    const take = getTake(book);
    expect(take.notes).toHaveLength(2);
    expect(take.duration).toBe(900 + 600); // last release + authored trailing silence
  });

  it("Backspace back to the loaded notes re-seams the next live note", () => {
    const library = [libraryPhrase()];
    openPhrase(book, "library-arpeggio", library, clock, newId);
    tap(4);
    undoLastNote(book);
    clock += 10_000;
    tap(5);
    const notes = getTake(book).notes;
    expect(notes[notes.length - 1].pressTime).toBe(2000);
  });

  it("titles unnamed phrases by their solfège contour", () => {
    play([0, 2, 4, 2, 0, 4]);
    expect(phraseContour(getTake(book))).toBe("Do Mi Sol Mi Do…");
    expect(phraseTitle(getTake(book))).toBe("Do Mi Sol Mi Do…");
    expect(phraseTitle({ notes: [], context: C_MAJOR })).toBe("New take");
  });
});

describe("phrase book: imports", () => {
  it("imports short captures as Recent phrases and opens the first", () => {
    const notes = libraryPhrase().notes.slice(0, 1).map((note) => ({
      ...note,
      pressTime: note.pressTime + 5_000,
      releaseTime: note.releaseTime + 5_000,
    }));
    play([0, 1, 2]);
    const played = book.takeId;
    const ids = importPhrases(book, [
      { name: "Take 1", notes },
      { name: "Take 2", notes },
    ], C_MAJOR, clock, newId);
    expect(ids).toHaveLength(2);
    expect(book.takeId).toBe(ids[0]);
    expect(getTake(book).notes[0].pressTime).toBe(0);
    const recentIds = shelveBook(book, []).recent.map((phrase) => phrase.id);
    expect(recentIds).toContain(played);
    expect(recentIds).toContain(ids[1]);

    // Choosing another capture is a move, and the first capture stays.
    openPhrase(book, ids[1], [], clock + 10, newId);
    expect(shelveBook(book, []).recent.map((phrase) => phrase.id)).toContain(ids[0]);
  });
});
