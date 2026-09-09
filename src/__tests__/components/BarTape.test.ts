import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BarTape from "@/components/primatives/BarTape.vue";
import barTapeSource from "@/components/primatives/BarTape.vue?raw";
import patternStripSource from "@/components/compounds/PatternStrip.vue?raw";
import patternReelSource from "@/components/compounds/PatternReel.vue?raw";
import productionPatternListSource from "@/components/patterns/PatternList.vue?raw";
import specimenSource from "@/style-guide/primatives/PrimitiveBarTape.vue?raw";

describe("BarTape", () => {
  it("renders musical events in sequence with duration-proportional widths", () => {
    const wrapper = mount(BarTape, {
      props: {
        segments: [
          { color: "rgb(255, 0, 0)", durationMs: 100 },
          { color: "rgb(0, 255, 0)", durationMs: 300 },
          { color: "rgb(0, 0, 255)", durationMs: 25 },
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

  it("keeps the primitive to the accepted compressed timeline contract", () => {
    expect(barTapeSource).toContain("height: 4px");
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
    expect(productionPatternListSource).toContain(
      'import PatternReel from "@/components/compounds/PatternReel.vue"',
    );
    expect(productionPatternListSource).not.toContain("note-color-strip");
    expect(specimenSource).toContain(
      'import BarTape from "../../components/primatives/BarTape.vue"',
    );
    expect(specimenSource).toContain("defaultPatterns.slice(0, 3)");
  });

  it("orders production PatternStrip segments by note onset", () => {
    expect(productionPatternListSource).toMatch(
      /\.sort\(\s*\(firstNote, secondNote\) => firstNote\.pressTime - secondNote\.pressTime,?\s*\)/,
    );
    expect(productionPatternListSource).toContain("[...notes]");
  });
});
