import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeTake, createPhraseBook, deletePhrase, keepTake, phraseFromPattern, pressNote, releaseNote,
} from "@/domain/phraseBook";
import { defaultPatterns } from "@/data/patterns";
import { NEUTRAL_SHAPE } from "@/services/shape";
import { defineCodec, readPayload } from "@/services/persistenceCodec";
import { listPhraseBackups, restorePhraseBackup, writePhraseBackup } from "@/services/phraseBackups";
import {
  createPhrasePersistence, phraseCodec, PHRASE_FORMAT_VERSION, type PersistedPhraseState,
} from "@/services/phrasePersistence";
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
  /** What the shelf notice was told: true for a landed write, false for a failure. */
  stored: boolean[];
  save(): boolean;
  /** Wait for a backup the save path is holding a write behind, and its queued save. */
  settled(): Promise<void>;
  /** The browser delivers the other tab's write to this tab. */
  hear(): void;
  dispose(): void;
}

const tabs: Tab[] = [];

/** `listening: false` is a tab whose storage events never arrive: only its own saves can notice. */
function openTab({ listening = true } = {}): Tab {
  const tab = { protectedIds: new Set<string>(), events: new EventTarget(), stored: [] as boolean[] } as Tab;
  const binding = createPhrasePersistence(defaults, () => context, {
    adopt: (state) => { tab.state = state; },
    protectedIds: () => tab.protectedIds,
    onStored: (ok) => tab.stored.push(ok),
  });
  tab.state = binding.load();
  const stop = listening ? binding.listen(() => tab.state, tab.events) : () => {};
  tab.save = () => binding.save(tab.state);
  tab.settled = () => binding.settled();
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
    const a = openTab({ listening: false });
    const b = openTab({ listening: false });
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
    const setItem = vi.spyOn(localStorage, "setItem");
    expect(a.save()).toBe(true);
    expect(setItem.mock.calls.filter(([key]) => key === "phrases")).toHaveLength(0);
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

  it("settles when the two tabs hold the same phrases in a different order", () => {
    const a = openTab();
    a.save();
    const b = openTab();
    // Sketched at the same moment: A ends up with [.., a1, b1], B with [.., b1, a1].
    sketch(a, "a1");
    sketch(b, "b1");
    b.save();
    a.save();
    expect(ids(a.state).slice(-2)).toEqual(["a1", "b1"]);
    b.hear();
    expect(ids(b.state).slice(-2)).toEqual(["b1", "a1"]);
    // Every write wakes the other tab, which then autosaves. Order alone is
    // nothing every tab shares, so the exchange stops instead of ping-ponging.
    const setItem = vi.spyOn(localStorage, "setItem");
    let writer = b;
    for (let round = 0; round < 6; round++) {
      const reader = writer === a ? b : a;
      writer.save();
      reader.hear();
      writer = reader;
    }
    expect(setItem.mock.calls.filter(([key]) => key === "phrases")).toHaveLength(0);
    expect(ids(stored())).toEqual(expect.arrayContaining(["a1", "b1"]));
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

  it("holds a release of this tab's own saved sketch that the other tab only took in", () => {
    const a = openTab();
    a.save();
    const b = openTab();
    sketch(a, "mine");
    a.save();
    b.hear(); // B takes it in, unchanged
    deletePhrase(a.state.book, "mine");
    // B writes before A saves the release (B's write still carries "mine").
    sketch(b, "from-b");
    b.save();
    a.save();
    // A's base is its own write, which had "mine": B never changed it, so the release holds.
    expect(ids(stored())).not.toContain("mine");
    expect(ids(stored())).toContain("from-b");
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

  it("keeps this tab's sketch when an old build's tab writes the shelf over it (v1, last-write-wins)", async () => {
    const a = openTab();
    a.save();
    // An old-build tab, open across the deploy, saved its stale shelf (without
    // A's sketch, with one of its own) after A's sketch was stored.
    const stale = structuredClone(stored());
    sketch(a, "mine");
    a.save();
    stale.book.phrases.push({ ...structuredClone(find(stored(), "mine")!), id: "old-tab-sketch" });
    localStorage.setItem("phrases", JSON.stringify({ $version: 1, data: stale }));
    a.hear(); // an older format waits for the save path, which backs it up first
    expect(a.save()).toBe(false);
    await a.settled();
    expect(ids(a.state)).toEqual(expect.arrayContaining(["mine", "old-tab-sketch"]));
    expect(JSON.parse(localStorage.getItem("phrases")!).$version).toBe(PHRASE_FORMAT_VERSION);
    expect(ids(stored())).toEqual(expect.arrayContaining(["mine", "old-tab-sketch"]));
    expect((await listPhraseBackups()).map((backup) => backup.label)).toContain("v1");
    // And from now on an old build meets the "newer" hold instead of writing.
    const oldBuild = defineCodec({ ...phraseCodec(defaults, () => context), version: 1, migrations: { 0: (data) => data } });
    expect(readPayload(oldBuild, localStorage.getItem("phrases")).kind).toBe("newer");
  });

  it("keeps this tab's sketch when an unversioned (v0) shelf lands over it", async () => {
    const a = openTab();
    a.save();
    const stale = structuredClone(stored());
    sketch(a, "mine");
    a.save();
    localStorage.setItem("phrases", JSON.stringify(stale));
    a.save();
    await a.settled();
    expect(ids(a.state)).toContain("mine");
    expect(ids(stored())).toContain("mine");
    expect((await listPhraseBackups()).map((backup) => backup.label)).toContain("v0");
  });

  it("backs up an unreadable payload from another tab before saving over it", async () => {
    const a = openTab();
    sketch(a, "mine");
    a.save();
    localStorage.setItem("phrases", "{not json");
    vi.spyOn(console, "error").mockImplementation(() => {});
    a.hear(); // nothing to merge; the save path owns it
    expect(ids(a.state)).toContain("mine");
    expect(a.save()).toBe(false);
    expect(localStorage.getItem("phrases")).toBe("{not json");
    await a.settled();
    const backups = await listPhraseBackups();
    expect(backups.find((backup) => backup.label === "unreadable")?.raw).toBe("{not json");
    expect(ids(stored())).toContain("mine");
  });

  it("never moves a tab that is playing off its desk when another tab loads and saves", () => {
    const a = openTab();
    a.save();
    const b = openTab();
    closeTake(b.state.book, NOW, context, undefined, undefined, "navigate");
    const takeId = b.state.book.takeId;
    const held = new Map();
    const play = (noteId: string, at: number) => {
      pressNote(b.state.book, held, {
        noteId, wallTime: at, context, note: "C4", scaleDegree: 1, scaleIndex: 0, octave: 4,
      });
      releaseNote(b.state.book, held, noteId, at + 200);
    };
    play("b-1", NOW);
    b.save();
    // A saves after B, so B's take is not the stored take: a reload sees it as another tab's.
    sketch(a, "from-a");
    a.save();
    b.hear();
    const c = openTab();
    expect(find(c.state, takeId)!.shelf).toBe("take");
    sketch(c, "from-c");
    c.save();
    b.hear();
    expect(b.state.book.takeId).toBe(takeId);
    expect(find(b.state, takeId)!.shelf).toBe("take");
    play("b-2", NOW + 300);
    expect(find(b.state, takeId)!.notes).toHaveLength(2);
    b.save();
    expect(find(stored(), takeId)!.shelf).toBe("take");
    expect(ids(stored())).toEqual(expect.arrayContaining(["from-a", "from-c"]));
  });

  it("does not report a save failure when a storage event's read fails", () => {
    const a = openTab();
    sketch(a, "mine");
    a.save();
    expect(a.stored).toEqual([true]);
    const getItem = vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new DOMException("denied", "SecurityError"); });
    a.hear();
    getItem.mockRestore();
    expect(a.stored).toEqual([true]);
    expect(saveFailureNotice.value).toBeNull();
  });

  it("keeps this tab's live curves when the other tab only renames the phrase", () => {
    const a = openTab();
    const phrase = sketch(a, "expressive");
    const note = phrase.notes[0];
    note.releaseTime = note.pressTime + 1000;
    note.duration = 1000;
    note.pitchExpression = Array.from({ length: 241 }, (_, point) => ({ timeMs: point * 1000 / 240, cents: point % 40 }));
    a.save();
    // Saved curves are thinned; A's memory still has every point.
    expect(find(stored(), "expressive")!.notes[0].pitchExpression!.length).toBeLessThan(241);
    const b = openTab();
    find(b.state, "expressive")!.name = "named in B";
    b.save();
    a.hear();
    const merged = find(a.state, "expressive")!;
    expect(merged.name).toBe("named in B");
    expect(merged.notes[0].pitchExpression).toHaveLength(241);
    expect(merged.notes[0]).toBe(note);
  });

  it("lets a deleted Loop take its member with it", () => {
    type LoopBook = { loops: Array<{ id: string; members: Array<{ phraseId: string }> }> };
    const a = openTab();
    sketch(a, "member");
    (a.state.book as unknown as LoopBook).loops = [{ id: "loop", members: [{ phraseId: "member" }] }];
    a.save();
    const b = openTab();
    // B deletes the Loop and then the phrase it pointed at.
    (b.state.book as unknown as LoopBook).loops = [];
    b.state.book.phrases = b.state.book.phrases.filter((phrase) => phrase.id !== "member");
    b.save();
    a.hear();
    expect((a.state.book as unknown as LoopBook).loops).toEqual([]);
    expect(ids(a.state)).not.toContain("member");
    expect(ids(stored())).not.toContain("member");
  });

  it("holds every open tab, not only the restoring one, when a backup is restored", async () => {
    const a = openTab();
    sketch(a, "before-restore");
    a.save();
    const old = localStorage.getItem("phrases")!;
    sketch(a, "after-backup");
    a.save();
    await writePhraseBackup("phrases", "pre-restore", old, NOW);
    const b = openTab(); // the tab whose console runs the restore
    const [backup] = await listPhraseBackups();
    expect((await restorePhraseBackup(backup.backupKey)).ok).toBe(true);
    expect(localStorage.getItem("phrases")).toBe(old);
    a.hear();
    // A must not merge its shelf back over the restore.
    sketch(a, "played-after-restore");
    expect(a.save()).toBe(false);
    expect(b.save()).toBe(false);
    expect(localStorage.getItem("phrases")).toBe(old);
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
    // After a reload the restored shelf is simply what the tab runs on.
    const reloaded = openTab();
    expect(ids(reloaded.state)).toContain("before-restore");
    expect(ids(reloaded.state)).not.toContain("after-backup");
    sketch(reloaded, "after-reload");
    expect(reloaded.save()).toBe(true);
  });

  it("leaves every tab saving when a restore's write fails (quota)", async () => {
    const a = openTab();
    sketch(a, "before-restore");
    a.save();
    await writePhraseBackup("phrases", "pre-restore", localStorage.getItem("phrases")!, NOW);
    sketch(a, "after-backup");
    a.save();
    const current = localStorage.getItem("phrases");
    const b = openTab(); // the tab whose console runs the restore
    const [backup] = await listPhraseBackups();
    const working = localStorage.setItem.bind(localStorage);
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation((key: string, value: string) => {
      if (key === "phrases") throw new DOMException("full", "QuotaExceededError");
      working(key, value);
    });
    let result;
    try {
      result = await restorePhraseBackup(backup.backupKey);
    } finally {
      setItem.mockRestore();
    }
    expect(result.ok).toBe(false);
    expect(localStorage.getItem("phrases")).toBe(current);
    expect(localStorage.getItem("phrases.restored")).toBeNull();
    // Nothing changed, so nothing is held: both tabs keep saving.
    a.hear();
    sketch(b, "from-b");
    expect(b.save()).toBe(true);
    sketch(a, "from-a");
    expect(a.save()).toBe(true);
    expect(ids(stored())).toEqual(expect.arrayContaining(["before-restore", "after-backup", "from-a", "from-b"]));
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
