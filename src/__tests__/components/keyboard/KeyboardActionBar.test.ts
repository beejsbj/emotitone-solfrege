import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "../../helpers/test-utils";
import KeyboardActionBar from "@/components/keyboard/KeyboardActionBar.vue";
import { CHROMATIC_NOTES, MODE_OPTIONS } from "@/data/musicData";

const mockKeyboardDrawerStore = {
  keyboardConfig: {
    mainOctave: 4,
    rowCount: 3,
  },
  setMainOctave: vi.fn(),
  setRowCount: vi.fn(),
};

const mockMusicStore = {
  currentKey: "C",
  currentMode: "major",
  setKey: vi.fn(),
  setMode: vi.fn(),
};

const mockVisualConfigStore = {
  config: {
    liveStrip: {
      bpm: 120,
    },
  },
  updateConfig: vi.fn(),
};

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => mockKeyboardDrawerStore,
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => mockMusicStore,
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => mockVisualConfigStore,
}));

vi.mock("@/components/knobs", () => ({
  Knob: {
    name: "Knob",
    props: [
      "modelValue",
      "type",
      "options",
      "label",
      "min",
      "max",
      "step",
      "isDisabled",
      "themeColor",
      "valueLabelTrue",
      "valueLabelFalse",
      "buttonText",
    ],
    template: '<div data-testid="mock-knob" :data-label="label" :data-type="type"></div>',
  },
}));

describe("KeyboardActionBar.vue", () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMusicStore.currentKey = "C";
    mockMusicStore.currentMode = "major";
    mockKeyboardDrawerStore.keyboardConfig.mainOctave = 4;
    mockKeyboardDrawerStore.keyboardConfig.rowCount = 3;
    mockVisualConfigStore.config.liveStrip.bpm = 120;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("wires the key knob to the full chromatic note list", () => {
    wrapper = createTestWrapper(KeyboardActionBar);

    const keyKnob = wrapper
      .findAllComponents({ name: "Knob" })
      .find((component: any) => component.props("label") === "Key");

    expect(keyKnob?.props("options")).toEqual(CHROMATIC_NOTES);
  });

  it("exposes the full MODE_OPTIONS catalog in the visible mode control", () => {
    wrapper = createTestWrapper(KeyboardActionBar);

    const modeKnob = wrapper
      .findAllComponents({ name: "Knob" })
      .find((component: any) => component.props("label") === "Mode");

    expect(modeKnob?.props("options")).toEqual(MODE_OPTIONS);
    expect(modeKnob?.props("options")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "dorian", label: "Dorian" }),
        expect.objectContaining({
          value: "major pentatonic",
          label: "Major Pentatonic",
        }),
        expect.objectContaining({ value: "chromatic", label: "Chromatic" }),
      ])
    );
  });

  it("passes non-major modes back into the music store", async () => {
    wrapper = createTestWrapper(KeyboardActionBar);

    const modeKnob = wrapper
      .findAllComponents({ name: "Knob" })
      .find((component: any) => component.props("label") === "Mode");

    modeKnob?.vm.$emit("update:modelValue", "dorian");

    expect(mockMusicStore.setMode).toHaveBeenCalledWith("dorian");
  });

  it("only renders the five musical controls in the action row", () => {
    wrapper = createTestWrapper(KeyboardActionBar);

    const labels = wrapper
      .findAllComponents({ name: "Knob" })
      .map((component: any) => component.props("label"));

    expect(labels).toEqual(["Key", "Mode", "BPM", "Octave", "Rows"]);
    expect(labels).not.toContain("Drawer");
    expect(labels).not.toContain("Undo");
    expect(labels).not.toContain("Play");
    expect(labels).not.toContain("Send");
  });
});
