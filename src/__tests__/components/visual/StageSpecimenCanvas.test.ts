import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, disposePinia } from "pinia";
import StageSpecimenCanvas from "@/style-guide/stage/StageSpecimenCanvas.vue";

vi.mock("pinia", async () => {
  const actual = await vi.importActual<typeof import("pinia")>("pinia");
  return {
    ...actual,
    createPinia: vi.fn(actual.createPinia),
    disposePinia: vi.fn(actual.disposePinia),
  };
});

vi.mock("@/components/UnifiedVisualEffects.vue", () => ({
  default: defineComponent({
    name: "UnifiedVisualEffects",
    render: () => null,
  }),
}));

describe("StageSpecimenCanvas", () => {
  afterEach(() => vi.clearAllMocks());

  it("disposes its isolated Pinia scope when the specimen unmounts", async () => {
    const wrapper = mount(StageSpecimenCanvas, {
      props: {
        signal: "silence",
        relationship: "web",
        stageEnabled: true,
      },
      attachTo: document.body,
    });
    await nextTick();

    const isolatedPinia = vi.mocked(createPinia).mock.results[0]?.value;
    expect(isolatedPinia).toBeDefined();

    wrapper.unmount();

    expect(disposePinia).toHaveBeenCalledOnce();
    expect(disposePinia).toHaveBeenCalledWith(isolatedPinia);
  });
});
