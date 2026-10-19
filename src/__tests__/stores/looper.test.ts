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
    expect(looper.memberFor(overdub.id)!.offsetBars + looper.looper.barOriginBars!).toBeCloseTo(expected, 6);
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
    expect(looper.lastError).toMatch(/Tap Play again/);
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
    expect(looper.lastError).toMatch(/restarting/);
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
    expect(looper.memberFor(overdub.id)!.offsetBars + looper.looper.barOriginBars!)
      .toBeCloseTo(player.barAtAudioTime(onFrame / RATE)!, 6);
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
        // A tap on it mutes the member on the transport; another tap restores it.
        await press(dial.element, 30);
        expect(player.getLooper().members[0]).toMatchObject({ id: take, muted: true });
        await wait(400);
        await press(dial.element, 30);
        expect(player.getLooper().members[0]).toMatchObject({ id: take, muted: false });

        // A drag up turns the pattern a beat later in the loop, on the transport.
        await wait(400);
        const before = player.getLooper().members[0].offsetBars;
        const drag = (type: string, clientY: number) => dial.element.dispatchEvent(new PointerEvent(type,
          { bubbles: true, cancelable: true, pointerId: 3, pointerType: "touch", clientX: 10, clientY }));
        drag("pointerdown", 200);
        drag("pointermove", 184);
        drag("pointerup", 184);
        (dial.element as HTMLElement).click();
        await flush();
        expect(player.getLooper().members[0].offsetBars).toBeCloseTo(before + .25, 9);
        expect(looper.memberFor(take)!.offsetBars + looper.looper.barOriginBars!).toBeCloseTo(before + .25, 9);
        // The drag was no tap: the member is not muted.
        expect(player.getLooper().members[0].muted).toBe(false);

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

    it("Play cannot start until the engine is ready, nor while it restores a rebuilt renderer", async () => {
      const { phrases, looper } = setup();
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

        playTake(.5);
        await press(play().element, 40);
        await looper.settled();
        render(1);
        // The renderer is rebuilt and its banks are slow to return: Play waits.
        let restored!: () => void;
        for (const instrument of rig.prepared) rig.gates.set(instrument, new Promise<void>((resolve) => { restored = resolve; }));
        rig.generation++;
        for (const listener of [...rig.listeners]) listener.onRendererReset?.();
        await flush();
        expect(play().attributes("disabled")).toBeDefined();
        for (const instrument of [...rig.gates.keys()]) rig.gates.delete(instrument);
        restored();
        await vi.waitFor(() => expect(looper.engineReady).toBe(true));
        await flush();
        expect(play().attributes("disabled")).toBeUndefined();
        expect(phrases.take.notes.length).toBeGreaterThan(0);
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
        expect(notice.get("[role=alert]").text()).toMatch(/cannot join/);
        expect(notice.find(".looper-dials__notice-lamp").exists()).toBe(true);
        expect(notice.text()).toMatch(/cannot join: every instrument slot is held/);
        expect(looper.members).toEqual([]);
        await notice.get('button[aria-label="Dismiss"]').trigger("click");
        expect(deck.find('[data-testid="looper-error"]').exists()).toBe(false);
      } finally {
        deck.unmount();
      }
    });
  });
});
