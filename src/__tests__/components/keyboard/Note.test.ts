import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Note from "@/components/primatives/Note.vue";

const getKeyBackground = vi.fn(() => ({
  background: "hsla(10, 80%, 50%, 1)",
  primaryColor: "hsla(10, 80%, 50%, 1)",
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({ getKeyBackground }),
}));

describe("Note", () => {
  it("renders controlled identity with the selected primary first", () => {
    const wrapper = mount(Note, {
      props: {
        syllable: "Ra",
        degree: "bII",
        rawPitch: "Db4",
        primary: "raw",
        scaleIndex: 1,
        pitchClassIndex: 1,
        octave: 4,
      },
    });

    expect(wrapper.element.tagName).toBe("SPAN");
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.findAll(".note__label").map((label) => label.text())).toEqual([
      "Db4",
      "Ra",
      "bII",
    ]);
    expect(wrapper.attributes("data-pitch-class-index")).toBe("1");
    expect(getKeyBackground).toHaveBeenCalledWith(
      1,
      "major",
      "C",
      4,
      "colored",
      false,
      expect.any(Object),
    );
  });

  it("expresses musical presentation states without owning state", () => {
    const wrapper = mount(Note, {
      props: {
        sounding: true,
        sustained: true,
        playedRecently: true,
        selected: true,
        ghosted: true,
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining([
      "note--sounding",
      "note--sustained",
      "note--played-recently",
      "note--selected",
      "note--ghosted",
    ]));
  });
});
