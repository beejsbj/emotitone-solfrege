import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import Mark from "@/components/primatives/Mark.vue";
import SpineCard from "@/components/primatives/SpineCard.vue";
import { MARK_DEFINITIONS, MARK_NAMES, markViewBox } from "@/components/primatives/marks";

describe("Mark lineage", () => {
  it("exposes every structural and musical glyph through one registry", () => {
    expect(MARK_NAMES).toHaveLength(28);
    expect(MARK_NAMES).toContain("triangle");
    expect(MARK_NAMES).toContain("clef");
    expect(MARK_NAMES).toContain("natural");
    expect(MARK_NAMES).toContain("quarter-rest");
    expect(MARK_NAMES).toContain("bass-clef");
    expect(MARK_NAMES).not.toContain("sparkle");
    expect(MARK_NAMES).not.toContain("mist");
  });

  it("renders the SVG primitive from the authoritative path definition", () => {
    const wrapper = mount(Mark, { props: { name: "clef" } });

    expect(wrapper.attributes("viewBox")).toBe(markViewBox("clef"));
    expect(wrapper.findAll("path")).toHaveLength(MARK_DEFINITIONS.clef.paths.length);
  });

  it("routes Spine Card's section marker through the marked Sticker seam", () => {
    const wrapper = mount(SpineCard, {
      props: { kicker: "Section 03", stamp: "Tomato" },
    });

    expect(wrapper.find(".sticker--marked").exists()).toBe(true);
    expect(wrapper.find(".sticker__marked-text").text()).toBe("Section 03");
    expect(wrapper.find("svg.mark").attributes("data-mark")).toBe("diamond");
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
