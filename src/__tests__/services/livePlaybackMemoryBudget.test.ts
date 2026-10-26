import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveResponse, PreparedLiveInstrument } from "@/audio/live/types";
import type { LogNote } from "@/types/patterns";
import type { LooperMemberRequest } from "@/services/patternTransport";

/**
 * Loaded sounds are limited by memory, not by count (BJS-573), observed at the
 * Looper's public seam: the real live-playback manager, the real pattern
 * player and the real worklet render core. Only the sample loader (it returns
 * banks of a chosen size) and the worklet port (it hands commands to the core
 * in-process) are stand-ins.
 */
const RATE = 8000;
const QUANTUM = 128;
const MIB = 1024 * 1024;

const rig = vi.hoisted(() => ({
  core: undefined as unknown as import("@/audio/live/core").LiveAudioCore,
  frame: 0,
  queued: [] as LiveResponse[],
  deliver: () => {},
  /** Source PCM of each sampled bank in bytes; every other name prepares as an oscillator. */
  sampleBytes: {} as Record<string, number>,
  pcm: [] as number[],
}));

vi.mock("@/audio/live/bridge", () => ({
  async createLiveWorklet(_context: unknown, _destination: unknown, callbacks: import("@/audio/liveRenderer").LiveRendererCallbacks) {
    const { LiveAudioCore } = await import("@/audio/live/core");
    rig.core = new LiveAudioCore(RATE, response => { rig.queued.push(response); });
    const waiting = new Map<number, () => void>();
    let serial = 0;
    rig.deliver = () => {
      while (rig.queued.length) {
        const response = rig.queued.shift()!;
        if (response.type === "prepared" || response.type === "forgotten") waiting.get(response.requestId)?.();
        else if (response.type === "event") callbacks.onEvent(response.event);
        else if (response.type === "plan") callbacks.onPlan?.(response.events);
        else if (response.type === "owner-ended") callbacks.onOwnerEnded?.(response.ownerId);
        else if (response.type === "transport-events") {
          callbacks.onTransport?.(response);
          rig.core.command({ type: "transport-recycle", buffer: response.buffer }, rig.frame);
        } else if (response.type === "transport-applied" || response.type === "transport-anchors") callbacks.onTransport?.(response);
      }
    };
    const send = (command: Parameters<typeof rig.core.command>[0]) => { rig.core.command(command, rig.frame); rig.deliver(); };
    const request = (make: (requestId: number) => Parameters<typeof rig.core.command>[0]) => new Promise<void>(resolve => {
      const requestId = ++serial;
      waiting.set(requestId, resolve);
      send(make(requestId));
    });
    return {
      prepare: (instrument: PreparedLiveInstrument) => request(requestId => ({ type: "prepare", requestId, instrument })),
      forget: (instrumentId: string) => request(requestId => ({ type: "forget", requestId, instrumentId, instant: false })),
      press: (ownerId: string, notes: import("@/audio/liveRenderer").LiveInputNote[]) => send({ type: "press", ownerId, notes }),
      release: (ownerId: string) => send({ type: "release", ownerId }),
      clear: () => send({ type: "clear" }),
      configure: (config: Partial<import("@/audio/liveRenderer").LiveConfig>) => send({ type: "configure", config }),
      shape: (envelope: import("@/audio/live/types").LiveEnvelopeOverride) => send({ type: "shape", envelope }),
      effects: (shaping: import("@/audio/liveShaping").LiveShaping) => send({ type: "effects", shaping }),
      transport: (command: import("@/audio/live/transport").TransportCommand) => send(command),
      renderCost: async () => { throw new Error("not measured here"); },
      dispose() {},
    };
  },
}));
vi.mock("@/audio/liveShaping", () => ({ OPEN_CUTOFF_HZ: 12000, createLiveShapingChain: () => ({
  input: {}, room: {}, delay: {}, apply() {}, dispose() {},
}) }));
vi.mock("@/services/audioRuntime", () => ({ getLiveOrbit: () => undefined }));
vi.mock("@/services/preparedLiveInstrument", () => ({
  async prepareLiveInstrument(_context: unknown, instrumentId: string) {
    const bytes = rig.sampleBytes[instrumentId];
    const envelope = { instrumentId, gain: .6, attack: .001, decay: .01, sustain: .8, release: .02 };
    if (bytes === undefined) return { ...envelope, kind: "oscillator", waveform: instrumentId };
    // Untouched pages of a large buffer cost address space, not memory: only the audible burst is written.
    const channel = new Float32Array(bytes / Float32Array.BYTES_PER_ELEMENT);
    for (let frame = 0; frame < 4000; frame++) channel[frame] = .8 * Math.sin(2 * Math.PI * 261.6256 * frame / RATE);
    return { ...envelope, kind: "sample-bank", zoneSelection: "nearest-root",
      zones: [{ id: "z", rootMidi: 60, sampleRate: RATE, channels: [channel] }] };
  },
  releasePreparedLiveInstrument() {},
  getPreparedLiveInstrumentDiagnostics: () => ({ cachedPreparationPcmBytes: 0, preparingPcmBytes: 0, preparationPcmBudgetBytes: 192 * 1024 * 1024 }),
}));

function render(seconds: number) {
  for (let index = 0; index < Math.round(seconds * RATE / QUANTUM); index++) {
    const output = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
    rig.core.render(output, rig.frame);
    rig.frame += QUANTUM;
    for (const sample of output[0]) rig.pcm.push(sample);
    rig.deliver();
  }
}

const rms = (from: number, to: number) => Math.sqrt(rig.pcm.slice(from, to).reduce((sum, value) => sum + value * value, 0) / (to - from));

const audioContext = {
  state: "running" as AudioContextState,
  sampleRate: RATE,
  get currentTime() { return rig.frame / RATE; },
  baseLatency: 0,
  outputLatency: 0,
  audioWorklet: {},
  resume: vi.fn(async () => {}),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

function note(id: string, name: string, at: number): LogNote {
  return { id, note: name, key: "C", mode: "major", scaleDegree: 1, scaleIndex: 0, octave: Number(name.at(-1)),
    pressTime: at, releaseTime: at + 150, duration: 150 } as unknown as LogNote;
}
// One bar at 120 BPM is 2000 ms.
const phrase = [note("n1", "C4", 0), note("n2", "E4", 500), note("n3", "G4", 1000), note("n4", "C4", 1500)];
const member = (id: string, instrument: string): LooperMemberRequest => ({ id, notes: phrase,
  config: { sourceBpm: 120, bpm: 120, patternDurationMs: 2000 }, instrument, key: "C", mode: "major", lengthBars: 1 });

const OSCILLATORS = ["sine", "triangle", "square", "sawtooth"];
const oscillatorMembers = () => OSCILLATORS.flatMap(name => [member(`${name}-1`, name), member(`${name}-2`, name)]);

async function setup() {
  const manager = await import("@/services/livePlayback");
  const { createPatternPlayer, PatternLoadError } = await import("@/services/patternTransport");
  const { UIBeatClock } = await import("@/composables/useUIBeat");
  const { looperFailureOf, looperMessage } = await import("@/services/looperMessages");
  const target = new EventTarget();
  const played: { phraseId: string; frame: number }[] = [];
  target.addEventListener("note-played", event => played.push((event as CustomEvent).detail));
  const player = createPatternPlayer({
    audio: { getContext: () => audioContext as unknown as AudioContext, ensureReady: async () => ({}) as AudioNode },
    uiBeat: new UIBeatClock({ observeEnvironment: false }), target,
    requestFrame: () => 1, cancelFrame: () => {},
  });
  const budget = manager.getLivePlaybackDiagnostics("sine").installedPcmBudgetBytes;
  // Each large bank takes 60% of the budget: one fits, two cannot.
  const large = Math.floor(budget * .6 / MIB) * MIB;
  return { manager, player, played, budget, large, PatternLoadError, say: (error: unknown, instrument: string) => looperMessage(looperFailureOf(error, instrument)) };
}

beforeEach(() => {
  vi.resetModules();
  rig.frame = 0;
  rig.queued = [];
  rig.pcm = [];
  rig.sampleBytes = {};
  vi.stubGlobal("AudioWorkletNode", vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("loaded sounds are limited by memory, not by count", () => {
  it("plays many oscillator members with one large sampled bank, and refuses a second large bank in plain words", async () => {
    const { manager, player, played, budget, large, PatternLoadError, say } = await setup();
    rig.sampleBytes = { piano: large, violin: large };
    // Nine members on five instruments: more than the four a count limit allowed.
    await player.start({ bpm: 120, target: { key: "C", mode: "major" }, members: [...oscillatorMembers(), member("piano-1", "piano")] });
    render(4.2);

    expect(player.getLooper().members).toHaveLength(9);
    for (const entry of player.getLooper().members) {
      expect(played.some(event => event.phraseId === entry.id), `${entry.id} sounded`).toBe(true);
    }
    expect(manager.getLivePlaybackDiagnostics("piano")).toMatchObject({ installedBanks: 5, installedPcmBytes: large, installedPcmBudgetBytes: budget });
    for (const name of [...OSCILLATORS, "piano"]) expect(manager.getLivePlaybackFailure(name), name).toBeUndefined();

    // The sampled bank itself is audible: silence the eight oscillator members and it still sounds.
    for (const entry of oscillatorMembers()) await player.setMember(entry.id, { muted: true });
    render(.5);
    const from = rig.pcm.length;
    render(4);
    expect(rms(from, rig.pcm.length)).toBeGreaterThan(.01);

    // A second large bank cannot fit beside the pinned first one: refused, loudly and without harm.
    const before = played.length;
    const error = await player.join(member("violin-1", "violin")).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PatternLoadError);
    expect(error).toMatchObject({ budget: true, retryable: false });
    expect((error as Error).message).toMatch(/Sample memory is full: this sound needs \d+\.\d MiB, but \d+\.\d MiB of the \d+\.\d MiB sample memory is held by playing loops and keys/);
    expect(say(error, "violin")).toBe("Not enough memory for Violin.");
    expect(say(error, "gm_acoustic_guitar_nylon")).toBe("Not enough memory. Stop a loop.");
    expect(player.getLooper().members).toHaveLength(9);
    expect(manager.getLivePlaybackDiagnostics("piano")).toMatchObject({ installedBanks: 5, installedPcmBytes: large });
    render(2);
    expect(played.length).toBeGreaterThan(before);
    expect(played.some(event => event.phraseId === "violin-1")).toBe(false);
    player.dispose();
  });

  it("makes room by evicting a bank once its member has left, while the oscillators stay loaded", async () => {
    const { manager, player, played, large } = await setup();
    rig.sampleBytes = { piano: large, violin: large };
    await player.start({ bpm: 120, target: { key: "C", mode: "major" }, members: [...oscillatorMembers(), member("piano-1", "piano")] });
    render(.5);
    await expect(player.join(member("violin-1", "violin"))).rejects.toMatchObject({ budget: true });

    await player.leave("piano-1");
    await player.join(member("violin-1", "violin"));
    render(4.2);

    expect(played.some(event => event.phraseId === "violin-1")).toBe(true);
    expect(manager.getLivePlayback("piano")).toBeUndefined();
    expect(manager.getLivePlayback("violin")).toBeDefined();
    expect(manager.getLivePlaybackDiagnostics("violin")).toMatchObject({ installedBanks: 5, installedPcmBytes: large });
    for (const name of OSCILLATORS) expect(manager.getLivePlayback(name), name).toBeDefined();
    expect(played.filter(event => event.phraseId === "sine-1").length).toBeGreaterThan(4);
    player.dispose();
  });
});
