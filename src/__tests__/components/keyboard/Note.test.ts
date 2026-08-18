import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Note from "@/components/primatives/Note.vue";

const getKeyBackground = vi.fn(() => ({
  background: "hsla(10, 80%, 50%, 1)",
  primaryColor: "hsla(10, 80%, 50%, 1)",
}));

const createGlassmorphShadow = vi.fn(() => "shadow(glass)");

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    createGlassmorphShadow,
    getKeyBackground,
  }),
}));

describe("Note", () => {
  it("renders a centered primary label with fixed playing-card auxiliary slots", () => {
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
    expect(wrapper.find('.note__label--primary.note__label--raw').text()).toBe("Db4");
    expect(wrapper.find('.note__label--syllable').attributes("data-slot")).toBe("top-left");
    expect(wrapper.find('.note__label--degree').attributes("data-slot")).toBe("bottom-right");
    expect(wrapper.attributes("data-pitch-class-index")).toBe("1");
    expect(wrapper.attributes("data-primary")).toBe("raw");
  });

  it("derives accidental semantics from raw pitch when accidental is not supplied", () => {
    mount(Note, {
      props: {
        rawPitch: "Db4",
        scaleIndex: 1,
      },
    });

    expect(getKeyBackground).toHaveBeenLastCalledWith(
      1,
      "major",
      "C",
      4,
      "colored",
      true,
      expect.any(Object),
    );

    const naturalWrapper = mount(Note, {
      props: {
        rawPitch: "C4",
        scaleIndex: 0,
      },
    });

    expect(naturalWrapper.classes()).toContain("note--natural");
    expect(naturalWrapper.classes()).not.toContain("note--accidental");
  });

  it("lets geometry and proportion coexist as separate axes", () => {
    const wrapper = mount(Note, {
      props: {
        geometry: "offcut",
        proportion: "wide",
      },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(["note--geometry-offcut", "note--proportion-wide"]),
    );
    expect(wrapper.attributes("data-geometry")).toBe("offcut");
    expect(wrapper.attributes("data-proportion")).toBe("wide");
  });

  it("supports arbitrary visible label subsets while keeping raw mono identity", () => {
    const wrapper = mount(Note, {
      props: {
        degree: "V",
        rawPitch: "G4",
        primary: "raw",
        visibleLabels: ["degree", "raw"],
      },
    });

    expect(wrapper.findAll(".note__label").map((label) => label.text())).toEqual([
      "G4",
      "V",
    ]);
    expect(wrapper.find(".note__label--primary.note__label--raw").exists()).toBe(true);
    expect(wrapper.find(".note__label--syllable").exists()).toBe(false);
  });

  it("keeps state hooks as classes and data attributes without asserting final draft styling", () => {
    const wrapper = mount(Note, {
      props: {
        sounding: true,
        sustained: true,
        playedRecently: true,
        selected: true,
        ghosted: true,
      },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "note--sounding",
        "note--sustained",
        "note--played-recently",
        "note--selected",
        "note--ghosted",
      ]),
    );
    expect(wrapper.attributes("data-sounding")).toBe("true");
    expect(wrapper.attributes("data-selected")).toBe("true");
  });

  it("uses the shared glass treatment when requested", () => {
    const wrapper = mount(Note, {
      props: {
        surfaceStyle: "glassmorphism",
      },
    });

    expect(createGlassmorphShadow).toHaveBeenCalled();
    expect(wrapper.attributes("style")).toContain("--note-backdrop: blur(18px) saturate(135%)");
  });
});
