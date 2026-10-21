import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import UniqueCodeStrip from "@/style-guide/uniques/UniqueCodeStrip.vue";
import CompoundCodeStripBar from "@/style-guide/compounds/CompoundCodeStripBar.vue";

// Controlled specimens never start audio; keep the browser-only Strudel adapter out of this DOM test.
vi.mock("@strudel/webaudio", () => ({}));

let wrapper: VueWrapper | undefined;
afterEach(() => wrapper?.unmount());

describe("HighlightStrip guide specimens", () => {
  it("renders the unique's note, chord, rest, density and glyph specimens through the real strip", async () => {
    wrapper = mount(UniqueCodeStrip);
    await flushPromises();

    const strips = wrapper.findAll(".highlight-strip");
    expect(strips).toHaveLength(17);
    for (const strip of strips) {
      expect(strip.findAll("[data-event-index]").length).toBeGreaterThan(0);
      expect(strip.find(".highlight-strip__empty").exists()).toBe(false);
      expect(strip.find('[aria-label="Open in Strudel"]').exists()).toBe(false);
      expect(strip.find('[contenteditable="true"], [role="textbox"]').exists()).toBe(false);
    }
    expect(wrapper.get("#code-strip-complete-anatomy").text()).toContain("Cmaj7");
    expect(wrapper.get("#code-strip-glyph-proportions").text()).toContain("F4");
  });

  it("renders events in the bar fixtures and reserves the recording prompt for the empty example", async () => {
    wrapper = mount(CompoundCodeStripBar);
    await flushPromises();

    const strips = wrapper.findAll(".highlight-strip");
    expect(strips.map(strip => strip.findAll("[data-event-index]").length)).toEqual([4, 3, 4, 0]);
    expect(wrapper.findAll(".highlight-strip__empty")).toHaveLength(1);
    expect(strips[3].text()).toContain("Record a pattern");
    expect(strips[3].find('[aria-label="Open in Strudel"]').exists()).toBe(false);
  });
});
