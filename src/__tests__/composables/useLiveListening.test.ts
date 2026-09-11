import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveListening } from "@/composables/useLiveListening";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn(),
  stopMonitor: vi.fn(),
  pushPitch: vi.fn(),
  stopBridge: vi.fn(),
  sourceListener: null as ((source: unknown) => void) | null,
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({ currentKey: "C", currentMode: "major" }),
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => ({ currentInstrument: "piano" }),
}));

vi.mock("@/services/livePitch", () => ({
  startLivePitchMonitor: vi.fn(async () => ({ stop: mocks.stopMonitor })),
}));

vi.mock("@/services/hummingStage", () => ({
  createLivePitchStageBridge: vi.fn(() => ({
    push: mocks.pushPitch,
    stop: mocks.stopBridge,
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
    mocks.sourceListener = null;
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
});
