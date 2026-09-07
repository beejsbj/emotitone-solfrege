import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStringRenderer } from "@/composables/canvas/useStringRenderer";

const mocks = vi.hoisted(() => ({
  musicStore: {
    currentMode: "major",
    currentKey: "C",
    solfegeData: [{ name: "Do", number: 1 }],
    getActiveNotes: vi.fn(() => []),
    getNoteFrequency: vi.fn(() => 261.63),
  },
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getPrimaryColor: vi.fn(() => "red"),
    getPrimaryColorByScaleIndex: vi.fn(() => "red"),
  }),
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mocks.musicStore,
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    visibleOctaves: [4],
    keyboardConfig: { mainOctave: 4, rowCount: 1 },
  }),
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => ({ config: { strings: {} } }),
}));

vi.mock("@/composables/useGSAP", () => ({
  default: () => ({
    gsap: { utils: { interpolate: (_from: number, to: number) => to } },
  }),
}));

describe("useStringRenderer humming lifecycle", () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it("sustains noteId activations until their matching release", () => {
    const renderer = useStringRenderer();
    const stringConfig = {
      isEnabled: true,
      octaveOffset: 0,
      baseOpacity: 0.1,
      activeOpacity: 1,
      maxAmplitude: 20,
      interpolationSpeed: 1,
      opacityInterpolationSpeed: 1,
      dampingFactor: 1,
    } as any;
    const animationConfig = { visualFrequencyDivisor: 100 } as any;
    renderer.initializeStrings(stringConfig, 800, 600, mocks.musicStore.solfegeData);

    renderer.handleNotePlayed(new CustomEvent("note-played", {
      detail: {
        noteId: "melograph-live-1",
        solfegeIndex: 0,
        frequency: 261.63,
        octave: 4,
        mode: "major",
        key: "C",
      },
    }));
    nowSpy.mockReturnValue(12_000);
    renderer.updateStringProperties(
      stringConfig,
      animationConfig,
      mocks.musicStore,
    );

    expect(renderer.strings.value[0].isActive).toBe(true);

    renderer.handleNoteReleased(new CustomEvent("note-released", {
      detail: { noteId: "melograph-live-1" },
    }));
    renderer.updateStringProperties(
      stringConfig,
      animationConfig,
      mocks.musicStore,
    );

    expect(renderer.strings.value[0].isActive).toBe(false);
  });
});
