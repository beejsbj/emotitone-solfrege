import type { LiveAudioSource } from "@/services/liveAudio";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  subscribe: vi.fn(),
  release: vi.fn(),
  startLivePitchMonitor: vi.fn(),
  stopMonitor: vi.fn(),
}));

vi.mock("@/services/liveAudio", () => ({
  liveAudioInput: { acquire: mocks.acquire, subscribe: mocks.subscribe },
}));

vi.mock("@/services/livePitch", () => ({
  startLivePitchMonitor: mocks.startLivePitchMonitor,
}));

import { startMicrophoneCapture } from "@/services/microphoneCapture";

describe("microphone capture", () => {
  let recorder: FakeMediaRecorder | undefined;
  let source: LiveAudioSource | null;
  const sourceListeners = new Set<(source: LiveAudioSource | null) => void>();
  function endSource() {
    source = null;
    sourceListeners.forEach((listener) => listener(null));
  }

  class FakeMediaRecorder {
    state: RecordingState = "inactive";
    mimeType = "audio/webm";
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    onstop: (() => void) | null = null;

    constructor() {
      recorder = this;
    }

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      this.onstop?.();
    }

    fail() {
      this.state = "inactive";
      this.onerror?.();
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    recorder = undefined;
    source = { stream: {} } as LiveAudioSource;
    sourceListeners.clear();
    mocks.subscribe.mockImplementation((listener) => {
      sourceListeners.add(listener);
      listener(source);
      return () => sourceListeners.delete(listener);
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    mocks.acquire.mockResolvedValue({
      source,
      release: mocks.release,
    });
    mocks.release.mockImplementation(async () => endSource());
    mocks.stopMonitor.mockResolvedValue(undefined);
    mocks.startLivePitchMonitor.mockResolvedValue({ stop: mocks.stopMonitor });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports a lost input, rejects the recording, and releases its resources", async () => {
    const onError = vi.fn();
    const capture = await startMicrophoneCapture(vi.fn(), onError);

    endSource();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Microphone input ended." }),
    );
    await expect(capture.stop()).rejects.toThrow("Microphone input ended.");
    expect(recorder?.state).toBe("inactive");
    expect(mocks.stopMonitor).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(sourceListeners.size).toBe(0);
  });

  it("cleans up a monitor that finishes starting after its input disappears", async () => {
    let finishMonitor!: (monitor: { stop: typeof mocks.stopMonitor }) => void;
    mocks.startLivePitchMonitor.mockReturnValueOnce(new Promise((resolve) => {
      finishMonitor = resolve;
    }));
    const onError = vi.fn();
    const onFrame = vi.fn();
    const starting = startMicrophoneCapture(onFrame, onError);
    await vi.waitFor(() => expect(mocks.startLivePitchMonitor).toHaveBeenCalled());

    endSource();
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(sourceListeners.size).toBe(0);
    mocks.startLivePitchMonitor.mock.calls[0][1]({ voiced: true });
    finishMonitor({ stop: mocks.stopMonitor });

    await expect(starting).rejects.toThrow("Microphone input ended.");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onFrame).not.toHaveBeenCalled();
    expect(recorder).toBeUndefined();
    expect(mocks.stopMonitor).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(sourceListeners.size).toBe(0);
  });

  it("rejects an input that disappeared before the source subscription was attached", async () => {
    source = null;
    const onError = vi.fn();

    await expect(startMicrophoneCapture(vi.fn(), onError)).rejects.toThrow("Microphone input ended.");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(mocks.startLivePitchMonitor).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(sourceListeners.size).toBe(0);
  });

  it.each(["stop", "cancel"] as const)("does not report its own %s cleanup as lost input", async (action) => {
    const onError = vi.fn();
    const capture = await startMicrophoneCapture(vi.fn(), onError);

    await capture[action]();

    expect(onError).not.toHaveBeenCalled();
    expect(sourceListeners.size).toBe(0);
    expect(mocks.stopMonitor).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes and releases the lease when monitor startup fails", async () => {
    mocks.startLivePitchMonitor.mockRejectedValueOnce(new Error("Monitor failed."));
    const onError = vi.fn();

    await expect(startMicrophoneCapture(vi.fn(), onError)).rejects.toThrow("Monitor failed.");

    expect(onError).not.toHaveBeenCalled();
    expect(sourceListeners.size).toBe(0);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("reports recorder failure and releases its shared audio lease", async () => {
    const onError = vi.fn();
    const capture = await startMicrophoneCapture(vi.fn(), onError);

    recorder?.fail();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "The microphone recording failed." }),
    );
    await expect(capture.stop()).rejects.toThrow(
      "The microphone recording failed.",
    );
    expect(sourceListeners.size).toBe(0);
    expect(mocks.stopMonitor).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("does not finish stop or cancellation until the microphone lease is released", async () => {
    let releaseLease!: () => void;
    mocks.release.mockReturnValueOnce(new Promise<void>((resolve) => {
      releaseLease = resolve;
    }));
    const capture = await startMicrophoneCapture(vi.fn());
    const onStopped = vi.fn();
    const onCancelled = vi.fn();
    const stopped = capture.stop().catch(() => undefined).then(onStopped);
    const cancelled = capture.cancel().then(onCancelled);
    await vi.waitFor(() => expect(mocks.release).toHaveBeenCalledTimes(1));

    expect(onStopped).not.toHaveBeenCalled();
    expect(onCancelled).not.toHaveBeenCalled();
    releaseLease();
    await Promise.all([stopped, cancelled]);

    expect(onStopped).toHaveBeenCalledTimes(1);
    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(mocks.stopMonitor).toHaveBeenCalledTimes(1);
  });
});
