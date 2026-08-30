import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CodeStrip from "@/components/uniques/CodeStrip.vue";
import Note from "@/components/primatives/Note.vue";

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: () => ({ background: "red", primaryColor: "red" }),
  }),
}));

describe("CodeStrip Note composition", () => {
  it("uses the Note primitive for note glyphs while preserving strip notation", () => {
    const wrapper = mount(CodeStrip, {
      props: {
        tokens: [
          { type: "note", note: "mi", text: "3̂", glyph: "deg", lit: true },
          { type: "rest", duration: "@0.25" },
          { type: "note", note: "sol", text: "G", glyph: "raw", accidental: "#" },
        ],
      },
    });

    const notes = wrapper.findAllComponents(Note);
    expect(notes).toHaveLength(2);
    expect(notes[0].props()).toMatchObject({
      primary: "degree",
      visibleLabels: ["degree"],
      proportion: "glyph",
      sounding: true,
      scaleIndex: 2,
    });
    expect(notes[0].attributes("shape")).toBeUndefined();
    expect(wrapper.find(".code-strip__rest").text()).toBe("~");
    expect(wrapper.find(".code-strip__accidental").text()).toBe("#");
  });
});
