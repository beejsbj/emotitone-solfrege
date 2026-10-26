import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { nextTick, toRaw } from "vue";
import { setActivePinia } from "pinia";
import type { LiveResponse } from "@/audio/live/types";
import type { TransportCommand, TransportResponse } from "@/audio/live/transport";

/**
 * A saved Loop is its own reel (BJS-572), observed through the deck: DOM
 * pointer events on the real PerformanceDeck and PhraseShelf, the real
 * phrases, Looper and music stores, the real pattern player and the real
 * worklet render core. The rig is the Looper suite's (looper.test.ts): only
 * the bank loader, the worklet port and the
 * AudioContext's clock are stand-ins. Live notes arrive as the app's own
 * `note-played` / `note-released` window events; the loop's notes are read
 * from the transport's own events (their audio frames).
 */
const RATE = 8000;
const QUANTUM = 128;
// The main thread's view of the audio clock runs this far behind the render
// thread, as on a device: a start read from it lands a little off its bar.
const LAG_FRAMES = 200;
const EPOCH = Date.UTC(2026, 9, 17, 12);

const rig = vi.hoisted(() => ({
  core: undefined as unknown as import("@/audio/live/core").LiveAudioCore,
  generation: 1,
  frame: 0,
  queued: [] as LiveResponse[],
  listeners: new Set<{ onTransport?(response: TransportResponse): void; onRendererReset?(): void }>(),
  gates: new Map<string, Promise<void>>(),
  prepared: [] as string[],
  /** Banks the worklet refuses (every instrument slot held). */
  refused: new Set<string>(),
  commands: [] as TransportCommand[],
  context: undefined as unknown as Record<string, unknown>,
  deliver() {
    while (rig.queued.length) {
      const response = rig.queued.shift()!;
      if (response.type === "transport-events" || response.type === "transport-applied" || response.type === "transport-anchors") {
        for (const listener of [...rig.listeners]) listener.onTransport?.(response);
        if (response.type === "transport-events") rig.core.command({ type: "transport-recycle", buffer: response.buffer }, rig.frame);
      }
    }
  },
}));

vi.mock("@/services/livePlayback", () => ({
  async prepareLivePlayback(_context: unknown, _destination: unknown, instrumentId: string) {
    await rig.gates.get(instrumentId);
    rig.prepared.push(instrumentId);
    rig.core.command({ type: "prepare", requestId: 0, instrument: { kind: "oscillator", instrumentId, waveform: "sine",
      gain: 1, attack: .001, decay: .01, sustain: .5, release: .01 } }, rig.frame);
  },
  getLiveTransport(instrumentId: string) {
    if (rig.refused.has(instrumentId)) return undefined;
    const generation = rig.generation;
    return {
      send(command: TransportCommand) {
        if (generation !== rig.generation) return;
        rig.commands.push(command);
        rig.core.command(command, rig.frame);
        rig.deliver();
      },
      sampleRate: RATE,
      generation,
    };
  },
  getLivePlaybackFailure: (instrumentId: string) => rig.refused.has(instrumentId)
    ? { kind: "fallback", reason: "budget", budget: true } : undefined,
  needsLivePlaybackPreparation: () => false,
  getLivePlayback: () => undefined,
  waitForLivePlayback: () => undefined,
  setLivePlaybackShaping: () => {},
  pinLivePlayback: () => () => {},
  subscribeLivePlayback(listener: { onTransport?(response: TransportResponse): void }) {
    rig.listeners.add(listener);
    return () => rig.listeners.delete(listener);
  },
}));
vi.mock("@/services/audioRuntime", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/audioRuntime")>(),
  getAudioContext: () => rig.context,
}));
vi.unmock("@/services/audioLifecycle");
// The mic opens without hardware: the capture records nothing until stopped.
vi.mock("@/services/microphoneCapture", () => ({
  startMicrophoneCapture: vi.fn(async () => ({ stop: async () => new Blob(), cancel: async () => {} })),
}));

import { LiveAudioCore } from "@/audio/live/core";
import { createPatternPlayer, setProductionPatternPlayer, type PatternPlayer } from "@/services/patternTransport";
import { audioTimeToOutputTime } from "@/services/liveAudioTiming";
import { UIBeatClock } from "@/composables/useUIBeat";
import { createTestPinia } from "../helpers/test-utils";
import { useLooperStore } from "@/stores/looper";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useInstrumentStore } from "@/stores/instrument";
import { mount } from "@vue/test-utils";
import PerformanceDeck from "@/components/PerformanceDeck.vue";

type Attack = { phraseId: string; memberId: string; sourceNoteId: string; frame: number; noteName: string; record: boolean };

let player: PatternPlayer;
let attacks: Attack[];
let spies: { mockRestore(): void }[] = [];
const onAttack = (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (detail?.source === "pattern-playback") attacks.push(detail);
};

function render(seconds: number) {
  const quanta = Math.round(seconds * RATE / QUANTUM);
  for (let index = 0; index < quanta; index++) {
    rig.core.render([new Float32Array(QUANTUM), new Float32Array(QUANTUM)], rig.frame);
    rig.frame += QUANTUM;
    rig.deliver();
  }
}

/** Render until `frame` (whole quanta). */
function renderTo(frame: number) {
  while (rig.frame + QUANTUM <= frame) render(QUANTUM / RATE);
}

const flush = async () => {
  for (let index = 0; index < 8; index++) await Promise.resolve();
  await nextTick();
};

let liveSerial = 0;
/**
 * A live note whose attack sounds at audio frame `onFrame`: the event is
 * dispatched then, carrying the audio clock's wall stamp and its heard time,
 * as the music store's live path does.
 */
function live(noteName: string, solfegeIndex: number, onFrame: number, offFrame: number,
  clocks: { audioTime?: boolean; heardSkewMs?: number } = {}) {
  const noteId = `live-${++liveSerial}`;
  renderTo(onFrame);
  const at = onFrame / RATE;
  const detail = { noteId, noteName, solfegeIndex, octave: Number(noteName.at(-1)), key: "C", mode: "major",
    source: "live-play-style", timestamp: EPOCH + at * 1000,
    audibleAt: audioTimeToOutputTime(rig.context as never, at) + (clocks.heardSkewMs ?? 0),
    ...(clocks.audioTime ? { audioTime: at } : {}) };
  window.dispatchEvent(new CustomEvent("note-played", { detail }));
  renderTo(offFrame);
  window.dispatchEvent(new CustomEvent("note-released", { detail: { ...detail,
    timestamp: EPOCH + offFrame / RATE * 1000 } }));
}

/** Three notes from `at` (seconds), half a second apart: a take of one bar at 120 BPM. */
function playTake(at: number, names = ["C4", "E4", "G4"]) {
  names.forEach((name, index) => {
    const on = Math.round((at + index * .5) * RATE);
    live(name, [0, 2, 4][index] ?? 0, on, on + .2 * RATE);
  });
}

const mod = (value: number, length: number) => ((value % length) + length) % length;
/** Two bar positions sound the same in a member's cycle (offsets are stored wrapped). */
function expectSamePhase(cycleBars: number, actual: number, expected: number, digits = 6) {
  const apart = mod(actual - expected + cycleBars / 2, cycleBars) - cycleBars / 2;
  expect(apart).toBeCloseTo(0, digits);
}
const cycleOf = (member: { lengthBars: number; rate: number }) => member.lengthBars / member.rate;

function setup() {
  setActivePinia(createTestPinia());
  useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
  const phrases = usePhrasesStore();
  player = createPatternPlayer({
    audio: { getContext: () => rig.context as unknown as AudioContext, ensureReady: async () => ({}) as AudioNode },
    uiBeat: new UIBeatClock({ observeEnvironment: false }),
    requestFrame: () => 1,
    cancelFrame: () => {},
  });
  setProductionPatternPlayer(player);
  const looper = useLooperStore();
  return { phrases, looper };
}

describe("a saved Loop is its own reel (BJS-572)", () => {
  beforeEach(() => {
    rig.frame = 0;
    rig.generation = 1;
    rig.queued = [];
    rig.commands = [];
    rig.gates.clear();
    rig.prepared = [];
    rig.refused.clear();
    rig.core = new LiveAudioCore(RATE, (response) => { rig.queued.push(response); });
    rig.context = {
      state: "running",
      sampleRate: RATE,
      get currentTime() { return Math.max(0, rig.frame - LAG_FRAMES) / RATE; },
      baseLatency: 0,
      outputLatency: 0,
      resume: vi.fn(async () => {}),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    attacks = [];
    liveSerial = 0;
    localStorage.clear();
    spies = [
      vi.spyOn(performance, "now").mockImplementation(() => 1000 + rig.frame / RATE * 1000),
      vi.spyOn(Date, "now").mockImplementation(() => EPOCH + rig.frame / RATE * 1000),
    ];
    window.addEventListener("note-played", onAttack);
  });

  afterEach(() => {
    window.removeEventListener("note-played", onAttack);
    useLooperStore().dispose();
    usePhrasesStore().removeEventListeners();
    player.dispose();
    setProductionPatternPlayer(undefined);
    rig.listeners.clear();
    for (const spy of spies) spy.mockRestore();
  });

  // The test DOM has no pointer capture; the reel and the switch both use it.
  const capture = new WeakMap<Element, Set<number>>();
  const captured = (element: Element) => capture.get(element) ?? capture.set(element, new Set()).get(element)!;
  beforeAll(() => {
    Object.defineProperties(Element.prototype, {
      setPointerCapture: { configurable: true, value(this: Element, id: number) { captured(this).add(id); } },
      releasePointerCapture: { configurable: true, value(this: Element, id: number) { captured(this).delete(id); } },
      hasPointerCapture: { configurable: true, value(this: Element, id: number) { return captured(this).has(id); } },
    });
  });
  afterAll(() => {
    const prototype = Element.prototype as unknown as Record<string, unknown>;
    for (const name of ["setPointerCapture", "releasePointerCapture", "hasPointerCapture"]) delete prototype[name];
  });

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const BLANK = "phrase-shelf-blank";

  function mountDeck() {
    // The app boots the engine before the deck shows.
    useInstrumentStore().engineBooted = true;
    return mount(PerformanceDeck, {
      attachTo: document.body,
      global: { stubs: { Keyboard: true, ControlBar: true, HummingCaptureTransport: true, CodeStrip: true } },
    });
  }
  type Deck = ReturnType<typeof mountDeck>;

  async function press(element: Element, holdMs = 30) {
    const options = { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true };
    element.dispatchEvent(new PointerEvent("pointerdown", options));
    await wait(holdMs);
    element.dispatchEvent(new PointerEvent("pointerup", options));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    await flush();
  }

  /**
   * A touch across the reel strip, from (x, y) to (x2, y2) over `ms`, in four
   * moves. The page clock is held at the gesture's own times, then handed back
   * to the audio rig.
   */
  async function drag(deck: Deck, x: number, x2: number, { ms = 400, y = 600, y2 = y } = {}) {
    const strip = deck.get(".reel-switch .pattern-reel__slot--active .pattern-strip__identity").element;
    const now = performance.now as unknown as Mock<() => number>;
    const rigged = now.getMockImplementation()!;
    const t0 = 5_000_000;
    const at = (type: string, step: number) => {
      now.mockImplementation(() => t0 + ms * step / 4);
      strip.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 9, pointerType: "touch", isPrimary: true,
        clientX: x + (x2 - x) * step / 4, clientY: y + (y2 - y) * step / 4,
      }));
    };
    try {
      at("pointerdown", 0);
      for (const step of [1, 2, 3, 4]) at("pointermove", step);
      at("pointerup", 4);
    } finally {
      now.mockImplementation(rigged);
    }
    await flush();
  }

  const play = (deck: Deck) => deck.get(".code-strip-bar__play");
  const shownIds = (deck: Deck) => deck.findAll(".pattern-reel__slot").map((slot) => slot.attributes("data-pattern-id"));
  const pips = (deck: Deck) => deck.findAll("[data-reel-pip]");
  const transportIds = () => player.getLooper().members.map((member) => member.id);
  const startCount = () => rig.commands.filter((command) => command.type === "transport-start").length;

  /** Two patterns looping from the deck's Play key: a take, and one played over it. */
  async function twoLooping(deck: Deck) {
    const phrases = usePhrasesStore();
    const looper = useLooperStore();
    playTake(.5);
    const first = phrases.take.id;
    await press(play(deck).element, 40);
    await looper.settled();
    render(1);
    // Played over the loop: rule 3 opens a fresh take, which Play joins where it was played.
    playTake(rig.frame / RATE + .3, ["A4", "B4", "D5"]);
    await flush();
    const second = phrases.take.id;
    expect(second).not.toBe(first);
    await press(play(deck).element, 40);
    await looper.settled();
    await flush();
    expect(transportIds()).toEqual([first, second]);
    return { first, second };
  }

  /** Save the two as a Loop from the dial column's key. */
  async function saveFromDeck(deck: Deck) {
    await press(deck.get("[data-testid=looper-save-loop]").element);
    return usePhrasesStore().book.loops.at(-1)!;
  }

  /** Each member's first note sounds on its saved place: bar one (`origin`) plus its offset, every cycle. */
  function expectInPlace(heard: Attack[], members: { phraseId: string; offsetBars: number; lengthBars: number; rate: number }[], origin: number) {
    const phrases = usePhrasesStore();
    for (const member of members) {
      const firstNote = phrases.findPhrase(member.phraseId)!.notes[0].id;
      const onsets = heard.filter((attack) => attack.phraseId === member.phraseId && attack.sourceNoteId === firstNote);
      expect(onsets.length).toBeGreaterThan(0);
      for (const onset of onsets) {
        expectSamePhase(cycleOf(member), player.barAtAudioTime(onset.frame / RATE)!, origin + member.offsetBars, 3);
      }
    }
  }

  it("saving: two patterns playing can be kept as a Loop, whose reel is a sideways swipe from home", async () => {
    const { phrases, looper } = setup();
    const deck = mountDeck();
    try {
      expect(deck.find("[data-testid=looper-save-loop]").exists()).toBe(false);
      expect(deck.find("[data-testid=reel-pips]").exists()).toBe(false);
      const { first, second } = await twoLooping(deck);
      const playing = looper.looper.members.map((member) => ({ ...member }));
      const loop = await saveFromDeck(deck);
      expect(phrases.book.loops).toHaveLength(1);
      expect(loop).toMatchObject({ name: "Loop 1", members: playing });
      // Saved once: the same set offers no second save, and both play on.
      expect(deck.find("[data-testid=looper-save-loop]").exists()).toBe(false);
      expect(transportIds()).toEqual([first, second]);
      // The take that went into the Loop is filed: the desk is a new, empty take.
      expect(phrases.takeId).not.toBe(second);
      expect(phrases.take.notes).toEqual([]);
      // A pip per reel, home's lit; the Loop is sounding, so its pip wears the Brass ring.
      expect(pips(deck).map((pip) => pip.attributes("data-reel-pip"))).toEqual(["home", loop.id]);
      expect(pips(deck)[0].classes()).toContain("reel-switch__pip--active");
      expect(pips(deck)[1].classes()).toContain("reel-switch__pip--sounding");
      const homeIds = shownIds(deck);
      expect(homeIds.length).toBeGreaterThan(3);

      // A vertical drag, and a short slow sideways one, stay on the home reel.
      await drag(deck, 200, 200, { y2: 520 });
      await drag(deck, 300, 250, { ms: 800 });
      expect(looper.reelLoopId).toBeNull();

      // A swipe to the left turns to the Loop's reel: only its patterns, then the front.
      await drag(deck, 320, 40);
      expect(looper.reelLoopId).toBe(loop.id);
      expect(pips(deck)[1].classes()).toContain("reel-switch__pip--active");
      expect(shownIds(deck)).toEqual([first, second, BLANK]);
      expect(deck.findAll(".pattern-strip__shelf").map((tag) => tag.text())).toEqual(["Loop 1", "Loop 1"]);
      // Turning reels touched nothing that plays.
      expect(transportIds()).toEqual([first, second]);

      // A swipe to the right turns back home, where it was.
      await drag(deck, 40, 320);
      expect(looper.reelLoopId).toBeNull();
      expect(shownIds(deck)).toEqual(homeIds);

      // The dial's flick off the left edge still removes its pattern, and turns no reel.
      const dial = deck.get(`button.looper-dial[data-phrase-id="${first}"]`).element;
      const point = (type: string, clientX: number) => dial.dispatchEvent(new PointerEvent(type,
        { bubbles: true, cancelable: true, pointerId: 5, pointerType: "touch", clientX, clientY: 100 }));
      point("pointerdown", 28);
      point("pointermove", 14);
      point("pointermove", 0);
      point("pointerup", 0);
      (dial as HTMLElement).click();
      await flush();
      expect(transportIds()).toEqual([second]);
      expect(looper.reelLoopId).toBeNull();
      expect(pips(deck)[1].classes()).not.toContain("reel-switch__pip--sounding");
    } finally {
      deck.unmount();
    }
  });

  it("Play on a Loop's reel starts its patterns from bar one in their saved places, and stops them together", async () => {
    const { phrases, looper } = setup();
    const deck = mountDeck();
    try {
      await twoLooping(deck);
      const loop = await saveFromDeck(deck);
      const saved = loop.members.map((member) => ({ ...member }));
      expect(saved[1].offsetBars).not.toBe(0);
      await press(deck.get("[data-testid=looper-stop-all]").element);
      expect(player.getLooper().running).toBe(false);
      await drag(deck, 320, 40);
      expect(play(deck).attributes("aria-label")).toBe("Play");

      const starts = startCount();
      const from = attacks.length;
      await press(play(deck).element, 40);
      await looper.settled();
      await flush();
      expect(startCount()).toBe(starts + 1);
      expect(looper.looper.members).toEqual(saved);
      expect(looper.looper.barOriginBars).toBe(0);
      expect(player.getLooper().members).toEqual(expect.arrayContaining(saved.map((member) =>
        expect.objectContaining({ id: member.phraseId, offsetBars: member.offsetBars }))));
      expect(play(deck).attributes("aria-label")).toBe("Stop");
      render(4);
      expectInPlace(attacks.slice(from), saved, 0);

      // Play again: the Loop's patterns stop together.
      await press(play(deck).element, 40);
      expect(looper.members).toEqual([]);
      expect(player.getLooper().running).toBe(false);
      expect(play(deck).attributes("aria-label")).toBe("Play");
      expect(phrases.book.loops[0].members).toEqual(saved);
    } finally {
      deck.unmount();
    }
  });

  it("over a pattern already looping, the Loop's Play brings its patterns in on the running grid's bar lines", async () => {
    const { phrases, looper } = setup();
    const deck = mountDeck();
    try {
      const { first, second } = await twoLooping(deck);
      const loop = await saveFromDeck(deck);
      const saved = loop.members.map((member) => ({ ...member }));
      await press(deck.get("[data-testid=looper-stop-all]").element);
      // A third pattern, from the home reel, loops on its own.
      playTake(rig.frame / RATE + .4, ["E4", "G4", "C5"]);
      const third = phrases.take.id;
      await press(play(deck).element, 40);
      await looper.settled();
      render(1.3);
      const origin = looper.looper.barOriginBars!;
      const starts = startCount();

      await drag(deck, 320, 40);
      const from = attacks.length;
      await press(play(deck).element, 40);
      await flush();
      await flush();
      // One clock: no second start, and the Loop's patterns join it.
      expect(startCount()).toBe(starts);
      expect(looper.members.map((member) => member.phraseId)).toEqual([third, first, second]);
      expect(player.getLooper().members).toEqual(expect.arrayContaining(saved.map((member) =>
        expect.objectContaining({ id: member.phraseId, offsetBars: expect.closeTo(origin + member.offsetBars, 9) }))));
      render(4);
      expectInPlace(attacks.slice(from), saved, origin);

      // Play again on its reel: the Loop's patterns leave, and the third plays on.
      await press(play(deck).element, 40);
      expect(looper.members.map((member) => member.phraseId)).toEqual([third]);
      expect(transportIds()).toEqual([third]);
    } finally {
      deck.unmount();
    }
  });

  it("editing: a take played over a Loop's pattern replaces it in the Loop as a pointer swap, in its place", async () => {
    const { phrases, looper } = setup();
    const deck = mountDeck();
    try {
      const { first, second } = await twoLooping(deck);
      const loop = await saveFromDeck(deck);
      const place = loop.members[0].offsetBars;
      await drag(deck, 320, 40);
      // Bring the Loop's first pattern to the desk on its reel.
      await deck.get(".pattern-reel").trigger("keydown", { key: "Home" });
      await flush();
      expect(phrases.deskPhraseId).toBe(first);
      const original = structuredClone(toRaw(phrases.findPhrase(first)!.notes));

      // Played over it (it is playing, and it is the Loop's): a new take opens on top.
      playTake(rig.frame / RATE + .2, ["F4", "A4", "C5"]);
      await flush();
      const edit = phrases.take.id;
      expect(edit).not.toBe(first);
      expect(phrases.findPhrase(first)!.notes).toEqual(original);
      expect(phrases.take.notes.map((note) => note.note)).toEqual(["F4", "A4", "C5"]);
      // The new take sits at the reel's front, offering to replace the pattern it was played over.
      expect(shownIds(deck)).toEqual([first, second, edit]);
      const replace = deck.get(".pattern-reel__slot--active [data-action=replace]");
      expect(replace.attributes("aria-label")).toMatch(/^Replace Take 1 in Loop 1 with Take \d+$/);
      // The new take's entrance settles first (the reel holds its keys while it
      // moves), and the clock moves on: Vue ignores an event stamped no later
      // than its listener, and the rig's clock only moves as audio renders.
      await wait(300);
      render(.1);
      await press(deck.get(".pattern-reel__slot--active [data-action=replace]").element);
      await flush();

      // The pointer swapped; the replaced pattern is unchanged and still on its shelf.
      expect(phrases.book.loops[0].members.map((member) => member.phraseId)).toEqual([edit, second]);
      expect(phrases.book.loops[0].members[0].offsetBars).toBe(place);
      expect(phrases.findPhrase(first)).toMatchObject({ shelf: "recent", notes: original });
      // The transport swapped them too: the edit sounds in the first's place.
      expect(transportIds()).toEqual([second, edit]);
      const origin = looper.looper.barOriginBars!;
      expect(player.getLooper().members.find((member) => member.id === edit)!.offsetBars).toBeCloseTo(origin + place, 9);
      const from = attacks.length;
      render(4);
      expectInPlace(attacks.slice(from), [phrases.book.loops[0].members[0]], origin);
      expect(attacks.slice(from).some((attack) => attack.phraseId === first)).toBe(false);
      // The take it was is filed: nothing more is written into the Loop's pattern.
      expect(phrases.takeId).not.toBe(edit);
      expect(phrases.take.notes).toEqual([]);
      expect(shownIds(deck)).toEqual([edit, second, BLANK]);

      // The Loop's protection moved with its pointer.
      looper.stopAll();
      await flush();
      expect(phrases.releaseCandidates.map((phrase) => phrase.id)).not.toContain(edit);
      expect(phrases.releaseCandidates.map((phrase) => phrase.id)).toContain(first);
      expect(phrases.deletePhrase(edit)).toBe(false);
      expect(phrases.deletePhrase(first)).toBe(true);
    } finally {
      deck.unmount();
    }
  });

  it("a Loop's pattern is read-only on its reel even with nothing playing", async () => {
    const { phrases, looper } = setup();
    const deck = mountDeck();
    try {
      const { first } = await twoLooping(deck);
      await saveFromDeck(deck);
      await press(deck.get("[data-testid=looper-stop-all]").element);
      await drag(deck, 320, 40);
      await deck.get(".pattern-reel").trigger("keydown", { key: "Home" });
      await flush();
      expect(phrases.deskPhraseId).toBe(first);
      expect(looper.isDeskPlaying).toBe(false);
      const original = structuredClone(toRaw(phrases.findPhrase(first)!.notes));
      playTake(rig.frame / RATE + .2, ["D4", "F4"]);
      await flush();
      expect(phrases.takeId).not.toBe(first);
      expect(phrases.findPhrase(first)!.notes).toEqual(original);
      expect(phrases.take.notes.map((note) => note.note)).toEqual(["D4", "F4"]);
      expect(deck.find(".pattern-reel__slot--active [data-action=replace]").exists()).toBe(true);
    } finally {
      deck.unmount();
    }
  });
});

