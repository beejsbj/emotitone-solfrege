import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { setActivePinia } from "pinia";
import type { LiveResponse } from "@/audio/live/types";
import type { TransportCommand, TransportResponse } from "@/audio/live/transport";

/**
 * Play is the loop (BJS-493), observed at the store seam: the real phrases,
 * music and visual-config stores, the real pattern player and the real
 * worklet render core. Only the bank loader, the worklet port and the
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
const FRAMES_PER_BAR = 4 * 60 * RATE / 120;

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
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useLoopTimingStore } from "@/stores/performanceSettings";
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

const attacksOf = (phraseId: string) => attacks.filter((attack) => attack.phraseId === phraseId);
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

describe("Play is the loop on the worklet transport", () => {
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

  it("rule 1: Play loops a played take from its own first note, and Play again stops it", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    const take = phrases.take;
    render(2);
    looper.togglePlay();
    await flush();
    await looper.settled();
    expect(looper.isDeskPlaying).toBe(true);
    expect(player.getLooper()).toMatchObject({ running: true, bpm: 120 });
    // Bar one is where the take's first note was played (the run started a
    // little off it, read from a lagging clock; the tempo map corrects it).
    const origin = player.barAtAudioTime(.5)!;
    expect(Math.abs(origin)).toBeLessThan(.02);
    expect(looper.looper.barOriginBars).toBeCloseTo(origin, 9);
    expect(player.getLooper().members[0].offsetBars).toBeCloseTo(origin, 9);
    render(4);
    const heard = attacksOf(take.id);
    expect(heard.length).toBeGreaterThanOrEqual(6);
    const firstNote = take.notes[0].id;
    for (const attack of heard) {
      const expected = attack.sourceNoteId === firstNote ? .5 : attack.sourceNoteId === take.notes[1].id ? 1 : 1.5;
      expect(Math.abs(mod(attack.frame - expected * RATE, FRAMES_PER_BAR))).toBeLessThanOrEqual(1);
    }

    looper.togglePlay();
    await flush();
    expect(looper.isDeskPlaying).toBe(false);
    expect(looper.members).toEqual([]);
    expect(player.getLooper().running).toBe(false);
    const count = attacks.length;
    render(2);
    expect(attacks.length).toBe(count);
  });

  it("rule 2: a pattern from the reel joins in phase, pinned to bar one, on the running clock", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    const first = phrases.take.id;
    phrases.keepTake();
    playTake(4, ["A4", "B4", "D5"]);
    const second = phrases.take.id;
    const keptSecond = phrases.keepTake()!;
    expect(keptSecond).toBe(second);
    // The first: a Kept pattern opened on the desk (a copy that stands for its source).
    phrases.openPhrase(first);
    expect(phrases.deskPhraseId).toBe(first);
    looper.togglePlay();
    await flush();
    await looper.settled();
    const run = player.getLooper();
    expect(run.members.map((member) => member.id)).toEqual([first]);
    render(3.1);
    const starts = rig.commands.filter((command) => command.type === "transport-start").length;

    phrases.openPhrase(second);
    looper.togglePlay();
    await flush();
    expect(looper.members.map((member) => member.phraseId)).toEqual([first, second]);
    expect(looper.memberFor(second)).toMatchObject({ offsetBars: 0, lengthBars: 1 });
    render(4);
    // One clock: no second start, and both sound, each on its own place in the bar.
    expect(rig.commands.filter((command) => command.type === "transport-start")).toHaveLength(starts);
    const secondAttacks = attacksOf(second);
    expect(secondAttacks.length).toBeGreaterThanOrEqual(3);
    // Pinned to bar one: its first note is on a bar line of the first pattern's grid.
    const firstOnset = attacksOf(first).find((attack) => attack.sourceNoteId === phrases.findPhrase(first)!.notes[0].id)!;
    const secondOnset = secondAttacks.find((attack) => attack.sourceNoteId === phrases.findPhrase(second)!.notes[0].id)!;
    expect(Math.abs(mod(secondOnset.frame - firstOnset.frame, FRAMES_PER_BAR))).toBeLessThanOrEqual(1);
  });

  it.each([0, 20, -20])("rule 3: a take played over the loop opens fresh, and joins where it was played (calibration %i ms)", async (calibration) => {
    const { phrases, looper } = setup();
    useLoopTimingStore().value = calibration;
    playTake(.5);
    const first = phrases.take;
    const firstNotes = first.notes.map((note) => ({ ...note }));
    looper.togglePlay();
    await flush();
    await looper.settled();
    render(1.3);
    // Played over its own loop: the desk's pattern is read-only.
    const onFrame = Math.round(5.3 * RATE);
    live("F4", 3, onFrame, onFrame + 800);
    live("A4", 5, onFrame + 2400, onFrame + 3200);
    const overdub = phrases.take;
    expect(overdub.id).not.toBe(first.id);
    expect(phrases.findPhrase(first.id)!.notes).toEqual(firstNotes);
    expect(overdub.notes.map((note) => note.note)).toEqual(["F4", "A4"]);

    looper.togglePlay();
    await flush();
    expect(looper.members.map((member) => member.phraseId)).toEqual([first.id, overdub.id]);
    // The oracle: the bar the attack sounded on, minus this device's calibration.
    const barOf = (frame: number) => player.barAtAudioTime(frame / RATE)!;
    const expected = barOf(onFrame) - calibration / 2000;
    const member = looper.memberFor(overdub.id)!;
    expectSamePhase(cycleOf(member), member.offsetBars + looper.looper.barOriginBars!, expected);
    render(6);
    const calibrationFrames = calibration / 1000 * RATE;
    const back = attacksOf(overdub.id).filter((attack) => attack.sourceNoteId === overdub.notes[0].id);
    expect(back.length).toBeGreaterThanOrEqual(2);
    for (const attack of back) {
      expect(Math.abs(mod(attack.frame - (onFrame - calibrationFrames) + 1, FRAMES_PER_BAR) - 1)).toBeLessThanOrEqual(1);
    }
  });

  it("latched during an engine restart: the take waits unjoined, and Play then really rejoins it", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    looper.togglePlay();
    await flush();
    await looper.settled();
    render(1.3);
    let restored!: () => void;
    for (const instrument of rig.prepared) rig.gates.set(instrument, new Promise<void>((resolve) => { restored = resolve; }));
    rig.generation++;
    for (const listener of [...rig.listeners]) listener.onRendererReset?.();
    await flush();
    looper.toggleLatch();
    const onFrame = Math.round(5.3 * RATE);
    live("F4", 3, onFrame, onFrame + 800);
    await flush();
    const take = phrases.take.id;
    expect(looper.members.map((member) => member.phraseId)).not.toContain(take);
    expect(looper.lastError).toBe("Audio restarted. Tap Play again.");
    // The engine comes back; the advice holds: Play joins the take where it was played.
    for (const instrument of [...rig.gates.keys()]) rig.gates.delete(instrument);
    restored();
    await flush();
    await vi.waitFor(() => expect(player.getLooper().recovering).toBe(false));
    looper.togglePlay();
    await flush();
    expect(looper.members.map((member) => member.phraseId)).toContain(take);
    expect(player.getLooper().members.map((member) => member.id)).toContain(take);
  });

  it("keeps a take played while the engine restarts unjoined, and says so, instead of placing it at bar one", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    looper.togglePlay();
    await flush();
    await looper.settled();
    render(1.3);
    // The renderer is rebuilt; its banks are slow to come back.
    let restored!: () => void;
    for (const instrument of rig.prepared) rig.gates.set(instrument, new Promise<void>((resolve) => { restored = resolve; }));
    rig.generation++;
    for (const listener of [...rig.listeners]) listener.onRendererReset?.();
    await flush();
    expect(player.getLooper().recovering).toBe(true);
    const onFrame = Math.round(5.3 * RATE);
    live("F4", 3, onFrame, onFrame + 800);
    live("A4", 5, onFrame + 2400, onFrame + 3200);
    const overdub = phrases.take;
    looper.togglePlay();
    await flush();
    expect(looper.members.map((member) => member.phraseId)).not.toContain(overdub.id);
    expect(player.getLooper().members.map((member) => member.id)).not.toContain(overdub.id);
    expect(looper.lastError).toBe("Audio restarted. Tap Play again.");
    expect(phrases.findPhrase(overdub.id)?.notes).toHaveLength(2);
    restored();
  });

  it("places a take by its attacks' own audio time when the live path sends it", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    looper.togglePlay();
    await flush();
    await looper.settled();
    render(1.3);
    // The heard estimate is 300 ms off (a bad latency report); the audio time is exact.
    const onFrame = Math.round(5.3 * RATE);
    live("F4", 3, onFrame, onFrame + 800, { audioTime: true, heardSkewMs: 300 });
    live("A4", 5, onFrame + 2400, onFrame + 3200, { audioTime: true, heardSkewMs: 300 });
    const overdub = phrases.take;
    looper.togglePlay();
    await flush();
    const member = looper.memberFor(overdub.id)!;
    expectSamePhase(cycleOf(member), member.offsetBars + looper.looper.barOriginBars!, player.barAtAudioTime(onFrame / RATE)!);
  });

  it("rule 4: a saved Loop is pointers, and opening it sets its patterns playing as they sat", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    const first = phrases.take.id;
    looper.togglePlay();
    await flush();
    await looper.settled();
    render(1.3);
    live("F4", 3, Math.round(5.3 * RATE), Math.round(5.4 * RATE));
    live("A4", 5, Math.round(5.6 * RATE), Math.round(5.7 * RATE));
    live("C5", 0, Math.round(5.9 * RATE), Math.round(6 * RATE));
    const second = phrases.take.id;
    looper.togglePlay();
    await flush();
    looper.toggleMute(first);
    const saved = looper.looper.members.map((member) => ({ ...member }));
    const id = looper.saveLoop("Two")!;
    expect(phrases.book.loops[0].members).toEqual(saved);
    expect(phrases.book.loops[0].members[0]).not.toHaveProperty("notes");

    looper.stopAll();
    await flush();
    expect(player.getLooper().running).toBe(false);
    expect(looper.openLoop(id)).toBe(true);
    await flush();
    await looper.settled();
    expect(looper.looper.members).toEqual(saved);
    expect(player.getLooper().members).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: first, muted: true }),
      expect.objectContaining({ id: second, muted: false, offsetBars: saved[1].offsetBars + looper.looper.barOriginBars! }),
    ]));
    render(4);
    expect(attacksOf(second).length).toBeGreaterThan(0);
  });

  it.each([false, true])("never records the loop's own notes into the book over eight bars (overdub; latched %s)", async (latched) => {
    const { phrases, looper } = setup();
    playTake(.5);
    looper.togglePlay();
    await flush();
    await looper.settled();
    phrases.startBlankTake();
    // Latched, the recorder's lastLiveNoteId watch is live: still nothing may land.
    if (latched) looper.toggleLatch();
    const before = JSON.stringify(phrases.book);
    for (let bar = 0; bar < 8; bar++) {
      render(2);
      await flush();
      looper.checkLatch();
    }
    expect(attacks.length).toBeGreaterThanOrEqual(24);
    expect(attacks.every((attack) => attack.record === false)).toBe(true);
    // The whole book, recorder included (its live ids and last release drive take boundaries).
    expect(JSON.stringify(phrases.book)).toBe(before);
    expect(phrases.takeNotes).toEqual([]);
    expect(looper.members).toHaveLength(1);
  });

  it("latch: held Play joins each note as it lands; a silent bar closes the take and the next note opens another", async () => {
    const { phrases, looper } = setup();
    looper.toggleLatch();
    expect(looper.latched).toBe(true);
    live("C4", 0, 4000, 5600);
    await flush();
    await looper.settled();
    const open = phrases.take.id;
    expect(looper.openTakeId).toBe(open);
    expect(player.getLooper().running).toBe(true);
    // The latch's take is not the desk "playing": Play still reads as Play.
    expect(looper.isDeskPlaying).toBe(false);
    live("E4", 2, 8000, 9600);
    await flush();
    render(.5);
    const latest = player.getLooper().members.find((member) => member.id === open)!;
    const tables = rig.commands.filter((command) => command.type === "transport-change").length;
    expect(tables).toBeGreaterThanOrEqual(2);
    expect(latest.loading).toBe(false);
    // Half a bar of quiet is not a bar, even if the wall clock has drifted
    // from the audio clock the note stamps are on.
    spies[1].mockRestore();
    spies[1] = vi.spyOn(Date, "now").mockImplementation(() => EPOCH + rig.frame / RATE * 1000 + 10_000);
    looper.checkLatch();
    expect(phrases.take.id).toBe(open);
    render(2.5);
    expect(new Set(attacksOf(open).map((attack) => attack.noteName))).toEqual(new Set(["C4", "E4"]));

    // A bar of silence closes it; it keeps playing from Recent.
    looper.checkLatch();
    expect(phrases.take.id).not.toBe(open);
    expect(phrases.findPhrase(open)?.shelf).toBe("recent");
    expect(looper.members.map((member) => member.phraseId)).toEqual([open]);
    live("G4", 4, rig.frame + 400, rig.frame + 1600);
    await flush();
    const next = phrases.take.id;
    expect(looper.openTakeId).toBe(next);
    expect(looper.members.map((member) => member.phraseId)).toEqual([open, next]);

    looper.toggleLatch();
    expect(looper.latched).toBe(false);
    expect(looper.openTakeId).toBeNull();
  });

  describe("a cold Play cancelled before its bank loads starts nothing (carried note 1)", () => {
    function cold(instrument: string) {
      let release!: () => void;
      rig.gates.set(instrument, new Promise<void>((resolve) => { release = resolve; }));
      return () => { release(); rig.gates.delete(instrument); };
    }

    async function keptOn(phrases: ReturnType<typeof usePhrasesStore>, instrument: string, at: number) {
      playTake(at);
      const id = phrases.keepTake()!;
      phrases.findPhrase(id)!.context.instrument = instrument;
      return id;
    }

    it("after Stop", async () => {
      const { phrases, looper } = setup();
      const id = await keptOn(phrases, "sawtooth", .5);
      phrases.openPhrase(id);
      const release = cold("sawtooth");
      looper.togglePlay();
      await flush();
      looper.stopAll();
      release();
      await flush();
      await looper.settled();
      render(3);
      expect(player.getLooper().running).toBe(false);
      expect(looper.members).toEqual([]);
      expect(attacks).toEqual([]);
    });

    it("after Stop, even when the player finishes its start anyway (the store's own guard)", async () => {
      const { phrases, looper } = setup();
      const id = await keptOn(phrases, "sawtooth", .5);
      phrases.openPhrase(id);
      const release = cold("sawtooth");
      // A player that ignores Stop: only the store's session epoch can drop its start.
      vi.spyOn(player, "stop").mockImplementation(() => {});
      looper.togglePlay();
      await flush();
      looper.stopAll();
      release();
      await vi.waitFor(() => expect(rig.commands.some((command) => command.type === "transport-start")).toBe(true));
      await flush();
      expect(looper.running).toBe(false);
      expect(looper.members).toEqual([]);
      expect(looper.deskMemberId).toBeNull();
      expect(looper.isDeskPlaying).toBe(false);
    });

    it("after the Code Strip unmounts (the player is released)", async () => {
      const { phrases, looper } = setup();
      const id = await keptOn(phrases, "sawtooth", .5);
      phrases.openPhrase(id);
      const release = cold("sawtooth");
      looper.togglePlay();
      await flush();
      player.dispose();
      setProductionPatternPlayer(undefined);
      release();
      await flush();
      render(3);
      expect(looper.members).toEqual([]);
      expect(looper.running).toBe(false);
      expect(attacks).toEqual([]);
    });

    it("after a new Play request (Stop, then another pattern)", async () => {
      const { phrases, looper } = setup();
      const coldId = await keptOn(phrases, "sawtooth", .5);
      const warmId = await keptOn(phrases, "triangle", 2);
      phrases.openPhrase(coldId);
      const release = cold("sawtooth");
      looper.togglePlay();
      await flush();
      looper.togglePlay();
      phrases.openPhrase(warmId);
      looper.togglePlay();
      await flush();
      await looper.settled();
      release();
      await flush();
      render(3);
      expect(looper.members.map((member) => member.phraseId)).toEqual([warmId]);
      expect(player.getLooper().members.map((member) => member.id)).toEqual([warmId]);
      expect(attacksOf(coldId)).toEqual([]);
      expect(attacksOf(warmId).length).toBeGreaterThan(0);
    });

    it("for a join into a running loop, left before its bank loads", async () => {
      const { phrases, looper } = setup();
      const warmId = await keptOn(phrases, "triangle", .5);
      const coldId = await keptOn(phrases, "sawtooth", 2);
      phrases.openPhrase(warmId);
      looper.togglePlay();
      await flush();
      await looper.settled();
      phrases.openPhrase(coldId);
      const release = cold("sawtooth");
      looper.togglePlay();
      await flush();
      looper.togglePlay();
      release();
      await flush();
      render(3);
      expect(looper.members.map((member) => member.phraseId)).toEqual([warmId]);
      expect(player.getLooper().members.map((member) => member.id)).toEqual([warmId]);
      expect(attacksOf(coldId)).toEqual([]);
    });
  });

  it("mutes, solos and bends through the transport; Stop All clears the latch", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    const id = phrases.take.id;
    looper.togglePlay();
    await flush();
    await looper.settled();
    looper.toggleMute(id);
    await flush();
    expect(player.getLooper().members[0]).toMatchObject({ id, muted: true });
    looper.toggleSolo(id);
    expect(player.getLooper().soloId).toBe(id);
    useMusicStore().setKey("D");
    await flush();
    expect(player.getLooper().target).toEqual({ key: "D", mode: "major" });
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 90 });
    await flush();
    expect(player.getLooper().bpm).toBe(90);
    looper.toggleLatch();
    looper.stopAll();
    expect(looper.latched).toBe(false);
    expect(player.getLooper().running).toBe(false);
  });

  it("a dial turned while the first start's banks load reaches the transport once they do", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    const id = phrases.keepTake()!;
    phrases.findPhrase(id)!.context.instrument = "sawtooth";
    phrases.openPhrase(id);
    let release!: () => void;
    rig.gates.set("sawtooth", new Promise<void>((resolve) => { release = resolve; }));
    looper.togglePlay();
    await flush();
    // Cold: the dial shows and is turned a beat, then muted, before anything runs.
    expect(player.getLooper().running).toBe(false);
    looper.shiftMember(id, 1);
    looper.toggleMute(id);
    release();
    rig.gates.delete("sawtooth");
    await flush();
    await looper.settled();
    await flush();
    const member = looper.memberFor(id)!;
    expect(member.offsetBars).toBeCloseTo(.25, 9);
    expect(player.getLooper().members[0]).toMatchObject({ id, muted: true });
    expect(player.getLooper().members[0].offsetBars).toBeCloseTo(looper.looper.barOriginBars! + .25, 9);
  });

  it("keeps a turned pattern's offset within its own cycle, however far it is turned", async () => {
    const { phrases, looper } = setup();
    playTake(.5);
    const id = phrases.take.id;
    looper.togglePlay();
    await flush();
    await looper.settled();
    const member = looper.memberFor(id)!;
    const cycle = cycleOf(member);
    for (let turn = 0; turn < 40; turn++) looper.shiftMember(id, 3);
    await flush();
    expect(member.offsetBars).toBeGreaterThanOrEqual(0);
    expect(member.offsetBars).toBeLessThan(cycle);
    // 120 beats later sounds where 120 beats would put it.
    expectSamePhase(cycle, member.offsetBars, 120 / 4, 9);
    for (let turn = 0; turn < 40; turn++) looper.shiftMember(id, -5);
    await flush();
    expect(member.offsetBars).toBeGreaterThanOrEqual(0);
    expect(member.offsetBars).toBeLessThan(cycle);
    expectSamePhase(cycle, member.offsetBars, (120 - 200) / 4, 9);
    expect(player.getLooper().members[0].offsetBars).toBeCloseTo(looper.looper.barOriginBars! + member.offsetBars, 9);
  });

  it("protects a playing take: it cannot be deleted, and a short one is kept when it closes", async () => {
    const { phrases, looper } = setup();
    live("C4", 0, 4000, 5000);
    const id = phrases.take.id;
    looper.togglePlay();
    await flush();
    await looper.settled();
    phrases.startBlankTake();
    expect(phrases.findPhrase(id)?.shelf).toBe("recent");
    expect(phrases.deletePhrase(id)).toBe(false);
    looper.togglePlay();
  });

  describe("a looped short take is kept after it stops (review blocker)", () => {
    it("Play, Play to stop, the silence, one note: the take is still there", async () => {
      const { phrases, looper } = setup();
      live("C4", 0, 4000, 5000);
      live("E4", 2, 8000, 9000);
      const id = phrases.take.id;
      looper.togglePlay();
      await flush();
      await looper.settled();
      render(1);
      looper.togglePlay();
      await flush();
      expect(looper.members).toEqual([]);
      render(4);
      live("G4", 4, rig.frame + 400, rig.frame + 1200);
      expect(phrases.take.id).not.toBe(id);
      expect(phrases.findPhrase(id)).toMatchObject({ shelf: "recent", looped: true });
      expect(phrases.findPhrase(id)!.notes.map((note) => note.note)).toEqual(["C4", "E4"]);
    });

    it("latch, two notes, Stop All, the next note: the take is still there", async () => {
      const { phrases, looper } = setup();
      looper.toggleLatch();
      live("C4", 0, 4000, 5000);
      await flush();
      await looper.settled();
      live("E4", 2, 8000, 9000);
      await flush();
      const id = phrases.take.id;
      expect(looper.openTakeId).toBe(id);
      looper.stopAll();
      await flush();
      render(4);
      live("G4", 4, rig.frame + 400, rig.frame + 1200);
      expect(phrases.take.id).not.toBe(id);
      expect(phrases.findPhrase(id)).toMatchObject({ shelf: "recent", looped: true });
    });
  });

  describe("a take edited while it loops (carried note 4)", () => {
    async function editedWhilePlaying() {
      const parts = setup();
      const { phrases, looper } = parts;
      playTake(.5);
      looper.togglePlay();
      await flush();
      await looper.settled();
      const generation = player.getLooper().members[0].generation;
      phrases.undoLastNote();
      await flush();
      return { ...parts, generation };
    }

    it("A: keeps the playing table until the next key, mode, octave, instrument or tempo change", async () => {
      const { looper, generation } = await editedWhilePlaying();
      expect(looper.swapPolicy).toBe("next-change");
      expect(player.getLooper().members[0].generation).toBe(generation);
      useMusicStore().setKey("D");
      await flush();
      render(.2);
      const table = rig.commands.flatMap((command) => command.type === "transport-change"
        ? command.change.type === "join" ? [command.change.member.table] : [] : []).at(-1)!;
      expect(table.begin.length).toBe(2);
      expect(player.getLooper().members[0].generation).not.toBe(generation);
    });

    it("B (hidden flag): swaps on every change", async () => {
      localStorage.setItem("emotitone.looper.swap", "every-change");
      const { looper, generation } = await editedWhilePlaying();
      expect(looper.swapPolicy).toBe("every-change");
      render(.2);
      expect(player.getLooper().members[0].generation).not.toBe(generation);
    });
  });

  describe("from the Play key in the deck (DOM pointer events, real store, real transport)", () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    function mountDeck() {
      // The app boots the engine before the deck shows.
      useInstrumentStore().engineBooted = true;
      return mount(PerformanceDeck, {
        attachTo: document.body,
        global: {
          stubs: { Keyboard: true, ControlBar: true, PhraseShelf: true, HummingCaptureTransport: true, CodeStrip: true },
        },
      });
    }

    async function press(element: Element, holdMs: number) {
      const options = { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true };
      element.dispatchEvent(new PointerEvent("pointerdown", options));
      await wait(holdMs);
      element.dispatchEvent(new PointerEvent("pointerup", options));
      (element as HTMLElement).click();
      await flush();
    }

    it("a tap plays the desk's take through to the transport's receipts; a hold past the threshold latches", async () => {
      const { phrases, looper } = setup();
      const deck = mountDeck();
      try {
        playTake(.5);
        const take = phrases.take.id;
        const play = deck.get(".code-strip-bar__play").element;
        await press(play, 40);
        await looper.settled();
        // The start's receipt has come back: the Looper runs and the take joined.
        expect(looper.running).toBe(true);
        expect(player.getLooper().members.map((member) => member.id)).toEqual([take]);
        const joined = rig.commands.find((command) => command.type === "transport-change"
          && command.change.type === "batch" && command.change.changes.some((part) => part.type === "join" && part.member.table.id === take));
        expect(joined).toBeDefined();
        expect(rig.commands.some((command) => command.type === "transport-start")).toBe(true);
        expect(deck.get(".code-strip-bar__play").attributes("aria-label")).toBe("Stop");
        render(2.5);
        expect(attacksOf(take).length).toBeGreaterThan(0);

        // The pattern's Looper Dial climbs the left edge (a bare dial, its disc
        // turning), and the mic moves to the Drawer's lip while dials are there.
        const dial = deck.get(`button.looper-dial[data-phrase-id="${take}"]`);
        expect(dial.find(".loop-dial--disc").exists()).toBe(true);
        expect(dial.find(".paper-button__cap").exists()).toBe(false);
        expect(document.documentElement.dataset.looperMic).toBe("lip");
        // A tap on it mutes the member on the transport; another tap, later, restores it.
        await press(dial.element, 30);
        expect(player.getLooper().members[0]).toMatchObject({ id: take, muted: true });
        render(.5);
        await press(dial.element, 30);
        expect(player.getLooper().members[0]).toMatchObject({ id: take, muted: false });
        // A vertical drag no longer turns the pattern (kept for the loop's volume).
        render(.5);
        const before = player.getLooper().members[0].offsetBars;
        const drag = (type: string, clientY: number) => dial.element.dispatchEvent(new PointerEvent(type,
          { bubbles: true, cancelable: true, pointerId: 3, pointerType: "touch", clientX: 10, clientY }));
        drag("pointerdown", 200);
        drag("pointermove", 150);
        drag("pointerup", 150);
        (dial.element as HTMLElement).click();
        await flush();
        expect(player.getLooper().members[0]).toMatchObject({ offsetBars: before, muted: false });

        // Hold past 450 ms: the latch, not a Stop.
        await press(deck.get(".code-strip-bar__play").element, 520);
        expect(looper.latched).toBe(true);
        expect(looper.isDeskPlaying).toBe(true);
        expect(deck.get(".code-strip-bar__play").classes()).toContain("paper-button--pressed");

        // A tap again stops the desk's pattern: its transport member leaves.
        await press(deck.get(".code-strip-bar__play").element, 40);
        expect(looper.members).toEqual([]);
        expect(player.getLooper().running).toBe(false);
        // No dials: the mic goes back to the top centre.
        expect(document.documentElement.dataset.looperMic).toBeUndefined();
      } finally {
        deck.unmount();
      }
    });

    describe("the Looper Dial's gesture map (Burooj, 2026-10-19)", () => {
      /** Two patterns looping: the first take, and a second played over it (now on the desk). */
      async function twoLooping(deck: ReturnType<typeof mountDeck>) {
        const phrases = usePhrasesStore();
        const looper = useLooperStore();
        playTake(.5);
        const first = phrases.take.id;
        await press(deck.get(".code-strip-bar__play").element, 40);
        await looper.settled();
        render(1);
        live("A4", 5, rig.frame + 400, rig.frame + 1200);
        await flush();
        const second = phrases.take.id;
        expect(second).not.toBe(first);
        await press(deck.get(".code-strip-bar__play").element, 40);
        await looper.settled();
        await flush();
        expect(player.getLooper().members.map((member) => member.id)).toEqual([first, second]);
        const dial = (id: string) => deck.get(`button.looper-dial[data-phrase-id="${id}"]`).element as HTMLElement;
        return { first, second, dial };
      }
      const onTransport = (id: string) => player.getLooper().members.find((member) => member.id === id)!;
      const point = (element: Element, type: string, clientX: number, clientY = 100, pointerId = 5) =>
        element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId, pointerType: "touch", clientX, clientY }));

      it("double-tap brings the pattern to the desk, not muted, and the Code Strip follows it", async () => {
        const { phrases, looper } = setup();
        const deck = mountDeck();
        try {
          const { first, dial } = await twoLooping(deck);
          expect(phrases.deskPhraseId).not.toBe(first);
          await press(dial(first), 20);
          expect(onTransport(first).muted).toBe(true);
          await press(dial(first), 20);
          await flush();
          expect(phrases.deskPhraseId).toBe(first);
          expect(looper.deskMemberId).toBe(first);
          expect(onTransport(first).muted).toBe(false);
          expect(looper.memberFor(first)!.muted).toBe(false);
          // No persistent solo any more.
          expect(player.getLooper().soloId).toBeNull();
          // At the desk, Play is its Stop.
          expect(deck.get(".code-strip-bar__play").attributes("aria-label")).toBe("Stop");
        } finally {
          deck.unmount();
        }
      });

      it("hold solos only while held, and the release puts back mute and solo exactly, whatever changed meanwhile", async () => {
        const { looper } = setup();
        const deck = mountDeck();
        try {
          const { first, second, dial } = await twoLooping(deck);
          // Before: the first is muted.
          await press(dial(first), 20);
          render(.5);
          expect(onTransport(first).muted).toBe(true);
          point(dial(first), "pointerdown", 20);
          await wait(620);
          await flush();
          // Held: the first sounds alone, unmuted.
          expect(player.getLooper().soloId).toBe(first);
          expect(onTransport(first).muted).toBe(false);
          expect(deck.get(`button.looper-dial[data-phrase-id="${first}"]`).classes()).toContain("looper-dial--solo");
          // Meanwhile another finger mutes the second.
          await press(dial(second), 20);
          expect(onTransport(second).muted).toBe(true);
          point(dial(first), "pointerup", 20);
          dial(first).click();
          await flush();
          // Back exactly as before the hold: first muted, second not, no solo.
          expect(player.getLooper().soloId).toBeNull();
          expect(onTransport(first).muted).toBe(true);
          expect(onTransport(second).muted).toBe(false);
          expect(looper.members.map((member) => member.muted)).toEqual([true, false]);
        } finally {
          deck.unmount();
        }
      });

      it("a held solo cancelled by the browser restores the same way", async () => {
        const { looper } = setup();
        const deck = mountDeck();
        try {
          const { second, dial } = await twoLooping(deck);
          looper.toggleSolo(second);
          await flush();
          point(dial(second), "pointerdown", 20);
          await wait(620);
          expect(player.getLooper().soloId).toBe(second);
          point(dial(second), "pointercancel", 20);
          await flush();
          // The solo from before the hold stays: the release put it back.
          expect(player.getLooper().soloId).toBe(second);
          looper.toggleSolo(second);
          point(dial(second), "pointerdown", 20);
          await wait(620);
          point(dial(second), "pointercancel", 20);
          await flush();
          expect(player.getLooper().soloId).toBeNull();
        } finally {
          deck.unmount();
        }
      });

      it("a flick off the left edge removes the pattern from the transport; Delete still removes", async () => {
        const { looper } = setup();
        const deck = mountDeck();
        try {
          const { first, second, dial } = await twoLooping(deck);
          const element = dial(first);
          point(element, "pointerdown", 30);
          point(element, "pointermove", 0);
          point(element, "pointermove", -40);
          point(element, "pointerup", -60);
          element.click();
          await flush();
          expect(looper.members.map((member) => member.phraseId)).toEqual([second]);
          expect(player.getLooper().members.map((member) => member.id)).toEqual([second]);
          await deck.get(`button.looper-dial[data-phrase-id="${second}"]`).trigger("keydown", { key: "Delete" });
          await flush();
          expect(looper.members).toEqual([]);
          expect(player.getLooper().running).toBe(false);
        } finally {
          deck.unmount();
        }
      });
    });

    describe("the latch's closing bar on the beat dots", () => {
      const dots = (deck: ReturnType<typeof mountDeck>) => deck.get(".code-strip-bar__beat");
      const shown = (deck: ReturnType<typeof mountDeck>) => ({
        countdown: dots(deck).attributes("data-beat-countdown"),
        lit: dots(deck).findAll(".beat-indicator__beat--lit").length,
        drained: dots(deck).findAll(".beat-indicator__beat--drained").length,
      });
      /** Render until the transport's heard bar reaches `bar`, then poll the latch as its timer would (only while latched). */
      async function hearUntil(bar: number) {
        while (player.heardBar()! < bar) render(QUANTUM / RATE);
        if (useLooperStore().latched) useLooperStore().checkLatch();
        await flush();
      }

      /** Latch, open a take, and let it go silent with the transport running. */
      async function silentLatchedTake(deck: ReturnType<typeof mountDeck>) {
        const { phrases, looper } = { phrases: usePhrasesStore(), looper: useLooperStore() };
        await press(deck.get(".code-strip-bar__play").element, 520);
        expect(looper.latched).toBe(true);
        live("C4", 0, 4000, 5600);
        await flush();
        await looper.settled();
        expect(player.getLooper().running).toBe(true);
        // The second note lands and lifts with the transport running.
        live("E4", 2, 8000, 9600);
        await flush();
        // The main thread's clock runs off from the audio clock: only the heard beat counts.
        spies[0].mockRestore();
        spies[0] = vi.spyOn(performance, "now").mockImplementation(() => 1000 + rig.frame / RATE * 3000);
        return { open: phrases.take.id, from: player.heardBar()! };
      }

      it("drain beat by beat on the heard beat, and are empty as the take closes", async () => {
        const { phrases, looper } = setup();
        const deck = mountDeck();
        try {
          const { open, from } = await silentLatchedTake(deck);
          looper.checkLatch();
          await flush();
          expect(shown(deck)).toEqual({ countdown: "4", lit: 4, drained: 0 });
          const seen: string[] = [];
          for (const beat of [.1, .3, .55, .8, .97]) {
            await hearUntil(from + beat);
            seen.push(shown(deck).countdown!);
            expect(phrases.take.id).toBe(open);
          }
          expect(seen).toEqual(["4", "3", "2", "1", "1"]);
          expect(shown(deck)).toEqual({ countdown: "1", lit: 1, drained: 3 });
          // The bar is out: the take closes as the last chad drains, and the dots are the beat again.
          await hearUntil(from + 1);
          expect(phrases.take.id).not.toBe(open);
          expect(looper.openTakeId).toBeNull();
          expect(shown(deck).countdown).toBeUndefined();
          expect(shown(deck).drained).toBe(0);
          expect(dots(deck).attributes("data-ui-beat-state")).not.toBe("countdown");
        } finally {
          deck.unmount();
        }
      });

      it("refill at once when a note is played before the bar is out", async () => {
        const { phrases } = setup();
        const deck = mountDeck();
        try {
          const { open, from } = await silentLatchedTake(deck);
          await hearUntil(from + .6);
          expect(shown(deck).countdown).toBe("2");
          // A note: the dots are full at once, before any poll.
          window.dispatchEvent(new CustomEvent("note-played", { detail: { noteId: "live-refill", noteName: "G4",
            solfegeIndex: 4, octave: 4, key: "C", mode: "major", source: "live-play-style", timestamp: Date.now() } }));
          await flush();
          expect(shown(deck)).toEqual({ countdown: "4", lit: 4, drained: 0 });
          window.dispatchEvent(new CustomEvent("note-released", { detail: { noteId: "live-refill", noteName: "G4",
            source: "live-play-style", timestamp: Date.now() } }));
          // The old bar's end passes and the take stays open: the bar starts again from the note.
          await hearUntil(from + 1.05);
          expect(phrases.take.id).toBe(open);
          expect(Number(shown(deck).countdown)).toBeGreaterThan(1);
        } finally {
          deck.unmount();
        }
      });

      it("change nothing when the Looper is not latched", async () => {
        const { phrases, looper } = setup();
        const deck = mountDeck();
        try {
          playTake(.5);
          await press(deck.get(".code-strip-bar__play").element, 40);
          await looper.settled();
          expect(looper.latched).toBe(false);
          live("A4", 5, rig.frame + 400, rig.frame + 1200);
          await flush();
          const from = player.heardBar()!;
          for (const beat of [.3, .8, 1.2]) {
            await hearUntil(from + beat);
            expect(looper.latchCountdown).toBeNull();
            expect(shown(deck)).toMatchObject({ countdown: undefined, drained: 0 });
            expect(dots(deck).attributes("data-ui-beat-state")).not.toBe("countdown");
          }
          expect(phrases.take.notes.length).toBe(1);
        } finally {
          deck.unmount();
        }
      });
    });

    /** The renderer is rebuilt and its banks do not come back (until `restore`). */
    function rebuildWithBanksHeld() {
      let restore!: () => void;
      const held = new Promise<void>((resolve) => { restore = resolve; });
      for (const instrument of rig.prepared) rig.gates.set(instrument, held);
      rig.generation++;
      for (const listener of [...rig.listeners]) listener.onRendererReset?.();
      return () => { for (const instrument of [...rig.gates.keys()]) rig.gates.delete(instrument); restore(); };
    }

    it("Play cannot *start* until the engine is ready", async () => {
      const { looper } = setup();
      const ready = player;
      // No pattern player yet (the Code Strip has not mounted).
      setProductionPatternPlayer(undefined);
      const deck = mountDeck();
      try {
        const play = () => deck.get(".code-strip-bar__play");
        await flush();
        expect(play().attributes("disabled")).toBeDefined();
        setProductionPatternPlayer(ready);
        await flush();
        expect(looper.engineReady).toBe(true);
        expect(play().attributes("disabled")).toBeUndefined();
      } finally {
        deck.unmount();
      }
    });

    it("during a restore, Play still stops the desk's pattern; a new pattern waits; a bank that never returns leaves nothing stuck", async () => {
      const { phrases, looper } = setup();
      const deck = mountDeck();
      try {
        const play = () => deck.get(".code-strip-bar__play");
        playTake(.5);
        const first = phrases.take.id;
        await press(play().element, 40);
        await looper.settled();
        render(1);
        rebuildWithBanksHeld();
        await flush();
        expect(looper.engineReady).toBe(false);
        // The desk's pattern plays: Play is Stop, and works.
        expect(play().attributes("disabled")).toBeUndefined();
        expect(play().attributes("aria-label")).toBe("Stop");
        await press(play().element, 40);
        expect(looper.members).toEqual([]);
        expect(phrases.findPhrase(first)).toBeDefined();
        // Nothing is starting and nothing plays: the never-returning bank holds nothing up.
        await flush();
        expect(looper.engineReady).toBe(true);
        expect(play().attributes("disabled")).toBeUndefined();
      } finally {
        deck.unmount();
      }
    });

    it("during a restore, a new pattern cannot start, and holding Play still releases the latch", async () => {
      const { looper } = setup();
      const deck = mountDeck();
      try {
        const play = () => deck.get(".code-strip-bar__play");
        playTake(.5);
        await press(play().element, 40);
        await looper.settled();
        // A fresh take on the desk (rule 3): not playing, not latched.
        live("A4", 5, rig.frame + 400, rig.frame + 1200);
        render(.2);
        const release = rebuildWithBanksHeld();
        await flush();
        expect(looper.isDeskPlaying).toBe(false);
        expect(play().attributes("disabled")).toBeDefined();
        // Latched (from the store, as a held Play would): Play is live and shows the latch.
        looper.toggleLatch();
        await flush();
        expect(play().attributes("disabled")).toBeUndefined();
        expect(play().classes()).toContain("paper-button--pressed");
        await press(play().element, 520);
        expect(looper.latched).toBe(false);
        release();
      } finally {
        deck.unmount();
      }
    });

    it("the instrument drawer re-initialising, or a hung sound fetch, never disables Play", async () => {
      const { looper } = setup();
      const instrument = useInstrumentStore();
      const superdough = await import("@/services/superdoughAudio");
      // A preferred sound that is not ready, whose download never finishes.
      vi.mocked(superdough.isPrewarmed).mockReturnValue(false);
      vi.mocked(superdough.prewarmSoundSamples).mockReturnValue(new Promise<void>(() => {}));
      instrument.currentInstrument = "gm_piano";
      try {
        void instrument.initializeInstruments();
        await flush();
        // The engine booted; the fetch hangs.
        expect(instrument.engineBooted).toBe(true);
        expect(looper.engineReady).toBe(true);
        // Opening the drawer runs it again: still ready.
        void instrument.initializeInstruments();
        await flush();
        expect(looper.engineReady).toBe(true);
      } finally {
        vi.mocked(superdough.isPrewarmed).mockReturnValue(true);
        vi.mocked(superdough.prewarmSoundSamples).mockResolvedValue(undefined);
      }
    });

    it("opening the mic over a running loop keeps the loop playing (humming over a loop)", async () => {
      const { phrases, looper } = setup();
      const deck = mountDeck();
      try {
        playTake(.5);
        const take = phrases.take.id;
        await press(deck.get(".code-strip-bar__play").element, 40);
        await looper.settled();
        render(2);
        const before = attacksOf(take).length;
        deck.getComponent({ name: "HummingCaptureTransport" }).vm.$emit("toggle");
        await flush();
        await vi.waitFor(() => expect(deck.getComponent({ name: "HummingCaptureTransport" }).props("status")).toBe("recording"));
        render(4);
        expect(looper.running).toBe(true);
        expect(player.getLooper().members.map((member) => member.id)).toEqual([take]);
        expect(attacksOf(take).length).toBeGreaterThan(before);
        expect(rig.commands.filter((command) => command.type === "transport-stop")).toEqual([]);
      } finally {
        deck.unmount();
      }
    });

    it("a refused bank says so on the deck instead of doing nothing", async () => {
      const { phrases, looper } = setup();
      playTake(.5);
      const id = phrases.keepTake()!;
      phrases.findPhrase(id)!.context.instrument = "sawtooth";
      rig.refused.add("sawtooth");
      phrases.openPhrase(id);
      const deck = mountDeck();
      try {
        expect(deck.find('[data-testid="looper-error"]').exists()).toBe(false);
        await press(deck.get(".code-strip-bar__play").element, 40);
        await looper.settled();
        await flush();
        const notice = deck.get('[data-testid="looper-error"]');
        expect(notice.get("[role=alert]").text()).toBe("Stop a loop to add Sawtooth.");
        expect(notice.find(".looper-dials__notice-lamp").exists()).toBe(true);
        expect(looper.members).toEqual([]);
        // No dials: the mic is at the top, and the strip keeps its place.
        expect(notice.classes()).not.toContain("looper-dials__notice--over-mic");
        await notice.get('button[aria-label="Dismiss"]').trigger("click");
        expect(deck.find('[data-testid="looper-error"]').exists()).toBe(false);
      } finally {
        deck.unmount();
      }
    });

    it("while the mic rides the Drawer's lip, the notice sits above it", async () => {
      const { looper } = setup();
      const deck = mountDeck();
      try {
        playTake(.5);
        await press(deck.get(".code-strip-bar__play").element, 40);
        await looper.settled();
        expect(document.documentElement.dataset.looperMic).toBe("lip");
        expect(looper.members.length).toBe(1);
        looper.lastError = "Stop a loop to add Piano.";
        await flush();
        expect(deck.get('[data-testid="looper-error"]').classes()).toContain("looper-dials__notice--over-mic");
      } finally {
        deck.unmount();
      }
    });
  });
});
