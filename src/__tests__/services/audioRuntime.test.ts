import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/services/audioRuntime");

const mocks = vi.hoisted(() => {
  const context = Object.assign(new EventTarget(), {
    createAnalyser: () => ({ fftSize: 2048, getFloatTimeDomainData: vi.fn(), disconnect: vi.fn() }),
    sampleRate: 48000, state: "running", resume: vi.fn().mockResolvedValue(undefined), destination: {},
  });
  return { context, constructContext: vi.fn(() => context) };
});

describe("production audio graph ownership", () => {
  beforeEach(async () => {
    class Gain {
      gain = { value: 1 };
      connect = vi.fn((target: unknown) => target);
      disconnect = vi.fn();
    }
    vi.stubGlobal("GainNode", Gain);
    vi.stubGlobal("AudioContext", mocks.constructContext);
    Object.assign(mocks.context, {
      createGain: () => new Gain(),
    });
    vi.useFakeTimers();
    vi.resetModules();
    const { EngineAudioGraph } = await import("@/audio/effects");
    vi.spyOn(EngineAudioGraph.prototype, "getOrbit").mockReturnValue({ ready: async () => {} } as never);
    vi.clearAllMocks();
    mocks.context.state = "running";
    mocks.context.sampleRate = 48000;
    mocks.context.resume.mockResolvedValue(undefined);
  });

  afterEach(() => { mocks.context.state = "closed"; mocks.context.dispatchEvent(new Event("statechange")); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("creates one context and one master for the app, however often it is asked", async () => {
    const runtime = await import("@/services/audioRuntime");
    expect(runtime.getAudioContext()).toBe(mocks.context);
    const master = runtime.getMasterGain();
    expect(master).toBeTruthy();
    await Promise.all([runtime.initializeAudio(), runtime.initializeAudio()]);
    expect(runtime.getAudioContext()).toBe(mocks.context);
    expect(runtime.getMasterGain()).toBe(master);
    expect(mocks.constructContext).toHaveBeenCalledOnce();
  });

  it("prepares a suspended graph without waiting for a user gesture or replacing its context", async () => {
    const { EngineAudioGraph } = await import("@/audio/effects");
    const runtime = await import("@/services/audioRuntime");
    mocks.context.state = "suspended";
    mocks.context.resume.mockReturnValue(new Promise(() => {}));
    await runtime.initializeAudio();
    await runtime.initializeAudio();
    expect(mocks.context.resume).not.toHaveBeenCalled();
    // The live room is warmed once.
    expect(vi.mocked(EngineAudioGraph.prototype.getOrbit).mock.calls.filter(([id]) => id === runtime.LIVE_ORBIT))
      .toHaveLength(1);
    expect(runtime.getAudioContext()).toBe(mocks.context);
  });

  it("waits for effect rebuilds at the lifecycle sample-rate gate", async () => {
    const { EngineAudioGraph } = await import("@/audio/effects");
    let finish!: () => void;
    const rebuild = vi.spyOn(EngineAudioGraph.prototype, "rebuildEffects")
      .mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    const runtime = await import("@/services/audioRuntime");
    await runtime.initializeAudio();
    mocks.context.state = "interrupted";
    mocks.context.resume.mockImplementation(async () => {
      mocks.context.state = "running";
      mocks.context.sampleRate = 44100;
    });
    const { resumeAudioContext } = await import("@/services/audioLifecycle");
    let ready = false;
    const gate = resumeAudioContext(mocks.context as unknown as AudioContext)!.then(() => { ready = true; });
    await Promise.resolve(); await Promise.resolve();
    expect(rebuild).toHaveBeenCalledOnce();
    expect(ready).toBe(false);
    finish(); await gate;
    expect(ready).toBe(true);
    expect(resumeAudioContext(mocks.context as unknown as AudioContext)).toBeUndefined();
    expect(rebuild).toHaveBeenCalledOnce();
  });

  it("starts audio while the optional room impulse is still rendering", async () => {
    const { EngineAudioGraph } = await import("@/audio/effects");
    vi.mocked(EngineAudioGraph.prototype.getOrbit).mockReturnValue({ ready: () => new Promise(() => {}) } as never);
    const runtime = await import("@/services/audioRuntime");
    await runtime.initializeAudio();
    expect(runtime.getMasterGain()).toBeTruthy();
  });

  it("allows initialization to retry after failure", async () => {
    const { EngineAudioGraph } = await import("@/audio/effects");
    vi.mocked(EngineAudioGraph.prototype.getOrbit).mockImplementationOnce(() => { throw new Error("no room bus"); });
    const runtime = await import("@/services/audioRuntime");
    await expect(runtime.initializeAudio()).rejects.toThrow("no room bus");
    await runtime.initializeAudio();
    expect(runtime.getAudioContext()).toBe(mocks.context);
  });
});

describe("the context's buffer (BJS-590)", () => {
  /** Each construction is a context of its own, recording what it was asked for. */
  const made: { options: unknown[]; state: string }[] = [];
  beforeEach(() => {
    made.length = 0;
    class Gain { gain = { value: 1 }; connect = vi.fn((target: unknown) => target); disconnect = vi.fn(); }
    vi.stubGlobal("GainNode", Gain);
    vi.stubGlobal("AudioContext", vi.fn(function (this: unknown, ...options: unknown[]) {
      const context = Object.assign(new EventTarget(), { options, state: "suspended", sampleRate: 48000, destination: {} });
      made.push(context);
      return context;
    }));
    vi.resetModules();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("leaves production on the browser's default: the context is created with no options", async () => {
    const runtime = await import("@/services/audioRuntime");
    const context = runtime.getAudioContext();
    expect(made.map(entry => entry.options)).toEqual([[]]);
    expect(runtime.latencyHintOf(context)).toBeNull();
  });

  it("creates the next context with the hint asked for, and keeps it for a replacement", async () => {
    const runtime = await import("@/services/audioRuntime");
    expect(runtime.setLatencyHintOverride("playback")).toBe(true);
    const first = runtime.getAudioContext();
    expect(runtime.latencyHintOf(first)).toBe("playback");
    // A live context keeps its buffer: asking again changes only the next one.
    expect(runtime.setLatencyHintOverride(0.03)).toBe(false);
    expect(runtime.getAudioContext()).toBe(first);
    expect(runtime.latencyHintOf(first)).toBe("playback");
    made[0].state = "closed";
    const second = runtime.getAudioContext();
    expect(second).not.toBe(first);
    expect(made.map(entry => entry.options)).toEqual([[{ latencyHint: "playback" }], [{ latencyHint: 0.03 }]]);
    expect(runtime.latencyHintOf(second)).toBe(0.03);
  });

  it("falls back to the default when the browser refuses the hint, and says so", async () => {
    const constructor = vi.mocked(AudioContext);
    const original = constructor.getMockImplementation()!;
    constructor.mockImplementationOnce(() => { throw new TypeError("latencyHint not supported"); });
    constructor.mockImplementation(original);
    const runtime = await import("@/services/audioRuntime");
    runtime.setLatencyHintOverride("balanced");
    const context = runtime.getAudioContext();
    expect(made.map(entry => entry.options)).toEqual([[]]);
    expect(runtime.latencyHintOf(context)).toBeNull();
    expect(runtime.latencyHintOf(new EventTarget() as unknown as BaseAudioContext)).toBeUndefined();
  });

  it("reads a link's value: a category in any case, or plain-decimal seconds in (0, 1]; nothing else", async () => {
    const { parseLatencyHint } = await import("@/services/audioRuntime");
    expect(["interactive", "balanced", "playback", " balanced ", "Balanced", "PLAYBACK"].map(parseLatencyHint))
      .toEqual(["interactive", "balanced", "playback", "balanced", "balanced", "playback"]);
    expect(["0.02", "0.256", ".05", "1"].map(parseLatencyHint)).toEqual([.02, .256, .05, 1]);
    const refused = [null, undefined, "", "0", "0.0", "-0.01", "+0.02", "1.5", "1.", "0x1", "1e-9", "2e-2", "Infinity", "NaN",
      "fast", "20ms", "0.02s", "0,02"];
    expect(refused.map(parseLatencyHint)).toEqual(Array(refused.length).fill(undefined));
  });
});
