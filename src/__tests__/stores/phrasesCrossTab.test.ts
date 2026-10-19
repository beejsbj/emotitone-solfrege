import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { nextTick } from "vue";
import { setActivePinia } from "pinia";
import { IDBFactory } from "fake-indexeddb";
import { createTestPinia } from "../helpers/test-utils";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { fakeLocks } from "../helpers/fakeLocks";
import { prewarmSoundSamples } from "@/services/superdoughAudio";

vi.mock("@/services/superdoughAudio", () => ({
  setStrudelLaBasedMinor: vi.fn(),
  setLiveSynthControls: vi.fn(),
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  stopNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn().mockReturnValue(true),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  getAudioContext: vi.fn(() => ({ state: "running", currentTime: 0 })),
  playStrudelCode: vi.fn().mockResolvedValue(undefined),
  stopStrudelPlayback: vi.fn(),
}));

/**
 * BJS-575 at the store: two phrase stores (two Pinia apps, as two tabs would
 * have) over the one localStorage. A browser fires `storage` only in the tabs
 * that did not write; here both stores hear it, and the writer finds nothing new.
 */

const START = new Date("2026-10-19T12:00:00Z").getTime();
type Store = ReturnType<typeof usePhrasesStore>;
const stores: Store[] = [];

function openTab(): Store {
  setActivePinia(createTestPinia());
  useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
  const store = usePhrasesStore();
  stores.push(store);
  return store;
}

function playPhrase(store: Store, prefix: string, at: number) {
  [0, 2, 4].forEach((degree, index) => {
    const noteId = `${prefix}-${index}`;
    const time = at + index * 300;
    store.handleNotePressed({ detail: { noteId, noteName: "C4", solfegeIndex: degree, octave: 4, timestamp: time } } as CustomEvent);
    store.handleNoteReleased({ detail: { noteId, timestamp: time + 200 } } as CustomEvent);
  });
}

/** Play a sketch and move on, so it lands in Recent and autosaves. */
async function sketch(store: Store, prefix: string, at: number): Promise<string> {
  playPhrase(store, prefix, at);
  const id = store.takeId;
  store.startBlankTake();
  await nextTick();
  return id;
}

const storedIds = () =>
  (JSON.parse(localStorage.getItem("phrases")!).data.book.phrases as Array<{ id: string }>).map((phrase) => phrase.id);
const otherTabWrote = () => window.dispatchEvent(new StorageEvent("storage", { key: "phrases" }));

beforeEach(() => {
  // afterEach's restoreAllMocks clears the factory's resolved value, and the instrument
  // store chains .then on what prewarmSoundSamples returns, as the real one is async.
  vi.mocked(prewarmSoundSamples).mockResolvedValue(undefined);
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.spyOn(Date, "now").mockReturnValue(START);
  localStorage.clear();
});
afterEach(() => {
  stores.splice(0).forEach((store) => {
    store.removeEventListeners();
    store.$dispose();
  });
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("phrase stores in two tabs", () => {
  it("shows a sketch played in the other tab, and both tabs' saves keep both sketches", async () => {
    const a = openTab();
    const b = openTab();
    const fromB = await sketch(b, "b", START);
    otherTabWrote();
    expect(a.shelves.recent.map((phrase) => phrase.id)).toContain(fromB);

    const fromA = await sketch(a, "a", START + 10_000);
    expect(storedIds()).toEqual(expect.arrayContaining([fromA, fromB]));
    otherTabWrote();
    expect(b.shelves.recent.map((phrase) => phrase.id)).toEqual(expect.arrayContaining([fromA, fromB]));
    // Each tab is still on its own desk.
    expect(a.takeId).not.toBe(b.takeId);

    const againB = await sketch(b, "b2", START + 20_000);
    expect(storedIds()).toEqual(expect.arrayContaining([fromA, fromB, againB]));
  });

  it("keeps the other tab's sketch when this tab saves before the event arrives", async () => {
    const a = openTab();
    const b = openTab();
    const fromB = await sketch(b, "b", START);
    // No event yet: A's own autosave reads storage first and merges.
    const fromA = await sketch(a, "a", START + 10_000);
    expect(storedIds()).toEqual(expect.arrayContaining([fromA, fromB]));
    expect(a.shelves.recent.map((phrase) => phrase.id)).toEqual(expect.arrayContaining([fromA, fromB]));
  });

  it("shelves a take left behind by a closed tab, and leaves a live tab's take on its desk", async () => {
    Object.defineProperty(navigator, "locks", { value: fakeLocks(), configurable: true });
    onTestFinished(() => { delete (navigator as { locks?: unknown }).locks; });
    const a = openTab();
    // Tab B plays into its own take, then A saves last, so B's take is "another tab's".
    const b = openTab();
    b.startBlankTake();
    playPhrase(b, "b", START);
    await nextTick();
    const live = b.takeId;
    const gone = openTab();
    gone.startBlankTake();
    playPhrase(gone, "g", START + 5_000);
    await nextTick();
    const leftBehind = gone.takeId;
    // The tab closes; the browser lets its lock go.
    stores.splice(stores.indexOf(gone), 1);
    gone.removeEventListeners();
    gone.$dispose();
    await sketch(a, "a", START + 10_000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const c = openTab();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    expect(c.shelves.recent.map((phrase) => phrase.id)).toContain(leftBehind);
    expect(c.shelves.recent.map((phrase) => phrase.id)).not.toContain(live);
    expect(c.book.phrases.find((phrase) => phrase.id === live)?.shelf).toBe("take");
    otherTabWrote();
    expect(b.takeId).toBe(live);
    expect(b.take.shelf).toBe("take");
  });

  it("without Web Locks, shelves another tab's take only once it is a day old", async () => {
    Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
    onTestFinished(() => { delete (navigator as { locks?: unknown }).locks; });
    const a = openTab();
    const id = await sketch(a, "a", START);
    const envelope = JSON.parse(localStorage.getItem("phrases")!);
    const played = envelope.data.book.phrases.find((phrase: { id: string }) => phrase.id === id);
    const day = 24 * 60 * 60 * 1000;
    const desk = (deskId: string, createdAt: number, notes: unknown[]) =>
      ({ ...played, id: deskId, shelf: "take", createdAt, closedAt: undefined, notes });
    envelope.data.book.phrases.push(
      desk("old-with-notes", START - day - 1, played.notes),
      desk("old-empty", START - day - 1, []),
      desk("fresh-desk", START - 60_000, played.notes),
    );
    localStorage.setItem("phrases", JSON.stringify(envelope));

    const c = openTab();
    await Promise.resolve();
    await nextTick();
    const shelf = (deskId: string) => c.book.phrases.find((phrase) => phrase.id === deskId)?.shelf;
    expect(shelf("old-with-notes")).toBe("recent");
    expect(shelf("old-empty")).toBeUndefined();
    expect(shelf("fresh-desk")).toBe("take");
    await nextTick();
    const storedShelf = (deskId: string) => JSON.parse(localStorage.getItem("phrases")!).data.book.phrases
      .find((phrase: { id: string }) => phrase.id === deskId)?.shelf;
    expect(storedShelf("old-with-notes")).toBe("recent");
    expect(storedShelf("old-empty")).toBeUndefined();
  });

  it("without Web Locks, a live take misjudged as left behind comes back to its desk whole", async () => {
    Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
    onTestFinished(() => { delete (navigator as { locks?: unknown }).locks; });
    const a = openTab();
    const b = openTab();
    playPhrase(b, "b", START);
    const takeId = b.takeId;
    b.take.modeBase = { notes: b.take.notes.map((note) => ({ ...note })), context: { ...b.take.context } };
    await nextTick();
    await sketch(a, "a", START + 1_000); // A saves last: B's take is another tab's
    otherTabWrote();
    // B has been sketching for over a day without moving on.
    vi.mocked(Date.now).mockReturnValue(START + 25 * 60 * 60 * 1000);
    const c = openTab();
    await Promise.resolve();
    await nextTick();
    expect(c.book.phrases.find((phrase) => phrase.id === takeId)?.shelf).toBe("recent");
    otherTabWrote();
    await nextTick();
    expect(b.takeId).toBe(takeId);
    expect(b.take.shelf).toBe("take");
    expect(b.take.modeBase?.notes).toHaveLength(3);
  });

  it("without Web Locks, leaves a Recent phrase reopened on another desk alone, whatever its age", async () => {
    Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
    onTestFinished(() => { delete (navigator as { locks?: unknown }).locks; });
    const a = openTab();
    const b = openTab();
    const old = await sketch(b, "b", START);
    vi.mocked(Date.now).mockReturnValue(START + 3 * 24 * 60 * 60 * 1000);
    b.openPhrase(old); // reopened in place: its dates are from days ago
    await nextTick();
    await sketch(a, "a", START + 3 * 24 * 60 * 60 * 1000 + 1_000);
    const c = openTab();
    await Promise.resolve();
    await nextTick();
    expect(c.book.phrases.find((phrase) => phrase.id === old)?.shelf).toBe("take");
  });

  it("keeps a phrase this tab's Looper protects when the other tab releases it", async () => {
    const a = openTab();
    const looping = await sketch(a, "a", START);
    const b = openTab();
    expect(b.shelves.recent.map((phrase) => phrase.id)).toContain(looping);
    a.setProtectedIds(() => new Set([looping]));
    expect(b.deletePhrase(looping)).toBe(true);
    await nextTick();
    otherTabWrote();
    expect(a.shelves.recent.map((phrase) => phrase.id)).toContain(looping);
    await nextTick();
    expect(storedIds()).toContain(looping);
  });
});
