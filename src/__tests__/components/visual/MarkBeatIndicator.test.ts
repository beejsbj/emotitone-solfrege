import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import Mark from "@/components/primatives/Mark.vue";
import { MARK_DEFINITIONS, MARK_NAMES, markViewBox } from "@/components/primatives/marks";

describe("Mark lineage", () => {
  it("exposes every structural and musical glyph through one registry", () => {
    expect(MARK_NAMES).toHaveLength(20);
    expect(MARK_NAMES).toContain("triangle");
    expect(MARK_NAMES).toContain("clef");
    expect(MARK_NAMES).not.toContain("sparkle");
    expect(MARK_NAMES).not.toContain("mist");
  });

  it("renders the SVG primitive from the authoritative path definition", () => {
    const wrapper = mount(Mark, { props: { name: "clef" } });

    expect(wrapper.attributes("viewBox")).toBe(markViewBox("clef"));
    expect(wrapper.findAll("path")).toHaveLength(MARK_DEFINITIONS.clef.paths.length);
  });

  it("builds Beat Indicator cells from a selected Mark set", () => {
    const wrapper = mount(BeatIndicator, {
      props: { beats: 5, marks: ["disk", "eighth"] },
    });

    expect(wrapper.findAll(".beat-indicator__beat")).toHaveLength(5);
    expect(wrapper.findAll("svg.mark")).toHaveLength(5);
    expect(wrapper.findAll(".beat-indicator__beat").map((beat) => beat.attributes("data-mark"))).toEqual([
      "disk", "eighth", "disk", "eighth", "disk",
    ]);
  });
});
