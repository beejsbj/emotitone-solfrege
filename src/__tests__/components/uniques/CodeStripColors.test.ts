import { mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import Note from "@/components/primatives/Note.vue";
import {
  createStaticNoteColorResolver,
  noteColorResolverKey,
} from "@/components/primatives/noteColorContext";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";

const mocks = vi.hoisted(() => ({ useMusicColor: vi.fn() }));
vi.mock("@/composables/useMusicColor", () => ({ useMusicColor: mocks.useMusicColor }));

describe("recorded-history color resolver", () => {
  it("keeps existing notes reactive to configured colors without subscribing them to hue frames", async () => {
    mocks.useMusicColor.mockImplementation(() => { throw new Error("unexpected animation subscriber"); });
    const config = reactive(structuredClone(DEFAULT_CONFIG.dynamicColors));
    const resolver = createStaticNoteColorResolver(() => config);
    const wrapper = mount(Note, {
      props: { rawPitch: "C4", scaleIndex: 0, octave: 4 },
      global: { provide: { [noteColorResolverKey as symbol]: resolver } },
    });
    const element = wrapper.element;
    const initial = wrapper.attributes("style");
    config.hueMotionEnabled = !config.hueMotionEnabled;
    await nextTick();
    expect(wrapper.attributes("style")).toBe(initial);
    config.lightnessCenter = 0.3;
    await nextTick();
    expect(wrapper.attributes("style")).not.toBe(initial);
    expect(wrapper.element).toBe(element);
    expect(mocks.useMusicColor).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
