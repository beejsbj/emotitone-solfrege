import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import Knob from "@/components/primatives/Knob/index.vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import { uiBeatClock } from "@/composables/useUIBeat";

vi.mock("@/composables/useGSAP", () => ({ default: () => ({}) }));

const sliderKeys = [
  "ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft",
  "PageUp", "PageDown", "Home", "End",
];
let wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount();
  wrappers = [];
  document.body.innerHTML = "";
  uiBeatClock.stop();
});

function renderRange(props: Record<string, unknown> = {}) {
  const value = ref(props.modelValue ?? 0.3);
  const wrapper = mount(defineComponent({
    setup: () => () => h(Knob, {
      type: "range",
      label: "Duration",
      min: 0.1,
      max: 2.1,
      step: 0.1,
      haptic: false,
      uiBeat: false,
      formatValue: (value: number) => `${value}s`,
      ...props,
      modelValue: value.value,
      "onUpdate:modelValue": (updated) => { value.value = updated; },
    }),
  }), { attachTo: document.body });
  wrappers.push(wrapper);
  return { value, knob: wrapper.getComponent(Knob) };
}

describe("range Knob accessibility", () => {
  it("makes the real BPM and Octave controls focusable and updates their models and announcements", async () => {
    const bpm = ref(120);
    const octave = ref(4);
    const wrapper = mount(defineComponent({
      components: { ControlBar },
      setup: () => ({ bpm, octave }),
      template: '<ControlBar v-model:bpm="bpm" v-model:octave="octave" :haptic="false" />',
    }), { attachTo: document.body });
    wrappers.push(wrapper);

    for (const control of [
      { label: "BPM", value: bpm, min: 40, max: 220, initial: 120 },
      { label: "Octave", value: octave, min: 1, max: 8, initial: 4 },
    ]) {
      const slider = wrapper.get(`[role="slider"][aria-label="${control.label}"]`);
      expect(slider.attributes("tabindex")).toBe("0");
      expect(slider.attributes("aria-valuemin")).toBe(String(control.min));
      expect(slider.attributes("aria-valuemax")).toBe(String(control.max));
      expect(slider.attributes("aria-valuenow")).toBe(String(control.initial));
      expect(slider.attributes("aria-valuetext")).toBe(String(control.initial));
      (slider.element as HTMLElement).focus();
      expect(document.activeElement).toBe(slider.element);

      for (const [key, expected] of [
        ["ArrowUp", control.initial + 1],
        ["ArrowRight", control.initial + 2],
        ["ArrowDown", control.initial + 1],
        ["ArrowLeft", control.initial],
        ["PageUp", Math.min(control.max, control.initial + 10)],
        ["PageDown", Math.max(control.min, Math.min(control.max, control.initial + 10) - 10)],
        ["End", control.max],
        ["ArrowUp", control.max],
        ["Home", control.min],
        ["ArrowDown", control.min],
      ] as const) {
        await slider.trigger("keydown", { key });
        expect(control.value.value).toBe(expected);
        expect(slider.attributes("aria-valuenow")).toBe(String(expected));
        expect(slider.attributes("aria-valuetext")).toBe(String(expected));
      }
    }
  });

  it("uses fractional steps anchored at min and shares formatted text with the decorative Readout", async () => {
    const { knob, value } = renderRange({ min: 0.05, modelValue: 0.15 });
    await knob.trigger("keydown", { key: "ArrowRight" });
    expect(value.value).toBeCloseTo(0.25);
    expect(Number(knob.attributes("aria-valuenow"))).toBeCloseTo(0.25);
    expect(knob.attributes("aria-valuetext")).toBe("0.25s");
    await knob.trigger("keydown", { key: "PageUp" });
    expect(value.value).toBeCloseTo(1.25);
    await knob.trigger("keydown", { key: "PageDown" });
    expect(value.value).toBeCloseTo(0.25);
    await knob.trigger("keydown", { key: "ArrowLeft" });
    expect(value.value).toBeCloseTo(0.15);
    expect(knob.attributes("aria-valuetext")).toBe("0.15s");

    await knob.trigger("mousedown", { clientX: 100, clientY: 200 });
    expect(document.activeElement).toBe(knob.element);
    const readout = document.querySelector(".knob-readout")!;
    expect(readout.getAttribute("aria-hidden")).toBe("true");
    expect(readout.querySelector(".readout__lit")?.textContent)
      .toBe(knob.attributes("aria-valuetext"));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100 }));
    await nextTick();
    expect(Number(value.value)).toBeGreaterThan(0.15);
    expect(Number(knob.attributes("aria-valuenow"))).toBe(value.value);
    expect(readout.querySelector(".readout__lit")?.textContent)
      .toBe(knob.attributes("aria-valuetext"));
    expect(knob.emitted("update:value")).toEqual(knob.emitted("update:modelValue"));
    document.dispatchEvent(new MouseEvent("mouseup"));
  });

  it("clamps at both endpoints even when max is between steps, without redundant updates", async () => {
    const { knob, value } = renderRange({ min: -0.2, max: 1.04, modelValue: 1 });
    await knob.trigger("keydown", { key: "End" });
    expect(value.value).toBe(1.04);
    await knob.trigger("keydown", { key: "ArrowUp" });
    await knob.trigger("keydown", { key: "PageUp" });
    expect(knob.emitted("update:modelValue")).toEqual([[1.04]]);
    await knob.trigger("keydown", { key: "Home" });
    expect(value.value).toBe(-0.2);
    await knob.trigger("keydown", { key: "ArrowDown" });
    await knob.trigger("keydown", { key: "PageDown" });
    expect(knob.emitted("update:modelValue")).toEqual([[1.04], [-0.2]]);
  });

  it.each(["isDisabled", "isDisplay"])("keeps %s range knobs out of keyboard interaction", async (flag) => {
    const { knob, value } = renderRange({ [flag]: true });
    expect(knob.attributes("tabindex")).toBe("-1");
    expect(knob.attributes("aria-disabled")).toBe("true");
    expect(knob.attributes("aria-valuetext")).toBe("0.3s");
    for (const key of sliderKeys) await knob.trigger("keydown", { key });
    expect(value.value).toBe(0.3);
    expect(knob.emitted("update:modelValue")).toBeUndefined();
  });

  it("consumes slider keys while leaving Tab and unrelated keys alone", async () => {
    const { knob } = renderRange();
    for (const key of [...sliderKeys, "Tab", "Enter", "a"]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      knob.element.dispatchEvent(event);
      await nextTick();
      expect(event.defaultPrevented).toBe(sliderKeys.includes(key));
    }
  });

  it("announces custom units and externally changed values for inferred range knobs", async () => {
    const { knob, value } = renderRange({
      type: undefined, min: 40, max: 220, step: 1, modelValue: 120,
      label: "BPM", formatValue: (value: number) => `${value} BPM`,
    });
    expect(knob.attributes("role")).toBe("slider");
    expect(knob.attributes("aria-valuetext")).toBe("120 BPM");
    value.value = 96;
    await nextTick();
    expect(knob.attributes("aria-valuenow")).toBe("96");
    expect(knob.attributes("aria-valuetext")).toBe("96 BPM");
  });

  it("preserves option arrows, endpoints and tap wrapping through a real model", async () => {
    const { knob, value } = renderRange({
      type: "options", label: "Wave", modelValue: "sine",
      options: [
        { label: "Sine", value: "sine" },
        { label: "Triangle", value: "triangle" },
        { label: "Saw", value: "saw" },
      ],
    });
    expect(knob.attributes("aria-valuemin")).toBe("0");
    expect(knob.attributes("aria-valuemax")).toBe("2");
    expect(knob.attributes("tabindex")).toBe("0");
    for (const [key, expected, index, label] of [
      ["ArrowRight", "triangle", 1, "Triangle"],
      ["ArrowDown", "sine", 0, "Sine"],
      ["ArrowLeft", "sine", 0, "Sine"],
      ["End", "saw", 2, "Saw"],
      ["ArrowUp", "saw", 2, "Saw"],
      ["PageDown", "saw", 2, "Saw"],
      ["Home", "sine", 0, "Sine"],
    ] as const) {
      await knob.trigger("keydown", { key });
      expect(value.value).toBe(expected);
      expect(knob.attributes("aria-valuenow")).toBe(String(index));
      expect(knob.attributes("aria-valuetext")).toBe(label);
    }
    await knob.trigger("keydown", { key: "End" });
    await knob.trigger("click");
    expect(value.value).toBe("sine");
    expect(knob.attributes("aria-valuetext")).toBe("Sine");
  });
});
