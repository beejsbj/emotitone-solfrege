import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Note } from "@tonaljs/tonal";
import type { LiveResponse } from "@/audio/live/types";
import type { TransportCommand, TransportResponse } from "@/audio/live/transport";
import type { LogNote } from "@/types/patterns";
import type { ChromaticNote, MusicalMode } from "@/types/music";

/**
 * The Looper on the worklet transport (BJS-491), observed at the player's
 * public seam with the real render core behind it: only the bank loader and
 * the worklet port are stand-ins. Bending's pitch oracle is the mode remap
 * module itself, not a copy.
 */
const RATE = 8000;
const QUANTUM = 128;
const rig = vi.hoisted(() => ({
  core: undefined as unknown as import("@/audio/live/core").LiveAudioCore,
  generation: 1,
  frame: 0,
  queued: [] as LiveResponse[],
  listeners: new Set<{ onTransport?(response: TransportResponse): void; onRendererReset?(): void }>(),
  pins: new Map<string, string[]>(),
  refused: new Set<string>(),
  gates: new Map<string, Promise<void>>(),
  /** Rendered left channel, from frame 0. */
  pcm: [] as number[],
  /** The renderer is down for this many more transport lookups (between an invalidation and its reinstall). */
  down: 0,
  commands: [] as TransportCommand[],
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
    if (rig.refused.has(instrumentId)) return;
    rig.core.command({ type: "prepare", requestId: 0, instrument: { kind: "oscillator", instrumentId, waveform: "sine",
      gain: 1, attack: .001, decay: .01, sustain: .5, release: .01 } }, rig.frame);
  },
  getLiveTransport(instrumentId: string) {
    if (rig.refused.has(instrumentId)) return undefined;
    if (rig.down > 0) { rig.down--; return undefined; }
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
  pinLivePlayback(holder: string, names: readonly string[]) {
    const held = [...names];
    rig.pins.set(holder, held);
    return () => { if (rig.pins.get(holder) === held) rig.pins.delete(holder); };
  },
  subscribeLivePlayback(listener: { onTransport?(response: TransportResponse): void; onRendererReset?(): void }) {
    rig.listeners.add(listener);
    return () => rig.listeners.delete(listener);
  },
}));
vi.unmock("@/services/audioLifecycle");

import { LiveAudioCore } from "@/audio/live/core";
import { createPatternPlayer, PatternLoadError, type LooperMemberRequest, type MuteTailPolicy } from "@/services/patternTransport";
import { remap } from "@/domain/modeRemap";
import { getSemitoneShift, transposePatternNotes } from "@/data/patterns";
import { resumeAudioContext } from "@/services/audioLifecycle";
import { UIBeatClock } from "@/composables/useUIBeat";

function newCore() {
  rig.core = new LiveAudioCore(RATE, response => { rig.queued.push(response); });
}

function render(seconds: number) {
  const quanta = Math.round(seconds * RATE / QUANTUM);
  for (let index = 0; index < quanta; index++) {
    const output = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
    rig.core.render(output, rig.frame);
    rig.frame += QUANTUM;
    for (const sample of output[0]) rig.pcm.push(sample);
    rig.deliver();
  }
}

/** The MIDI pitch heard in a window of the rendered output, from interpolated rising zero crossings. */
function heardMidi(from: number, to: number) {
  const crossings: number[] = [];
  for (let index = from + 1; index < to; index++) {
    const [a, b] = [rig.pcm[index - 1], rig.pcm[index]];
    if (a < 0 && b >= 0) crossings.push(index - 1 + a / (a - b));
  }
  const hz = (crossings.length - 1) / ((crossings.at(-1)! - crossings[0]) / RATE);
  return 69 + 12 * Math.log2(hz / 440);
}

const context = {
  state: "running" as AudioContextState,
  sampleRate: RATE,
  get currentTime() { return rig.frame / RATE; },
  baseLatency: 0,
  outputLatency: 0,
  resume: vi.fn(async () => {}),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

function note(id: string, name: string, at: number, key: ChromaticNote = "C", mode: MusicalMode = "major"): LogNote {
  return { id, note: name, key, mode, scaleDegree: 1, scaleIndex: 0, octave: Number(name.at(-1)),
    pressTime: at, releaseTime: at + 150, duration: 150 } as unknown as LogNote;
}

// One bar at 120 BPM is 2000 ms. F#4 is borrowed in C major.
const melody = [note("a1", "C4", 0), note("a2", "E4", 500), note("a3", "F#4", 1000), note("a4", "A4", 1500)];
const bass = [note("c1", "E3", 750), note("c2", "B3", 1750)];
const pinned = [note("b1", "G3", 250), note("b2", "B3", 1250)];

function member(id: string, notes: LogNote[], extra: Partial<LooperMemberRequest> = {}): LooperMemberRequest {
  return { id, notes, config: { sourceBpm: 120, bpm: 120, patternDurationMs: 2000 }, instrument: "sine",
    key: "C", mode: "major", lengthBars: 1, ...extra };
}

type Played = { noteName: string; key: string; mode: string; phraseId: string; sourceNoteId: string; frame: number; bar: number; noteId: string };

function setup(muteTails: MuteTailPolicy = "ring") {
  const target = new EventTarget();
  const announced: (Played & { audibleAt: number })[] = [];
  const cancelled = new Set<string>();
  target.addEventListener("note-played", event => announced.push((event as CustomEvent).detail));
  // A cancelled announcement is released at its own onset: it never sounded.
  target.addEventListener("note-released", event => {
    const detail = (event as CustomEvent).detail;
    if (announced.find(entry => entry.noteId === detail.noteId)?.audibleAt === detail.audibleAt) cancelled.add(detail.noteId);
  });
  const played = new Proxy(announced, { get(list, key) {
    const sounded = list.filter(entry => !cancelled.has(entry.noteId));
    const value = Reflect.get(sounded, key);
    return typeof value === "function" ? value.bind(sounded) : value;
  } }) as Played[];
  const cutWetTails = vi.fn();
  const uiBeat = new UIBeatClock({ observeEnvironment: false });
  let beat: (() => void) | undefined;
  const player = createPatternPlayer({
    audio: { getContext: () => context as unknown as AudioContext, ensureReady: async () => ({}) as AudioNode, cutWetTails },
    uiBeat, target, muteTails, requestFrame: callback => { beat = callback; return 1; }, cancelFrame: () => { beat = undefined; },
  });
  return { player, played, cutWetTails, uiBeat, tick: () => beat?.() };
}

/** The MIDI a member's note should sound at after a bend, from the remap module. */
function bentMidi(notes: LogNote[], to: { key: ChromaticNote; mode: MusicalMode }) {
  const remapped = transposePatternNotes(remap(notes, "major", to.mode, "C"), getSemitoneShift("C", to.key));
  return new Map(remapped.map(entry => [entry.id, Note.midi(entry.note)!]));
}

const tables = () => rig.commands.flatMap(command => {
  if (command.type !== "transport-change") return [];
  const parts = command.change.type === "batch" ? command.change.changes : [command.change];
  return parts.flatMap(part => part.type === "join" ? [part.member.table] : part.type === "replace" ? [part.table] : []);
});

describe("the Looper on the worklet transport", () => {
  beforeEach(() => {
    rig.frame = 0;
    rig.generation = 1;
    rig.queued = [];
    rig.commands = [];
    rig.pins.clear();
    rig.refused.clear();
    rig.gates.clear();
    rig.pcm = [];
    rig.down = 0;
    newCore();
  });
  afterEach(() => { rig.listeners.clear(); });

  it.each([
    ["D", "minor", "immediate"],
    ["D", "minor", "bar"],
    ["A", "major pentatonic", "bar"],
  ] as const)("bends unpinned members to %s %s through the identity remap, all at one frame (%s)", async (key, mode, policy) => {
    const { player, played } = setup();
    await player.start({ bpm: 120, target: { key: "C", mode: "major" },
      members: [member("a", melody), member("b", pinned, { pinned: true }), member("c", bass)] });
    render(1.3);
    const bending = player.bend({ key, mode }, policy === "bar" ? { bar: 1 } : "immediate");
    render(4);
    const receipt = await bending;
    const at = receipt!.appliedFrame;
    expect(receipt!.late).toBe(false);
    if (policy === "bar") expect(receipt!.appliedBar).toBe(1);
    const expected = { a: bentMidi(melody, { key, mode }), c: bentMidi(bass, { key, mode }) };
    const original = (id: string) => Note.midi([...melody, ...bass, ...pinned].find(entry => entry.id === id)!.note);
    for (const event of played) {
      const midi = Note.midi(event.noteName);
      if (event.phraseId === "b" || event.frame < at) {
        // Before the bend frame (and always for the pinned member): the recorded pitch and context.
        expect(midi).toBe(original(event.sourceNoteId));
        expect([event.key, event.mode]).toEqual(["C", "major"]);
      } else {
        expect(midi).toBe(expected[event.phraseId as "a" | "c"].get(event.sourceNoteId));
        expect([event.key, event.mode]).toEqual([key, mode]);
      }
    }
    expect(played.filter(event => event.frame >= at && event.phraseId !== "b").length).toBeGreaterThan(4);
    // The worklet plays the pitches the events name: the bent tables hold the oracle's MIDI.
    const bent = tables().filter(table => table.id !== "b").slice(-2);
    for (const table of bent) {
      const wanted = [...expected[table.id as "a" | "c"].values()].sort((x, y) => x - y);
      expect([...table.pitch].sort((x, y) => x - y)).toEqual(wanted);
    }
    // One batch carried both retunes.
    const batches = rig.commands.filter(command => command.type === "transport-change" && command.change.type === "batch");
    expect(batches.at(-1)).toMatchObject({ change: { changes: [{ type: "replace" }, { type: "replace" }] } });
    player.dispose();
  });

  it("pins and unpins a member, and keeps a muted member muted through a bend", async () => {
    const { player, played } = setup();
    await player.start({ bpm: 120, target: { key: "C", mode: "major" }, members: [member("a", melody), member("c", bass)] });
    render(.5);
    await player.setMember("c", { muted: true });
    await player.bend({ key: "D", mode: "minor" });
    render(.5);
    const pinnedAt = rig.frame;
    await player.setMember("a", { pinned: true });
    render(2.5);
    const after = played.filter(event => event.phraseId === "a" && event.frame >= pinnedAt);
    expect(after.length).toBeGreaterThan(2);
    for (const event of after) {
      expect(Note.midi(event.noteName)).toBe(Note.midi(melody.find(entry => entry.id === event.sourceNoteId)!.note));
      expect([event.key, event.mode]).toEqual(["C", "major"]);
    }
    expect(played.some(event => event.phraseId === "c" && event.frame >= pinnedAt)).toBe(false);
    expect(player.getLooper().members.find(entry => entry.id === "a")).toMatchObject({ pinned: true });
    player.dispose();
  });

  it("keeps each member's bank pinned while it rests or is muted, and releases it once it has left", async () => {
    const { player } = setup();
    await player.start({ bpm: 120, target: { key: "C", mode: "major" },
      members: [member("a", melody), member("c", bass, { instrument: "triangle" })] });
    expect([...rig.pins.values()].flat().sort()).toEqual(["sine", "triangle"]);
    await player.setMember("c", { muted: true });
    render(.5);
    expect([...rig.pins.values()].flat()).toContain("triangle");
    const left = player.leave("c", { bar: 1 });
    render(.5);
    // Still a member until its bar: still pinned.
    expect([...rig.pins.values()].flat()).toContain("triangle");
    render(2);
    await left;
    expect([...rig.pins.values()].flat()).toEqual(["sine"]);
    player.dispose();
    expect(rig.pins.size).toBe(0);
  });

  it("refuses a join whose bank the budget refuses, explicitly, and the loop plays on", async () => {
    const { player, played } = setup();
    await player.start({ bpm: 120, target: { key: "C", mode: "major" }, members: [member("a", melody)] });
    render(.5);
    rig.refused.add("kazoo");
    const error = await player.join(member("d", bass, { instrument: "kazoo" })).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PatternLoadError);
    expect(error).toMatchObject({ budget: true, retryable: false });
    expect(player.getLooper().members.map(entry => entry.id)).toEqual(["a"]);
    const before = played.length;
    render(2);
    expect(played.length).toBeGreaterThan(before);
    expect(played.some(event => event.phraseId === "d")).toBe(false);
    player.dispose();
  });

  it("joins a cold member when its bank arrives, and joins nothing if it left while loading", async () => {
    const { player, played } = setup();
    await player.start({ bpm: 120, target: { key: "C", mode: "major" }, members: [member("a", melody)] });
    let arrive!: () => void;
    rig.gates.set("cello", new Promise<void>(resolve => { arrive = resolve; }));
    const joining = player.join(member("e", bass, { instrument: "cello" }));
    render(1);
    expect(player.getLooper().members.find(entry => entry.id === "e")).toMatchObject({ loading: true });
    void player.leave("e");
    arrive();
    expect(await joining).toMatchObject({ cancelled: true });
    render(2);
    expect(played.some(event => event.phraseId === "e")).toBe(false);

    rig.gates.set("viola", new Promise<void>(resolve => { arrive = resolve; }));
    const second = player.join(member("f", bass, { instrument: "viola" }));
    render(.7);
    arrive();
    const receipt = await second;
    render(2);
    // Every note of the cold member from its join on, at its oracle bars.
    const joinedBar = receipt.appliedBar!;
    const bars = played.filter(event => event.phraseId === "f").map(event => event.bar);
    expect(bars.length).toBeGreaterThan(1);
    expect(bars[0]).toBeGreaterThanOrEqual(joinedBar);
    // A take starts at its first note: the bass's notes sit at 0 and 0.5 of each bar.
    expect(bars.every(bar => [0, .5].some(phase => Math.abs(bar - Math.floor(bar) - phase) < 1e-9))).toBe(true);
    player.dispose();
  });

  it.each(["ring", "cut"] as const)("applies the %s tail policy after a mute or solo applies", async policy => {
    const { player, cutWetTails } = setup(policy);
    await player.start({ bpm: 120, target: { key: "C", mode: "major" }, members: [member("a", melody), member("c", bass)] });
    render(.3);
    const mute = player.setMember("c", { muted: true }, { bar: 1 });
    render(.5);
    expect(cutWetTails).not.toHaveBeenCalled();
    render(2);
    await mute;
    await player.solo("a");
    await player.solo(null);
    expect(cutWetTails).toHaveBeenCalledTimes(policy === "cut" ? 2 : 0);
    player.dispose();
  });

  it("keeps one UIBeat generation through tempo, join, bend and leave", async () => {
    const { player, uiBeat, tick } = setup();
    await player.start({ bpm: 120, target: { key: "C", mode: "major" }, members: [member("a", melody)] });
    render(.75);
    tick();
    const generation = uiBeat.snapshot.generation;
    await player.setTempo(180);
    render(.3);
    await player.join(member("c", bass));
    await player.bend({ key: "D", mode: "minor" });
    await player.leave("c");
    render(.2);
    tick();
    expect(uiBeat.snapshot.generation).toBe(generation);
    player.stop();
  });

  it("recovers through the interruption gate after a renderer rebuild, continuing from the bar it reached", async () => {
    const { player, played } = setup();
    await player.start({ bpm: 120, target: { key: "D", mode: "minor" },
      members: [member("a", melody), member("b", pinned, { pinned: true })] });
    await player.setMember("b", { offsetBars: .5 });
    render(2.6);
    const reachedBar = rig.frame / RATE / 2;
    const before = played.length;
    // The renderer is rebuilt (a route or sample-rate change): a new, empty core and port generation.
    rig.generation++;
    newCore();
    for (const listener of [...rig.listeners]) listener.onRendererReset?.();
    expect(player.getLooper()).toMatchObject({ running: false, recovering: true });
    // The gate restores it (the same gate a gesture or the rebuild itself runs).
    await resumeAudioContext(context as unknown as AudioContext);
    await vi.waitFor(() => expect(player.getLooper().running).toBe(true));
    const resumedFrame = rig.frame;
    render(2.2);
    const after = played.slice(before);
    expect(after.length).toBeGreaterThan(3);
    // Bars continue from where the clock stopped, on the same grid, with the same members and settings.
    expect(after[0].bar).toBeGreaterThanOrEqual(reachedBar - 1e-9);
    expect(after[0].bar - reachedBar).toBeLessThan(.25 + 1e-9);
    for (const event of after) {
      const phase = event.bar - Math.floor(event.bar);
      // The pinned member's take starts at its first note, then sits half a bar later.
      const wanted = event.phraseId === "a" ? [0, .25, .5, .75] : [.5, 0];
      expect(wanted.some(value => Math.abs(phase - value) < 1e-9)).toBe(true);
      expect(event.frame).toBe(Math.ceil(resumedFrame + (event.bar - reachedBar) * 2 * RATE - 1e-6));
    }
    // The bend survived: the unpinned member still plays in D minor.
    expect(after.filter(event => event.phraseId === "a").every(event => event.key === "D" && event.mode === "minor")).toBe(true);
    expect(new Set(after.map(event => event.noteId)).size).toBe(after.length);
    expect(after.every(event => !played.slice(0, before).some(old => old.noteId === event.noteId))).toBe(true);
    player.dispose();
  });
});

/** Review round on #199, at the player's seam with the real core behind it. */
describe("the Looper after review", () => {
  beforeEach(() => {
    rig.frame = 0;
    rig.generation = 1;
    rig.queued = [];
    rig.commands = [];
    rig.pins.clear();
    rig.refused.clear();
    rig.gates.clear();
    rig.pcm = [];
    rig.down = 0;
    newCore();
  });
  afterEach(() => { rig.listeners.clear(); });

  const start = (player: ReturnType<typeof setup>["player"], members: LooperMemberRequest[], target = { key: "C" as ChromaticNote, mode: "major" as MusicalMode }) =>
    player.start({ bpm: 120, target, members });

  it("keeps what getLooper reports and what plays in agreement for a member whose join waits for its bar", async () => {
    const { player, played } = setup();
    await start(player, [member("a", melody), member("c", bass)]);
    render(.6);
    void player.join(member("b", pinned), { bar: 2 });
    // Mute it, then bend everyone, then solo it, all before its bar.
    await player.setMember("b", { muted: true });
    await player.bend({ key: "D", mode: "minor" });
    await player.solo("b");
    render(5);
    expect(player.getLooper()).toMatchObject({ soloId: "b" });
    expect(player.getLooper().members.find(entry => entry.id === "b")).toMatchObject({ muted: true });
    // Soloed and muted: nothing sounds after the solo, b included (mute wins).
    const soloFrame = .6 * RATE;
    expect(played.filter(event => event.frame > soloFrame + .05 * RATE)).toEqual([]);
    await player.setMember("b", { muted: false });
    render(2.5);
    const b = played.filter(event => event.phraseId === "b");
    expect(b.length).toBeGreaterThan(2);
    // b plays alone, and with the table the bend built for it (b is not pinned here).
    expect(played.filter(event => event.frame > rig.frame - 2 * RATE).every(event => event.phraseId === "b")).toBe(true);
    expect(b.every(event => event.key === "D" && event.mode === "minor")).toBe(true);
    player.dispose();
  });

  it("refuses an invalid value at once and changes nothing", async () => {
    const { player, played } = setup();
    await start(player, [member("a", melody)]);
    render(.2);
    const sent = rig.commands.length;
    await expect(player.setTempo(Number.NaN)).rejects.toThrow(RangeError);
    await expect(player.setTempo(0, { bar: 2 })).rejects.toThrow(RangeError);
    await expect(player.solo("a", { bar: Number.NaN })).rejects.toThrow(RangeError);
    await expect(player.solo("nobody")).rejects.toThrow(RangeError);
    await expect(player.bend({ key: "D", mode: "minor" }, { bar: Number.NaN })).rejects.toThrow(RangeError);
    await expect(player.join(member("z", bass, { rate: -1 }))).rejects.toThrow(RangeError);
    // A rate of 0, then a valid mute before any receipt: rate 0 is never reported.
    const zero = player.setMember("a", { rate: 0 });
    const mute = player.setMember("a", { muted: true });
    await expect(zero).rejects.toThrow(RangeError);
    await mute;
    expect(player.getLooper()).toMatchObject({ bpm: 120, soloId: null, target: { key: "C", mode: "major" } });
    expect(player.getLooper().members).toEqual([expect.objectContaining({ id: "a", rate: 1, muted: true })]);
    // Only the valid mute reached the worklet.
    expect(rig.commands.slice(sent)).toEqual([expect.objectContaining({ change: { type: "update", memberId: "a", patch: { muted: true } } })]);
    await player.setMember("a", { muted: false });
    // leave with a bad bar: still a member, still pinned, still playing.
    await expect(player.leave("a", { bar: Number.NaN })).rejects.toThrow(RangeError);
    expect(player.getLooper().members.map(entry => entry.id)).toEqual(["a"]);
    expect([...rig.pins.values()].flat()).toEqual(["sine"]);
    const before = played.length;
    render(1);
    expect(played.length).toBeGreaterThan(before);
    player.dispose();
  });

  it("leaves no ghost, no stuck solo and no stuck pin when a loading member is refused, and a rebuild restores the rest", async () => {
    const { player, played } = setup();
    await start(player, [member("a", melody)]);
    render(.3);
    let arrive!: () => void;
    rig.gates.set("cello", new Promise<void>(resolve => { arrive = resolve; }));
    const joining = player.join(member("b", bass, { instrument: "cello" }));
    // The reviewer's probe: an invalid rate is refused at once, the solo stands while it loads.
    await expect(player.setMember("b", { rate: 0 })).rejects.toThrow(RangeError);
    await player.solo("b");
    render(.5);
    // Its bank is then refused (every slot held): the join never happens.
    rig.refused.add("cello");
    arrive();
    await expect(joining).rejects.toMatchObject({ budget: true });
    expect(player.getLooper()).toMatchObject({ soloId: null });
    expect(player.getLooper().members.map(entry => entry.id)).toEqual(["a"]);
    expect([...rig.pins.values()].flat()).toEqual(["sine"]);
    const lifted = rig.frame;
    render(1.2);
    expect(played.some(event => event.phraseId === "a" && event.frame >= lifted)).toBe(true);
    // A renderer rebuild brings back the valid member, and only it.
    rig.refused.clear();
    rig.generation++;
    newCore();
    for (const listener of [...rig.listeners]) listener.onRendererReset?.();
    await resumeAudioContext(context as unknown as AudioContext);
    await vi.waitFor(() => expect(player.getLooper().running).toBe(true));
    const resumed = played.length;
    render(1.5);
    const after = played.slice(resumed);
    expect(after.length).toBeGreaterThan(2);
    expect(after.every(event => event.phraseId === "a")).toBe(true);
    player.dispose();
  });

  it("lets an immediate re-join withdraw a join still waiting for its bar, and pins only the bank that plays", async () => {
    const { player, played } = setup();
    await start(player, [member("a", melody)]);
    render(.3);
    const stale = player.join(member("b", pinned, { instrument: "triangle" }), { bar: 2 });
    await vi.waitFor(() => expect([...rig.pins.values()].flat()).toContain("triangle"));
    const fresh = [note("f1", "D4", 0), note("f2", "F4", 1000)];
    await player.join(member("b", fresh, { instrument: "cello" }));
    expect(await stale).toMatchObject({ cancelled: true });
    render(5);
    const b = played.filter(event => event.phraseId === "b");
    expect(b.filter(event => event.frame >= 2 * 2 * RATE).length).toBeGreaterThan(1);
    expect(b.every(event => event.sourceNoteId.startsWith("f"))).toBe(true);
    expect(player.getLooper().members.find(entry => entry.id === "b")).toMatchObject({
      generation: Math.max(...tables().filter(table => table.id === "b").map(table => table.generation)) });
    expect([...rig.pins.values()].flat().sort()).toEqual(["cello", "sine"]);
    player.dispose();
  });

  it("keeps an empty Looper's bar grid running through a rebuild (the latch's grid), and the next join joins it", async () => {
    const { player, played, uiBeat, tick } = setup();
    await start(player, [member("a", melody)]);
    render(1.1);
    await player.leave("a");
    render(.3);
    rig.generation++;
    newCore();
    for (const listener of [...rig.listeners]) listener.onRendererReset?.();
    await resumeAudioContext(context as unknown as AudioContext);
    await vi.waitFor(() => expect(player.getLooper().recovering).toBe(false));
    // The grid starts again on the rebuilt renderer, where the clock had reached, and the beat moves on.
    expect(player.heardBar()).not.toBeNull();
    render(.2);
    tick();
    const beat = uiBeat.snapshot.barPosition!;
    expect(beat).toBeGreaterThan(1.4 / 2);
    render(.2);
    tick();
    expect(uiBeat.snapshot.barPosition!).toBeGreaterThan(beat);
    expect(uiBeat.snapshot.barPosition!).toBeCloseTo(rig.core.transport.barAt(rig.frame), 1);
    await expect(player.setTempo(120)).resolves.not.toHaveProperty("cancelled");
    const joined = await player.join(member("a", melody));
    expect(joined.cancelled).toBeUndefined();
    const before = played.length;
    render(1.5);
    const after = played.slice(before);
    expect(after.length).toBeGreaterThan(2);
    // The new run continues from the bar the clock had reached, on the quarter-bar grid.
    expect(after[0].bar).toBeGreaterThanOrEqual(1.4 / 2 - 1e-9);
    expect(after.every(event => Math.abs(event.bar * 4 - Math.round(event.bar * 4)) < 1e-9)).toBe(true);
    player.dispose();
  });

  it("keeps the old bank pinned until a re-join at a bar lands", async () => {
    const { player, played } = setup();
    await start(player, [member("a", melody), member("c", bass, { instrument: "triangle" })]);
    render(.3);
    const rejoined = player.join(member("c", bass, { instrument: "cello" }), { bar: 1 });
    await vi.waitFor(() => expect([...rig.pins.values()].flat()).toContain("cello"));
    expect([...rig.pins.values()].flat().sort()).toEqual(["cello", "sine", "triangle"]);
    render(1);
    // Until the bar the old member still plays: on its old instrument, its table still known.
    expect([...rig.pins.values()].flat()).toContain("triangle");
    render(1.5);
    await rejoined;
    expect([...rig.pins.values()].flat().sort()).toEqual(["cello", "sine"]);
    expect(played.some(event => event.phraseId === "c" && event.frame >= 2 * RATE)).toBe(true);
    player.dispose();
  });

  it("drops tables no member plays, so a long session of bends does not grow", async () => {
    const { player } = setup();
    await start(player, [member("a", melody), member("c", bass)]);
    for (let bend = 0; bend < 30; bend++) {
      await player.bend(bend % 2 ? { key: "C", mode: "major" } : { key: "D", mode: "minor" });
      render(.1);
    }
    // Two members: at most the newest, applied and previous table each, plus any sounding note's.
    expect(player.getLooper().tables).toBeLessThanOrEqual(8);
    player.dispose();
  });

  it("recovers from a second rebuild during its restore, at the bar the first outage stopped at", async () => {
    const { player, played } = setup();
    await start(player, [member("a", melody)], { key: "D", mode: "minor" });
    render(2.6);
    const reachedBar = rig.frame / RATE / 2;
    const before = played.length;
    let arrive!: () => void;
    rig.gates.set("sine", new Promise<void>(resolve => { arrive = resolve; }));
    rig.generation++;
    newCore();
    for (const listener of [...rig.listeners]) listener.onRendererReset?.();
    const gate = resumeAudioContext(context as unknown as AudioContext);
    // The restore's bank load is in flight (held at the gate).
    await new Promise(resolve => setTimeout(resolve, 0));
    // The outage goes on: time passes, then the renderer is rebuilt again,
    // and the bank load in flight finds no renderer.
    render(.7);
    rig.generation++;
    newCore();
    rig.down = 1;
    for (const listener of [...rig.listeners]) listener.onRendererReset?.();
    arrive();
    rig.gates.delete("sine");
    await gate;
    await vi.waitFor(() => expect(player.getLooper().running).toBe(true));
    expect(player.isPlaying).toBe(true);
    const resumedFrame = rig.frame;
    render(2.2);
    const after = played.slice(before);
    expect(after.length).toBeGreaterThan(3);
    expect(after[0].bar).toBeGreaterThanOrEqual(reachedBar - 1e-9);
    expect(after[0].bar - reachedBar).toBeLessThan(.25 + 1e-9);
    for (const event of after) expect(event.frame).toBe(Math.ceil(resumedFrame + (event.bar - reachedBar) * 2 * RATE - 1e-6));
    player.dispose();
  });

  it("bends from G major to A minor with the #165 rule, heard in the PCM, and keeps a pinned member's pitch", async () => {
    // Recorded in G major. C#5 is borrowed, between degrees 4 (C5) and 5 (D5).
    const g = (id: string, name: string, at: number) => note(id, name, at, "G", "major");
    const tune = [g("g1", "G4", 0), g("g2", "B4", 250), g("g3", "C5", 500), g("g4", "C#5", 750), g("g5", "D5", 1000), g("g6", "F#5", 1250)];
    // Hand-worked: degrees map major to minor (B→Bb, F#→F); C# keeps between
    // the images of C and D, and the tie goes down to C; then up a tone to A.
    const expected: Record<string, number> = { g1: 69, g2: 72, g3: 74, g4: 74, g5: 76, g6: 79 };
    const kept = [g("p1", "D5", 1600)];
    const { player, played } = setup();
    // A take starts at its first note: the pinned member sits 0.8 bar in, clear of the tune.
    await start(player, [member("a", tune, { key: "G", mode: "major" }),
      member("p", kept, { key: "G", mode: "major", pinned: true, offsetBars: .8 })],
      { key: "A", mode: "minor" });
    render(2.2);
    const heard = played.filter(event => event.bar < 1);
    expect(heard.filter(event => event.phraseId === "a")).toHaveLength(6);
    for (const event of heard) {
      const wanted = event.phraseId === "a" ? expected[event.sourceNoteId] : 74;
      expect(Note.midi(event.noteName), event.sourceNoteId).toBe(wanted);
      // The sound itself: the pitch in the PCM while the note holds.
      expect(heardMidi(event.frame + 200, event.frame + 1100), event.sourceNoteId).toBeCloseTo(wanted, 1);
    }
    // Contour can collapse but never reverse (#165).
    const bent = heard.filter(event => event.phraseId === "a").map(event => Note.midi(event.noteName)!);
    expect(bent).toEqual([...bent].sort((x, y) => x - y));
    expect(heard.filter(event => event.phraseId === "p").every(event => event.key === "G" && event.mode === "major")).toBe(true);
    player.dispose();
  });

  it("never steps the UIBeat cursor backward across a bar change and tempo changes, and tracks the transport", async () => {
    const { player, uiBeat, tick } = setup();
    await start(player, [member("a", melody)]);
    const positions: number[] = [];
    const step = (seconds: number) => {
      for (let index = 0; index < seconds / .05; index++) {
        render(.05);
        tick();
        positions.push(uiBeat.snapshot.barPosition!);
      }
    };
    step(.6);
    void player.join(member("c", bass), { bar: 1 });
    void player.setTempo(90, { bar: 1 });
    step(1.5);
    await player.setTempo(180);
    step(1);
    expect(positions.every(position => Number.isFinite(position))).toBe(true);
    expect(positions.every((position, index) => !index || position >= positions[index - 1])).toBe(true);
    expect(positions.at(-1)!).toBeCloseTo(rig.core.transport.barAt(rig.frame), 2);
    player.dispose();
  });

  it("keeps every surviving attack while a cold 512-note member loads and joins", async () => {
    // Table building is on the main thread; the audio thread never waits for it.
    const dense = Array.from({ length: 512 }, (_, index) => note(`d${index}`, ["C4", "E4", "G4", "B4"][index % 4], index * 3.9));
    const { player, played } = setup();
    await start(player, [member("a", melody)]);
    let arrive!: () => void;
    rig.gates.set("cello", new Promise<void>(resolve => { arrive = resolve; }));
    const joining = player.join(member("big", dense, { instrument: "cello" }));
    render(1.3);
    arrive();
    const receipt = await joining;
    render(2.5);
    // a's notes sit on every quarter bar, from bar 0 to the end, with none lost.
    const bars = played.filter(event => event.phraseId === "a" && event.frame < rig.frame).map(event => event.bar);
    const quarters = Math.ceil(rig.frame / (RATE / 2));
    expect(bars).toEqual(Array.from({ length: quarters }, (_, index) => index / 4));
    const big = played.filter(event => event.phraseId === "big");
    expect(big.length).toBeGreaterThan(500);
    expect(big[0].bar).toBeGreaterThanOrEqual(receipt.appliedBar!);
    player.dispose();
  });
});

/** Third review of #199. */
describe("the Looper after the third review", () => {
  beforeEach(() => {
    rig.frame = 0;
    rig.generation = 1;
    rig.queued = [];
    rig.commands = [];
    rig.pins.clear();
    rig.refused.clear();
    rig.gates.clear();
    rig.pcm = [];
    rig.down = 0;
    newCore();
  });
  afterEach(() => { rig.listeners.clear(); });

  const begin = (player: ReturnType<typeof setup>["player"], members: LooperMemberRequest[]) =>
    player.start({ bpm: 120, target: { key: "C", mode: "major" }, members });
  async function rebuild() {
    rig.generation++;
    newCore();
    for (const listener of [...rig.listeners]) listener.onRendererReset?.();
    await resumeAudioContext(context as unknown as AudioContext);
  }

  it("joins two members at once after a rebuild with no members: neither is left loading", async () => {
    const { player, played } = setup();
    await begin(player, [member("a", melody)]);
    render(.5);
    await player.leave("a");
    render(.2);
    await rebuild();
    await vi.waitFor(() => expect(player.getLooper().recovering).toBe(false));
    await Promise.all([player.join(member("a", melody)), player.join(member("c", bass))]);
    render(2.2);
    expect(player.getLooper().members.map(entry => [entry.id, entry.loading])).toEqual([["a", false], ["c", false]]);
    expect(played.some(event => event.phraseId === "a" && event.frame > 1.5 * RATE)).toBe(true);
    expect(played.some(event => event.phraseId === "c" && event.frame > 1.5 * RATE)).toBe(true);
    player.dispose();
  });

  it("joins a member whose bank finishes loading during a restore, on the restored renderer", async () => {
    const { player, played } = setup();
    await begin(player, [member("a", melody)]);
    render(.5);
    let arrive!: () => void;
    rig.gates.set("cello", new Promise<void>(resolve => { arrive = resolve; }));
    const joining = player.join(member("c", bass, { instrument: "cello" }));
    render(.3);
    await rebuild();
    await vi.waitFor(() => expect(player.getLooper().running).toBe(true));
    arrive();
    rig.gates.delete("cello");
    const receipt = await joining;
    expect(receipt.cancelled).toBeUndefined();
    render(2.2);
    expect(player.getLooper().members.find(entry => entry.id === "c")).toMatchObject({ loading: false });
    expect(played.some(event => event.phraseId === "c")).toBe(true);
    expect([...rig.pins.values()].flat().sort()).toEqual(["cello", "sine"]);
    player.dispose();
  });

  it("refuses to start with a member that has no length, changing nothing, and a rebuild still restores", async () => {
    const { player, played } = setup();
    await begin(player, [member("a", melody)]);
    render(.5);
    const empty = member("e", [], { lengthBars: undefined, config: { sourceBpm: 120, bpm: 120 } });
    await expect(begin(player, [member("a", melody), empty])).rejects.toThrow(RangeError);
    await expect(player.join(empty)).rejects.toThrow(RangeError);
    expect(player.getLooper()).toMatchObject({ running: true });
    expect(player.getLooper().members.map(entry => entry.id)).toEqual(["a"]);
    const before = played.length;
    render(1);
    expect(played.length).toBeGreaterThan(before);
    await rebuild();
    await vi.waitFor(() => expect(player.getLooper().running).toBe(true));
    const restored = played.length;
    render(1.2);
    expect(played.slice(restored).some(event => event.phraseId === "a")).toBe(true);
    player.dispose();
  });

  it("lets a later un-solo beat the solo of a member re-joining at a bar", async () => {
    const { player, played } = setup();
    await begin(player, [member("a", melody), member("b", pinned)]);
    render(.3);
    await player.solo("b");
    void player.join(member("b", pinned), { bar: 2 });
    await vi.waitFor(() => expect(rig.commands.some(command => command.type === "transport-change"
      && command.boundary !== "immediate")).toBe(true));
    await player.solo(null);
    render(6);
    expect(player.getLooper().soloId).toBeNull();
    expect(played.filter(event => event.phraseId === "a" && event.frame >= 2 * 2 * RATE).length).toBeGreaterThan(2);
    player.dispose();
  });

  it("recovers from a second rebuild while the Looper is empty, instead of stopping", async () => {
    const interrupted: Error[] = [];
    const target = new EventTarget();
    const played: Played[] = [];
    target.addEventListener("note-played", event => played.push((event as CustomEvent).detail));
    const player = createPatternPlayer({
      audio: { getContext: () => context as unknown as AudioContext, ensureReady: async () => ({}) as AudioNode },
      uiBeat: new UIBeatClock({ observeEnvironment: false }), target,
      requestFrame: () => 1, cancelFrame: () => {}, onInterrupted: error => interrupted.push(error),
    });
    await begin(player, [member("a", melody)]);
    render(.6);
    await player.leave("a");
    render(.2);
    await rebuild();
    await vi.waitFor(() => expect(player.getLooper().recovering).toBe(false));
    render(.2);
    await rebuild();
    await vi.waitFor(() => expect(player.getLooper().recovering).toBe(false));
    expect(interrupted).toEqual([]);
    expect(player.isPlaying).toBe(true);
    await player.join(member("a", melody));
    render(1.2);
    expect(played.some(event => event.phraseId === "a" && event.frame > rig.frame - RATE)).toBe(true);
    player.dispose();
  });
});
