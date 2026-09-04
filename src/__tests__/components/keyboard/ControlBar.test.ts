import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ControlBar from "@/components/compounds/ControlBar.vue";
import controlBarSource from "@/components/compounds/ControlBar.vue?raw";
import { CHROMATIC_NOTES, MODE_OPTIONS } from "@/data/musicData";

vi.mock("@/components/primatives/Knob/index.vue", () => ({
  default: {
    name: "Knob",
    props: ["modelValue", "type", "options", "label", "min", "max", "step"],
    emits: ["update:modelValue"],
    template: '<div data-testid="knob" :data-label="label" />',
  },
}));

describe("ControlBar.vue", () => {
  it("composes the six current controls with their existing ranges", () => {
    const wrapper = mount(ControlBar);
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

  it("exposes controlled changes without owning application stores", () => {
    const wrapper = mount(ControlBar);
    const knobs = wrapper.findAllComponents({ name: "Knob" });

    knobs[0].vm.$emit("update:modelValue", "D");
    knobs[1].vm.$emit("update:modelValue", "dorian");
    knobs[2].vm.$emit("update:modelValue", 96);
    knobs[3].vm.$emit("update:modelValue", 5);
    knobs[4].vm.$emit("update:modelValue", 7);
    knobs[5].vm.$emit("update:modelValue", true);

    expect(wrapper.emitted("update:keyValue")?.[0]).toEqual(["D"]);
    expect(wrapper.emitted("update:modeValue")?.[0]).toEqual(["dorian"]);
    expect(wrapper.emitted("update:bpm")?.[0]).toEqual([96]);
    expect(wrapper.emitted("update:octave")?.[0]).toEqual([5]);
    expect(wrapper.emitted("update:rows")?.[0]).toEqual([7]);
    expect(wrapper.emitted("update:drawerOpen")?.[0]).toEqual([true]);
    wrapper.unmount();
  });

  it("spreads equal-width controls without a horizontal scroller", () => {
    expect(controlBarSource).toContain("grid-template-columns: repeat(6, minmax(0, 1fr))");
    expect(controlBarSource).toContain("padding: 3px 0 4px");
    expect(controlBarSource).not.toContain("overflow-x: auto");
    expect(controlBarSource).not.toContain("width: max-content");
  });
});
