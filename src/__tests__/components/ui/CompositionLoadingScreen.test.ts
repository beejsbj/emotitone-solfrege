import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CompositionLoadingScreen from "@/style-guide/compositions/CompositionLoadingScreen.vue";
import { INSTRUMENT_LOAD_TIMEOUT_MESSAGE, INSTRUMENT_LOAD_TIMEOUT_MS } from "@/services/audioFailures";

vi.mock("@/components/MidiPermissionIcon.vue", () => ({ default: { template: "<span />" } }));

describe("Loading Screen specimen", () => {
  it("renders every still frame inert, so its unwired gates are never live controls", () => {
    const wrapper = mount(CompositionLoadingScreen);
    const wells = wrapper.findAll(".loading-specimen__well");
    expect(wells.length).toBeGreaterThanOrEqual(4);
    for (const well of wells) expect(well.attributes()).toHaveProperty("inert");
    for (const button of wrapper.findAll("button")) {
      expect(button.element.closest("[inert]")).not.toBeNull();
    }
  });

  it("shows the production timeout message and its real limit", () => {
    const wrapper = mount(CompositionLoadingScreen);
    expect(wrapper.text()).toContain(INSTRUMENT_LOAD_TIMEOUT_MESSAGE);
    expect(wrapper.text()).toContain(`${INSTRUMENT_LOAD_TIMEOUT_MS / 1000}-second`);
    expect(wrapper.text()).not.toContain("30 seconds");
    expect(wrapper.find(".count-gate--reload").exists()).toBe(true);
  });
});
