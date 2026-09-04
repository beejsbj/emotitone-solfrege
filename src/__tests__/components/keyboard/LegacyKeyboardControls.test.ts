import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import LegacyKeyboardControls from "@/components/keyboard/LegacyKeyboardControls.vue";
import { CHROMATIC_NOTES, MODE_OPTIONS } from "@/data/musicData";

const mocks = vi.hoisted(() => ({
  setKey: vi.fn(),
  setMode: vi.fn(),
  updateConfig: vi.fn(),
  setMainOctave: vi.fn(),
  setRowCount: vi.fn(),
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({
    currentKey: "C",
    currentMode: "major",
    setKey: mocks.setKey,
    setMode: mocks.setMode,
  }),
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => ({
    config: { codeStrip: { bpm: 120 } },
    updateConfig: mocks.updateConfig,
  }),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    keyboardConfig: { mainOctave: 4, rowCount: 3 },
    drawer: { isOpen: false },
    setMainOctave: mocks.setMainOctave,
    setRowCount: mocks.setRowCount,
    openDrawer: mocks.openDrawer,
    closeDrawer: mocks.closeDrawer,
  }),
}));

vi.mock("@/components/primatives/Knob/index.vue", () => ({
  default: {
    name: "Knob",
    props: ["modelValue", "type", "options", "label", "min", "max", "step"],
    emits: ["update:modelValue"],
    template: '<div data-testid="knob" :data-label="label" />',
  },
}));

describe("LegacyKeyboardControls.vue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps all six displaced settings available with their original ranges", () => {
    const wrapper = mount(LegacyKeyboardControls);
    const knobs = wrapper.findAllComponents({ name: "Knob" });

    expect(knobs.map((knob) => knob.props("label"))).toEqual([
      "Key",
      "Mode",
      "BPM",
      "Octave",
      "Rows",
      "Drawer",
    ]);
    expect(knobs[0].props("options")).toEqual(CHROMATIC_NOTES);
    expect(knobs[1].props("options")).toEqual(MODE_OPTIONS);
    expect(knobs[2].props()).toMatchObject({ min: 40, max: 220, step: 1 });
    expect(knobs[3].props()).toMatchObject({ min: 1, max: 8, step: 1 });
    expect(knobs[4].props()).toMatchObject({ min: 1, max: 8, step: 2 });
    wrapper.unmount();
  });

  it("preserves every settings action while their final homes remain undefined", () => {
    const wrapper = mount(LegacyKeyboardControls);
    const knobs = wrapper.findAllComponents({ name: "Knob" });

    knobs[0].vm.$emit("update:modelValue", "D");
    knobs[1].vm.$emit("update:modelValue", "dorian");
    knobs[2].vm.$emit("update:modelValue", 96);
    knobs[3].vm.$emit("update:modelValue", 5);
    knobs[4].vm.$emit("update:modelValue", 7);
    knobs[5].vm.$emit("update:modelValue", true);
    knobs[5].vm.$emit("update:modelValue", false);

    expect(mocks.setKey).toHaveBeenCalledWith("D");
    expect(mocks.setMode).toHaveBeenCalledWith("dorian");
    expect(mocks.updateConfig).toHaveBeenCalledWith("codeStrip", { bpm: 96 });
    expect(mocks.setMainOctave).toHaveBeenCalledWith(5);
    expect(mocks.setRowCount).toHaveBeenCalledWith(7);
    expect(mocks.openDrawer).toHaveBeenCalledTimes(1);
    expect(mocks.closeDrawer).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
