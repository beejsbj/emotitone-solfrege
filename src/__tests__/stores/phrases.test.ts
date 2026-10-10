import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { setActivePinia } from "pinia";
import { createTestPinia } from "../helpers/test-utils";
import { usePhrasesStore, libraryPhrases } from "@/stores/phrases";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { isPrewarmed, prewarmSoundSamples } from "@/services/superdoughAudio";
import {
  deserializePatternsState,
  serializePatternsState,
} from "@/services/patternPersistence";

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

const START = new Date("2026-09-26T12:00:00Z").getTime();

type Store = ReturnType<typeof usePhrasesStore>;

function tap(store: Store, noteId: string, solfegeIndex: number, at: number, extra = {}) {
  store.handleNotePressed({
    detail: { noteId, noteName: "C4", solfegeIndex, octave: 4, timestamp: at, ...extra },
  } as CustomEvent);
  store.handleNoteReleased({ detail: { noteId, timestamp: at + 200 } } as CustomEvent);
}

function playPhrase(store: Store, prefix: string, at: number) {
  [0, 2, 4].forEach((degree, index) => tap(store, `${prefix}-${index}`, degree, at + index * 300));
}

describe("phrases store", () => {
  let store: Store;

  beforeEach(() => {
    vi.mocked(isPrewarmed).mockReturnValue(true);
    vi.mocked(prewarmSoundSamples).mockResolvedValue(undefined);
    localStorage.clear();
    vi.spyOn(Date, "now").mockReturnValue(START);
    setActivePinia(createTestPinia());
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
    store = usePhrasesStore();
  });

  afterEach(() => {
    store?.removeEventListeners();
    vi.restoreAllMocks();
  });

  it("records played notes into the take, in phrase time", () => {
    playPhrase(store, "a", START);
    expect(store.takeNotes.map((note) => note.pressTime)).toEqual([0, 300, 600]);
    expect(store.lastLiveNoteId).toBe(store.takeNotes[2].id);
    expect(store.takeContext.key).toBe(useMusicStore().currentKey);
  });

  it("ignores playback and explicitly unrecorded notes", () => {
    tap(store, "p", 0, START, { source: "strudel-playback" });
    tap(store, "q", 0, START + 300, { record: false });
    expect(store.takeNotes).toEqual([]);
  });

  it("reports a held key in the take as sounding", () => {
    store.handleNotePressed({
      detail: { noteId: "held", noteName: "C4", solfegeIndex: 0, octave: 4, timestamp: START },
    } as CustomEvent);
    expect(store.isTakeSounding).toBe(true);
    store.handleNoteReleased({ detail: { noteId: "held", timestamp: START + 200 } } as CustomEvent);
    expect(store.isTakeSounding).toBe(false);
  });

  it("keeps the take on Return and leaves an empty take", () => {
    playPhrase(store, "a", START);
    const keptId = store.keepTake();
    expect(store.shelves.kept.map((phrase) => phrase.id)).toEqual([keptId]);
    expect(store.takeNotes).toEqual([]);
  });

  it("points the live controls at a phrase it puts on the desk", async () => {
    const golden = libraryPhrases.find((phrase) => phrase.context.key !== "C")!;
    store.openPhrase(golden.id);
    await nextTick();
    expect(useMusicStore().currentKey).toBe(golden.context.key);
    expect(useKeyboardDrawerStore().keyboardConfig.mainOctave).toBe(golden.context.octave);
    expect(store.take.derivedFrom?.id).toBe(golden.id);
    // The controls moving to the phrase's own context must not re-skin it.
    expect(store.takeNotes.map((note) => note.note)).toEqual(golden.notes.map((note) => note.note));
  });

  it("re-skins an untouched loaded take when the key changes", async () => {
    const phrase = libraryPhrases.find((candidate) => candidate.context.key === "C")
      ?? libraryPhrases[0];
    store.openPhrase(phrase.id);
    await nextTick();
    const music = useMusicStore();
    const nextKey = phrase.context.key === "D" ? "E" : "D";
    music.setKey(nextKey);
    await nextTick();
    expect(store.takeContext.key).toBe(nextKey);
    expect(store.takeNotes[0].note).not.toBe(phrase.notes[0].note);
  });

  it("remaps the original loaded melody through repeated mode/key/octave changes", async () => {
    const twinkle = libraryPhrases.find((phrase) => phrase.id === "pattern-twinkle-1")!;
    store.openPhrase(twinkle.id);
    await nextTick();
    const original = JSON.parse(JSON.stringify(store.takeNotes));
    const music = useMusicStore();
    music.setMode("major pentatonic");
    await nextTick();
    expect(store.takeNotes[2]).toMatchObject({ note: "D5", scaleIndex: 3 });
    music.setMode("minor pentatonic");
    music.setKey("A#");
    useKeyboardDrawerStore().setMainOctave(twinkle.context.octave + 1);
    await nextTick();
    music.setMode(twinkle.context.mode);
    music.setKey(twinkle.context.key);
    useKeyboardDrawerStore().setMainOctave(twinkle.context.octave);
    await nextTick();
    expect(store.takeNotes).toEqual(original);
    expect(twinkle.notes).toEqual(original);
  });

  it("restores borrowed notes after saving and hydrating a remapped take", async () => {
    const twinkle = libraryPhrases.find((phrase) => phrase.id === "pattern-twinkle-1")!;
    const source = JSON.parse(JSON.stringify(twinkle));
    source.id = "borrowed-source";
    source.shelf = "kept";
    source.notes[0] = {
      ...source.notes[0], note: "G#4", octave: 4, pitchClassIndex: 8,
      scaleIndex: -1, scaleDegree: 0, isBorrowed: true,
    };
    store.book.phrases.push(source);
    store.openPhrase(source.id);
    await nextTick();
    const original = JSON.parse(JSON.stringify(store.takeNotes));
    useMusicStore().setMode("minor pentatonic");
    await nextTick();
    const saved = serializePatternsState({ book: store.book, isRecordingEnabled: true });
    store.$dispose();
    localStorage.setItem("phrases", saved);
    const pinia = createTestPinia().use(piniaPluginPersistedstate);
    createApp({}).use(pinia);
    setActivePinia(pinia);
    useMusicStore().setKey(source.context.key);
    useMusicStore().setMode("minor pentatonic");
    useKeyboardDrawerStore().setMainOctave(source.context.octave);
    store = usePhrasesStore();
    expect(store.takeContext.mode).toBe("minor pentatonic");
    expect(store.take.modeBase).toBeDefined();
    useMusicStore().setMode(source.context.mode);
    await nextTick();
    expect(store.takeNotes).toEqual(original);
  });

  it("does not resurrect an undone loaded note on a later mode change", async () => {
    store.openPhrase("pattern-twinkle-1");
    await nextTick();
    useMusicStore().setMode("major pentatonic");
    await nextTick();
    const removed = store.takeNotes[store.takeNotes.length - 1].id;
    store.undoLastNote();
    useMusicStore().setMode("major");
    await nextTick();
    expect(store.takeNotes).toHaveLength(13);
    expect(store.takeNotes.some((note) => note.id === removed)).toBe(false);
  });

  it("keeps, renames, and deletes the source of a copy you are only looking at", async () => {
    const source = libraryPhrases[0];
    store.openPhrase(source.id);
    await nextTick();
    expect(store.isTakeTouched).toBe(false);
    const keptId = store.keepPhrase(store.takeId)!;
    expect(store.shelves.kept.map((phrase) => phrase.id)).toEqual([keptId]);

    store.openPhrase(keptId);
    await nextTick();
    store.renamePhrase(store.takeId, "Renamed source");
    expect(store.findPhrase(keptId)?.name).toBe("Renamed source");
    expect(store.deletePhrase(store.takeId)).toBe(true);
    expect(store.findPhrase(keptId)).toBeUndefined();
    expect(store.takeNotes).toEqual([]);
  });

  it("the blank slot files what you played and never churns an empty take", () => {
    const emptyId = store.takeId;
    store.startBlankTake();
    expect(store.takeId).toBe(emptyId);

    tap(store, "one", 0, START);
    const played = store.takeId;
    store.startBlankTake();
    expect(store.takeNotes).toEqual([]);
    expect(store.shelves.recent.map((phrase) => phrase.id)).toEqual([played]);
  });

  it("deletes and renames a reopened played-over copy itself, never its Kept source", async () => {
    tap(store, "k1", 0, START);
    store.keepTake();
    const keptId = store.shelves.kept[0].id;
    store.openPhrase(keptId);
    await nextTick();
    tap(store, "k2", 2, START + 1000);
    const copyId = store.takeId;
    store.startBlankTake();
    store.openPhrase(copyId);
    await nextTick();
    expect(store.take.derivedFrom?.id).toBe(keptId);

    store.renamePhrase(store.takeId, "My copy");
    expect(store.findPhrase(copyId)?.name).toBe("My copy");
    expect(store.findPhrase(keptId)?.name).toBeUndefined();

    expect(store.deletePhrase(copyId)).toBe(true);
    expect(store.findPhrase(copyId)).toBeUndefined();
    expect(store.findPhrase(keptId)).toBeDefined();
  });

  it("discards the take you played into on a confirmed delete", () => {
    playPhrase(store, "a", START);
    const doomed = store.takeId;
    expect(store.deletePhrase(doomed)).toBe(true);
    expect(store.findPhrase(doomed)).toBeUndefined();
    expect(store.takeNotes).toEqual([]);
  });

  it("round-trips the book through its serializer", () => {
    playPhrase(store, "a", START);
    store.keepTake();
    const json = serializePatternsState({ book: store.book, isRecordingEnabled: true });
    const restored = deserializePatternsState(json);
    expect(restored.book.phrases).toHaveLength(2);
    expect(restored.book.takeId).toBe(store.takeId);
  });
});

describe("phrases store migration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("reads the legacy patterns key once and leaves it in place", () => {
    vi.spyOn(Date, "now").mockReturnValue(START);
    const legacy = JSON.stringify({
      savedPatterns: [{
        id: "saved-1",
        name: "Sent last week",
        notes: [0, 1, 2].map((index) => ({
          id: `n${index}`, note: "C4", scaleDegree: 1, scaleIndex: 0, octave: 4,
          pressTime: START - 5000 + index * 300, releaseTime: START - 4800 + index * 300, duration: 200,
        })),
        key: "C", mode: "major", instrument: "piano", bpm: 120,
        createdAt: START - 5000, isSaved: true,
      }],
      loggedNotes: [],
    });
    localStorage.setItem("patterns", legacy);
    setActivePinia(createTestPinia());
    const store = usePhrasesStore();
    expect(store.shelves.kept.map((phrase) => phrase.name)).toEqual(["Sent last week"]);
    expect(localStorage.getItem("patterns")).toBe(legacy);
    store.removeEventListeners();
  });

  it("ignores the legacy key once the new one exists", () => {
    localStorage.setItem("phrases", JSON.stringify({}));
    localStorage.setItem("patterns", JSON.stringify({ savedPatterns: [{ id: "x", notes: [] }] }));
    setActivePinia(createTestPinia());
    const store = usePhrasesStore();
    expect(store.shelves.kept).toEqual([]);
    store.removeEventListeners();
  });
});
