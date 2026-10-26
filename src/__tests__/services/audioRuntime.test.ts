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
