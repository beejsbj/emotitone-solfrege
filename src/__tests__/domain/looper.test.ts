import { beforeEach, describe, expect, it } from "vitest";
import {
  audible,
  clear,
  createLooper,
  deleteLoop,
  effectiveKeyMode,
  isPlaying,
  join,
  leave,
  mustOpenFreshTake,
  openLoop,
  periodBars,
  phraseLengthBars,
  protectedPhraseIds,
  renameLoop,
  saveLoop,
  setOffset,
  setPinned,
  setRate,
  toggleMute,
  toggleSolo,
} from "@/domain/looper";
import {
  createPhraseBook,
  deletePhrase,
  DEFAULT_PHRASE_BOOK_CONFIG,
  findPhrase,
  pruneRecent,
  renamePhrase,
} from "@/domain/phraseBook";
import { NEUTRAL_SHAPE } from "@/services/shape";
import type { Looper, LooperRate, NewLoopId } from "@/types/looper";
import type { Phrase, PhraseBook, PhraseContext } from "@/types/phrases";

const C_MAJOR: PhraseContext = {
  key: "C", mode: "major", instrument: "piano", bpm: 120,
  shape: { ...NEUTRAL_SHAPE }, octave: 4,
};

let looper: Looper;
let book: PhraseBook;
let clock: number;
let counter: number;
const newId: NewLoopId = (prefix) => `${prefix}-${++counter}`;

beforeEach(() => {
  counter = 0;
  clock = 1_000_000;
  looper = createLooper();
  book = createPhraseBook(C_MAJOR, clock, (prefix) => `${prefix}-${++counter}`);
});

function phrase(overrides: Partial<Phrase> = {}): Phrase {
  return {
    id: "arpeggio", shelf: "recent", name: "Arpeggio",
    notes: [{
      id: "note-1", note: "C4", scaleDegree: 1, scaleIndex: 0, octave: 4,
      pressTime: 0, releaseTime: 1500, duration: 1500,
    }],
    context: { ...C_MAJOR, shape: { ...C_MAJOR.shape } },
    duration: 2000, createdAt: clock - 1000, closedAt: clock - 500,
    ...overrides,
  };
}

function add(source = phrase()) {
  book.phrases.push(source);
  return join(looper, source, { kind: "pinned-to-bar-one" });
}

function save(name = "Together") {
  return saveLoop(book, looper, name, clock, newId)!;
}

describe("looper: playing rules", () => {
  it("rule 1: any phrase can play and leave, from every shelf", () => {
    for (const shelf of ["take", "recent", "kept", "library"] as const) {
      const source = phrase({ shelf });
      join(looper, source, { kind: "pinned-to-bar-one" });
      expect(isPlaying(looper, source.id)).toBe(true);
      expect(leave(looper, source.id)).toBe(true);
      expect(isPlaying(looper, source.id)).toBe(false);
    }
  });

  it("rule 2: playing phrases stack with independent lengths and the longest period", () => {
    add(phrase({ id: "three", duration: 6000 }));
    add(phrase({ id: "four", duration: 8000 }));
    expect(looper.members.map((member) => member.lengthBars)).toEqual([3, 4]);
    expect(periodBars(looper)).toBe(4); // not 12, and the shorter phrase is never padded
    leave(looper, "four");
    expect(periodBars(looper)).toBe(3);
    clear(looper);
    expect(periodBars(looper)).toBe(0);
  });

  it("rule 3: a playing desk phrase needs a fresh take at press time", () => {
    const source = phrase();
    expect(mustOpenFreshTake(looper, source.id)).toBe(false);
    join(looper, source, { kind: "pinned-to-bar-one" });
    const freshAtPress = mustOpenFreshTake(looper, source.id);
    leave(looper, source.id); // a later change cannot move the pressed note
    expect(freshAtPress).toBe(true);
    expect(mustOpenFreshTake(looper, source.id)).toBe(false);
    expect(mustOpenFreshTake(looper, "other-desk")).toBe(false);
    expect(mustOpenFreshTake(looper, null)).toBe(false);
  });

  it("sets the tempo and bar origin from the first member only", () => {
    join(looper, phrase({ id: "first", context: { ...C_MAJOR, bpm: 90 } }), {
      kind: "played", phraseOriginBars: 12.375,
    });
    join(looper, phrase({ id: "second", context: { ...C_MAJOR, bpm: 150 } }), {
      kind: "played", phraseOriginBars: 14,
    });
    expect(looper.bpm).toBe(90);
    expect(looper.barOriginBars).toBe(12.375);
    leave(looper, "first");
    expect(looper.bpm).toBe(90);
    expect(looper.barOriginBars).toBe(12.375);
    leave(looper, "second");
    expect(looper.bpm).toBeNull();
    expect(looper.barOriginBars).toBeNull();
    join(looper, phrase(), { kind: "played", phraseOriginBars: 20 });
    expect(looper.bpm).toBe(120);
    expect(looper.barOriginBars).toBe(20);
  });

  it("uses the phrase book's default tempo for an invalid recorded BPM", () => {
    join(looper, phrase({ context: { ...C_MAJOR, bpm: 0 } }), { kind: "pinned-to-bar-one" });
    expect(looper.bpm).toBe(120);
    expect(looper.members[0].lengthBars).toBe(1);
  });

  it("joining again preserves one membership and its playback choices", () => {
    const source = phrase();
    const member = add(source);
    setOffset(looper, source.id, 0.375);
    setRate(looper, source.id, 2);
    toggleMute(looper, source.id);
    expect(join(looper, source, { kind: "played", phraseOriginBars: 100 })).toBe(member);
    expect(looper.members).toHaveLength(1);
    expect(member).toMatchObject({ offsetBars: 0.375, rate: 2, muted: true });
  });
});

describe("looper: joining", () => {
  it("tap Play joins only the explicitly chosen desk phrase", () => {
    const desk = phrase();
    const practice = phrase({ id: "practice" });
    book.phrases.push(desk, practice);
    join(looper, desk, { kind: "pinned-to-bar-one" });
    expect(looper.latched).toBe(false);
    expect(isPlaying(looper, practice.id)).toBe(false);
    expect(looper.members.map((member) => member.phraseId)).toEqual([desk.id]);
  });

  it("retains the latch while completed takes join and the last member leaves", () => {
    looper.latched = true; // slice 4 owns hold Play and the silence boundary
    add();
    add(phrase({ id: "completed-take" }));
    expect(looper.latched).toBe(true);
    leave(looper, "arpeggio");
    leave(looper, "completed-take");
    expect(looper.latched).toBe(true);
    looper.latched = false;
    expect(looper.latched).toBe(false);
  });

  it("a take played over the loop joins where phrase time zero was played", () => {
    join(looper, phrase(), { kind: "played", phraseOriginBars: 10 });
    const over = phrase({ id: "over", context: { ...C_MAJOR, bpm: 60 } });
    const member = join(looper, over, { kind: "played", phraseOriginBars: 12.375 });
    expect(member.offsetBars).toBe(2.375); // captured on the shared grid, not its own tempo
    expect(member.lengthBars).toBe(1);
    expect(looper.barOriginBars).toBe(10);
  });

  it("a phrase from the reel joins pinned to bar one, ready to enter in phase", () => {
    join(looper, phrase(), { kind: "played", phraseOriginBars: 10 });
    const member = join(looper, phrase({ id: "reel" }), { kind: "pinned-to-bar-one" });
    expect(member.offsetBars).toBe(0);
    expect(member.pinned).toBe(false); // bar placement and harmonic pin are different choices
    expect(looper.barOriginBars).toBe(10);
  });

  it("played alone starts at its first note without changing the phrase", () => {
    const source = phrase();
    const before = structuredClone(source);
    const member = join(looper, source, { kind: "played", phraseOriginBars: 25.375 });
    expect(member.offsetBars).toBe(0);
    setOffset(looper, source.id, -0.375);
    expect(source).toEqual(before);
    expect(member.offsetBars).toBe(-0.375);
  });

  it("the dial adjusts fractional or negative offsets without changing the clock or length", () => {
    const member = add();
    expect(setOffset(looper, member.phraseId, 8.375)).toBe(true);
    expect(member.offsetBars).toBe(8.375); // no modulo: preserve the captured origin
    expect(setOffset(looper, member.phraseId, -0.5)).toBe(true);
    expect(member.offsetBars).toBe(-0.5);
    expect(member.lengthBars).toBe(1);
    expect(looper.barOriginBars).toBe(0);
    expect(looper.bpm).toBe(120);
  });

  it("rejects non-finite origins and offsets without changing membership", () => {
    expect(() => join(looper, phrase(), { kind: "played", phraseOriginBars: NaN })).toThrow(RangeError);
    expect(looper).toEqual(createLooper());
    const member = add();
    for (const offset of [NaN, Infinity, -Infinity]) expect(setOffset(looper, member.phraseId, offset)).toBe(false);
    expect(member.offsetBars).toBe(0);
  });
});

describe("looper: whole-bar lengths", () => {
  it("rounds the phrase's own length up using its recorded tempo", () => {
    expect(phraseLengthBars(phrase({ duration: 5600 }))).toBe(3);
    expect(phraseLengthBars(phrase({ duration: 5600, context: { ...C_MAJOR, bpm: 60 } }))).toBe(2);
    expect(phraseLengthBars(phrase({ duration: 6000 }))).toBe(3);
  });

  it("a last note ringing up to a quarter bar over the boundary adds no bar", () => {
    for (const end of [2000, 2001, 2250, 2500]) {
      const source = phrase({ duration: end });
      source.notes[0].releaseTime = end;
      source.notes[0].duration = end;
      expect(phraseLengthBars(source)).toBe(1);
    }
    const source = phrase({ duration: 6500 });
    source.notes[0].releaseTime = 6500;
    expect(phraseLengthBars(source)).toBe(3);
  });

  it("a ringing note beyond the quarter-bar grace adds a bar", () => {
    const source = phrase({ duration: 2501 });
    source.notes[0].releaseTime = 2501;
    expect(phraseLengthBars(source)).toBe(2);
  });

  it("authored trailing silence never uses the ringing-note grace", () => {
    expect(phraseLengthBars(phrase({ duration: 2250 }))).toBe(2);
    expect(phraseLengthBars(phrase({ duration: 2500 }))).toBe(2);
    expect(phraseLengthBars(phrase({ duration: 6000, notes: [] }))).toBe(3);
  });

  it("a note starting on or after the boundary cannot use the grace", () => {
    for (const start of [2000, 2100]) {
      const source = phrase({ duration: 2300 });
      source.notes[0] = { ...source.notes[0], pressTime: start, releaseTime: 2300, duration: 2300 - start };
      expect(phraseLengthBars(source)).toBe(2);
    }
  });

  it("keeps a one-bar minimum for an empty or very short phrase", () => {
    expect(phraseLengthBars(phrase({ duration: 0, notes: [] }))).toBe(1);
    const source = phrase({ duration: 100 });
    source.notes[0].releaseTime = 100;
    expect(phraseLengthBars(source)).toBe(1);
  });

  it("includes a hanging release beyond the stored phrase duration", () => {
    const source = phrase({ duration: 2000 });
    source.notes[0].releaseTime = 3000;
    expect(phraseLengthBars(source)).toBe(2);
  });
});

describe("looper: audibility and bending choices", () => {
  it("mute and solo choose audible members without rewriting other mute flags", () => {
    const first = add();
    const second = add(phrase({ id: "second" }));
    expect(audible(looper)).toEqual([first, second]);
    toggleMute(looper, first.phraseId);
    expect(audible(looper)).toEqual([second]);
    toggleSolo(looper, first.phraseId);
    expect(audible(looper)).toEqual([]); // mute wins, even for the solo member
    toggleMute(looper, first.phraseId);
    expect(audible(looper)).toEqual([first]);
    toggleSolo(looper, second.phraseId);
    expect(audible(looper)).toEqual([second]);
    toggleSolo(looper, second.phraseId);
    expect(audible(looper)).toEqual([first, second]);
  });

  it("muted and non-solo members stay playing and read-only", () => {
    add();
    add(phrase({ id: "second" }));
    toggleMute(looper, "arpeggio");
    toggleSolo(looper, "second");
    expect(isPlaying(looper, "arpeggio")).toBe(true);
    expect(mustOpenFreshTake(looper, "arpeggio")).toBe(true);
  });

  it("leaving the solo member releases solo without resetting the surviving clock", () => {
    add();
    const second = add(phrase({ id: "second" }));
    toggleSolo(looper, "arpeggio");
    leave(looper, "arpeggio");
    expect(looper.soloId).toBeNull();
    expect(audible(looper)).toEqual([second]);
    expect(looper.bpm).toBe(120);
    expect(looper.barOriginBars).toBe(0);
  });

  it("stores pin and half or double time without changing the source or its stored length", () => {
    const source = phrase({ duration: 6000 });
    const before = structuredClone(source);
    const member = add(source);
    expect(setPinned(looper, source, true)).toBe(true);
    expect(member.pinned).toBe(true);
    for (const rate of [0.5, 1, 2] as const) {
      expect(setRate(looper, source.id, rate)).toBe(true);
      expect(member.rate).toBe(rate);
      expect(member.lengthBars).toBe(3);
      expect(periodBars(looper)).toBe(3);
    }
    setPinned(looper, source, false);
    expect(member.pinned).toBe(false);
    expect(source).toEqual(before);
    expect(setRate(looper, source.id, 3 as LooperRate)).toBe(false);
    expect(member.rate).toBe(2);
  });

  it("unpinned members follow live key and mode while pinned members retain their recorded pair", () => {
    const source = phrase();
    const member = add(source);
    const live = { key: "D", mode: "minor" } as const;
    expect(effectiveKeyMode(member, source, live)).toEqual(live);
    setPinned(looper, source, true);
    const effective = effectiveKeyMode(member, source, live);
    expect(effective).toEqual({ key: "C", mode: "major" });
    effective.key = "G";
    expect(source.context.key).toBe("C");
  });

  it("unpitched instruments are always pinned, including a restored unpinned membership", () => {
    const live = { key: "D", mode: "minor" } as const;
    for (const instrument of ["bd", "snare_modern", "cajon", "white", "unknown-sound"]) {
      const source = phrase({ id: instrument, context: { ...C_MAJOR, instrument } });
      const member = add(source);
      expect(member.pinned).toBe(true);
      setPinned(looper, source, false);
      expect(member.pinned).toBe(true);
      expect(effectiveKeyMode({ ...member, pinned: false }, source, live)).toEqual({ key: "C", mode: "major" });
    }
  });

  it("operations on missing members leave the playing set unchanged", () => {
    add();
    const before = structuredClone(looper);
    expect(leave(looper, "missing")).toBe(false);
    expect(toggleMute(looper, "missing")).toBe(false);
    expect(toggleSolo(looper, "missing")).toBe(false);
    expect(setOffset(looper, "missing", 1)).toBe(false);
    expect(setRate(looper, "missing", 2)).toBe(false);
    expect(setPinned(looper, phrase({ id: "missing" }), true)).toBe(false);
    expect(looper).toEqual(before);
  });

  it("Stop All clears members, clock, solo and latch", () => {
    add();
    toggleSolo(looper, "arpeggio");
    looper.latched = true;
    clear(looper);
    expect(looper).toEqual(createLooper());
    expect(audible(looper)).toEqual([]);
  });
});

describe("looper: saved Loops", () => {
  it("rule 4: a Loop saves pointers that still resolve after a phrase rename", () => {
    const source = phrase();
    add(source);
    const id = save();
    renamePhrase(book, source.id, "Morning");
    expect(book.loops[0].members[0].phraseId).toBe(source.id);
    expect(Object.keys(book.loops[0].members[0]).sort()).toEqual([
      "lengthBars", "muted", "offsetBars", "phraseId", "pinned", "rate",
    ]);
    const opened = openLoop(book, id)!;
    expect(isPlaying(opened, source.id)).toBe(true);
    expect(findPhrase(book, opened.members[0].phraseId)?.name).toBe("Morning");
    expect(book.phrases.filter((entry) => entry.id === source.id)).toHaveLength(1);
  });

  it("saving snapshots membership controls and opening does not edit that snapshot", () => {
    const source = phrase();
    const member = add(source);
    setOffset(looper, source.id, 0.375);
    setRate(looper, source.id, 0.5);
    setPinned(looper, source, true);
    toggleMute(looper, source.id);
    toggleSolo(looper, source.id);
    looper.latched = true;
    const snapshot = { ...member };
    const id = save();
    setOffset(looper, source.id, 2);
    const opened = openLoop(book, id)!;
    expect(opened.members).toEqual([snapshot]);
    expect(opened.soloId).toBeNull();
    expect(opened.latched).toBe(false);
    expect(opened.bpm).toBe(120);
    expect(opened.barOriginBars).toBe(0);
    toggleMute(opened, source.id);
    expect(book.loops[0].members).toEqual([snapshot]);
    expect(openLoop(book, id)!.members).toEqual([snapshot]);
  });

  it("reopens at bar zero with the first member's tempo and resolves library pointers", () => {
    const library = phrase({ shelf: "library", context: { ...C_MAJOR, bpm: 90 } });
    join(looper, library, { kind: "played", phraseOriginBars: 10 });
    add(phrase({ id: "second" }));
    const id = save();
    expect(openLoop(book, id)).toBeNull();
    const opened = openLoop(book, id, [library])!;
    expect(opened.members).toEqual(looper.members);
    expect(opened.bpm).toBe(90);
    expect(opened.barOriginBars).toBe(0);
    expect(book.phrases.some((entry) => entry.id === library.id)).toBe(false);
  });

  it("refuses an unknown Loop or a Loop with any missing phrase pointer", () => {
    expect(openLoop(book, "missing")).toBeNull();
    add();
    join(looper, phrase({ id: "missing-phrase" }), { kind: "pinned-to-bar-one" });
    const id = save();
    expect(openLoop(book, id)).toBeNull();
    expect(book.loops[0].members).toHaveLength(2);
  });

  it("saves and renames with bounded nonempty names and wall-clock timestamps", () => {
    add();
    expect(saveLoop(book, looper, "   ", clock, newId)).toBeNull();
    const id = save("  Together  ");
    expect(book.loops[0]).toMatchObject({ id, name: "Together", createdAt: clock, updatedAt: clock });
    expect(renameLoop(book, id, "   ", clock + 1)).toBe(false);
    expect(renameLoop(book, "missing", "Name", clock + 1)).toBe(false);
    expect(renameLoop(book, id, "x".repeat(100), clock + 1)).toBe(true);
    expect(book.loops[0].name).toHaveLength(80);
    expect(book.loops[0].createdAt).toBe(clock);
    expect(book.loops[0].updatedAt).toBe(clock + 1);
  });

  it("does not save an empty playing set", () => {
    expect(saveLoop(book, looper, "Empty", clock, newId)).toBeNull();
    expect(book.loops).toEqual([]);
  });

  it("deleting a Loop leaves its phrases and the playing set intact", () => {
    add();
    const id = save();
    expect(deleteLoop(book, "missing")).toBe(false);
    expect(deleteLoop(book, id)).toBe(true);
    expect(book.loops).toEqual([]);
    expect(findPhrase(book, "arpeggio")).toBeDefined();
    expect(isPlaying(looper, "arpeggio")).toBe(true);
  });
});

describe("looper: retention and deletion", () => {
  it("protects every playing and saved phrase, including muted members", () => {
    add();
    add(phrase({ id: "second" }));
    const id = save();
    leave(looper, "arpeggio");
    toggleMute(looper, "second");
    add(phrase({ id: "third" }));
    expect(protectedPhraseIds(book, looper)).toEqual(new Set(["arpeggio", "second", "third"]));
    deleteLoop(book, id);
    expect(protectedPhraseIds(book, looper)).toEqual(new Set(["second", "third"]));
  });

  it("playing and saved Loop phrases survive pruning by age and by count", () => {
    add(phrase({ id: "saved" }));
    save();
    leave(looper, "saved");
    add(phrase({ id: "playing" }));
    toggleMute(looper, "playing");
    book.phrases.push(phrase({ id: "unprotected" }));
    const config = { ...DEFAULT_PHRASE_BOOK_CONFIG, recentRetentionMs: 100, recentLimit: 0 };
    pruneRecent(book, clock, config, protectedPhraseIds(book, looper));
    expect(book.phrases.filter((entry) => entry.shelf === "recent").map((entry) => entry.id)).toEqual(["saved", "playing"]);
  });

  it("saved Loop phrases are protected from prune by default", () => {
    add();
    save();
    clear(looper);
    pruneRecent(book, clock, { ...DEFAULT_PHRASE_BOOK_CONFIG, recentLimit: 0 });
    expect(findPhrase(book, "arpeggio")).toBeDefined();
  });

  it("refuses deletion of a playing phrase even when force is requested", () => {
    add();
    expect(deletePhrase(book, "arpeggio", protectedPhraseIds(book, looper))).toBe(false);
    expect(deletePhrase(book, "arpeggio", protectedPhraseIds(book, looper), true)).toBe(false);
    expect(findPhrase(book, "arpeggio")).toBeDefined();
    leave(looper, "arpeggio");
    expect(deletePhrase(book, "arpeggio", protectedPhraseIds(book, looper))).toBe(true);
  });

  it("refuses deletion of a saved Loop phrase by default", () => {
    add();
    save();
    clear(looper);
    expect(deletePhrase(book, "arpeggio")).toBe(false);
    expect(findPhrase(book, "arpeggio")).toBeDefined();
    expect(book.loops[0].members[0].phraseId).toBe("arpeggio");
  });

  it("force deletion removes the pointer from every saved Loop without deleting other members", () => {
    add();
    add(phrase({ id: "second" }));
    save("Both");
    leave(looper, "second");
    const soloLoop = save("One");
    clear(looper); // supplied live protection must be released before force
    expect(deletePhrase(book, "arpeggio", new Set(), true)).toBe(true);
    expect(book.loops.map((loop) => loop.members.map((member) => member.phraseId))).toEqual([["second"], []]);
    expect(findPhrase(book, "arpeggio")).toBeUndefined();
    expect(findPhrase(book, "second")).toBeDefined();
    expect(openLoop(book, soloLoop)).toEqual(createLooper()); // keep the now-empty named Loop
  });
});
