import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const context = { state: "running", resume: vi.fn().mockResolvedValue(undefined) };
  const master = { id: "shared-master" };
  return {
    context,
    master,
    initAudio: vi.fn().mockResolvedValue(undefined),
    getContext: vi.fn(() => context),
    getController: vi.fn(() => ({ output: { destinationGain: master } })),
  };
});

vi.mock("superdough", () => ({
  getAudioContext: mocks.getContext,
  getSuperdoughAudioController: mocks.getController,
  initAudio: mocks.initAudio,
}));

describe("production audio graph ownership", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.context.state = "running";
    mocks.initAudio.mockResolvedValue(undefined);
    mocks.context.resume.mockResolvedValue(undefined);
  });

  it("shares the native graph and coalesces concurrent initialization", async () => {
    const runtime = await import("@/services/audioRuntime");
    expect(runtime.getAudioContext()).toBe(mocks.context);
    expect(runtime.getMasterGain()).toBe(mocks.master);
    await Promise.all([runtime.initializeAudio(), runtime.initializeAudio()]);
    expect(runtime.getAudioContext()).toBe(mocks.context);
    expect(mocks.getContext).toHaveBeenCalledOnce();
    expect(mocks.initAudio).toHaveBeenCalledOnce();
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

  it("allows initialization to retry after failure", async () => {
    const runtime = await import("@/services/audioRuntime");
    mocks.initAudio.mockRejectedValueOnce(new Error("worklets unavailable"));
    await expect(runtime.initializeAudio()).rejects.toThrow("worklets unavailable");
    await runtime.initializeAudio();
    expect(mocks.initAudio).toHaveBeenCalledTimes(2);
    expect(runtime.getAudioContext()).toBe(mocks.context);
  });
});
