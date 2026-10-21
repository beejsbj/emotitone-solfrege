import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const context = Object.assign(new EventTarget(), { createAnalyser: () => ({ fftSize: 2048, getFloatTimeDomainData: vi.fn(), disconnect: vi.fn() }), sampleRate: 48000, state: "running", resume: vi.fn().mockResolvedValue(undefined) });
  const master = { connect: vi.fn(), disconnect: vi.fn(), id: "shared-master" };
  return {
    context,
    master,
    initAudio: vi.fn().mockResolvedValue(undefined),
    setContext: vi.fn(),
    setController: vi.fn(),
    constructContext: vi.fn(() => context),
    getContext: vi.fn(() => { throw new Error("superdough must not own the context") }),
    getController: vi.fn(() => ({ output: { destinationGain: master } })),
  };
});

vi.mock("superdough", () => ({
  setAudioContext: mocks.setContext,
  setSuperdoughAudioController: mocks.setController,
  getAudioContext: mocks.getContext,
  getSuperdoughAudioController: mocks.getController,
  initAudio: mocks.initAudio,
}));

describe("production audio graph ownership", () => {
  beforeEach(async () => {
    class Gain {
      gain = { value: 1 };
      connect = vi.fn((target: unknown) => target);
      disconnect = vi.fn();
    }
    vi.stubGlobal("GainNode", Gain);
    vi.stubGlobal("AudioContext", mocks.constructContext);
    vi.useFakeTimers();
    vi.resetModules();
    const { EngineAudioGraph } = await import("@/audio/effects");
    vi.spyOn(EngineAudioGraph.prototype, "getOrbit").mockReturnValue({ ready: async () => {} } as any);
    vi.clearAllMocks();
    mocks.context.state = "running";
    mocks.context.sampleRate = 48000;
    mocks.initAudio.mockResolvedValue(undefined);
    mocks.context.resume.mockResolvedValue(undefined);
  });

  afterEach(() => { mocks.context.state = "closed"; mocks.context.dispatchEvent(new Event("statechange")); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("creates one app graph and lends it to the native fallback", async () => {
    const runtime = await import("@/services/audioRuntime");
    expect(runtime.getAudioContext()).toBe(mocks.context);
    const master = runtime.getMasterGain();
    expect(master).toBeTruthy();
    expect(mocks.setController).toHaveBeenCalledWith(expect.objectContaining({ master, audioContext: mocks.context }));
    await Promise.all([runtime.initializeAudio(), runtime.initializeAudio()]);
    expect(runtime.getAudioContext()).toBe(mocks.context);
    expect(mocks.constructContext).toHaveBeenCalledOnce();
    expect(mocks.getContext).not.toHaveBeenCalled();
    expect(mocks.setContext).toHaveBeenCalledWith(mocks.context);
    expect(mocks.initAudio).toHaveBeenCalledOnce();
    expect(mocks.initAudio).toHaveBeenCalledWith({ maxPolyphony: 64 });
  });

  it("prepares a suspended graph without waiting for a user gesture or replacing its context", async () => {
    const runtime = await import("@/services/audioRuntime");
    mocks.context.state = "suspended";
    mocks.context.resume.mockReturnValue(new Promise(() => {}));
    await runtime.initializeAudio();
    await runtime.initializeAudio();
    expect(mocks.context.resume).not.toHaveBeenCalled();
    expect(mocks.initAudio).toHaveBeenCalledOnce();
    expect(runtime.getAudioContext()).toBe(mocks.context);
  });

  it("waits for effect rebuilds at the lifecycle sample-rate gate", async () => {
    const runtime = await import("@/services/audioRuntime");
    await runtime.initializeAudio();
    const graph = mocks.setController.mock.calls[0][0];
    let finish!: () => void;
    const rebuild = vi.spyOn(graph, "rebuildEffects").mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
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
    vi.mocked(EngineAudioGraph.prototype.getOrbit).mockReturnValue({ ready: () => new Promise(() => {}) } as any);
    const runtime = await import("@/services/audioRuntime");
    await runtime.initializeAudio();
    expect(mocks.initAudio).toHaveBeenCalledOnce();
    expect(runtime.getMasterGain()).toBeTruthy();
  });

  it("allows initialization to retry after failure", async () => {
    const runtime = await import("@/services/audioRuntime");
    mocks.initAudio.mockRejectedValueOnce(new Error("worklets unavailable"));
    await expect(runtime.initializeAudio()).rejects.toThrow("worklets unavailable");
    await runtime.initializeAudio();
    expect(mocks.initAudio).toHaveBeenCalledTimes(2);
    expect(mocks.initAudio.mock.calls).toEqual([
      [{ maxPolyphony: 64 }],
      [{ maxPolyphony: 64 }],
    ]);
    expect(runtime.getAudioContext()).toBe(mocks.context);
  });
});
