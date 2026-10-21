import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, provide, toRefs } from "vue";
import { mount } from "@vue/test-utils";
import ConfigPanel from "@/components/ConfigPanel.vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { resetSaveFailure, saveFailureNotice } from "@/services/safeStorage";

// Only the drawer chrome is stubbed. The Config store, storage wrapper and
// panel are real, so this exercises the whole explicit-save path.
vi.mock("@/components/TopDrawer.vue", () => ({
  default: {
    template: '<div><slot name="icon" /><slot name="panel" :close="() => {}" /></div>',
  },
}));
vi.mock("@/components/TabbedOverlayPanel.vue", () => ({
  default: {
    name: "TabbedOverlayPanel",
    props: ["modelValue", "tabs"],
    template: '<div><slot name="header" /><slot /></div>',
    setup(props: { modelValue: string }) {
      const { modelValue } = toRefs(props);
      provide("tabs-context", { value: modelValue });
    },
  },
}));

function quotaError() {
  return new DOMException("The quota has been exceeded.", "QuotaExceededError");
}

describe("ConfigPanel saving a Stage Look", () => {
  const alertSpy = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.clear();
    resetSaveFailure();
    alertSpy.mockReset();
    vi.stubGlobal("alert", alertSpy);
    vi.stubGlobal("prompt", vi.fn(() => "Night Drive"));
    window.alert = alertSpy;
    window.prompt = vi.fn(() => "Night Drive");
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function pressSave() {
    const wrapper = mount(ConfigPanel);
    wrapper.getComponent({ name: "TabbedOverlayPanel" }).vm.$emit("update:modelValue", "stage");
    await nextTick();
    await wrapper.find('[data-testid="stage-look-save"]').trigger("click");
    return wrapper;
  }

  it("says it was saved when storage accepts the Stage Look", async () => {
    await pressSave();

    expect(alertSpy).toHaveBeenCalledWith('Stage Look "Night Drive" saved.');
    expect(saveFailureNotice.value).toBeNull();
    const stored = JSON.parse(window.localStorage.getItem("emotitone-saved-stage-looks")!);
    expect(stored.map((look: { name: string }) => look.name)).toEqual(["Night Drive"]);
  });

  it("tells the player storage is full instead of claiming it saved, and keeps the look in memory", async () => {
    const setItem = window.localStorage.setItem as unknown as ReturnType<typeof vi.fn>;
    setItem.mockImplementationOnce(() => {
      throw quotaError();
    });

    await pressSave();

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith("Can't save — storage full");
    expect(useVisualConfigStore().savedStageLooks.map((look) => look.name)).toEqual(["Night Drive"]);
  });

  it("says a plain Can't save for other failures", async () => {
    const setItem = window.localStorage.setItem as unknown as ReturnType<typeof vi.fn>;
    setItem.mockImplementationOnce(() => {
      throw new Error("blocked");
    });

    await pressSave();

    expect(alertSpy).toHaveBeenCalledWith("Can't save");
  });
});
