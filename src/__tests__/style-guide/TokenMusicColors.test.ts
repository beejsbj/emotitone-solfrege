import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import TokenMusicColors from "@/style-guide/tokens/TokenMusicColors.vue";

describe("TokenMusicColors", () => {
  it("renders the real twelve-slot specimen and all three mappings", async () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const wrapper = mount(TokenMusicColors);
    const segments = wrapper.findAll(".music-recipe__segment");

    expect(segments).toHaveLength(12);
    expect(wrapper.findAll(".music-recipe__segment--tonic")).toHaveLength(1);
    expect(wrapper.findAll(".music-recipe__segment--empty")).toHaveLength(5);
    expect(wrapper.text()).toContain("fixed-chromatic-fallback");
    expect(wrapper.find(".note").exists()).toBe(true);
    expect(wrapper.find(".chord").exists()).toBe(true);

    await wrapper.findAll("button").find((button) => button.text() === "Fixed")!.trigger("click");
    expect(wrapper.findAll(".music-recipe__segment--empty")).toHaveLength(0);

    await wrapper.findAll("button").find((button) => button.text() === "Ordinal")!.trigger("click");
    expect(wrapper.text()).toContain("ordinal movable");
    expect(wrapper.findAll(".music-recipe__segment--empty")).toHaveLength(5);
  });
});
