import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import Knob from "@/components/primatives/Knob/index.vue";
import optionsKnobSource from "@/components/primatives/Knob/OptionsKnob.vue?raw";
import motionGuideSource from "@/style-guide/tokens/TokenMotion.vue?raw";
import { MODE_OPTIONS } from "@/data/musicData";
import { knobScrollContextKey } from "@/components/primatives/Knob/interaction";

const { triggerUIHaptic } = vi.hoisted(() => ({
  triggerUIHaptic: vi.fn(),
}));

vi.mock("@/composables/useGSAP", () => ({
  default: () => ({}),
}));

vi.mock("@/utils/hapticFeedback", () => ({
  triggerUIHaptic,
}));

describe("Knob public interface", () => {
  let wrappers: VueWrapper[] = [];

  const render = (props: Record<string, unknown> = {}, attachTo?: HTMLElement) => {
    const wrapper = mount(Knob, { props, attachTo });
    wrappers.push(wrapper);
    return wrapper;
  };

  beforeEach(() => {
    triggerUIHaptic.mockClear();
  });

  afterEach(() => {
    for (const wrapper of wrappers) wrapper.unmount();
    wrappers = [];
    document.body.innerHTML = "";
  });

  // Global setup mocks document events. Exercise the actual registered handlers.
  const documentEvent = async (type: string, event: Event) => {
    const registration = vi.mocked(document.addEventListener).mock.calls
      .filter(([name]) => name === type).at(-1);
    expect(registration).toBeDefined();
    (registration![1] as EventListener)(event);
    await nextTick();
  };

  it("shows formatted values above contact, updates immediately, and removes on release", async () => {
    const wrapper = render({ modelValue: -4.84, type: "range", formatValue: (v: number) => `${v} dB` });
    expect(document.querySelector(".knob-drag-value")).toBeNull();
    await wrapper.trigger("mousedown", { clientX: 150, clientY: 300 });
    const follower = document.querySelector(".knob-drag-value")!;
    expect(follower.textContent).toContain("-4.84 dB");
    expect(follower.querySelector(".sticker--fill")).not.toBeNull();
    await wrapper.setProps({ modelValue: -3.2 });
    expect(follower.textContent).toContain("-3.2 dB");
    await documentEvent("mouseup", new MouseEvent("mouseup"));
    expect(document.querySelector(".knob-drag-value")).toBeNull();
  });

  it("shows full option labels and dismisses for a horizontal gesture", async () => {
    const wrapper = render({ modelValue: "minor", options: [{ label: "Harmonic minor", value: "minor" }] });
    await wrapper.trigger("mousedown", { clientX: 150, clientY: 300 });
    expect(document.querySelector(".knob-drag-value")?.textContent).toContain("Harmonic minor");
    await documentEvent("mousemove", new MouseEvent("mousemove", { clientX: 190, clientY: 302 }));
    expect(document.querySelector(".knob-drag-value")).toBeNull();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("cancels touch without tapping and cleans up a held follower on unmount", async () => {
    const wrapper = render({ modelValue: "a", options: ["a", "b"] });
    await wrapper.trigger("touchstart", { touches: [{ clientX: 150, clientY: 300 }] });
    expect(document.querySelector(".knob-drag-value")).not.toBeNull();
    await documentEvent("touchcancel", new Event("touchcancel"));
    expect(document.querySelector(".knob-drag-value")).toBeNull();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    await wrapper.trigger("mousedown", { clientX: 150, clientY: 300 });
    wrapper.unmount();
    wrappers = wrappers.filter((entry) => entry !== wrapper);
    expect(document.querySelector(".knob-drag-value")).toBeNull();
    expect(document.removeEventListener).toHaveBeenCalledWith("mousemove", expect.any(Function));
  });

  it("removes a follower when made inert and keeps display-only activation inert", async () => {
    const wrapper = render({ modelValue: "a", options: ["a", "b"] });
    await wrapper.trigger("mousedown", { clientX: 150, clientY: 300 });
    await wrapper.setProps({ isDisplay: true });
    expect(document.querySelector(".knob-drag-value")).toBeNull();
    await wrapper.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("routes window blur to cancellation and leaves later document input inert", async () => {
    const addWindowListener = vi.spyOn(window, "addEventListener");
    try {
      const wrapper = render({ modelValue: 50, type: "range" });
      await wrapper.trigger("mousedown", { clientX: 100, clientY: 100 });
      const blurRegistration = addWindowListener.mock.calls
        .filter(([name]) => name === "blur")
        .at(-1);
      expect(blurRegistration).toBeDefined();

      (blurRegistration![1] as EventListener)(new Event("blur"));
      await nextTick();
      await documentEvent(
        "mousemove",
        new MouseEvent("mousemove", { clientX: 100, clientY: 40 }),
      );

      expect(document.querySelector(".knob-drag-value")).toBeNull();
      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    } finally {
      addWindowListener.mockRestore();
    }
  });

  it("keeps one responsive production anatomy with a bottom label", () => {
    const wrapper = render({ modelValue: 42, label: "Volume" });

    expect(wrapper.classes()).toContain("knob-wrapper");
    expect(wrapper.classes()).not.toContain("max-w-12");
    expect(wrapper.find(".knob-wrapper__face").exists()).toBe(true);
    expect(wrapper.get(".knob-wrapper__label").element.tagName).toBe("SPAN");
    expect(wrapper.get(".knob-wrapper__label").text()).toBe("Volume");
    expect(wrapper.find(".knob-face").exists()).toBe(true);
    expect(wrapper.find(".knob-primitive__label").exists()).toBe(false);
  });

  it("preserves deprecated value fallback and modelValue precedence", () => {
    expect(render({ value: 42 }).text()).toContain("42");
    expect(render({ modelValue: 7, value: 42 }).text()).toContain("7");
  });

  it("infers the accepted range, boolean, and options roles", () => {
    expect(render({ modelValue: 50 }).get(".knob-face").classes()).toContain(
      "knob-face--range",
    );
    expect(render({ modelValue: false }).get(".knob-face").classes()).toContain(
      "knob-face--boolean",
    );
    expect(
      render({ modelValue: 1, min: 0, max: 1, step: 1 })
        .get(".knob-face")
        .classes(),
    ).toContain("knob-face--boolean");
    expect(
      render({ modelValue: "SQ", options: ["SIN", "SQ"] })
        .get(".knob-face")
        .classes(),
    ).toContain("knob-face--options");
  });

  it("exposes Ring and Arc with semantic Brass and Ivory treatments", () => {
    const ring = render({
      modelValue: 64,
      visual: "ring",
      tone: "brass",
    });
    const arc = render({ modelValue: 64, visual: "arc", tone: "ivory" });

    expect(ring.get(".knob-face").classes()).toEqual(
      expect.arrayContaining(["knob-face--ring", "knob-face--brass"]),
    );
    expect(ring.find(".knob-face__dome").exists()).toBe(true);
    expect(arc.get(".knob-face").classes()).toEqual(
      expect.arrayContaining(["knob-face--arc", "knob-face--ivory"]),
    );
    expect(arc.find(".knob-face__dome").exists()).toBe(false);
  });

  it("renders production role grammar through the public interface", () => {
    const range = render({
      modelValue: 3.456,
      type: "range",
      formatValue: (value: number) => `${value}s`,
    });
    expect(range.text()).toContain("3.46");
    expect(range.text()).toContain("s");

    const boolean = render({ modelValue: true, type: "boolean" });
    expect(boolean.get(".knob-face").classes()).toContain("knob-face--active");
    expect(boolean.find(".knob-boolean__ball").exists()).toBe(true);
    expect(boolean.findAll(".knob-face circle")).toHaveLength(2);

    const options = render({
      modelValue: "SQ",
      type: "options",
      options: [
        { label: "Sine", value: "SIN" },
        { label: "Square", value: "SQ", color: "tomato" },
        { label: "Saw", value: "SAW" },
      ],
    });
    expect(options.text()).toContain("Square");
    expect(options.findAll(".knob-face circle")).toHaveLength(3);
    expect(options.get(".knob-face").attributes("style")).toContain("tomato");

  });

  it("keeps option labels whole and gives long mode names a compact treatment", () => {
    for (const option of MODE_OPTIONS) {
      const options = render({
        modelValue: option.value,
        type: "options",
        options: MODE_OPTIONS,
      });
      const value = options.get(".knob-options__value");

      expect(value.text()).toBe(option.label);
      if (option.label.replace(/\s/g, "").length > 7) {
        expect(value.classes()).toContain("knob-options__value--long");
      }
      if (option.label.includes(" ")) {
        expect(value.classes()).toContain("knob-options__value--multiline");
      }
    }
    expect(optionsKnobSource).toContain("inline-size: 84cqi");
    expect(optionsKnobSource).not.toContain("text-overflow: ellipsis");
    expect(optionsKnobSource).not.toContain("max-inline-size: 58cqi");
  });

  it("uses the shared rip-mode recipe for keyed option-label changes", async () => {
    const options = render({
      modelValue: "major",
      type: "options",
      options: [
        { label: "Major", value: "major" },
        { label: "Phrygian", value: "phrygian" },
      ],
    });

    await options.setProps({ modelValue: "phrygian" });

    expect(options.get(".knob-options__value").text()).toBe("Phrygian");
    expect(optionsKnobSource).toContain('<Transition name="knob-rip-mode">');
    expect(optionsKnobSource).toContain("`${typeof value}:${String(value)}`");
    expect(optionsKnobSource).toContain("animation: rip-mode-in var(--dur-rip-mode) var(--ease-rip-mode) both");
    expect(optionsKnobSource).toContain("animation: rip-mode-out var(--dur-rip-mode) var(--ease-rip-mode) both");
    expect(motionGuideSource).toContain("animation-name: rip-mode-out");
    expect(motionGuideSource).toContain("animation-name: rip-mode-in");
    expect(motionGuideSource).toContain("animation-duration: var(--dur-rip-mode)");
    expect(motionGuideSource).not.toContain("animation: cross-fade-rip");
  });

  it("keeps Boolean Knob keyboard-operable for persistent state consumers", () => {
    const boolean = render({ modelValue: true, type: "boolean", label: "Visuals" });

    expect(boolean.element.tagName).toBe("BUTTON");
    expect(boolean.attributes("type")).toBe("button");
    expect(boolean.attributes("aria-pressed")).toBe("true");
    expect(boolean.attributes("aria-label")).toBe("Visuals");
  });

  it("keeps explicit theme and per-option colors ahead of semantic tone", () => {
    const explicit = render({
      modelValue: 64,
      tone: "brass",
      themeColor: "hotpink",
    });
    expect(explicit.get(".knob-face").attributes("style")).toContain("hotpink");

    const option = render({
      modelValue: "SQ",
      tone: "brass",
      options: [{ label: "Square", value: "SQ", color: "tomato" }],
    });
    expect(option.get(".knob-face").attributes("style")).toContain("tomato");
  });

  it("emits both current and deprecated updates for boolean taps", async () => {
    const wrapper = render({ modelValue: false, type: "boolean" });

    await wrapper.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
    expect(wrapper.emitted("update:value")).toEqual([[true]]);
    expect(triggerUIHaptic).toHaveBeenCalledTimes(1);
  });

  it("applies vertical drag effects through both public update events", async () => {
    const wrapper = render({ modelValue: 50, type: "range" });
    await wrapper.trigger("mousedown", { clientX: 100, clientY: 100 });
    await documentEvent(
      "mousemove",
      new MouseEvent("mousemove", { clientX: 102, clientY: 60 }),
    );

    expect(wrapper.emitted("update:modelValue")).toEqual([[70]]);
    expect(wrapper.emitted("update:value")).toEqual([[70]]);
    expect(triggerUIHaptic).toHaveBeenCalledTimes(1);
  });

  it("continues a drag from an authoritative external model update", async () => {
    const wrapper = render({ modelValue: 50, type: "range" });
    await wrapper.trigger("mousedown", { clientX: 100, clientY: 100 });
    await documentEvent(
      "mousemove",
      new MouseEvent("mousemove", { clientX: 100, clientY: 80 }),
    );
    expect(wrapper.emitted("update:modelValue")).toEqual([[60]]);

    await wrapper.setProps({ modelValue: 20 });
    expect(document.querySelector(".knob-drag-value")?.textContent).toContain("20");
    await documentEvent(
      "mousemove",
      new MouseEvent("mousemove", { clientX: 100, clientY: 60 }),
    );

    const modelUpdates = wrapper.emitted("update:modelValue")!;
    const legacyUpdates = wrapper.emitted("update:value")!;
    const continuedValue = Number(modelUpdates[1][0]);
    expect(modelUpdates[0]).toEqual([60]);
    expect(continuedValue).toBeGreaterThan(20);
    expect(continuedValue).toBeLessThan(40);
    expect(legacyUpdates).toEqual(modelUpdates);
  });

  it("activates a boolean mouse tap once across mouseup and click", async () => {
    const wrapper = render({ modelValue: false, type: "boolean" });

    await wrapper.trigger("mousedown", { clientX: 20, clientY: 20 });
    await documentEvent("mouseup", new MouseEvent("mouseup", { bubbles: true }));

    // Mouseup closes the gesture; the native click is the single activation.
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await wrapper.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
    expect(triggerUIHaptic).toHaveBeenCalledTimes(1);
  });

  it("advances and wraps real string options on tap", async () => {
    const wrapper = render({
      modelValue: "SAW",
      type: "options",
      options: ["SIN", "TRI", "SAW"],
    });

    await wrapper.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["SIN"]]);
    expect(wrapper.emitted("update:value")).toEqual([["SIN"]]);
  });

  it("keeps the newest option label visible during rapid cycling", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1000);
      const wrapper = render({
        modelValue: "major",
        type: "options",
        options: [
          { label: "Major", value: "major" },
          { label: "Phrygian", value: "phrygian" },
          { label: "Dorian", value: "dorian" },
        ],
      });

      await wrapper.setProps({ modelValue: "phrygian" });
      const firstChangedLabel = wrapper.get(".knob-options__value").element;

      vi.setSystemTime(1100);
      await wrapper.setProps({ modelValue: "dorian" });

      expect(wrapper.get(".knob-options__value").element).toBe(firstChangedLabel);
      expect(wrapper.get(".knob-options__value").text()).toBe("Dorian");
    } finally {
      vi.useRealTimers();
    }
  });

  it("routes horizontal movement through the explicit scroll adapter", async () => {
    let scrollLeft = 40;
    const writeScrollLeft = vi.fn((value: number) => {
      scrollLeft = value;
    });
    const knob = mount(Knob, {
      props: { modelValue: 50, type: "range" },
      attachTo: document.body,
      global: {
        provide: {
          [knobScrollContextKey as symbol]: {
            read: () => scrollLeft,
            write: writeScrollLeft,
          },
        },
      },
    });
    wrappers.push(knob);

    const mouseAt = (type: string, clientX: number, clientY: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        clientX: { value: clientX },
        clientY: { value: clientY },
      });
      return event;
    };

    await knob.trigger("mousedown", { clientX: 100, clientY: 100 });
    await documentEvent("mousemove", mouseAt("mousemove", 130, 102));
    await documentEvent("mouseup", new MouseEvent("mouseup", { bubbles: true }));

    expect(writeScrollLeft).toHaveBeenCalledWith(10);
    expect(scrollLeft).toBe(10);
    expect(knob.emitted("update:modelValue")).toBeUndefined();
    expect(triggerUIHaptic).not.toHaveBeenCalled();
  });

  it("keeps disabled and display modes pointer-inert", async () => {
    const disabled = render({ modelValue: false, type: "boolean", isDisabled: true });
    expect(disabled.classes()).toContain("pointer-events-none");
    await disabled.trigger("click");
    expect(disabled.emitted("update:modelValue")).toBeUndefined();

    const display = render({ modelValue: 4, type: "range", isDisplay: true });
    expect(display.classes()).toContain("pointer-events-none");
    expect(display.get(".knob-face").classes()).toContain("knob-face--display");
  });
});
