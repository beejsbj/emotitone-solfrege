import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIO_IDLE_MS, manageAudioLifecycle } from "@/services/audioLifecycle";
import { RenderCostMeter } from "@/audio/live/renderCost";
import { getLivePlayback, getLivePlaybackFailure, prepareLivePlayback, readLiveRenderCost } from "@/services/livePlayback";
import { createPatternPlayer } from "@/services/patternTransport";
import { getAudioContext } from "@/services/superdoughAudio";
import { createPhoneGate } from "./runner";

// A piano download that takes as long as the test says, and then is refused,
// so the run ends at its summary without needing a worklet.
const load = vi.hoisted(() => ({ finish: undefined as undefined | (() => void) }));
vi.mock("@/services/livePlayback", async importOriginal => ({
  ...await importOriginal<typeof import("@/services/livePlayback")>(),
  prepareLivePlayback: vi.fn(() => new Promise<void>(resolve => { load.finish = resolve; })),
  getLivePlaybackFailure: vi.fn(() => ({ kind: "load", reason: "refused by the test" })),
  getLivePlayback: vi.fn(),
  readLiveRenderCost: vi.fn(),
}));
vi.mock("@/services/patternTransport", async importOriginal => ({
  ...await importOriginal<typeof import("@/services/patternTransport")>(),
  createPatternPlayer: vi.fn(),
  setProductionPatternPlayer: vi.fn(),
}));

function fakeContext() {
  const context = {
    state: "running", currentTime: 0, sampleRate: 48000, baseLatency: 0, outputLatency: 0,
    suspend: vi.fn(async () => { context.state = "suspended"; }),
    resume: vi.fn(async () => { context.state = "running"; }),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  };
  return context;
}

describe("phone gate run", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance", "Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the context awake through a piano load longer than the idle timeout, then lets it go", async () => {
    const context = fakeContext();
    vi.mocked(getAudioContext).mockReturnValue(context as unknown as AudioContext);
    // The app's idle manager: a running context silent for 30 s is suspended.
    const disposeLifecycle = manageAudioLifecycle(context as unknown as AudioContext, { isSounding: () => false });
    const gate = createPhoneGate();
    try {
      gate.run();
      await vi.advanceTimersByTimeAsync(AUDIO_IDLE_MS + 15_000);
      expect(prepareLivePlayback).toHaveBeenCalled();
      expect(gate.state.phase).toBe("loading");
      expect(context.suspend).not.toHaveBeenCalled();

      // The load ends (refused here), the run summarises, and the lease is released.
      load.finish?.();
      await vi.advanceTimersByTimeAsync(0);
      expect(gate.state.phase).toBe("done");
      expect(gate.state.summary).toContain("The piano is not in the worklet: refused by the test");
      await vi.advanceTimersByTimeAsync(AUDIO_IDLE_MS + 1000);
      expect(context.suspend).toHaveBeenCalledOnce();
    } finally {
      gate.dispose();
      disposeLifecycle();
    }
  });

  it("reads the worklet's render cost into the summary when Stop is tapped mid-soak", async () => {
    const context = fakeContext();
    vi.mocked(getAudioContext).mockReturnValue(context as unknown as AudioContext);
    vi.mocked(prepareLivePlayback).mockResolvedValueOnce();
    vi.mocked(getLivePlaybackFailure).mockReturnValue(undefined);
    // The loop plays on a stand-in player: the bar follows the context's clock (2.4 s a bar at 100 BPM).
    vi.mocked(createPatternPlayer).mockReturnValue({
      start: vi.fn(async () => {}), dispose: vi.fn(), getLooper: () => ({ members: [] }),
      barAtAudioTime: (time: number) => time / 2.4,
    } as never);
    const meter = new RenderCostMeter("performance");
    for (const ms of [.4, .5, .6, .7]) meter.record(ms);
    vi.mocked(readLiveRenderCost).mockImplementation(() => Promise.resolve(meter.snapshot()));
    const gate = createPhoneGate();
    try {
      gate.run();
      context.currentTime = 2.4;
      await vi.advanceTimersByTimeAsync(200);
      expect(gate.state.phase).toBe("soak");
      gate.stop();
      await vi.advanceTimersByTimeAsync(0);
      expect(gate.state.phase).toBe("done");
      // Stopped before a whole soak bar: the reading is kept, and graded partial rather than pass.
      expect(gate.state.summary).toMatch(/\[PARTIAL\] Worklet render cost per quantum: p50 0\.60 ms · p99 0\.70 ms/);
      expect(gate.state.summary).not.toContain("[NOT RUN] Worklet render cost");
    } finally {
      gate.dispose();
      vi.mocked(getLivePlaybackFailure).mockReturnValue({ kind: "load", reason: "refused by the test" });
    }
  });

  it("stays done when Stop is tapped while the soak's render-cost read is still pending", async () => {
    const context = fakeContext();
    vi.mocked(getAudioContext).mockReturnValue(context as unknown as AudioContext);
    vi.mocked(prepareLivePlayback).mockResolvedValueOnce();
    vi.mocked(getLivePlaybackFailure).mockReturnValue(undefined);
    vi.mocked(createPatternPlayer).mockReturnValue({
      start: vi.fn(async () => {}), dispose: vi.fn(), getLooper: () => ({ members: [] }),
      barAtAudioTime: (time: number) => time / 2.4,
    } as never);
    const meter = new RenderCostMeter("performance");
    meter.record(.5);
    // Arming answers at once; every later read waits until the test lets it go.
    const pending: (() => void)[] = [];
    const release = () => pending.splice(0).forEach(resolve => resolve());
    vi.mocked(readLiveRenderCost).mockImplementation((arm?: boolean) => arm
      ? Promise.resolve(meter.snapshot())
      : new Promise(resolve => { pending.push(() => resolve(meter.snapshot())); }));
    const gate = createPhoneGate();
    try {
      gate.run();
      context.currentTime = 2.4;
      await vi.advanceTimersByTimeAsync(200);
      expect(gate.state.phase).toBe("soak");
      // The soak runs to its end and waits on the render-cost read.
      context.currentTime = 2.4 * 100;
      await vi.advanceTimersByTimeAsync(1000);
      expect(pending).toHaveLength(1);
      gate.stop();
      await vi.advanceTimersByTimeAsync(1000);
      expect(gate.state.phase).toBe("done");
      // The soak's own read now settles, after the Stop.
      release();
      await vi.advanceTimersByTimeAsync(0);
      expect(gate.state.phase).toBe("done");
    } finally {
      gate.dispose();
      vi.mocked(getLivePlaybackFailure).mockReturnValue({ kind: "load", reason: "refused by the test" });
    }
  });

  it("releases a pad note still held when the step changes, so it cannot sound on into the next", () => {
    const context = fakeContext();
    vi.mocked(getAudioContext).mockReturnValue(context as unknown as AudioContext);
    const renderer = { press: vi.fn(), release: vi.fn() };
    vi.mocked(getLivePlayback).mockReturnValue(renderer as never);
    const gate = createPhoneGate();
    try {
      gate.run();
      gate.state.phase = "soak";
      gate.padDown(new PointerEvent("pointerdown"));
      expect(renderer.press).toHaveBeenCalledOnce();
      const owner = renderer.press.mock.calls[0][0];
      // The soak ends with the finger still down: the pad and its pointerup leave the page.
      gate.state.phase = "ear";
      expect(renderer.release).toHaveBeenCalledExactlyOnceWith(owner);
      // A later stray pointerup releases nothing twice.
      gate.padUp();
      expect(renderer.release).toHaveBeenCalledOnce();
    } finally {
      gate.dispose();
    }
  });
});
