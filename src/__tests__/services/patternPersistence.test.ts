import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createApp, nextTick, reactive } from "vue";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { usePhrasesStore } from "@/stores/phrases";
import {
  deserializePatternsState,
  serializePatternsState,
} from "@/services/patternPersistence";

function createStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

function createNote(index: number) {
  return {
    id: `note-${index}`,
    note: index % 2 ? "D4" : "C4",
    scaleDegree: (index % 7) + 1,
    scaleIndex: index % 7,
    pitchClassIndex: index % 2 ? 2 : 0,
    octave: 4,
    frequency: index % 2 ? 293.66 : 261.63,
    velocity: 0.8,
    pressTime: index * 500,
    releaseTime: index * 500 + 300,
    duration: 300,
  };
}

describe("pattern persistence serializer", () => {
  let storage: ReturnType<typeof createStorage>;
  let restoreLocalStorage: () => void;

  beforeEach(() => {
    storage = createStorage();
    const previous = window.localStorage;
    Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
    vi.stubGlobal("localStorage", storage);
    restoreLocalStorage = () => {
      Object.defineProperty(window, "localStorage", { configurable: true, value: previous });
      vi.unstubAllGlobals();
    };
  });

  afterEach(() => restoreLocalStorage());

  function makeStore() {
    const pinia = createPinia();
    pinia.use(piniaPluginPersistedstate);
    createApp({}).use(pinia);
    setActivePinia(pinia);
    return usePhrasesStore();
  }

  it("round-trips nested reactive phrase state with JSON shape", () => {
    const state = reactive({ book: { phrases: [{ id: "phrase-1", notes: [createNote(0)] }] } });
    const optimized = serializePatternsState(state);
    expect(JSON.parse(optimized)).toEqual(JSON.parse(JSON.stringify(state)));
    expect(optimized).not.toContain("__v_");
  });

  it("hydrates and persists the phrases store through Pinia", async () => {
    const seed = makeStore();
    seed.take.notes.push(...Array.from({ length: 512 }, (_, index) => createNote(index)));
    seed.book.phrases.push({ ...seed.take, id: "kept-1", shelf: "kept", notes: [createNote(1)] });
    const existing = serializePatternsState({ book: seed.book, isRecordingEnabled: true });
    seed.removeEventListeners();
    storage.setItem("phrases", existing);

    const store = makeStore();
    expect(store.takeNotes).toHaveLength(512);
    store.take.notes.push(createNote(512));
    store.take.notes[0].velocity = 0.5;
    store.take.notes.splice(1, 0, createNote(513));
    store.book.phrases.find((phrase) => phrase.id === "kept-1")!.name = "Persisted replacement";
    await nextTick();

    const persisted = storage.getItem("phrases");
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted!);
    expect(parsed).toEqual(JSON.parse(JSON.stringify({ book: store.book, isRecordingEnabled: store.isRecordingEnabled })));
    expect(persisted).not.toContain("__v_");
    expect(parsed.book.phrases.find((phrase: { id: string }) => phrase.id === store.takeId).notes).toHaveLength(514);
    expect(parsed.book.phrases.find((phrase: { id: string }) => phrase.id === store.takeId).notes[0].velocity).toBe(0.5);
    expect(parsed.book.phrases.find((phrase: { id: string }) => phrase.id === "kept-1").name).toBe("Persisted replacement");
    store.removeEventListeners();
  });

  it("leaves malformed persisted JSON on safe defaults and allows a later save", async () => {
    storage.setItem("phrases", "{ malformed");
    const store = makeStore();
    expect(() => deserializePatternsState("{ malformed")).toThrow();
    expect(store.takeNotes).toEqual([]);
    expect(store.book.phrases).toHaveLength(1);
    expect(store.isRecordingEnabled).toBe(true);

    store.take.notes.push(createNote(0));
    await nextTick();
    const parsed = JSON.parse(storage.getItem("phrases")!);
    expect(parsed.book.phrases[0].notes[0].id).toBe("note-0");
    store.removeEventListeners();
  });
});
