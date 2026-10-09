import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createApp, nextTick } from "vue";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { defaultPatterns, retiredDefaultPatternIds } from "@/data/patterns";
import { libraryPhrases, usePhrasesStore } from "@/stores/phrases";
import { isPrewarmed, prewarmSoundSamples } from "@/services/superdoughAudio";
import { createTestPinia } from "../helpers/test-utils";

vi.mock("@/services/superdoughAudio", () => ({
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

const START = new Date("2026-10-01T12:00:00Z").getTime();
const RETIRED_ID = "pattern-warrior-chorus-1";

type Store = ReturnType<typeof usePhrasesStore>;

/**
 * What a returning player's browser holds: a take that was opened from a
 * built-in transcription (untouched), a kept copy of another, and a rename of
 * a third. Built from today's real store so the shape is the real shape.
 */
function savedBookThatMentionsRetiredPatterns(): string {
  const clock = vi.spyOn(Date, "now").mockReturnValue(START);
  setActivePinia(createTestPinia());
  const maker = usePhrasesStore();
  const source = libraryPhrases[0];

  maker.openPhrase(source.id);
  const keptId = maker.keepPhrase(maker.takeId)!;
  const kept = maker.book.phrases.find((phrase) => phrase.id === keptId)!;
  kept.derivedFrom = { id: "pattern-warrior-theme-1", name: "Warrior of the Mind (Theme)", shelf: "library", named: true };

  maker.openPhrase(source.id);
  const take = maker.book.phrases.find((phrase) => phrase.id === maker.takeId)!;
  take.derivedFrom = { id: RETIRED_ID, name: "Warrior of the Mind (Chorus)", shelf: "library", named: true };
  maker.book.libraryNames[RETIRED_ID] = "My chorus";
  maker.book.libraryNames["pattern-ruthlessness-melody-1"] = "Mine";
  maker.book.libraryNames[source.id] = "A name I chose";

  const json = JSON.stringify({ book: maker.book, isRecordingEnabled: true });
  maker.removeEventListeners();
  clock.mockRestore();
  return json;
}

function returnToApp(): Store {
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);
  createApp({}).use(pinia);
  setActivePinia(pinia);
  return usePhrasesStore();
}

describe("a returning player whose saved phrases mention retired built-ins", () => {
  let store: Store;

  beforeEach(() => {
    vi.mocked(isPrewarmed).mockReturnValue(true);
    vi.mocked(prewarmSoundSamples).mockResolvedValue(undefined);
    localStorage.clear();
    localStorage.setItem("phrases", savedBookThatMentionsRetiredPatterns());
    vi.spyOn(Date, "now").mockReturnValue(START);
    store = returnToApp();
  });

  afterEach(() => {
    store?.removeEventListeners();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("no longer offers the retired transcriptions in the library", () => {
    const ids = libraryPhrases.map((phrase) => phrase.id);
    for (const retired of retiredDefaultPatternIds) expect(ids).not.toContain(retired);
    expect(defaultPatterns.map((pattern) => pattern.name).join("|"))
      .not.toMatch(/Warrior of the Mind|Ruthlessness/);
    expect(store.shelves.library.map((phrase) => phrase.id)).toEqual(ids);
  });

  it("loads, lays out the reel, and keeps the open take and kept copy intact", () => {
    expect(store.book.recorder.origin).toBe("library");
    expect(store.take.derivedFrom?.id).toBe(RETIRED_ID);
    expect(store.takeNotes.length).toBeGreaterThan(0);
    expect(store.shelves.kept).toHaveLength(1);
    expect(store.shelves.kept[0].notes.length).toBeGreaterThan(0);
    expect(() => store.reel).not.toThrow();
    expect(store.reel.length).toBeGreaterThan(0);
    // The one surviving rename is still honoured.
    const renamed = store.shelves.library.find((phrase) => phrase.name === "A name I chose");
    expect(renamed).toBeDefined();
  });

  it("lets the player carry on: look up, rename, open another, and Return", async () => {
    expect(store.findPhrase(RETIRED_ID)).toBeUndefined();
    expect(store.renamePhrase(RETIRED_ID, "Another name")).toBe(false);

    // Return on an untouched copy whose source is gone keeps the player's copy.
    const keptId = store.keepTake();
    expect(keptId).not.toBeNull();
    expect(store.shelves.kept.map((phrase) => phrase.id)).toContain(keptId);

    const next = libraryPhrases[1];
    store.openPhrase(next.id);
    await nextTick();
    expect(store.take.derivedFrom?.id).toBe(next.id);
    expect(() => store.reel).not.toThrow();
  });
});
