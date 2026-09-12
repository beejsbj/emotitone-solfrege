import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHummingCapture } from "@/composables/useHummingCapture";

const mocks = vi.hoisted(() => ({
  bridgePush: vi.fn(),
  bridgeStop: vi.fn(),
  startMicrophoneCapture: vi.fn(),
  sessionStop: vi.fn(),
  sessionCancel: vi.fn(),
  preparePitchAnalysisAudio: vi.fn(),
  analyzePitchRecording: vi.fn(),
  toCandidates: vi.fn(),
  importPatternCandidates: vi.fn(),
  loadPatternAsBase: vi.fn(),
  loggedNotes: [] as Array<{ id: string }>,
}));

vi.mock("@/services/hummingStage", () => ({
  createHummingStageBridge: () => ({
    push: mocks.bridgePush,
    stop: mocks.bridgeStop,
  }),
}));

vi.mock("@/services/microphoneCapture", () => ({
  startMicrophoneCapture: mocks.startMicrophoneCapture,
}));

vi.mock("@/services/pitchAnalysis", () => ({
  preparePitchAnalysisAudio: mocks.preparePitchAnalysisAudio,
  analyzePitchRecording: mocks.analyzePitchRecording,
  pitchAnalysisToPatternCandidates: mocks.toCandidates,
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({ currentKey: "D", currentMode: "dorian" }),
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => ({ currentInstrument: "piano" }),
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => ({ config: { codeStrip: { bpm: 96 } } }),
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => ({
    loggedNotes: mocks.loggedNotes,
    importPatternCandidates: mocks.importPatternCandidates,
    loadPatternAsBase: mocks.loadPatternAsBase,
  }),
}));

describe("useHummingCapture", () => {
  let capture: ReturnType<typeof useHummingCapture>;

  afterEach(() => vi.useRealTimers());

  function mountCapture() {
    const Host = defineComponent({
      setup() {
        capture = useHummingCapture();
        return () => h("div");
      },
    });
    return mount(Host);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loggedNotes.splice(0);
    mocks.startMicrophoneCapture.mockResolvedValue({
      stop: mocks.sessionStop,
      cancel: mocks.sessionCancel,
    });
    mocks.sessionStop.mockResolvedValue(new Blob(["recording"]));
    mocks.sessionCancel.mockResolvedValue(undefined);
    mocks.preparePitchAnalysisAudio.mockResolvedValue(new Blob(["wav"]));
    mocks.analyzePitchRecording.mockResolvedValue({ product: "Melograph" });
    mocks.toCandidates.mockReturnValue([
      { name: "Hummed take 1", notes: [{ note: "D4" }, { note: "F4" }] },
      { name: "Hummed take 2", notes: [{ note: "A4" }] },
    ]);
    mocks.importPatternCandidates.mockReturnValue(["pattern-1", "pattern-2"]);
  });

  it("routes live frames to the Stage, then imports finalized phrases once", async () => {
    const wrapper = mountCapture();
    await capture.start();

    expect(capture.status.value).toBe("recording");
    const onFrame = mocks.startMicrophoneCapture.mock.calls[0][0];
    const frame = { voiced: true, midi: 62, frequencyHz: 293.66 };
    onFrame(frame);
    expect(mocks.bridgePush).toHaveBeenCalledWith(frame);
    expect(mocks.analyzePitchRecording).not.toHaveBeenCalled();
    expect(mocks.importPatternCandidates).not.toHaveBeenCalled();

    await capture.stop();

    expect(mocks.bridgeStop).toHaveBeenCalled();
    expect(mocks.preparePitchAnalysisAudio).toHaveBeenCalledTimes(1);
    expect(mocks.analyzePitchRecording).toHaveBeenCalledTimes(1);
    expect(mocks.toCandidates).toHaveBeenCalledWith(
      { product: "Melograph" },
      { key: "D", mode: "dorian", instrument: "piano", bpm: 96 },
    );
    expect(mocks.importPatternCandidates).toHaveBeenCalledWith(
      expect.any(Array),
      { key: "D", mode: "dorian", instrument: "piano", bpm: 96 },
      { workingNotes: [] },
    );
    expect(capture.takeCount.value).toBe(2);
    expect(capture.takeLabels.value).toEqual([
      "Hummed take 1",
      "Hummed take 2",
    ]);
    expect(capture.statusMessage.value).toBe("3 notes added from 2 takes");
    wrapper.unmount();
  });

  it("retires prior take choices when a new capture starts", async () => {
    const wrapper = mountCapture();
    await capture.start();
    await capture.stop();
    expect(capture.takeCount.value).toBe(2);

    await capture.start();

    expect(capture.takeCount.value).toBe(0);
    expect(capture.takeLabels.value).toEqual([]);
    expect(capture.selectedTakeIndex.value).toBe(0);
    wrapper.unmount();
  });

  it("keeps listening beyond 45 seconds and only stops and imports on acceptance", async () => {
    vi.useFakeTimers();
    const wrapper = mountCapture();
    await capture.toggle();

    await vi.advanceTimersByTimeAsync(5 * 60_000);

    expect(capture.status.value).toBe("recording");
    expect(mocks.sessionStop).not.toHaveBeenCalled();
    expect(mocks.bridgeStop).not.toHaveBeenCalled();
    const frame = { voiced: true, midi: 62, frequencyHz: 293.66 };
    mocks.startMicrophoneCapture.mock.calls[0][0](frame);
    expect(mocks.bridgePush).toHaveBeenCalledWith(frame);
    expect(mocks.analyzePitchRecording).not.toHaveBeenCalled();
    expect(mocks.importPatternCandidates).not.toHaveBeenCalled();

    await capture.toggle();

    expect(mocks.sessionStop).toHaveBeenCalledTimes(1);
    expect(mocks.analyzePitchRecording).toHaveBeenCalledTimes(1);
    expect(mocks.importPatternCandidates).toHaveBeenCalledTimes(1);
    expect(capture.status.value).toBe("idle");
    wrapper.unmount();
  });

  it.each(["resolve", "reject"])("awaits microphone cleanup when acceptance is cancelled (%s)", async (outcome) => {
    let resolveRecording!: (recording: Blob) => void;
    let rejectRecording!: (error: Error) => void;
    mocks.sessionStop.mockReturnValueOnce(new Promise<Blob>((resolve, reject) => {
      resolveRecording = resolve;
      rejectRecording = reject;
    }));
    const wrapper = mountCapture();
    await capture.start();
    const acceptance = capture.stop();
    expect(capture.status.value).toBe("preparing");

    const onCancelled = vi.fn();
    const cancellation = capture.cancel().then(onCancelled);
    await Promise.resolve();
    await Promise.resolve();
    expect(onCancelled).not.toHaveBeenCalled();

    if (outcome === "resolve") resolveRecording(new Blob(["recording"]));
    else rejectRecording(new Error("Recorder ended during cleanup"));
    await Promise.all([acceptance, cancellation]);

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(capture.status.value).toBe("idle");
    expect(mocks.preparePitchAnalysisAudio).not.toHaveBeenCalled();
    expect(mocks.importPatternCandidates).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each([0, 45_000])("discards without importing when cancelled after %i ms", async (elapsed) => {
    vi.useFakeTimers();
    const wrapper = mountCapture();
    await capture.toggle();
    await vi.advanceTimersByTimeAsync(elapsed);

    await capture.cancel();
    await capture.stop();

    expect(capture.status.value).toBe("idle");
    expect(mocks.analyzePitchRecording).not.toHaveBeenCalled();
    expect(mocks.importPatternCandidates).not.toHaveBeenCalled();
    await capture.toggle();
    expect(capture.status.value).toBe("recording");
    expect(mocks.startMicrophoneCapture).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("keeps pitch-analysis take numbers in selector labels", async () => {
    mocks.toCandidates.mockReturnValue([
      {
        name: "Hummed take 1",
        notes: [{ note: "D4" }],
        source: { takeNumber: 1 },
      },
      {
        name: "Hummed take 3",
        notes: [{ note: "A4" }],
        source: { takeNumber: 3 },
      },
    ]);
    const wrapper = mountCapture();

    await capture.start();
    await capture.stop();

    expect(capture.takeLabels.value).toEqual(["Take 1", "Take 3"]);
    wrapper.unmount();
  });

  it("switches among imported takes through the Pattern store", async () => {
    const wrapper = mountCapture();
    await capture.start();
    await capture.stop();

    capture.selectTake(1);

    expect(mocks.loadPatternAsBase).toHaveBeenCalledWith(
      "pattern-2",
      { discardWorkingNotes: true },
    );
    expect(capture.selectedTakeIndex.value).toBe(1);
    wrapper.unmount();
  });

  it("reports permission failure without importing or leaving a preview note", async () => {
    mocks.startMicrophoneCapture.mockRejectedValue(
      new DOMException("denied", "NotAllowedError"),
    );
    const wrapper = mountCapture();

    await capture.start();

    expect(capture.status.value).toBe("error");
    expect(capture.error.value).toBe("Microphone permission was not granted.");
    expect(mocks.bridgeStop).toHaveBeenCalled();
    expect(mocks.importPatternCandidates).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("surfaces recorder failure immediately", async () => {
    const wrapper = mountCapture();
    await capture.start();

    const onError = mocks.startMicrophoneCapture.mock.calls[0][1];
    onError(new Error("The microphone recording failed."));

    expect(capture.status.value).toBe("error");
    expect(capture.error.value).toBe("The microphone recording failed.");
    expect(mocks.bridgeStop).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("preserves notes recorded while pitch analysis is pending", async () => {
    mocks.loggedNotes.push({ id: "before-capture" });
    const wrapper = mountCapture();
    await capture.start();
    mocks.loggedNotes.push({ id: "during-analysis" });

    await capture.stop();

    expect(mocks.importPatternCandidates).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      { workingNotes: [{ id: "during-analysis" }] },
    );
    wrapper.unmount();
  });

  it("cancels the microphone and flushes the Stage on unmount", async () => {
    const wrapper = mountCapture();
    await capture.start();

    wrapper.unmount();
    await vi.waitFor(() => {
      expect(mocks.sessionCancel).toHaveBeenCalledTimes(1);
    });
    expect(mocks.bridgeStop).toHaveBeenCalled();
  });
});
