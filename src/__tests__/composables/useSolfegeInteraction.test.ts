import { describe, expect, it, vi } from "vitest";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onMounted: vi.fn(),
    onUnmounted: vi.fn(),
  };
});

const mocks = vi.hoisted(() => ({
  musicStore: {
    attackNoteWithOctave: vi.fn(),
    releaseNote: vi.fn(),
    releaseAllNotes: vi.fn(),
    getActiveNotes: vi.fn(() => []),
  },
  instrumentStore: { isInteractionLocked: false },
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mocks.musicStore,
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getGradient: vi.fn(() => "none"),
    isDynamicColorsEnabled: { value: false },
  }),
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useSolfegeInteraction pending attacks", () => {
  it("releases a pointer attack whose input ended before startup completed", async () => {
    const deferred = createDeferred<string | null>();
    mocks.musicStore.attackNoteWithOctave.mockReturnValueOnce(deferred.promise);
    const interaction = useSolfegeInteraction();

    const pendingAttack = interaction.attackNoteWithOctave(0, 4);
    interaction.releaseNoteByButtonKey("0_4");
    deferred.resolve("late-pointer-note");
    await pendingAttack;

    expect(mocks.musicStore.releaseNote).toHaveBeenCalledWith(
      "late-pointer-note"
    );
    expect(interaction.activeNoteIds.value.size).toBe(0);
  });
});
