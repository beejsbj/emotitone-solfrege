import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import KnobFace from "@/components/primatives/Knob.vue";
import RangeKnob from "@/components/knobs/RangeKnob.vue";
import BooleanKnob from "@/components/knobs/BooleanKnob.vue";
import OptionsKnob from "@/components/knobs/OptionsKnob.vue";
import ButtonKnob from "@/components/knobs/ButtonKnob.vue";
import knobFaceSource from "@/components/primatives/Knob.vue?raw";
import knobWrapperSource from "@/components/knobs/Knob.vue?raw";

vi.mock("@/composables/useGSAP", () => ({
  default: () => ({}),
}));

describe("accepted Knob visual family", () => {
  it("renders ring and arc as treatments of the same visual face", () => {
    const ring = mount(KnobFace, {
      props: { role: "range", visual: "ring", tone: "brass", color: "gold" },
    });
    const arc = mount(KnobFace, {
      props: { role: "range", visual: "arc", tone: "ivory", color: "white" },
    });

    expect(ring.classes()).toEqual(
      expect.arrayContaining(["knob-face", "knob-face--ring", "knob-face--brass"]),
    );
    expect(ring.find(".knob-face__dome").exists()).toBe(true);
    expect(arc.classes()).toEqual(
      expect.arrayContaining(["knob-face", "knob-face--arc", "knob-face--ivory"]),
    );
    expect(arc.find(".knob-face__dome").exists()).toBe(false);
    expect(ring.findAll("circle")).toHaveLength(2);
    expect(arc.findAll("circle")).toHaveLength(2);
  });

  it("formalizes a 270-degree range and full-circle non-range tracks", () => {
    expect(knobFaceSource).toContain("const PARTIAL_ARC_START = -37.5");
    expect(knobFaceSource).toContain("const PARTIAL_ARC_END = 37.5");
    expect(knobFaceSource).toMatch(
      /if \(props\.role === "range"\)[\s\S]*PARTIAL_ARC_START[\s\S]*return \{ start: FULL_CIRCLE_START, end: FULL_CIRCLE_END \}/,
    );

    for (const role of ["boolean", "options", "button"] as const) {
      const wrapper = mount(KnobFace, {
        props: { role, color: "white", isActive: true, totalSegments: 4 },
      });
      expect(wrapper.classes()).toContain(`knob-face--${role}`);
      expect(wrapper.get(".knob-face__track").element.tagName).toBe("circle");
    }
  });

  it("drives production range formatting and treatment through the shared face", () => {
    const wrapper = mount(RangeKnob, {
      props: {
        modelValue: 3.456,
        min: 0,
        max: 10,
        visual: "ring",
        tone: "brass",
        themeColor: "gold",
        formatValue: (value) => `${value}s`,
      },
    });

    expect(wrapper.get(".knob-face").classes()).toContain("knob-face--ring");
    expect(wrapper.text()).toContain("3.46");
    expect(wrapper.text()).toContain("s");
  });

  it("keeps the boolean elastic ball and gives it a full-circle face", () => {
    const wrapper = mount(BooleanKnob, {
      props: {
        modelValue: true,
        visual: "arc",
        tone: "brass",
        themeColor: "gold",
      },
    });

    expect(wrapper.get(".knob-face--boolean").exists()).toBe(true);
    expect(wrapper.get(".knob-face--boolean").classes()).toContain(
      "knob-face--active",
    );
    expect(wrapper.get(".rounded-full").attributes("style")).toContain("gold");
    expect(knobWrapperSource).toContain('scale: held ? 1.15 : 1');
    expect(knobWrapperSource).toContain('ease: "elastic.out(1, 0.3)"');
  });

  it("uses the real option count, index, label, and per-option color", () => {
    const wrapper = mount(OptionsKnob, {
      props: {
        modelValue: "SQ",
        visual: "arc",
        tone: "ivory",
        options: [
          { label: "Sine", value: "SIN" },
          { label: "Square", value: "SQ", color: "tomato" },
          { label: "Saw", value: "SAW" },
        ],
      },
    });
    const face = wrapper.getComponent(KnobFace);

    expect(face.props("totalSegments")).toBe(3);
    expect(face.props("activeSegment")).toBe(1);
    expect(face.props("color")).toBe("tomato");
    expect(wrapper.text()).toContain("Square");
  });

  it("keeps button content state-driven with one full-circle face", () => {
    const active = mount(ButtonKnob, {
      props: {
        visual: "arc",
        tone: "brass",
        buttonText: "REC",
        isActive: true,
        activeColor: "gold",
      },
    });
    const loading = mount(ButtonKnob, {
      props: { visual: "ring", buttonText: "GO", isLoading: true },
    });

    expect(active.getComponent(KnobFace).props("isActive")).toBe(true);
    expect(active.text()).toContain("REC");
    expect(active.findAll(".knob-face__track")).toHaveLength(1);
    expect(loading.get(".knob-face").classes()).toContain("knob-face--ring");
    expect(loading.get(".knob-face").classes()).not.toContain(
      "knob-face--active",
    );
    expect(loading.text()).not.toContain("GO");
    expect(knobFaceSource).toContain("repeat: -1");
    expect(knobFaceSource).toContain('ease: "none"');
  });
});
