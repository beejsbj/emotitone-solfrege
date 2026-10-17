import { IDBDatabase, IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPhraseBook, phraseFromPattern } from "@/domain/phraseBook";
import { defaultPatterns } from "@/data/patterns";
import { NEUTRAL_SHAPE } from "@/services/shape";
import {
  createPhrasePersistence, decimateCurve, encodedPhraseBytes, PHRASE_BUDGET_BYTES, phraseCodec,
  type PersistedPhraseState,
} from "@/services/phrasePersistence";
import { encodePayload, readPayload } from "@/services/persistenceCodec";
import { IDB_OPEN_DEADLINE_MS, listPhraseBackups, restorePhraseBackup, writePhraseBackup } from "@/services/phraseBackups";
import { resetSaveFailure, saveFailureNotice } from "@/services/safeStorage";
import type { PhraseContext } from "@/types/phrases";

const NOW = Date.UTC(2026, 9, 16);
const context: PhraseContext = { key: "C", mode: "major", instrument: "piano", octave: 4, bpm: 120, shape: { ...NEUTRAL_SHAPE } };
const defaults = (): PersistedPhraseState => ({ book: createPhraseBook(context, NOW), isRecordingEnabled: true });
const codec = () => phraseCodec(defaults, () => context);
const active: ReturnType<typeof createPhrasePersistence>[] = [];
const binding = () => {
  const next = createPhrasePersistence(defaults, () => context);
  active.push(next);
  return next;
};

/** Generated realistic shelf, not a capture from a player's device. */
function realisticShelf(count = 200): PersistedPhraseState {
  const state = defaults();
  for (let index = 0; index < count; index++) {
    const phrase = phraseFromPattern(defaultPatterns[0], index % 4 === 0 ? "kept" : "recent");
    phrase.id = `generated-${index}`;
    phrase.createdAt = NOW - index * 60_000;
    phrase.closedAt = phrase.createdAt;
    phrase.notes = phrase.notes.slice(0, 8);
    const note = phrase.notes[0];
    note.duration = 1000;
    note.releaseTime = note.pressTime + 1000;
    note.pitchExpression = Array.from({ length: 241 }, (_, point) => ({ timeMs: point * 1000 / 240, cents: Math.round(30 * Math.sin(point / 6)) }));
    note.gainExpression = Array.from({ length: 241 }, (_, point) => ({ timeMs: point * 1000 / 240, gain: 1 + 0.3 * Math.sin(point / 8) }));
    state.book.phrases.push(phrase);
  }
  return state;
}

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  localStorage.clear();
  resetSaveFailure();
});
afterEach(() => {
  active.splice(0).forEach((binding) => binding.unregister());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("phrase payload budget and curve fidelity", () => {
  it("keeps no more than 100 points per second at uniform time targets, with both endpoints", () => {
    const dense = Array.from({ length: 1001 }, (_, timeMs) => ({ timeMs, cents: timeMs % 50 }));
    const saved = decimateCurve(dense);
    expect(saved.length).toBeLessThanOrEqual(100);
    // Uniform targets use the allowance: not roughly half of it.
    expect(saved.length).toBeGreaterThanOrEqual(98);
    expect(saved[0]).toEqual(dense[0]);
    expect(saved.at(-1)).toEqual(dense.at(-1));
    const gaps = saved.slice(1).map((point, index) => point.timeMs - saved[index].timeMs);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(11);
    // A very short curve keeps both endpoints, not just the last point.
    expect(decimateCurve(dense.slice(0, 6))).toEqual([dense[0], dense[5]]);
    expect(decimateCurve([dense[0], dense[500], dense[1000]])).toEqual([dense[0], dense[500], dense[1000]]);
    expect(decimateCurve([dense[7]])).toEqual([dense[7]]);
  });
  it("reduces both curves and modeBase only in saved bytes; reload retains endpoints and sparse samples", () => {
    const state = realisticShelf(1);
    const phrase = state.book.phrases[1];
    phrase.modeBase = { notes: structuredClone(phrase.notes), context };
    const original = structuredClone(state);
    const encoded = encodePayload(codec(), state);
    const loaded = readPayload(codec(), encoded).state.book.phrases[1];
    expect(state).toEqual(original);
    for (const notes of [loaded.notes, loaded.modeBase!.notes]) {
      for (const curve of [notes[0].pitchExpression!, notes[0].gainExpression!]) {
        expect(curve.length).toBeLessThanOrEqual(100);
        expect(curve[0].timeMs).toBe(0);
        expect(curve.at(-1)!.timeMs).toBe(1000);
        expect(curve.slice(1).every((point, index) => point.timeMs - curve[index].timeMs >= 10)).toBe(true);
      }
    }
    expect(loaded.notes[0].pitchExpression!.at(-1)).toEqual(original.book.phrases[1].notes[0].pitchExpression!.at(-1));
    expect(loaded.notes[1]).toEqual(original.book.phrases[1].notes[1]);
    expect(encodePayload(codec(), readPayload(codec(), encoded).state)).toBe(encoded);
  });

  it("measures a generated 200-phrase shelf with 50 Kept, eight notes each and 240 Hz pitch/gain on one note", () => {
    const state = realisticShelf();
    const raw = JSON.stringify({ $version: 1, data: state });
    const encoded = encodePayload(codec(), state);
    console.info(`BJS-513 generated shelf: ${encodedPhraseBytes(raw)} bytes before, ${encodedPhraseBytes(encoded)} bytes saved, ${state.book.phrases.length - 1} phrases`);
    expect(encodedPhraseBytes(encoded)).toBeGreaterThan(PHRASE_BUDGET_BYTES);
    expect(encodedPhraseBytes(encoded)).toBeLessThan(encodedPhraseBytes(raw));
    const store = binding();
    expect(store.save(state)).toBe(false);
    expect(localStorage.getItem("phrases")).toBeNull();
    // Explicitly release ten Recent; all fifty Kept still fit and survive.
    const release = new Set(state.book.phrases.filter((phrase) => phrase.shelf === "recent").slice(0, 10).map((phrase) => phrase.id));
    state.book.phrases = state.book.phrases.filter((phrase) => !release.has(phrase.id));
    expect(store.save(state)).toBe(true);
    expect(readPayload(codec(), localStorage.getItem("phrases")).state.book.phrases.filter((phrase) => phrase.shelf === "kept")).toHaveLength(50);
  });

  it("refuses over-budget saves without dropping Kept, then saves after explicit Recent release", () => {
    const store = binding();
    const state = store.load();
    expect(store.save(state)).toBe(true);
    const before = localStorage.getItem("phrases");
    const kept = realisticShelf(1).book.phrases[1];
    state.book.phrases.push(kept);
    const recent = { ...structuredClone(kept), id: "big-recent", shelf: "recent" as const, name: "曲".repeat(PHRASE_BUDGET_BYTES / 2) };
    state.book.phrases.push(recent);
    expect(store.save(state)).toBe(false);
    expect(saveFailureNotice.value?.message).toBe("Shelf full");
    expect(localStorage.getItem("phrases")).toBe(before);
    expect(state.book.phrases).toContain(kept);
    expect(state.book.phrases).toContain(recent);
    state.book.phrases = state.book.phrases.filter((phrase) => phrase.id !== recent.id);
    expect(store.save(state)).toBe(true);
    expect(saveFailureNotice.value).toBeNull();
    expect(binding().load().book.phrases.find((phrase) => phrase.id === kept.id)?.shelf).toBe("kept");
  });
});

describe("shelf reads and saves", () => {
  it("drops an invalid phrase and keeps the rest of the shelf", () => {
    const state = realisticShelf(3);
    const [, good, broken, nothing] = state.book.phrases;
    const stored = JSON.parse(encodePayload(codec(), state));
    const bad = stored.data.book.phrases.find((phrase: { id: string }) => phrase.id === broken.id);
    delete bad.notes;
    stored.data.book.phrases[stored.data.book.phrases.findIndex((phrase: { id: string }) => phrase.id === nothing.id)] = null;
    localStorage.setItem("phrases", JSON.stringify(stored));
    const store = binding();
    const loaded = store.load();
    const ids = loaded.book.phrases.map((phrase) => phrase.id);
    expect(ids).toContain(good.id);
    expect(ids).not.toContain(broken.id);
    expect(ids).not.toContain(nothing.id);
    expect(store.hold).toBeNull();
    expect(store.save(loaded)).toBe(true);
    expect(JSON.parse(localStorage.getItem("phrases")!).data.book.phrases.map((phrase: { id: string }) => phrase.id)).toContain(good.id);
  });

  it("does not re-read or re-parse the shelf when saving over its own last write", () => {
    const state = realisticShelf(20);
    const store = binding();
    expect(store.save(state)).toBe(true);
    const parse = vi.spyOn(JSON, "parse");
    state.book.phrases[1].name = "changed";
    expect(store.save(state)).toBe(true);
    expect(parse).not.toHaveBeenCalled();
    parse.mockRestore();
    expect(JSON.parse(localStorage.getItem("phrases")!).data.book.phrases[1].name).toBe("changed");
  });

  it("still re-checks bytes another tab wrote", () => {
    const state = realisticShelf(1);
    const store = binding();
    expect(store.save(state)).toBe(true);
    localStorage.setItem("phrases", JSON.stringify({ $version: 99, data: {} }));
    expect(store.save(state)).toBe(false);
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
  });

  it("asks the browser to keep storage once, and ignores a refusal", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "storage", { value: { persist }, configurable: true });
    try {
      const state = realisticShelf(1);
      const store = binding();
      expect(store.save(state)).toBe(true);
      expect(store.save(state)).toBe(true);
      await Promise.resolve();
      expect(persist).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(navigator, "storage");
    }
  });
});

describe("IndexedDB backup before phrase rewrites", () => {
  it("reports a save failure when IndexedDB never finishes opening, and leaves the stored shelf alone", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal("indexedDB", { open: () => ({}) });
      const old = JSON.stringify(realisticShelf(1));
      localStorage.setItem("phrases", old);
      const store = binding();
      store.load();
      expect(saveFailureNotice.value).toBeNull();
      await vi.advanceTimersByTimeAsync(IDB_OPEN_DEADLINE_MS + 1);
      await store.settled();
      expect(saveFailureNotice.value?.message).toBe("Can't save");
      expect(localStorage.getItem("phrases")).toBe(old);
    } finally {
      vi.useRealTimers();
    }
  });

  it("backs up exact legacy bytes outside localStorage before migration, including latest edits while pending", async () => {
    const old = JSON.stringify(realisticShelf(190));
    localStorage.setItem("phrases", old);
    const store = binding();
    const state = store.load();
    expect(localStorage.getItem("phrases")).toBe(old);
    state.book.phrases[1].name = "Edited during backup";
    expect(store.save(state)).toBe(false);
    await store.settled();
    expect((await listPhraseBackups()).map((entry) => entry.raw)).toEqual([old]);
    expect(JSON.parse(localStorage.getItem("phrases")!).data.book.phrases[1].name).toBe("Edited during backup");
    expect(Object.keys(localStorage).some((key) => key.startsWith("phrases.backup."))).toBe(false);
  });

  it("does not rewrite when IndexedDB is unavailable; retries safely", async () => {
    const old = JSON.stringify(realisticShelf(1));
    localStorage.setItem("phrases", old);
    vi.stubGlobal("indexedDB", undefined);
    const store = binding();
    const state = store.load();
    await store.settled();
    expect(store.save(state)).toBe(false);
    await store.settled();
    expect(localStorage.getItem("phrases")).toBe(old);
    expect(saveFailureNotice.value?.message).toBe("Can't save");
    vi.stubGlobal("indexedDB", new IDBFactory());
    store.save(state);
    await store.settled();
    expect((await listPhraseBackups())[0].raw).toBe(old);
    expect(JSON.parse(localStorage.getItem("phrases")!).$version).toBe(1);
    expect(saveFailureNotice.value).toBeNull();
  });

  it("keeps live bytes and prior backups when the IndexedDB transaction aborts", async () => {
    await writePhraseBackup("phrases", "unreadable", "previous recovery copy", NOW);
    const old = JSON.stringify(realisticShelf(1));
    localStorage.setItem("phrases", old);
    const original = IDBDatabase.prototype.transaction;
    vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementationOnce(function (...args) {
      const tx = original.apply(this, args);
      queueMicrotask(() => tx.abort());
      return tx;
    });
    const store = binding();
    store.load();
    await store.settled();
    expect(localStorage.getItem("phrases")).toBe(old);
    expect((await listPhraseBackups()).map((entry) => entry.raw)).toEqual(["previous recovery copy"]);
    expect(saveFailureNotice.value).not.toBeNull();
  });

  it("finishes a pending recovery copy without rewriting a disposed store", async () => {
    const old = JSON.stringify(realisticShelf(1));
    localStorage.setItem("phrases", old);
    const store = binding();
    store.load();
    store.holdUntilReload();
    store.unregister();
    await store.settled();
    expect((await listPhraseBackups())[0].raw).toBe(old);
    expect(localStorage.getItem("phrases")).toBe(old);
  });

  it("backs up corrupt data before replacement, protects newer versions even during a backup", async () => {
    localStorage.setItem("phrases", "{corrupt");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store = binding();
    const state = store.load();
    store.save(state);
    const newer = JSON.stringify({ $version: 99, data: {} });
    localStorage.setItem("phrases", newer);
    await store.settled();
    expect((await listPhraseBackups())[0].raw).toBe("{corrupt");
    expect(localStorage.getItem("phrases")).toBe(newer);
    expect(store.save(state)).toBe(false);
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
  });

  it("retains recovery copies, prunes only committed migration backups, and restores with a pre-restore copy", async () => {
    for (let index = 0; index < 4; index++) {
      await writePhraseBackup("phrases", "v0", `old-${index}`, NOW + index * 86_400_000);
    }
    await writePhraseBackup("phrases", "unreadable", "{broken", NOW);
    expect((await listPhraseBackups()).filter((entry) => entry.label === "v0").map((entry) => entry.raw)).toEqual(["old-3", "old-2"]);
    const store = binding();
    store.load();
    store.save(realisticShelf(1));
    const before = localStorage.getItem("phrases");
    const backup = (await listPhraseBackups()).find((entry) => entry.raw === "old-3")!;
    expect((await restorePhraseBackup(backup.backupKey)).ok).toBe(true);
    expect(localStorage.getItem("phrases")).toBe("old-3");
    expect((await listPhraseBackups()).find((entry) => entry.label === "pre-restore")?.raw).toBe(before);
    expect(store.save(defaults())).toBe(false);
    expect(localStorage.getItem("phrases")).toBe("old-3");
  });
});
