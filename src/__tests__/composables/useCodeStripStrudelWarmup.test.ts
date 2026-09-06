import { reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  instrumentStore: null as unknown as {
    isInteractionLocked: boolean;
    selectionEpoch: number;
  },
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
}));

describe("CodeStrip playback warmup locking", () => {
  afterEach(async () => {
    const { useCodeStripStrudel } = await import(
      "@/composables/useCodeStripStrudel"
    );
    useCodeStripStrudel().detachEditor();
  });

  it("does not restore playing state after a warmup interrupts evaluation", async () => {
    mocks.instrumentStore = reactive({
      isInteractionLocked: false,
      selectionEpoch: 0,
    });
    let resolveEvaluation!: () => void;
    const evaluate = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveEvaluation = resolve;
      })
    );
    const stop = vi.fn().mockResolvedValue(undefined);
    const { useCodeStripStrudel } = await import(
      "@/composables/useCodeStripStrudel"
    );
    const playback = useCodeStripStrudel();
    playback.attachEditor(
      {
        getCode: () => "sound('piano')",
        setCode: vi.fn(),
        evaluate,
        stop,
      },
      "sound('piano')"
    );

    const pendingPlayback = playback.play();
    mocks.instrumentStore.selectionEpoch += 1;
    mocks.instrumentStore.isInteractionLocked = true;
    mocks.instrumentStore.isInteractionLocked = false;
    resolveEvaluation();
    await pendingPlayback;

    expect(stop).toHaveBeenCalledOnce();
    expect(playback.isPlaying.value).toBe(false);
  });
});
