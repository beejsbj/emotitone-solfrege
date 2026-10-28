import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LogNote } from "@/types/patterns";

/**
 * The pattern player against the real audio lifecycle: a running transport
 * is never idle, even through a long silent or muted stretch, and the idle
 * suspend resumes its normal course after Stop.
 */
const mocks = vi.hoisted(() => ({ commands: [] as unknown[] }));

vi.mock("@/services/livePlayback", () => ({
  prepareLivePlayback: vi.fn().mockResolvedValue(undefined),
  getLiveTransport: () => ({ send: (command: unknown) => mocks.commands.push(command), sampleRate: 1000, generation: 1 }),
  getLivePlaybackFailure: () => undefined,
  pinLivePlayback: () => () => {},
  subscribeLivePlayback: () => () => {},
}));
vi.unmock("@/services/audioLifecycle");

import { AUDIO_IDLE_MS, manageAudioLifecycle } from "@/services/audioLifecycle";
import { createPatternPlayer } from "@/services/patternTransport";
import { UIBeatClock } from "@/composables/useUIBeat";

const note = {
  id: "n", note: "C4", key: "C", mode: "major", scaleDegree: 1, scaleIndex: 0, octave: 4,
  pressTime: 0, releaseTime: 200, duration: 200,
} as unknown as LogNote;

const member = (config: object) => ({ id: "take", notes: [note], config, instrument: "sine", key: "C" as const, mode: "major" as const });
const target = { key: "C" as const, mode: "major" as const };

function fakeContext() {
  const context = {
    state: "running", currentTime: 0, sampleRate: 1000, baseLatency: 0, outputLatency: 0,
    suspend: vi.fn(async () => { context.state = "suspended"; }),
    resume: vi.fn(async () => { context.state = "running"; }),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  };
  return context;
}

describe("pattern player audio lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance", "Date"] });
    mocks.commands = [];
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the context awake past the idle threshold while playing, then suspends after Stop", async () => {
    const context = fakeContext();
    // Silent output throughout: a resting (or muted) member makes no sound.
    const dispose = manageAudioLifecycle(context as unknown as AudioContext, { isSounding: () => false });
    const player = createPatternPlayer({
      audio: { getContext: () => context as unknown as AudioContext, ensureReady: async () => ({} as AudioNode) },
      uiBeat: new UIBeatClock({ observeEnvironment: false }),
      target: new EventTarget(),
      requestFrame: () => 0,
      cancelFrame: () => {},
    });
    try {
      // The start's receipt comes from the worklet, which this test has none of.
      void player.start({ bpm: 120, target, members: [member({ sourceBpm: 120, bpm: 120 })] });
      await vi.advanceTimersByTimeAsync(0);
      expect(mocks.commands.at(-1)).toMatchObject({ type: "transport-start" });
      await vi.advanceTimersByTimeAsync(AUDIO_IDLE_MS + 5000);
      expect(context.suspend).not.toHaveBeenCalled();

      player.stop();
      await vi.advanceTimersByTimeAsync(AUDIO_IDLE_MS + 1000);
      expect(context.suspend).toHaveBeenCalledOnce();
    } finally {
      player.dispose();
      dispose();
    }
  });

  it("releases its hold when a cold first start fails", async () => {
    const context = fakeContext();
    const dispose = manageAudioLifecycle(context as unknown as AudioContext, { isSounding: () => false });
    const player = createPatternPlayer({
      audio: {
        getContext: () => context as unknown as AudioContext,
        ensureReady: async () => { throw new Error("catalog download failed"); },
      },
      uiBeat: new UIBeatClock({ observeEnvironment: false }),
      target: new EventTarget(),
      requestFrame: () => 0,
      cancelFrame: () => {},
    });
    try {
      await expect(player.start({ bpm: 120, target, members: [member({})] })).rejects.toThrow("catalog download failed");
      expect(mocks.commands).toEqual([]);
      await vi.advanceTimersByTimeAsync(AUDIO_IDLE_MS + 1000);
      expect(context.suspend).toHaveBeenCalledOnce();
    } finally {
      player.dispose();
      dispose();
    }
  });
});
