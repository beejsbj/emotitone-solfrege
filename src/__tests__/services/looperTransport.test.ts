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
import { getTransportGrid } from "@/services/transportGrid";
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
    rig.core.render([new Float32Array(QUANTUM), new Float32Array(QUANTUM)], rig.frame);
    rig.frame += QUANTUM;
    rig.deliver();
  }
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

  it("publishes its bar grid to main-thread play styles while it runs, and keeps one UIBeat generation", async () => {
    const { player, uiBeat, tick } = setup();
    expect(getTransportGrid()).toBeUndefined();
    await player.start({ bpm: 120, target: { key: "C", mode: "major" }, members: [member("a", melody)] });
    render(.75);
    expect(getTransportGrid()).toEqual({ at: 0, bar: 0, bpm: 120 });
    tick();
    const generation = uiBeat.snapshot.generation;
    await player.setTempo(180);
    render(.3);
    const grid = getTransportGrid()!;
    expect(grid.bpm).toBe(180);
    expect(grid.bar).toBeCloseTo(.75 * 120 / 240, 2);
    await player.join(member("c", bass));
    await player.bend({ key: "D", mode: "minor" });
    await player.leave("c");
    render(.2);
    tick();
    expect(uiBeat.snapshot.generation).toBe(generation);
    player.stop();
    expect(getTransportGrid()).toBeUndefined();
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
