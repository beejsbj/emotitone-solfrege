import { describe, expect, it, vi } from "vitest";
import {
  LiveMpmTracker,
  startMicrophoneCapture,
} from "@/services/melographLivePitch";

const SAMPLE_RATE = 48_000;
const FRAME_SIZE = 2_048;

describe("Melograph provisional live pitch", () => {
  it("recognizes a clear A4 frame without treating silence as voiced", () => {
    const tracker = new LiveMpmTracker();
    const a4 = new Float32Array(FRAME_SIZE);
    for (let index = 0; index < a4.length; index += 1) {
      a4[index] = Math.sin(2 * Math.PI * 440 * index / SAMPLE_RATE) * 0.5;
    }

    const voiced = tracker.analyze(a4, SAMPLE_RATE, 0.1);
    const silent = tracker.analyze(new Float32Array(FRAME_SIZE), SAMPLE_RATE, 0.2);

    expect(voiced.voiced).toBe(true);
    expect(voiced.frequencyHz).toBeCloseTo(440, 0);
    expect(voiced.midi).toBeCloseTo(69, 0);
    expect(silent).toEqual(expect.objectContaining({
      voiced: false,
      frequencyHz: null,
      midi: null,
    }));
  });

  it("reports MediaRecorder failure without waiting for Stop", async () => {
    const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "mediaDevices",
    );
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    const audioNode = () => ({ connect: vi.fn(), disconnect: vi.fn() });
    const source = audioNode();
    const analyser = {
      ...audioNode(),
      fftSize: 0,
      smoothingTimeConstant: 0,
      getFloatTimeDomainData: vi.fn(),
    };
    const gain = { ...audioNode(), gain: { value: 1 } };
    const close = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("AudioContext", vi.fn(() => ({
      state: "running",
      currentTime: 0,
      sampleRate: SAMPLE_RATE,
      destination: {},
      createMediaStreamSource: () => source,
      createAnalyser: () => analyser,
      createGain: () => gain,
      resume: vi.fn().mockResolvedValue(undefined),
      close,
    })));
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

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
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);

    try {
      const onError = vi.fn();
      const capture = await startMicrophoneCapture(vi.fn(), onError);

      recorder?.fail();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "The microphone recording failed." }),
      );
      await expect(capture.stop()).rejects.toThrow(
        "The microphone recording failed.",
      );
      expect(track.stop).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      if (mediaDevicesDescriptor) {
        Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "mediaDevices");
      }
    }
  });
});
