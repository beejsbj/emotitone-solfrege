import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Chord from "@/components/compounds/Chord.vue";
import CodeStrip from "@/components/uniques/CodeStrip.vue";
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

describe("CodeStrip composition", () => {
  it("composes Note and Chord through their public sources", () => {
    const wrapper = mount(CodeStrip, {
      props: {
        tokens: [
          { type: "note", note: "mi", text: "3̂", glyph: "deg", lit: true, progress: .7 },
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
    });
    expect(notes[0].attributes("shape")).toBeUndefined();
    expect(wrapper.findComponent(Chord).props()).toMatchObject({
      display: "notes",
      symbol: "C",
      proportion: "compact",
    });
    expect(wrapper.find(".code-strip__accidental").text()).toBe("#");
  });

  it("keeps Rest local, durationless, and controlled from Ink to Ivory", () => {
    const wrapper = mount(CodeStrip, {
      props: {
        durationMode: "inline",
        tokens: [{ type: "rest", duration: "@0.5", progress: 1.4 }],
      },
    });

    expect(wrapper.find(".code-strip__rest-mark").text()).toBe("~");
    expect(wrapper.find(".code-strip__duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__stack-duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__rest").attributes("style")).toContain("--code-strip-progress: 1");
    expect(wrapper.find(".code-strip__rest-fill").exists()).toBe(true);
  });

  it("treats duration presentation as a strip-level comparison", async () => {
    const wrapper = mount(CodeStrip, {
      props: {
        durationMode: "inline",
        tokens: [{ type: "note", note: "do", text: "Do", duration: "@0.5" }],
      },
    });

    expect(wrapper.find(".code-strip__duration").text()).toBe("@0.5");

    await wrapper.setProps({ durationMode: "stacked" });
    expect(wrapper.find(".code-strip__duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__stack-duration").text()).toBe("@0.5");

    await wrapper.setProps({ durationMode: "bar" });
    expect(wrapper.find(".code-strip__duration-bar").exists()).toBe(true);

    await wrapper.setProps({ durationMode: "distance" });
    expect(wrapper.classes()).toContain("code-strip--duration-distance");
    expect(wrapper.find(".code-strip__event").attributes("style")).toContain("--code-strip-duration: 0.5");

    await wrapper.setProps({ durationMode: "hidden" });
    expect(wrapper.find(".code-strip__duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__stack-duration").exists()).toBe(false);
    expect(wrapper.find(".code-strip__duration-bar").exists()).toBe(false);
  });

  it("exposes density without changing notation anatomy", async () => {
    const wrapper = mount(CodeStrip, {
      props: {
        density: "dense",
        tokens: [{ type: "note", note: "do", text: "Do" }],
      },
    });

    expect(wrapper.classes()).toContain("code-strip--dense");
    expect(wrapper.findAllComponents(Note)).toHaveLength(1);

    await wrapper.setProps({ density: "spaced" });
    expect(wrapper.classes()).toContain("code-strip--spaced");
    expect(wrapper.findAllComponents(Note)).toHaveLength(1);
  });
});
