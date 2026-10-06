import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { setActivePinia } from "pinia";
import { isPrewarmed, prewarmSoundSamples } from "@/services/superdoughAudio";
import { createTestPinia } from "../helpers/test-utils";
import { libraryPhrases, usePhrasesStore } from "@/stores/phrases";
import { useLooperStore } from "@/stores/looper";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";

const START = new Date("2026-10-06T12:00:00Z").getTime();
const BAR_MS = 2000; // 120 bpm

/**
 * The transport's contract, on wall time: bar 0 is when it started, one bar
 * per BAR_MS. The real transport is covered by its own receipts.
 */
const fake = vi.hoisted(() => {
  const state = {
    startedAt: null as number | null,
    calls: [] as Array<[string, ...unknown[]]>,
    joins: new Map<string, { offsetBars: number; muted: boolean; lengthBars: number; notes: number }>(),
  };
  const transport = {
    setTempo: async (bpm: number) => { state.calls.push(["setTempo", bpm]); },
    setKeyMode: async (key: string, mode: string) => { state.calls.push(["setKeyMode", key, mode]); },
    join: async (cached: { phraseId: string; lengthBars: number; notes: number }, settings: { offsetBars: number; muted: boolean }) => {
      state.calls.push(["join", cached.phraseId, settings.offsetBars]);
      state.joins.set(cached.phraseId, { ...settings, lengthBars: cached.lengthBars, notes: cached.notes });
    },
    leave: async (id: string) => { state.calls.push(["leave", id]); state.joins.delete(id); },
    update: async (id: string, settings: object) => { state.calls.push(["update", id, settings]); },
    solo: async (id: string | null) => { state.calls.push(["solo", id]); },
    start: async () => { state.calls.push(["start"]); state.startedAt = Date.now(); },
    stop: async () => { state.calls.push(["stop"]); state.startedAt = null; state.joins.clear(); },
    dispose: async () => undefined,
    position: () => state.startedAt === null ? 0 : (Date.now() - state.startedAt) / 2000,
    eventPosition: (epochMs: number) => (epochMs - state.startedAt!) / 2000,
    setCalibrationMs: (ms: number) => { state.calls.push(["calibration", ms]); },
    getCalibrationMs: () => 0,
  };
  return { state, transport };
});

vi.mock("@/services/looperTransport", () => ({
  createLooperTransport: () => fake.transport,
  prepareLooperPhrase: async (phrase: { id: string; notes: unknown[] }, options: { lengthBars: number }) => ({
    phraseId: phrase.id, lengthBars: options.lengthBars, notes: phrase.notes.length,
  }),
}));

vi.mock("@/services/patternPlayback", () => ({
  getActivePatternEditor: () => ({}),
  getLooperPlaybackPort: () => ({ onStop: () => () => undefined }),
}));

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

type Phrases = ReturnType<typeof usePhrasesStore>;
type Looper = ReturnType<typeof useLooperStore>;

let now = START;
function at(time: number) {
  now = time;
}

/** A live note, dispatched as the music store does, so both stores hear it. */
function tap(id: string, degree: number, time: number, length = 200) {
  at(time);
  window.dispatchEvent(new CustomEvent("note-played", {
    detail: { noteId: id, noteName: "C4", solfegeIndex: degree, octave: 4, timestamp: time },
  }));
  at(time + length);
  window.dispatchEvent(new CustomEvent("note-released", { detail: { noteId: id, timestamp: time + length } }));
}

function playTake(prefix: string, from: number, notes = 3) {
  for (let index = 0; index < notes; index += 1) tap(`${prefix}-${index}`, index * 2, from + index * 500);
}

describe("Looper store: Play is the loop", () => {
  let phrases: Phrases;
  let looper: Looper;

  beforeEach(() => {
    vi.mocked(isPrewarmed).mockReturnValue(true);
    vi.mocked(prewarmSoundSamples).mockResolvedValue(undefined);
    localStorage.clear();
    now = START;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    fake.state.startedAt = null;
    fake.state.calls = [];
    fake.state.joins.clear();
    setActivePinia(createTestPinia());
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
    useMusicStore();
    phrases = usePhrasesStore();
    looper = useLooperStore();
  });

  afterEach(() => {
    looper?.dispose();
    phrases?.removeEventListeners();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("tap Play sets a played take looping from where its first note was played", async () => {
    playTake("a", START);
    const takeId = phrases.takeId;
    at(START + 3000);
    looper.togglePlay();
    expect(looper.isDeskPlaying).toBe(true);
    await looper.settled();

    expect(fake.state.calls.map(([name]) => name).filter((name) => name !== "calibration")).toEqual(["setTempo", "setKeyMode", "start", "join"]);
    // The take has been "looping since its first note", 1.5 bars before Play.
    expect(looper.looper.barOriginBars).toBeCloseTo(-1.5);
    expect(looper.memberFor(takeId)).toMatchObject({ offsetBars: 0, lengthBars: 1 });
    expect(fake.state.joins.get(takeId)?.offsetBars).toBeCloseTo(-1.5);

    looper.togglePlay();
    expect(looper.isDeskPlaying).toBe(false);
    await looper.settled();
    expect(fake.state.calls.at(-1)).toEqual(["stop"]);
  });

  it("a note played over a playing desk opens a fresh take first (rule 3)", async () => {
    playTake("a", START);
    const first = phrases.takeId;
    looper.togglePlay();
    await looper.settled();
    const notes = phrases.findPhrase(first)!.notes.length;

    tap("over", 4, START + 5000);

    expect(phrases.takeId).not.toBe(first);
    expect(phrases.takeNotes).toHaveLength(1);
    expect(phrases.findPhrase(first)!.notes).toHaveLength(notes);
    expect(looper.memberFor(first)).toBeDefined();
    expect(looper.isDeskPlaying).toBe(false);
  });

  it("a take played over the loop joins where it was played, not at bar one", async () => {
    playTake("a", START);
    at(START + 2000);
    looper.togglePlay();
    await looper.settled();
    const origin = looper.looper.barOriginBars!;

    // Played 0.75 bar into the loop's third bar.
    playTake("b", START + 2000 + 2 * BAR_MS + 0.75 * BAR_MS);
    const second = phrases.takeId;
    looper.togglePlay();
    await looper.settled();

    const pressBars = (START + 2000 + 2.75 * BAR_MS - fake.state.startedAt!) / BAR_MS;
    expect(looper.memberFor(second)!.offsetBars).toBeCloseTo(pressBars - origin);
    expect(fake.state.joins.get(second)!.offsetBars).toBeCloseTo(pressBars);
    expect(looper.memberFor(second)!.offsetBars % 1).not.toBeCloseTo(0);
  });

  it("a reel pattern joins pinned to bar one; its untouched copy stands for the source", async () => {
    playTake("a", START);
    looper.togglePlay();
    await looper.settled();
    const origin = looper.looper.barOriginBars!;

    const library = libraryPhrases[0];
    phrases.openPhrase(library.id);
    expect(phrases.deskPhraseId).toBe(library.id);
    looper.togglePlay();
    await looper.settled();

    expect(looper.memberFor(library.id)).toMatchObject({ offsetBars: 0 });
    expect(fake.state.joins.get(library.id)!.offsetBars).toBeCloseTo(origin);
    expect(looper.isDeskPlaying).toBe(true);
  });

  it("a reel pattern played first starts the clock at its own bar one", async () => {
    const library = libraryPhrases[1];
    phrases.openPhrase(library.id);
    looper.togglePlay();
    await looper.settled();

    expect(fake.state.calls.map(([name]) => name).filter((name) => name !== "calibration")).toEqual(["setTempo", "setKeyMode", "join", "start"]);
    expect(looper.looper.barOriginBars).toBe(0);
    expect(fake.state.joins.get(library.id)!.offsetBars).toBe(0);
  });

  it("latch grows the open take note by note, then closes it after a bar of silence", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    looper.toggleLatch();
    expect(looper.latched).toBe(true);

    tap("l-0", 0, START);
    const takeId = phrases.takeId;
    await nextTick();
    await looper.settled();
    expect(looper.openTakeId).toBe(takeId);
    expect(fake.state.joins.get(takeId)?.notes).toBe(1);

    tap("l-1", 2, START + 500);
    await nextTick();
    await looper.settled();
    tap("l-2", 4, START + 2500);
    await nextTick();
    await looper.settled();
    expect(fake.state.joins.get(takeId)).toMatchObject({ notes: 3, lengthBars: 2 });
    // Still the take being played: playing more does not open another.
    expect(phrases.takeId).toBe(takeId);

    at(START + 2700);
    vi.advanceTimersByTime(100);
    at(START + 2700 + BAR_MS + 50);
    vi.advanceTimersByTime(100);

    expect(looper.openTakeId).toBeNull();
    expect(phrases.takeId).not.toBe(takeId);
    expect(looper.memberFor(takeId)).toBeDefined();
    expect(phrases.findPhrase(takeId)?.shelf).toBe("recent");

    // The next thing played starts another pattern, which also joins.
    tap("m-0", 0, START + 6000);
    await nextTick();
    await looper.settled();
    expect(looper.openTakeId).toBe(phrases.takeId);
    expect(looper.members).toHaveLength(2);

    looper.toggleLatch();
    expect(looper.latched).toBe(false);
    expect(looper.openTakeId).toBeNull();
  });

  it("mute and solo reach the transport; Stop All clears the loop and the latch", async () => {
    playTake("a", START);
    const first = phrases.takeId;
    looper.togglePlay();
    await looper.settled();
    phrases.openPhrase(libraryPhrases[0].id);
    looper.togglePlay();
    await looper.settled();

    looper.toggleMute(first);
    looper.toggleSolo(libraryPhrases[0].id);
    await looper.settled();
    expect(fake.state.calls).toContainEqual(["update", first, { muted: true }]);
    expect(fake.state.calls).toContainEqual(["solo", libraryPhrases[0].id]);
    expect(looper.memberViews.map((view) => view.audible)).toEqual([false, true]);

    looper.toggleLatch();
    looper.stopAll();
    await looper.settled();
    expect(looper.members).toHaveLength(0);
    expect(looper.latched).toBe(false);
    expect(looper.running).toBe(false);
    expect(fake.state.calls.at(-1)).toEqual(["stop"]);
  });

  it("saves a Loop as pointers and opens it again from bar one", async () => {
    playTake("a", START);
    const first = phrases.takeId;
    looper.togglePlay();
    await looper.settled();
    phrases.openPhrase(libraryPhrases[0].id);
    looper.togglePlay();
    await looper.settled();

    const id = looper.saveLoop("Evening");
    expect(id).toBeTruthy();
    expect(looper.loops.map((loop) => loop.name)).toEqual(["Evening"]);
    looper.stopAll();
    await looper.settled();

    expect(looper.openLoop(id!)).toBe(true);
    await looper.settled();
    expect(looper.members.map((member) => member.phraseId)).toEqual([first, libraryPhrases[0].id]);
    expect(looper.running).toBe(true);
    expect(fake.state.joins.size).toBe(2);

    expect(looper.deleteLoop(id!)).toBe(true);
    expect(looper.loops).toHaveLength(0);
  });

  it("protects playing phrases from delete, pruning and the stray-tap floor", async () => {
    playTake("a", START, 2);
    const take = phrases.takeId;
    looper.togglePlay();
    await looper.settled();

    // Two notes is a stray tap for a fresh take; playing, it survives closing.
    tap("over", 0, START + 9000);
    expect(phrases.findPhrase(take)?.shelf).toBe("recent");
    expect(phrases.deletePhrase(take)).toBe(false);

    // Over the Recent cap, the playing phrase is kept and older ones go.
    phrases.findPhrase(take)!.closedAt = START - 1_000_000;
    for (let index = 0; index < 205; index += 1) {
      phrases.book.phrases.push({
        ...phrases.findPhrase(take)!, id: `filler-${index}`, closedAt: START + index,
      });
    }
    phrases.startBlankTake();
    expect(phrases.findPhrase(take)).toBeDefined();
    expect(phrases.book.phrases.filter((phrase) => phrase.shelf === "recent").length).toBe(201);

    looper.stopAll();
    expect(phrases.deletePhrase(take)).toBe(true);
  });

  it("bends the running loop when key, mode or tempo change", async () => {
    playTake("a", START);
    looper.togglePlay();
    await looper.settled();
    fake.state.calls = [];

    useMusicStore().setKey("D");
    useMusicStore().setMode("dorian");
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 96 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await looper.settled();

    expect(fake.state.calls).toContainEqual(["setKeyMode", "D", "dorian"]);
    expect(fake.state.calls).toContainEqual(["setTempo", 96]);
  });

  it("follows the persisted timing setting", () => {
    playTake("a", START);
    looper.togglePlay();
    useVisualConfigStore().updateDeckControl("loopTiming", 35);
    return looper.settled().then(async () => {
      useVisualConfigStore().updateDeckControl("loopTiming", 40);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fake.state.calls).toContainEqual(["calibration", 40]);
    });
  });
});
