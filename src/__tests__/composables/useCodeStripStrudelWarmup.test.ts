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

  it("treats comment-prefixed code as playable but rejects comment-only documents", async () => {
    mocks.instrumentStore = reactive({
      isInteractionLocked: false,
      selectionEpoch: 0,
    });
    const evaluate = vi.fn().mockResolvedValue(undefined);
    const { useCodeStripStrudel } = await import(
      "@/composables/useCodeStripStrudel"
    );
    const playback = useCodeStripStrudel();
    playback.attachEditor(
      {
        getCode: () => "",
        setCode: vi.fn(),
        evaluate,
        stop: vi.fn(),
      },
      "// Evening arrangement\n/* Keep this soft */\nsound('piano')"
    );

    expect(playback.hasPlayableCode.value).toBe(true);
    await playback.play();
    expect(evaluate).toHaveBeenCalledOnce();

    playback.syncCode("// Arrangement pending\n/* No notes yet */");
    expect(playback.hasPlayableCode.value).toBe(false);

    for (const lineBreak of ["\r", "\r\n", "\u2028", "\u2029"]) {
      playback.syncCode(`// Arrangement${lineBreak}sound('piano')`);
      expect(playback.hasPlayableCode.value).toBe(true);
    }
  });
});
