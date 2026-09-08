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
  keyboardStore: {
    visibleOctaves: [5, 4],
    keyboardConfig: { mainOctave: 4, rowCount: 2 },
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
  useKeyboardDrawerStore: () => mocks.keyboardStore,
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
    mocks.musicStore.getActiveNotes.mockReturnValue([]);
    mocks.keyboardStore.visibleOctaves = [5, 4];
    mocks.keyboardStore.keyboardConfig.mainOctave = 4;
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

    expect(renderer.strings.value.find((string) => string.octave === 4)?.isActive)
      .toBe(true);

    renderer.handleNoteReleased(new CustomEvent("note-released", {
      detail: { noteId: "melograph-live-1" },
    }));
    renderer.updateStringProperties(
      stringConfig,
      animationConfig,
      mocks.musicStore,
    );

    expect(renderer.strings.value.find((string) => string.octave === 4)?.isActive)
      .toBe(false);
  });

  it("uses keyboard octave for wrapped note event activation", () => {
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
    mocks.musicStore.getActiveNotes.mockReturnValue([{
      solfegeIndex: 0,
      octave: 5,
      keyboardOctave: 4,
      frequency: 261.63,
      mode: "major",
      key: "G",
    }]);

    renderer.handleNotePlayed(new CustomEvent("note-played", {
      detail: {
        noteId: "wrapped-c5",
        solfegeIndex: 0,
        frequency: 261.63,
        octave: 5,
        keyboardOctave: 4,
        mode: "major",
        key: "G",
      },
    }));
    renderer.updateStringProperties(stringConfig, animationConfig, mocks.musicStore);

    expect(renderer.strings.value.filter((string) => string.isActive).map(
      (string) => string.octave,
    )).toEqual([4]);
  });

  it("centers octave offsets on the configured main octave at range edges", () => {
    mocks.keyboardStore.visibleOctaves = [3, 2, 1];
    mocks.keyboardStore.keyboardConfig.mainOctave = 1;
    const renderer = useStringRenderer();
    renderer.initializeStrings({
      isEnabled: true,
      octaveOffset: 10,
      baseOpacity: 0.1,
    } as any, 800, 600, mocks.musicStore.solfegeData);

    const xByOctave = new Map(renderer.strings.value.map((string) => [string.octave, string.x]));
    expect(xByOctave.get(1)).toBe(400);
    expect(xByOctave.get(2)).toBe(390);
    expect(xByOctave.get(3)).toBe(380);
  });
});
