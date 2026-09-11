import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StageComparisonPage from "@/style-guide/StageComparisonPage.vue";

describe("Stage comparison page", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the Stage study explicit and isolated from production", async () => {
    const wrapper = mount(StageComparisonPage);

    expect(wrapper.text()).toContain("One body.");
    expect(wrapper.text()).toContain("One orbit.");
    expect(wrapper.text()).toContain("This fixture changes no production Stage code.");
    expect(wrapper.text()).toContain("Pitch-gated strings");
    expect(wrapper.text()).toContain("Spectral strings");
    expect(wrapper.findAll("article")).toHaveLength(3);

    const silence = wrapper.findAll("button").find((button) => button.text() === "Silence");
    await silence?.trigger("click");
    expect(silence?.attributes("aria-pressed")).toBe("true");

    const web = wrapper.findAll("button").find((button) => button.text() === "Web");
    expect(web?.attributes("aria-pressed")).toBe("true");
  });
});
