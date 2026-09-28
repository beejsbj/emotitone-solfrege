import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BarTape from "@/components/primatives/BarTape.vue";
import barTapeSource from "@/components/primatives/BarTape.vue?raw";
import patternStripSource from "@/components/compounds/PatternStrip.vue?raw";
import patternReelSource from "@/components/compounds/PatternReel.vue?raw";
import productionPhraseShelfSource from "@/components/patterns/PhraseShelf.vue?raw";
import specimenSource from "@/style-guide/primatives/PrimitiveBarTape.vue?raw";

describe("BarTape", () => {
  it("renders musical events in sequence with duration-proportional widths", () => {
    const wrapper = mount(BarTape, {
      props: {
        segments: [
          { color: "rgb(255, 0, 0)", durationMs: 100, height: 48 },
          { color: "rgb(0, 255, 0)", durationMs: 300, height: 52 },
          { color: "rgb(0, 0, 255)", durationMs: 25, height: 55 },
        ],
      },
    });

    const segments = wrapper.findAll(".bar-tape__segment");

    expect(segments).toHaveLength(3);
    expect(segments[0].attributes("style")).toContain("flex-grow: 100");
    expect(segments[1].attributes("style")).toContain("flex-grow: 300");
    expect(segments[2].attributes("style")).toContain("flex-grow: 50");
    expect(segments.map((segment) => segment.element.style.backgroundColor)).toEqual([
      "rgb(255, 0, 0)",
      "rgb(0, 255, 0)",
      "rgb(0, 0, 255)",
    ]);
  });

  it("places each note at its pitch height, normalized between the lowest and highest pitch", () => {
    const wrapper = mount(BarTape, {
      props: {
        segments: [
          { color: "red", durationMs: 100, height: 60 },
          { color: "red", durationMs: 100, height: 52 },
          { color: "red", durationMs: 100, height: 56 },
          { color: "red", durationMs: 100, height: 60 },
        ],
      },
    });

    const rises = wrapper.findAll(".bar-tape__segment").map((segment) => (
      segment.element.style.getPropertyValue("--bar-tape-rise")
    ));
    expect(rises).toEqual(["1", "0", "0.5", "1"]);
  });

  it("lays a single-pitch tape flat without dividing by zero", () => {
    const wrapper = mount(BarTape, {
      props: {
        segments: [
          { color: "red", durationMs: 100, height: 55 },
          { color: "red", durationMs: 200, height: 55 },
        ],
      },
    });

    expect(wrapper.findAll(".bar-tape__segment").map((segment) => (
      segment.element.style.getPropertyValue("--bar-tape-rise")
    ))).toEqual(["0", "0"]);
  });

  it("renders an empty labelled band when there are no notes", () => {
    const wrapper = mount(BarTape, {
      props: { segments: [], ariaLabel: "Current Take note timeline" },
    });

    expect(wrapper.findAll(".bar-tape__segment")).toHaveLength(0);
    expect(wrapper.get(".bar-tape").attributes("aria-label"))
      .toBe("Current Take note timeline");
  });

  it("keeps the primitive to the accepted Piano Roll contract", () => {
    expect(barTapeSource).toMatch(/\.bar-tape\s*{[^}]*height: 6px;[^}]*gap: 1px;/);
    expect(barTapeSource).toMatch(/\.bar-tape__segment\s*{[^}]*height: 2px;/);
    expect(barTapeSource).toContain("calc(var(--bar-tape-rise, 0) * -4px)");
    expect(barTapeSource).toContain("@media (forced-colors: active)");
    expect(barTapeSource).not.toMatch(/transition|animation|cursor|border:/);
    expect(barTapeSource).toContain("MINIMUM_VISIBLE_DURATION = 50");
    expect(barTapeSource).not.toMatch(/BarTapeMode|BarTapeSize|BarTapeFrame|playhead|downbeat|majorFlex/);
  });

  it("crosses the same source seam in production and the guide", () => {
    expect(patternStripSource).toContain(
      'import BarTape from "../primatives/BarTape.vue"',
    );
    expect(patternStripSource).toContain(':segments="item.barTape"');
    expect(patternReelSource).toContain(
      'import PatternStrip from "./PatternStrip.vue"',
    );
    expect(productionPhraseShelfSource).toContain(
      'import PatternReel from "@/components/compounds/PatternReel.vue"',
    );
    expect(productionPhraseShelfSource).not.toContain("note-color-strip");
    expect(specimenSource).toContain(
      'import BarTape from "../../components/primatives/BarTape.vue"',
    );
    expect(specimenSource).toContain("defaultPatterns.slice(0, 3)");
  });

});
