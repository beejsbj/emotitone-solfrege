import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import Sticker from "@/components/primatives/Sticker.vue";
import { provideUIBeat, UIBeatClock } from "@/composables/useUIBeat";

describe("Sticker", () => {
  it("applies the Brass Badge treatment without randomized geometry", () => {
    const wrapper = mount(Sticker, {
      props: {
        variant: "badge",
        color: "brass-sheen",
      },
      slots: {
        default: "Alert",
      },
    });

    expect(wrapper.classes()).toContain("sticker--badge");
    expect(wrapper.classes()).toContain("sticker--color-brass-sheen");
    expect(wrapper.find(".sticker__badge-edge").exists()).toBe(true);
    expect(wrapper.find(".sticker__badge-text").text()).toBe("Alert");
    expect(wrapper.attributes("style")).toBeUndefined();
  });

  it("supports the Ivory Badge material used for committed joystick latches", () => {
    const wrapper = mount(Sticker, {
      props: {
        variant: "badge",
        color: "ivory",
      },
      slots: {
        default: "Dark",
      },
    });

    expect(wrapper.classes()).toContain("sticker--badge");
    expect(wrapper.classes()).toContain("sticker--color-ivory");
    expect(wrapper.find(".sticker__badge-edge").exists()).toBe(true);
    expect(wrapper.find(".sticker__badge-text").text()).toBe("Dark");
  });

  it.each([
    ["before", ["mark", "sticker__marked-text"]],
    ["after", ["sticker__marked-text", "mark"]],
  ] as const)("places an optional Mark %s the text", (markPosition, expectedOrder) => {
    const wrapper = mount(Sticker, {
      props: {
        variant: "fill",
        color: "tomato",
        mark: "eighth",
        markPosition,
      },
      slots: {
        default: "Live",
      },
    });

    expect(wrapper.classes()).toContain("sticker--marked");
    expect(wrapper.find("svg.mark").attributes("data-mark")).toBe("eighth");
    expect(wrapper.find("svg.mark").classes()).toContain("mark--tone-inherit");
    expect(wrapper.element.children).toHaveLength(2);
    expect(Array.from(wrapper.element.children).map((child) => child.classList[0])).toEqual(expectedOrder);
  });

  it("opts the actual paper into UIBeat without replacing its cut-paper transform", () => {
    const presentationEnabled = ref(true);
    const clock = new UIBeatClock({
      observeEnvironment: false,
      reducedMotion: () => false,
      documentVisible: () => true,
    });
    const Host = defineComponent({
      setup() {
        provideUIBeat({
          clock,
          presentationEnabled: () => presentationEnabled.value,
        });
        return () => h(Sticker, {
          uiBeat: true,
          variant: "fill",
          color: "ivory",
        }, () => "Current Piano");
      },
    });
    const wrapper = mount(Host);
    const generation = clock.arm({
      mappingAvailable: true,
      bpm: 120,
      meter: { beatsPerBar: 4, beatUnit: 4 },
    });
    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });

    const sticker = wrapper.get(".sticker");
    expect(sticker.attributes("data-ui-beat-state")).toBe("running");
    expect(sticker.attributes("style")).toContain("scale: 1.100");
    expect(sticker.attributes("style")).toContain("--sticker-transform");
    expect((sticker.element as HTMLElement).style.transform).toBe("");
    wrapper.unmount();
    clock.destroy();
  });
});
