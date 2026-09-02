import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Chord from "@/components/compounds/Chord.vue";
import CodeStripSequence from "@/components/uniques/CodeStrip/Sequence.vue";
import Note from "@/components/primatives/Note.vue";

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: (scaleIndex: number) => ({
      background: `color-${scaleIndex}`,
      primaryColor: `color-${scaleIndex}`,
    }),
  }),
}));

const chordMembers = [
  { syllable: "Do", rawPitch: "C4", scaleIndex: 0, progress: 1 },
  { syllable: "Mi", rawPitch: "E4", scaleIndex: 2, progress: .6 },
  { syllable: "Sol", rawPitch: "G4", scaleIndex: 4, progress: .2 },
];

describe("CodeStrip event rendering", () => {
  it("composes Note and Chord through their public sources", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        tokens: [
          {
            type: "note",
            note: "mi",
            text: "3̂",
            glyph: "deg",
            lit: true,
            progress: .7,
            mode: "dorian",
            musicKey: "D",
            surfaceStyle: "monochrome",
            isAccidental: true,
            keyBrightness: .8,
            keySaturation: .7,
          },
          { type: "rest", duration: "@0.25", progress: .4 },
          { type: "chord", symbol: "C", members: chordMembers, display: "notes" },
          { type: "note", note: "sol", text: "G", glyph: "raw", accidental: "#" },
        ],
      },
    });

    const notes = wrapper.findAllComponents(Note);
    expect(notes).toHaveLength(5);
    expect(notes[0].props()).toMatchObject({
      primary: "degree",
      visibleLabels: ["degree"],
      proportion: "glyph",
      sounding: true,
      scaleIndex: 2,
      mode: "dorian",
      musicKey: "D",
      surfaceStyle: "monochrome",
      accidental: true,
      keyBrightness: .8,
      keySaturation: .7,
    });
    expect(notes[0].attributes("shape")).toBeUndefined();
    expect(wrapper.findComponent(Chord).props()).toMatchObject({
      display: "notes",
      symbol: "C",
      proportion: "compact",
    });
    expect(wrapper.find(".code-strip__accidental").text()).toBe("#");
    expect(wrapper.findAll("[data-code-strip-index]").map((event) => event.attributes("data-code-strip-index")))
      .toEqual(["0", "1", "2", "3"]);
  });

  it("keeps Rest local, durationless, and controlled from Ink to Ivory", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        durationMode: "stacked",
        tokens: [{ type: "rest", duration: "@0.5", progress: 1.4 }],
      },
    });

    expect(wrapper.find(".code-strip__rest-mark").text()).toBe("~");
    expect(wrapper.find(".code-strip__stack-duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__rest").attributes("style")).toContain("--code-strip-progress: 1");
    expect(wrapper.find(".code-strip__rest-fill").exists()).toBe(true);
  });

  it("treats duration presentation as a strip-level comparison", async () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        durationMode: "stacked",
        tokens: [{ type: "note", note: "do", text: "Do", duration: "@0.5" }],
      },
    });

    expect(wrapper.find(".code-strip__stack-duration").text()).toBe("@0.5");

    await wrapper.setProps({ durationMode: "bar" });
    const bar = wrapper.get(".code-strip__duration-bar");
    expect(bar.element.parentElement?.classList.contains("code-strip__event-line")).toBe(true);
    expect(bar.attributes("style")).toContain("--code-strip-duration-ratio: 0.5");
    expect(wrapper.findAll(".code-strip__duration-mark")).toHaveLength(8);
    expect(wrapper.findAll(".code-strip__duration-mark--beat")).toHaveLength(2);

    await wrapper.setProps({ timeSignature: "3/4" });
    expect(wrapper.findAll(".code-strip__duration-mark")).toHaveLength(6);

    await wrapper.setProps({ durationMode: "hidden" });
    expect(wrapper.find(".code-strip__stack-duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__duration-marks").exists()).toBe(false);
  });

  it("shows meter-aware duration marks for Rest without printing its duration", () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        durationMode: "bar",
        timeSignature: "4/4",
        tokens: [{ type: "rest", duration: "@0.25", progress: .4 }],
      },
    });

    expect(wrapper.find(".code-strip__stack-duration").exists()).toBe(false);
    expect(wrapper.get(".code-strip__duration-bar").element.parentElement?.classList.contains("code-strip__event-line")).toBe(true);
    expect(wrapper.get(".code-strip__duration-bar").attributes("style")).toContain("--code-strip-duration-ratio: 0.25");
    expect(wrapper.findAll(".code-strip__duration-mark")).toHaveLength(4);
    expect(wrapper.findAll(".code-strip__duration-mark--beat")).toHaveLength(1);
  });

  it("exposes density without changing notation anatomy", async () => {
    const wrapper = mount(CodeStripSequence, {
      props: {
        density: "dense",
        tokens: [{ type: "note", note: "do", text: "Do" }],
      },
    });

    expect(wrapper.classes()).toContain("code-strip-sequence--dense");
    expect(wrapper.findAllComponents(Note)).toHaveLength(1);

    await wrapper.setProps({ density: "spaced" });
    expect(wrapper.classes()).toContain("code-strip-sequence--spaced");
    expect(wrapper.findAllComponents(Note)).toHaveLength(1);
  });

  it("exposes a production scroll surface without changing the default specimen", () => {
    const clipped = mount(CodeStripSequence, {
      props: { tokens: [{ type: "note", note: "do", text: "Do" }] },
    });
    const scrollable = mount(CodeStripSequence, {
      props: {
        scrollable: true,
        tokens: [{ type: "note", note: "do", text: "Do" }],
      },
    });

    expect(clipped.classes()).not.toContain("code-strip-sequence--scrollable");
    expect(scrollable.classes()).toContain("code-strip-sequence--scrollable");
  });
});
