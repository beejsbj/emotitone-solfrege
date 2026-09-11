import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ControlBar from "@/components/compounds/ControlBar.vue";
import controlBarSource from "@/components/compounds/ControlBar.vue?raw";
import { CHROMATIC_NOTES, MODE_OPTIONS } from "@/data/musicData";

vi.mock("@/components/primatives/Knob/index.vue", () => ({
  default: {
    name: "Knob",
    props: [
      "modelValue",
      "type",
      "options",
      "label",
      "min",
      "max",
      "step",
      "changeSignal",
      "haptic",
      "uiBeat",
      "isDisabled",
    ],
    emits: ["update:modelValue"],
    template: '<div data-testid="knob" :data-label="label" />',
  },
}));

vi.mock("@/components/uniques/Joystick/index.vue", () => ({
  default: {
    name: "Joystick",
    props: ["modelValue", "label", "visual", "haptic"],
    emits: ["update:modelValue", "effectiveChange"],
    template: '<div data-testid="joystick" :data-label="label" />',
  },
}));

describe("ControlBar.vue", () => {
  it("composes musical and performance Knobs plus one Harmony Joystick", () => {
    const wrapper = mount(ControlBar);
    const knobs = wrapper.findAllComponents({ name: "Knob" });

    expect(knobs.map((knob) => knob.props("label"))).toEqual([
      "Key",
      "Mode",
      "BPM",
      "Octave",
      "Play Mode",
    ]);
    expect(knobs[0].props("options")).toEqual(CHROMATIC_NOTES);
    expect(knobs[1].props("options")).toEqual(MODE_OPTIONS);
    expect(knobs[2].props()).toMatchObject({ min: 40, max: 220, step: 1 });
    expect(knobs.every((knob) => knob.props("uiBeat") === undefined)).toBe(true);
    expect(controlBarSource).not.toContain("ui-beat");
    expect(knobs[3].props()).toMatchObject({ min: 1, max: 8, step: 1 });
    expect(wrapper.getComponent({ name: "Joystick" }).props()).toMatchObject({
      label: "Harmony",
      modelValue: "auto",
      visual: undefined,
    });
    wrapper.unmount();
  });

  it("exposes controlled changes without owning application stores", () => {
    const wrapper = mount(ControlBar);
    const knobs = wrapper.findAllComponents({ name: "Knob" });

    knobs[0].vm.$emit("update:modelValue", "D");
    knobs[1].vm.$emit("update:modelValue", "dorian");
    knobs[2].vm.$emit("update:modelValue", 96);
    knobs[3].vm.$emit("update:modelValue", 5);
    knobs[4].vm.$emit("update:modelValue", "arp-up:16");
    const joystick = wrapper.getComponent({ name: "Joystick" });
    joystick.vm.$emit("update:modelValue", "jazzy7");
    joystick.vm.$emit("effectiveChange", "sus4");

    expect(wrapper.emitted("update:keyValue")?.[0]).toEqual(["D"]);
    expect(wrapper.emitted("update:modeValue")?.[0]).toEqual(["dorian"]);
    expect(wrapper.emitted("update:bpm")?.[0]).toEqual([96]);
    expect(wrapper.emitted("update:octave")?.[0]).toEqual([5]);
    expect(wrapper.emitted("update:playMode")?.[0]).toEqual(["arp-up:16"]);
    expect(wrapper.emitted("update:rows")).toBeUndefined();
    expect(wrapper.emitted("update:harmonyValue")?.[0]).toEqual(["jazzy7"]);
    expect(wrapper.emitted("harmonyEffective")?.[0]).toEqual(["sus4"]);
    wrapper.unmount();
  });

  it("forwards explicit haptic suppression to every control", () => {
    const wrapper = mount(ControlBar, { props: { haptic: false } });

    expect(wrapper.findAllComponents({ name: "Knob" }).every(
      (knob) => knob.props("haptic") === false,
    )).toBe(true);
    expect(wrapper.getComponent({ name: "Joystick" }).props("haptic")).toBe(false);
    wrapper.unmount();
  });

  it("routes pattern-change signals to the matching Knob only", () => {
    const wrapper = mount(ControlBar, {
      props: {
        changeSignals: { key: 2, bpm: 4 },
      },
    });
    const knobs = wrapper.findAllComponents({ name: "Knob" });

    expect(knobs.map((knob) => knob.props("changeSignal"))).toEqual([
      2,
      undefined,
      4,
      undefined,
      undefined,
    ]);
  });

  it("spreads equal-width controls without a horizontal scroller", () => {
    expect(controlBarSource).toContain("grid-template-columns: repeat(6, minmax(0, 1fr))");
    expect(controlBarSource).toContain("padding: 3px 0 4px");
    expect(controlBarSource.match(/calc\(\(100% - var\(--instrument-control-size\)\) \/ 2\)/g))
      .toHaveLength(2);
    expect(controlBarSource.match(/var\(--s-4\)/g)).toHaveLength(2);
    expect(controlBarSource).not.toContain("overflow-x: auto");
    expect(controlBarSource).not.toContain("width: max-content");
  });

  it("includes all rhythmic rates in the single Play Mode knob", async () => {
    const wrapper = mount(ControlBar);
    const mode = wrapper.findAllComponents({ name: "Knob" })[4];
    const options = mode.props("options");
    expect(options.map((option: { label: string }) => option.label)).toEqual([
      "Together", "Strum ↑", "Strum ↓",
      "Arp ↑\n1/4", "Arp ↑\n1/8", "Arp ↑\n1/16",
      "Arp ↕\n1/4", "Arp ↕\n1/8", "Arp ↕\n1/16",
      "Repeat\n1/4", "Repeat\n1/8", "Repeat\n1/16",
    ]);
    expect(new Set(options.map((option: { value: string }) => option.value)).size).toBe(12);
    await wrapper.setProps({ playMode: "repeat:16" });
    expect(mode.props("modelValue")).toBe("repeat:16");
  });
});
