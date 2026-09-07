import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import ControlBar from "@/components/compounds/ControlBar.vue";
import Knob from "@/components/primatives/Knob/index.vue";

vi.mock("@/composables/useGSAP", () => ({
  default: () => ({}),
}));

vi.mock("@/utils/hapticFeedback", () => ({
  triggerUIHaptic: vi.fn(),
}));

describe("ControlBar knob interaction wiring", () => {
  let wrapper: VueWrapper | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("hands a real control-bar horizontal gesture to its provided element", async () => {
    wrapper = mount(ControlBar, { attachTo: document.body });
    const element = wrapper.get(".control-bar").element as HTMLElement;
    let scrollLeft = 40;
    const setScrollLeft = vi.fn((left: number) => {
      scrollLeft = left;
    });
    Object.defineProperty(element, "scrollLeft", {
      configurable: true,
      get: () => scrollLeft,
      set: setScrollLeft,
    });

    const bpmKnob = wrapper.findAllComponents(Knob)[2];
    await bpmKnob.trigger("mousedown", { clientX: 100, clientY: 100 });
    expect(document.querySelector(".knob-drag-value")).not.toBeNull();

    const moveRegistration = vi.mocked(document.addEventListener).mock.calls
      .filter(([name]) => name === "mousemove")
      .at(-1);
    expect(moveRegistration).toBeDefined();
    const move = new MouseEvent("mousemove", { bubbles: true, cancelable: true });
    Object.defineProperties(move, {
      clientX: { value: 130 },
      clientY: { value: 102 },
    });
    (moveRegistration![1] as EventListener)(move);
    await nextTick();

    expect(setScrollLeft).toHaveBeenCalledWith(10);
    expect(document.querySelector(".knob-drag-value")).toBeNull();
    expect(bpmKnob.emitted("update:modelValue")).toBeUndefined();
  });
});
