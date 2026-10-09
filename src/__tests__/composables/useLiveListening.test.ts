import { defineComponent, h, reactive } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveListening } from "@/composables/useLiveListening";
import { startLivePitchMonitor } from "@/services/livePitch";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn(),
  stopMonitor: vi.fn(),
  pushPitch: vi.fn(),
  stopBridge: vi.fn(),
  updateBridgeContext: vi.fn(),
  musicStore: null as unknown as { currentKey: string; currentMode: string },
  instrumentStore: null as unknown as { currentInstrument: string },
  sourceListener: null as ((source: unknown) => void) | null,
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mocks.musicStore,
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
}));

vi.mock("@/services/livePitch", () => ({
  startLivePitchMonitor: vi.fn(),
}));

vi.mock("@/services/hummingStage", () => ({
  createLivePitchStageBridge: vi.fn(() => ({
    push: mocks.pushPitch,
    stop: mocks.stopBridge,
    updateContext: mocks.updateBridgeContext,
  })),
}));

vi.mock("@/services/liveAudio", () => ({
  liveAudioInput: {
    acquire: mocks.acquire,
    subscribe: (listener: (source: unknown) => void) => {
      mocks.sourceListener = listener;
      listener(null);
      return vi.fn();
    },
  },
}));

describe("useLiveListening", () => {
  let listening: ReturnType<typeof useLiveListening>;

  function mountListening() {
    const Host = defineComponent({
      setup() {
        listening = useLiveListening();
        return () => h("div");
      },
    });
    return mount(Host);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.musicStore = reactive({ currentKey: "C", currentMode: "major" });
    mocks.instrumentStore = reactive({ currentInstrument: "piano" });
    mocks.sourceListener = null;
    mocks.release.mockResolvedValue(undefined);
    vi.mocked(startLivePitchMonitor).mockResolvedValue({ stop: mocks.stopMonitor });
    mocks.acquire.mockResolvedValue({
      source: { context: {}, node: {}, stream: {} },
      release: mocks.release,
    });
  });

  it("acquires listening independently and releases it when toggled off", async () => {
    const wrapper = mountListening();

    await listening.toggle();
    expect(listening.status.value).toBe("listening");
    expect(mocks.acquire).toHaveBeenCalledTimes(1);

    await listening.toggle();
    expect(mocks.stopMonitor).toHaveBeenCalledTimes(1);
    expect(mocks.stopBridge).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(listening.status.value).toBe("idle");
    wrapper.unmount();
  });

  it("reports a denied permission without retaining a lease", async () => {
    mocks.acquire.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const wrapper = mountListening();

    await listening.start();

    expect(listening.status.value).toBe("error");
    expect(listening.error.value).toBe("Microphone permission was not granted.");
    expect(mocks.release).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("reports when an active microphone source ends", async () => {
    const wrapper = mountListening();
    await listening.start();

    mocks.sourceListener?.(null);

    expect(listening.status.value).toBe("error");
    expect(listening.error.value).toBe("Microphone input ended.");
    wrapper.unmount();
  });

  it("does not let a stale monitor startup clobber a replacement session", async () => {
    let resolveFirst!: (monitor: { stop: () => Promise<void> }) => void;
    const firstStop = vi.fn(async () => undefined);
    const secondStop = vi.fn(async () => undefined);
    vi.mocked(startLivePitchMonitor)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ stop: secondStop });
    const wrapper = mountListening();

    const firstStart = listening.start();
    await vi.waitFor(() => expect(startLivePitchMonitor).toHaveBeenCalledTimes(1));
    await listening.stop();
    expect(mocks.release).toHaveBeenCalledTimes(1);
    await listening.start();
    resolveFirst({ stop: firstStop });
    await firstStart;

    expect(firstStop).toHaveBeenCalledTimes(1);
    expect(secondStop).not.toHaveBeenCalled();
    expect(listening.status.value).toBe("listening");

    await listening.stop();
    expect(secondStop).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("keeps a source-ended error when a pending monitor resolves late", async () => {
    let resolveMonitor!: (monitor: { stop: () => Promise<void> }) => void;
    const staleStop = vi.fn(async () => undefined);
    vi.mocked(startLivePitchMonitor).mockImplementationOnce(
      () => new Promise((resolve) => { resolveMonitor = resolve; }),
    );
    const wrapper = mountListening();

    const starting = listening.start();
    await vi.waitFor(() => expect(startLivePitchMonitor).toHaveBeenCalledTimes(1));
    mocks.sourceListener?.(null);
    resolveMonitor({ stop: staleStop });
    await starting;

    expect(staleStop).toHaveBeenCalledTimes(1);
    expect(listening.status.value).toBe("error");
    expect(listening.error.value).toBe("Microphone input ended.");
    wrapper.unmount();
  });

  it("updates pending and active bridges without restarting live audio", async () => {
    let resolveMonitor!: (monitor: { stop: () => Promise<void> }) => void;
    vi.mocked(startLivePitchMonitor).mockImplementationOnce(
      () => new Promise((resolve) => { resolveMonitor = resolve; }),
    );
    const wrapper = mountListening();

    const starting = listening.start();
    await vi.waitFor(() => expect(startLivePitchMonitor).toHaveBeenCalledTimes(1));
    mocks.musicStore.currentKey = "D";
    mocks.instrumentStore.currentInstrument = "organ";

    expect(mocks.updateBridgeContext).toHaveBeenLastCalledWith({
      key: "D",
      mode: "major",
      instrument: "organ",
    });

    resolveMonitor({ stop: mocks.stopMonitor });
    await starting;
    mocks.updateBridgeContext.mockClear();
    mocks.musicStore.currentMode = "dorian";

    expect(mocks.updateBridgeContext).toHaveBeenCalledOnce();
    expect(mocks.updateBridgeContext).toHaveBeenCalledWith({
      key: "D",
      mode: "dorian",
      instrument: "organ",
    });
    expect(mocks.acquire).toHaveBeenCalledOnce();
    expect(startLivePitchMonitor).toHaveBeenCalledOnce();
    expect(mocks.stopMonitor).not.toHaveBeenCalled();

    await listening.stop();
    wrapper.unmount();
  });
});
