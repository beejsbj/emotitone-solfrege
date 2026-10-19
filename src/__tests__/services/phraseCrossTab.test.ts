import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTake, createPhraseBook, deletePhrase, keepTake, phraseFromPattern } from "@/domain/phraseBook";
import { defaultPatterns } from "@/data/patterns";
import { NEUTRAL_SHAPE } from "@/services/shape";
import { createPhrasePersistence, type PersistedPhraseState } from "@/services/phrasePersistence";
import { resetSaveFailure, saveFailureNotice } from "@/services/safeStorage";
import type { Phrase, PhraseContext } from "@/types/phrases";

/**
 * BJS-575: two tabs, one shelf. Each "tab" is its own binding and its own
 * memory over the one shared localStorage, and hears the other's writes only
 * through a simulated `storage` event (a browser never fires one in the tab
 * that wrote).
 */

const NOW = Date.UTC(2026, 9, 19);
const context: PhraseContext = { key: "C", mode: "major", instrument: "piano", octave: 4, bpm: 120, shape: { ...NEUTRAL_SHAPE } };
const defaults = (): PersistedPhraseState => ({ book: createPhraseBook(context, NOW), isRecordingEnabled: true });

interface Tab {
  state: PersistedPhraseState;
  protectedIds: Set<string>;
  events: EventTarget;
  save(): boolean;
  /** The browser delivers the other tab's write to this tab. */
  hear(): void;
  dispose(): void;
}

const tabs: Tab[] = [];

function openTab(): Tab {
  const tab = { protectedIds: new Set<string>(), events: new EventTarget() } as Tab;
  const binding = createPhrasePersistence(defaults, () => context, {
    adopt: (state) => { tab.state = state; },
    protectedIds: () => tab.protectedIds,
  });
  tab.state = binding.load();
  const stop = binding.listen(() => tab.state, tab.events);
  tab.save = () => binding.save(tab.state);
  tab.hear = () => { tab.events.dispatchEvent(new StorageEvent("storage", { key: "phrases" })); };
  tab.dispose = () => { stop(); binding.unregister(); };
  tabs.push(tab);
  return tab;
}

function sketch(tab: Tab, id: string, shelf: "recent" | "kept" = "recent"): Phrase {
  const phrase = phraseFromPattern(defaultPatterns[0], shelf);
  phrase.id = id;
  phrase.notes = phrase.notes.slice(0, 3);
  phrase.createdAt = NOW;
  phrase.closedAt = NOW;
  tab.state.book.phrases.push(phrase);
  return phrase;
}

const stored = () => JSON.parse(localStorage.getItem("phrases")!).data as PersistedPhraseState;
const ids = (state: PersistedPhraseState) => state.book.phrases.map((phrase) => phrase.id);
const find = (state: PersistedPhraseState, id: string) => state.book.phrases.find((phrase) => phrase.id === id);

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  localStorage.clear();
  resetSaveFailure();
});
afterEach(() => {
  tabs.splice(0).forEach((tab) => tab.dispose());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("two tabs, one shelf", () => {
  it("never writes over a sketch the other tab saved, even when no storage event arrives", () => {
    const a = openTab();
    const b = openTab();
    sketch(b, "from-b");
    expect(b.save()).toBe(true);
    // Tab A has not heard about it and saves its own sketch.
    sketch(a, "from-a");
    expect(a.save()).toBe(true);
    expect(ids(stored())).toEqual(expect.arrayContaining(["from-a", "from-b"]));
    // A took B's sketch into memory too, so its next save keeps it.
    expect(ids(a.state)).toContain("from-b");
    a.state.book.phrases.find((phrase) => phrase.id === "from-a")!.name = "renamed in A";
    expect(a.save()).toBe(true);
    expect(ids(stored())).toContain("from-b");

    // And the other way round.
    sketch(b, "b-again");
    expect(b.save()).toBe(true);
    expect(ids(stored())).toEqual(expect.arrayContaining(["from-a", "from-b", "b-again"]));
    expect(find(stored(), "from-a")!.name).toBe("renamed in A");
  });

  it("takes the other tab's sketch in on the storage event, and does not write it back", () => {
    const a = openTab();
    a.save();
    const b = openTab();
    sketch(b, "from-b");
    b.save();
    const written = localStorage.getItem("phrases");
    a.hear();
    expect(ids(a.state)).toContain("from-b");
    // A's autosave after taking it in changes nothing every tab shares: no write,
    // so the two tabs never trade writes back and forth.
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    expect(a.save()).toBe(true);
    expect(localStorage.getItem("phrases")).toBe(written);
    setItem.mockRestore();

    sketch(a, "from-a");
    a.save();
    b.hear();
    expect(ids(b.state)).toEqual(expect.arrayContaining(["from-a", "from-b"]));
    // The tab that wrote hears nothing new.
    a.hear();
    expect(ids(a.state)).toEqual(expect.arrayContaining(["from-a", "from-b"]));
  });

  it("keeps each tab's own open take and recorder through a merge", () => {
    const a = openTab();
    a.save();
    const b = openTab();
    // B moves on to its own take; A is playing into the one it opened with.
    closeTake(b.state.book, NOW, context, undefined, undefined, "navigate");
    b.save();
    const aTake = a.state.book.takeId;
    const aTakePhrase = find(a.state, aTake)!;
    aTakePhrase.notes = phraseFromPattern(defaultPatterns[0], "recent").notes.slice(0, 2);
    a.state.book.recorder.liveNoteIds = aTakePhrase.notes.map((note) => note.id);
    a.state.book.recorder.edited = true;
    const recorder = a.state.book.recorder;
    sketch(b, "from-b");
    b.save();
    a.hear();
    expect(a.state.book.takeId).toBe(aTake);
    expect(a.state.book.recorder).toBe(recorder);
    // Untouched by B since they last agreed: the very same object stays on A's desk.
    expect(find(a.state, aTake)).toBe(aTakePhrase);
    expect(ids(a.state)).toContain("from-b");
    // B's open take is B's; it is not on any of A's shelves.
    expect(find(a.state, b.state.book.takeId)?.shelf).toBe("take");
    a.save();
    b.hear();
    expect(b.state.book.takeId).not.toBe(aTake);
    expect(find(b.state, aTake)!.notes).toHaveLength(2);
  });

  it("holds a release: a phrase deleted in one tab does not come back from the other", () => {
    const a = openTab();
    sketch(a, "shared");
    a.save();
    const b = openTab();
    expect(ids(b.state)).toContain("shared");
    expect(deletePhrase(a.state.book, "shared")).toBe(true);
    a.save();
    // B never touched it, and saves something else without hearing first.
    sketch(b, "from-b");
    b.save();
    expect(ids(stored())).not.toContain("shared");
    expect(ids(b.state)).not.toContain("shared");
    a.hear();
    expect(ids(a.state)).toEqual(expect.arrayContaining(["from-b"]));
    expect(ids(a.state)).not.toContain("shared");
  });

  it("lets an edit beat a concurrent release: the sketch comes back", () => {
    const a = openTab();
    sketch(a, "shared");
    a.save();
    const b = openTab();
    deletePhrase(a.state.book, "shared");
    a.save();
    find(b.state, "shared")!.name = "still wanted";
    b.save();
    expect(find(stored(), "shared")!.name).toBe("still wanted");
    a.hear();
    expect(find(a.state, "shared")!.name).toBe("still wanted");
  });

  it("merges a concurrent edit to one phrase field by field", () => {
    const a = openTab();
    const shared = sketch(a, "shared");
    a.save();
    const b = openTab();
    const extra = { ...shared.notes[0], id: "note-from-b", pressTime: 5000, releaseTime: 5400 };
    // A keeps it and renames it; B renames it and adds a note, without hearing.
    const inA = find(a.state, "shared")!;
    inA.shelf = "kept";
    inA.keptAt = NOW;
    inA.name = "alpha";
    a.save();
    const inB = find(b.state, "shared")!;
    inB.name = "beta";
    inB.notes.push(extra);
    inB.duration = 5400;
    b.save();
    const merged = find(stored(), "shared")!;
    expect(merged.shelf).toBe("kept");
    // Both renamed it: the tab that saved last wins, and the other takes it in.
    expect(merged.name).toBe("beta");
    expect(merged.notes.map((note) => note.id)).toEqual([...shared.notes.map((note) => note.id), "note-from-b"]);
    a.hear();
    expect(find(a.state, "shared")!.name).toBe("beta");
    expect(find(a.state, "shared")!.notes).toHaveLength(4);
  });

  it("joins notes when both tabs played into the same phrase", () => {
    const a = openTab();
    const shared = sketch(a, "shared");
    a.save();
    const b = openTab();
    const base = shared.notes[0];
    find(a.state, "shared")!.notes.push({ ...base, id: "a-note", pressTime: 3000, releaseTime: 3200 });
    find(b.state, "shared")!.notes.push({ ...base, id: "b-note", pressTime: 4000, releaseTime: 4200 });
    a.save();
    b.save();
    const notes = find(stored(), "shared")!.notes.map((note) => note.id);
    expect(notes).toEqual(expect.arrayContaining(["a-note", "b-note"]));
    expect(find(stored(), "shared")!.duration).toBeGreaterThanOrEqual(4200);
  });

  it("never releases a phrase this tab's Looper is playing", () => {
    const a = openTab();
    sketch(a, "looping");
    a.save();
    const b = openTab();
    b.protectedIds.add("looping");
    deletePhrase(a.state.book, "looping");
    a.save();
    b.hear();
    expect(ids(b.state)).toContain("looping");
    b.save();
    expect(ids(stored())).toContain("looping");
  });

  it("merges saved Loops by id and keeps the phrases they point at", () => {
    const a = openTab();
    sketch(a, "member");
    const loopsOf = (state: PersistedPhraseState) => (state.book as unknown as { loops: Array<{ id: string; members: Array<{ phraseId: string }> }> }).loops;
    (a.state.book as unknown as { loops: unknown[] }).loops = [];
    a.save();
    const b = openTab();
    loopsOf(b.state).push({ id: "loop-b", members: [{ phraseId: "member" }] });
    b.save();
    loopsOf(a.state).push({ id: "loop-a", members: [] });
    deletePhrase(a.state.book, "member");
    a.save();
    expect(loopsOf(stored()).map((loop) => loop.id)).toEqual(["loop-a", "loop-b"]);
    // B's Loop still points at it, so A's release does not take it away.
    expect(ids(stored())).toContain("member");
  });

  it("moves this tab to a fresh take when the other tab kept the take they shared", () => {
    const a = openTab();
    const take = find(a.state, a.state.book.takeId)!;
    take.notes = phraseFromPattern(defaultPatterns[0], "recent").notes.slice(0, 3);
    a.save();
    // B opens on the same desk, as a reload would, and keeps it.
    const b = openTab();
    expect(b.state.book.takeId).toBe(take.id);
    expect(keepTake(b.state.book, NOW, context)).toBe(take.id);
    b.save();
    a.hear();
    expect(find(a.state, take.id)!.shelf).toBe("kept");
    expect(a.state.book.takeId).not.toBe(take.id);
    expect(find(a.state, a.state.book.takeId)!.shelf).toBe("take");
  });

  it("does not read cleared storage as a release of everything", () => {
    const a = openTab();
    sketch(a, "kept-safe", "kept");
    a.save();
    localStorage.removeItem("phrases");
    a.hear();
    expect(ids(a.state)).toContain("kept-safe");
    a.save();
    expect(ids(stored())).toContain("kept-safe");
  });

  it("stops saving, and says so, when the other tab is a newer app", () => {
    const a = openTab();
    sketch(a, "mine");
    a.save();
    localStorage.setItem("phrases", JSON.stringify({ $version: 99, data: {} }));
    a.hear();
    // Said at once, not at the next save.
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
    expect(a.save()).toBe(false);
    expect(JSON.parse(localStorage.getItem("phrases")!).$version).toBe(99);
  });
});
