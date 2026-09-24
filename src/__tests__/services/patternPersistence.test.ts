import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createApp, nextTick, reactive } from "vue";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { usePatternsStore } from "@/stores/patterns";
import {
  deserializePatternsState,
  serializePatternsState,
} from "@/services/patternPersistence";

interface StorageStub {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function createStorage(): StorageStub & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function createNote(index: number) {
  return {
    id: `note-${index}`,
    note: index % 2 ? "D4" : "C4",
    key: "C",
    mode: "major",
    scaleDegree: (index % 7) + 1,
    scaleIndex: index % 7,
    solfege: {
      name: index % 2 ? "Re" : "Do",
      number: (index % 7) + 1,
      emotion: "curious",
      description: "Bright forward motion",
      texture: "glossy",
    },
    octave: 4,
    frequency: index % 2 ? 293.66 : 261.63,
    instrument: "piano",
    bpm: 120,
    velocity: 0.8,
    pressTime: index * 500,
    releaseTime: index * 500 + 300,
    duration: 300,
    sessionId: "session-persistence",
    isStartingNewPattern: index === 0 || index === 256,
  };
}

describe("pattern persistence serializer", () => {
  let storage: ReturnType<typeof createStorage>;
  let restoreLocalStorage: () => void;
  let dateNowSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    storage = createStorage();
    const previous = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    vi.stubGlobal("localStorage", storage);
    restoreLocalStorage = () => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: previous,
      });
      vi.unstubAllGlobals();
    };
  });

  afterEach(() => {
    dateNowSpy?.mockRestore();
    restoreLocalStorage();
  });

  it("round-trips nested reactive state with the legacy JSON shape", () => {
    const state = reactive({
      loggedNotes: [createNote(0)],
      savedPatterns: [{ id: "pattern-1", notes: [createNote(1)] }],
    });

    const optimized = serializePatternsState(state);
    const legacy = JSON.stringify(state);

    expect(JSON.parse(optimized)).toEqual(JSON.parse(legacy));
    expect(optimized).not.toContain("__v_");
  });

  it("hydrates and persists the actual patterns store through Pinia", async () => {
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(512 * 500 + 300);
    const existing = {
      loggedNotes: Array.from({ length: 512 }, (_, index) => createNote(index)),
      currentSessionId: "session-persistence",
      isLoggingEnabled: true,
      config: { silenceGapThreshold: 4000, maxRetentionTime: 604800000 },
      savedPatterns: [],
      loadedBaseNotes: [],
      loadedBasePatternId: null,
      loadedBaseMeta: null,
      isStripCleared: false,
      currentTakeGeneration: 0,
      focusedPatternId: null,
    };
    storage.setItem("patterns", serializePatternsState(existing));

    const pinia = createPinia();
    pinia.use(piniaPluginPersistedstate);
    createApp({}).use(pinia);
    setActivePinia(pinia);
    const store = usePatternsStore();

    expect(store.loggedNotes).toHaveLength(512);
    store.loggedNotes.push(createNote(512));
    store.loggedNotes[0].solfege.description = "Edited nested note";
    store.loggedNotes.splice(1, 0, createNote(513));
    store.savedPatterns.push({
      id: "saved-pattern",
      name: "Persisted",
      notes: [createNote(513)],
      duration: 300,
      noteCount: 1,
      key: "C",
      mode: "major",
      instrument: "piano",
      bpm: 120,
      createdAt: 1,
      isSaved: true,
      isDefault: false,
    });
    store.savedPatterns = store.savedPatterns.map((pattern) => ({
      ...pattern,
      name: "Persisted replacement",
    }));
    await nextTick();

    const persisted = storage.getItem("patterns");
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted!)).toEqual(JSON.parse(JSON.stringify(store.$state)));
    expect(JSON.parse(persisted!)).not.toHaveProperty("__v_isReactive");
    expect(persisted).not.toContain("__v_");
    expect(JSON.parse(persisted!).loggedNotes).toHaveLength(514);
    expect(JSON.parse(persisted!).loggedNotes[0].solfege.description).toBe("Edited nested note");
    expect(JSON.parse(persisted!).savedPatterns[0].notes[0].solfege.name).toBe("Re");
  });

  it("leaves malformed persisted JSON on safe store defaults and allows subsequent save/load", async () => {
    storage.setItem("patterns", "{ malformed");

    const pinia = createPinia();
    pinia.use(piniaPluginPersistedstate);
    createApp({}).use(pinia);
    setActivePinia(pinia);

    expect(() => usePatternsStore()).not.toThrow();
    expect(() => deserializePatternsState("{ malformed")).toThrow();

    // Verify safe defaults are initialized
    const store = usePatternsStore();
    expect(store.loggedNotes).toEqual([]);
    expect(store.savedPatterns).toEqual([]);
    expect(store.isLoggingEnabled).toBe(true);
    expect(store.loadedBaseNotes).toEqual([]);
    expect(store.loadedBasePatternId).toBeNull();
    expect(store.loadedBaseMeta).toBeNull();
    expect(store.isStripCleared).toBe(false);
    expect(store.currentTakeGeneration).toBe(0);
    expect(store.focusedPatternId).toBeNull();

    // Verify subsequent normal save/load cycle works
    const note = createNote(0);
    store.loggedNotes.push(note);
    await nextTick();

    const persisted = storage.getItem("patterns");
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted!);
    expect(parsed.loggedNotes).toHaveLength(1);
    expect(parsed.loggedNotes[0].id).toBe("note-0");
  });
});
