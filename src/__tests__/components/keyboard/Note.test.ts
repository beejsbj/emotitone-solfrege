import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Note from "@/components/primatives/Note.vue";
import noteSource from "@/components/primatives/Note.vue?raw";

const getKeyBackground = vi.fn(() => ({
  background: "hsla(10, 80%, 50%, 1)",
  primaryColor: "hsla(10, 80%, 50%, 1)",
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({ getKeyBackground }),
}));

describe("Note", () => {
  beforeEach(() => {
    getKeyBackground.mockClear();
  });

  it("defaults to the standard geometry, medium proportion, and colored surface", () => {
    const wrapper = mount(Note);

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "note--geometry-standard",
        "note--proportion-medium",
        "note--surface-colored",
      ]),
    );
    expect(wrapper.attributes("data-geometry")).toBe("standard");
    expect(wrapper.attributes("data-proportion")).toBe("medium");
    expect(noteSource).toMatch(
      /\.note\s*\{[^}]*background:\s*transparent;/,
    );
  });

  it("renders a noninteractive surface with a centered primary and playing-card auxiliaries", () => {
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
    expect(wrapper.find(".note__surface").exists()).toBe(true);
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.attributes("tabindex")).toBeUndefined();
    expect(wrapper.attributes("role")).toBeUndefined();
    expect(wrapper.find(".note__label--rank-primary.note__label--raw").text()).toBe(
      "D♭4",
    );
    expect(wrapper.find(".note__label--syllable").attributes("data-slot")).toBe(
      "top-left",
    );
    expect(wrapper.find(".note__label--degree").attributes("data-slot")).toBe(
      "bottom-right",
    );
    expect(wrapper.attributes("data-pitch-class-index")).toBe("1");
    expect(wrapper.attributes("data-primary")).toBe("raw");
    expect(wrapper.attributes("aria-label")).toBe("Ra, bII, Db4");
  });

  it("uses rank classes equally for syllable, degree, and raw typography", () => {
    for (const primary of ["syllable", "degree", "raw"] as const) {
      const wrapper = mount(Note, { props: { primary } });
      const primaryLabel = wrapper.find(".note__label--rank-primary");

      expect(primaryLabel.classes()).toContain(`note__label--${primary}`);
      expect(wrapper.findAll(".note__label--rank-aux")).toHaveLength(2);
    }
  });

  it("preserves supplied solfege title casing", () => {
    for (const syllable of ["Do", "Re", "Sol"]) {
      const wrapper = mount(Note, {
        props: { syllable, visibleLabels: ["syllable"] },
      });

      expect(wrapper.find(".note__label--syllable").text()).toBe(syllable);
    }
    expect(noteSource).not.toMatch(/\.note__label--syllable[^}]*text-transform/);
  });

  it("presents accidental glyphs without mutating source identity", () => {
    const examples: Array<{
      primary: "raw" | "degree";
      rawPitch?: string;
      degree?: string;
      expected: string;
      source: string;
    }> = [
      { primary: "raw", rawPitch: "Db4", expected: "D♭4", source: "Db4" },
      { primary: "raw", rawPitch: "F#4", expected: "F♯4", source: "F#4" },
      { primary: "degree", degree: "bII", expected: "♭II", source: "bII" },
      { primary: "degree", degree: "#IV", expected: "♯IV", source: "#IV" },
    ];

    for (const example of examples) {
      const wrapper = mount(Note, {
        props: {
          primary: example.primary,
          rawPitch: example.rawPitch,
          degree: example.degree,
          visibleLabels: [example.primary],
        },
      });

      expect(wrapper.find(".note__label--rank-primary").text()).toBe(
        example.expected,
      );
      expect(wrapper.attributes("aria-label")).toContain(example.source);
    }

    expect(noteSource).not.toMatch(/\.note__label--raw[^}]*text-transform/);
  });

  it("centers structured primary notation on its identity core", () => {
    const degreeWrapper = mount(Note, {
      props: {
        primary: "degree",
        degree: "bVII",
        visibleLabels: ["degree"],
      },
    });
    const degreePrimary = degreeWrapper.get(".note__label--rank-primary");

    expect(degreePrimary.classes()).toEqual(
      expect.arrayContaining([
        "note__label--structured",
        "note__label--core-centered",
      ]),
    );
    expect(degreePrimary.attributes("data-center-anchor")).toBe("identity-core");
    expect(degreePrimary.get(".note__identity-core").text()).toBe("VII");
    expect(
      degreePrimary.get(".note__identity-accidental--degree").text(),
    ).toBe("♭");
    expect(degreePrimary.text()).toBe("♭VII");

    const rawWrapper = mount(Note, {
      props: {
        primary: "raw",
        rawPitch: "C#2",
        visibleLabels: ["raw"],
      },
    });
    const rawPrimary = rawWrapper.get(".note__label--rank-primary");
    const rawCore = rawPrimary.get(".note__identity-core--raw");
    const pitchPart = rawCore.get(".note__identity-core-part--pitch");
    const octavePart = rawCore.get(".note__identity-core-part--octave");

    expect(rawPrimary.attributes("data-center-anchor")).toBe("identity-core");
    expect(rawCore.classes()).toContain("note__identity-core--has-accidental");
    expect(pitchPart.text()).toBe("C");
    expect(rawCore.get(".note__identity-accidental--raw").text()).toBe("♯");
    expect(octavePart.text()).toBe("2");
    expect(pitchPart.classes()).toContain("note__identity-core-part");
    expect(octavePart.classes()).toContain("note__identity-core-part");
    expect(rawCore.findAll(".note__identity-satellite")).toHaveLength(1);
    expect(rawPrimary.find(".note__identity-octave").exists()).toBe(false);
    expect(rawPrimary.text()).toBe("C♯2");
    expect(noteSource).toMatch(
      /\.note__identity-satellite\s*\{[^}]*position:\s*absolute;/,
    );
    expect(noteSource).not.toContain("--note-primary-octave-size");
    expect(noteSource).not.toContain("--note-primary-satellite-drop");
    expect(noteSource).toMatch(
      /\.note__identity-core-part\s*\{[^}]*font:\s*inherit;/,
    );

    const naturalWrapper = mount(Note, {
      props: { primary: "raw", rawPitch: "C4", visibleLabels: ["raw"] },
    });
    const naturalCore = naturalWrapper.get(".note__identity-core--raw");

    expect(naturalCore.classes()).not.toContain(
      "note__identity-core--has-accidental",
    );
    expect(naturalCore.find(".note__identity-satellite").exists()).toBe(false);
    expect(naturalCore.text()).toBe("C4");
  });

  it("keeps auxiliary degree and raw notation compact and inline", () => {
    const wrapper = mount(Note, {
      props: {
        syllable: "Do",
        degree: "bVII",
        rawPitch: "C#2",
        primary: "syllable",
      },
    });
    const degreeAux = wrapper.get(
      ".note__label--rank-aux.note__label--degree",
    );
    const rawAux = wrapper.get(".note__label--rank-aux.note__label--raw");

    expect(degreeAux.get(".note__identity-inline").text()).toBe("♭VII");
    expect(rawAux.get(".note__identity-inline").text()).toBe("C♯2");
    expect(degreeAux.find(".note__identity-satellite").exists()).toBe(false);
    expect(rawAux.find(".note__identity-satellite").exists()).toBe(false);
  });

  it("supports arbitrary visible label subsets without changing raw pitch rank", () => {
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
    expect(wrapper.find(".note__label--rank-primary.note__label--raw").exists()).toBe(
      true,
    );
    expect(wrapper.find(".note__label--syllable").exists()).toBe(false);
  });

  it("derives accidental semantics and piano-key text variables from raw pitch", () => {
    const accidentalWrapper = mount(Note, {
      props: { rawPitch: "Db4", scaleIndex: 1 },
    });

    expect(getKeyBackground).toHaveBeenLastCalledWith(
      1,
      "major",
      "C",
      4,
      "colored",
      true,
      { keyBrightness: 1, keySaturation: 1 },
    );
    expect(accidentalWrapper.classes()).toContain("note--accidental");
    expect(accidentalWrapper.attributes("style")).toContain(
      "--note-label-main: rgba(0, 0, 0, .88)",
    );

    const naturalWrapper = mount(Note, {
      props: { rawPitch: "C4", scaleIndex: 0 },
    });

    expect(naturalWrapper.classes()).toContain("note--natural");
    expect(naturalWrapper.classes()).not.toContain("note--accidental");
    expect(naturalWrapper.attributes("style")).toContain(
      "--note-label-main: rgba(255, 255, 255, .94)",
    );
  });

  it("keeps all five geometries independent from all four proportions", () => {
    const geometries = ["standard", "tile", "offcut", "tab", "pill"] as const;
    const proportions = ["tall", "medium", "stocky", "wide"] as const;

    for (const geometry of geometries) {
      for (const proportion of proportions) {
        const wrapper = mount(Note, { props: { geometry, proportion } });
        expect(wrapper.classes()).toEqual(
          expect.arrayContaining([
            `note--geometry-${geometry}`,
            `note--proportion-${proportion}`,
          ]),
        );
      }
    }
  });

  it("supports only colored and monochrome surface treatments", () => {
    const colored = mount(Note, { props: { surfaceStyle: "colored" } });
    const monochrome = mount(Note, { props: { surfaceStyle: "monochrome" } });

    expect(colored.classes()).toContain("note--surface-colored");
    expect(monochrome.classes()).toContain("note--surface-monochrome");
    expect(getKeyBackground).toHaveBeenLastCalledWith(
      0,
      "major",
      "C",
      4,
      "monochrome",
      false,
      { keyBrightness: 1, keySaturation: 1 },
    );
  });

  it("exposes sounding as its sole musical activity state", () => {
    const wrapper = mount(Note, { props: { sounding: true } });
    const propNames = Object.keys(
      (Note as unknown as { props: Record<string, unknown> }).props,
    );

    expect(wrapper.classes()).toContain("note--sounding");
    expect(wrapper.attributes("data-sounding")).toBe("true");
    expect(propNames).toContain("sounding");
    expect(propNames).not.toEqual(
      expect.arrayContaining([
        "sustained",
        "playedRecently",
        "selected",
        "ghosted",
        "glassmorphOpacity",
      ]),
    );
  });
});
