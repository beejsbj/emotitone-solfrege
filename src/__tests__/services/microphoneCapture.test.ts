import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn(),
  startLivePitchMonitor: vi.fn(),
  stopMonitor: vi.fn(),
}));

vi.mock("@/services/liveAudio", () => ({
  liveAudioInput: { acquire: mocks.acquire },
}));

vi.mock("@/services/livePitch", () => ({
  startLivePitchMonitor: mocks.startLivePitchMonitor,
}));

import { startMicrophoneCapture } from "@/services/microphoneCapture";

describe("microphone capture", () => {
  let recorder: FakeMediaRecorder | undefined;

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
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    mocks.acquire.mockResolvedValue({
      source: { stream: {} },
      release: mocks.release,
    });
    mocks.release.mockResolvedValue(undefined);
    mocks.stopMonitor.mockResolvedValue(undefined);
    mocks.startLivePitchMonitor.mockResolvedValue({ stop: mocks.stopMonitor });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
