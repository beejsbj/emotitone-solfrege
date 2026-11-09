import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { setActivePinia } from "pinia";
import { IDBFactory } from "fake-indexeddb";
import { createTestPinia } from "../helpers/test-utils";
import { createPhraseBook, phraseFromPattern } from "@/domain/phraseBook";
import { defaultPatterns } from "@/data/patterns";
import { usePhrasesStore } from "@/stores/phrases";
import { useInstrumentStore } from "@/stores/instrument";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { isPrewarmed, prewarmSoundSamples } from "@/services/audioEngine";
import { PHRASE_FORMAT_VERSION } from "@/services/phrasePersistence";
import { NEUTRAL_SHAPE, SHAPE_KNOB_RANGES } from "@/services/shape";
import type { Shape } from "@/types/instrument";
import type { Phrase, PhraseContext } from "@/types/phrases";

/**
 * BJS-650: a saved phrase's Shape is read like an instrument's, so a broken
 * one never throws on open and never reaches the live knobs. Each case is the
 * real phrases store over real localStorage; only the read changes, so the
 * stored text stays as it was.
 */

const NOW = new Date("2026-11-09T12:00:00Z").getTime();
const live: PhraseContext = { key: "C", mode: "major", instrument: "piano", octave: 4, bpm: 120, shape: { ...NEUTRAL_SHAPE } };
type Store = ReturnType<typeof usePhrasesStore>;
let store: Store | undefined;

function savedPhrase(id: string, shape: unknown): Phrase {
  const phrase = phraseFromPattern(defaultPatterns[0], "recent");
  phrase.id = id;
  phrase.createdAt = NOW;
  phrase.closedAt = NOW;
  (phrase.context as { shape: unknown }).shape = shape;
  return phrase;
}

const envelope = (phrases: Phrase[]) => {
  const book = createPhraseBook(live, NOW);
  book.phrases.push(...phrases);
  return JSON.stringify({ $version: PHRASE_FORMAT_VERSION, data: { book, isRecordingEnabled: true } });
};

function openStore(): Store {
  setActivePinia(createTestPinia());
  useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
  store = usePhrasesStore();
  return store;
}

const HEALTHY: Shape = { cutoff: 4000, resonance: 3.5, room: 0.25, delay: 0.125, attack: 0.05, release: 0.8 };

const BAD_SHAPES: Array<[string, unknown]> = [
  ["a string", "bright"],
  ["null", null],
  ["a number", 7],
  ["an array", [1, 2]],
  ["a missing release", { ...HEALTHY, release: undefined }],
  ["a missing attack", { ...HEALTHY, attack: undefined }],
  ["a null knob", { ...HEALTHY, cutoff: null }],
  ["a string NaN", { ...HEALTHY, resonance: "NaN" }],
  ["a numeric NaN and Infinity", { ...HEALTHY, room: Number.NaN, delay: Number.POSITIVE_INFINITY }],
  ["out-of-range values", { cutoff: 1e9, resonance: -50, room: 9, delay: -1, attack: 99, release: -3 }],
];

/** Every knob the player could be left holding: finite, in range. */
function expectSafeKnobs() {
  const controls = useInstrumentStore().synthControls;
  for (const key of Object.keys(SHAPE_KNOB_RANGES) as Array<keyof Shape>) {
    const value = controls[key];
    expect(Number.isFinite(value), key).toBe(true);
    expect(value, key).toBeGreaterThanOrEqual(SHAPE_KNOB_RANGES[key].min);
    expect(value, key).toBeLessThanOrEqual(SHAPE_KNOB_RANGES[key].max);
  }
}

function expectOpensSafely(target: Store, id: string) {
  const applied = vi.spyOn(useInstrumentStore(), "applyShape");
  expect(() => target.openPhrase(id)).not.toThrow();
  expect(applied).toHaveBeenCalled();
  const shape = applied.mock.calls.at(-1)![0];
  expect(Object.keys(shape).sort()).toEqual(Object.keys(NEUTRAL_SHAPE).sort());
  expect(target.takeContext.shape).toEqual(shape);
  expectSafeKnobs();
}

beforeEach(() => {
  vi.mocked(isPrewarmed).mockReturnValue(true);
  vi.mocked(prewarmSoundSamples).mockResolvedValue(undefined);
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  localStorage.clear();
});
afterEach(() => {
  store?.removeEventListeners();
  store?.$dispose();
  store = undefined;
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("a saved phrase with a broken Shape (initial load)", () => {
  it.each(BAD_SHAPES)("opens a phrase whose Shape is %s", (_name, shape) => {
    localStorage.setItem("phrases", envelope([savedPhrase("bad", shape)]));
    const target = openStore();
    expectOpensSafely(target, "bad");
  });

  it("repairs only the bad fields: the rest of the Shape is kept, and values are clamped", () => {
    localStorage.setItem("phrases", envelope([
      savedPhrase("a", { ...HEALTHY, release: undefined, resonance: "NaN" }),
      savedPhrase("b", { ...HEALTHY, cutoff: 1e9 }),
    ]));
    const target = openStore();
    expect(target.findPhrase("a")!.context.shape).toEqual({ ...HEALTHY, resonance: NEUTRAL_SHAPE.resonance, release: null });
    expect(target.findPhrase("b")!.context.shape).toEqual({ ...HEALTHY, cutoff: SHAPE_KNOB_RANGES.cutoff.max });
  });

  it("repairs the Shape on a modeBase too, so a later control change cannot throw", () => {
    const phrase = savedPhrase("based", HEALTHY);
    phrase.modeBase = { notes: phrase.notes, context: { ...phrase.context, shape: "oops" as unknown as Shape } };
    localStorage.setItem("phrases", envelope([phrase]));
    const target = openStore();
    expect(target.findPhrase("based")!.context.shape).toEqual(HEALTHY);
    expect(target.findPhrase("based")!.modeBase!.context.shape).toEqual(NEUTRAL_SHAPE);
  });

  it("does not rewrite the stored text until an ordinary save", () => {
    const text = envelope([savedPhrase("bad", { ...HEALTHY, release: undefined })]);
    localStorage.setItem("phrases", text);
    openStore();
    expect(localStorage.getItem("phrases")).toBe(text);
  });

  it("loads a healthy phrase bit for bit as saved", () => {
    const phrase = savedPhrase("healthy", { ...HEALTHY });
    const before = JSON.stringify(phrase);
    localStorage.setItem("phrases", envelope([phrase]));
    const target = openStore();
    const loaded = target.findPhrase("healthy")!;
    expect(JSON.stringify(loaded)).toBe(before);
    expect(JSON.stringify(loaded.context.shape)).toBe(JSON.stringify(HEALTHY));
  });

  it("loads healthy envelope stages, null included, as saved", () => {
    const shape: Shape = { cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null };
    localStorage.setItem("phrases", envelope([savedPhrase("neutral", { ...shape })]));
    expect(JSON.stringify(openStore().findPhrase("neutral")!.context.shape)).toBe(JSON.stringify(shape));
  });
});

describe("a broken Shape arriving from another tab", () => {
  it.each(BAD_SHAPES)("takes in a phrase whose Shape is %s and opens it", async (_name, shape) => {
    localStorage.setItem("phrases", envelope([savedPhrase("fine", HEALTHY)]));
    const target = openStore();
    await nextTick();
    // The other tab saves a shelf holding the bad phrase; this tab hears it.
    localStorage.setItem("phrases", envelope([savedPhrase("fine", HEALTHY), savedPhrase("bad", shape)]));
    window.dispatchEvent(new StorageEvent("storage", { key: "phrases" }));
    await nextTick();
    expect(target.findPhrase("bad")).toBeTruthy();
    expectOpensSafely(target, "bad");
  });

  it("repairs a phrase this tab already holds when the other tab breaks its Shape", async () => {
    localStorage.setItem("phrases", envelope([savedPhrase("shared", HEALTHY)]));
    const target = openStore();
    await nextTick();
    localStorage.setItem("phrases", envelope([savedPhrase("shared", { ...HEALTHY, release: undefined })]));
    window.dispatchEvent(new StorageEvent("storage", { key: "phrases" }));
    await nextTick();
    expect(target.findPhrase("shared")!.context.shape).toEqual({ ...HEALTHY, release: null });
    expectOpensSafely(target, "shared");
  });
});

describe("a legacy pattern with a broken Shape", () => {
  it("is imported with a usable Shape", () => {
    const legacy = {
      ...structuredClone(defaultPatterns[0]), id: "legacy-1", isSaved: true, shape: { ...HEALTHY, attack: "NaN" },
    };
    localStorage.setItem("patterns", JSON.stringify({ savedPatterns: [legacy], loggedNotes: [] }));
    const target = openStore();
    expect(target.findPhrase("legacy-1")!.context.shape).toEqual({ ...HEALTHY, attack: null });
    expectOpensSafely(target, "legacy-1");
  });
});
