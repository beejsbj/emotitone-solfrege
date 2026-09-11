import { describe, expect, it, vi } from "vitest";

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");

  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

import { ref } from "vue";

Object.defineProperty(globalThis, "requestAnimationFrame", {
  configurable: true,
  writable: true,
  value: vi.fn(() => 1),
});
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

vi.unmock("@/data");

const dynamicColorConfig = ref({
  recipeVersion: 1 as const,
  musicColorMode: "movable-ordinal" as const,
  hueMotionEnabled: true,
  animationSpeed: 1,
  chroma: 0.18,
  lightnessCenter: 0.575,
  lightnessSpan: 0.6,
});

vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: () => ({
    dynamicColorConfig,
  }),
}));

import { useMusicColor } from "@/composables/useMusicColor";

describe("useMusicColor", () => {
  it("keeps movable tonic colors aligned while still respecting scale size", () => {
    dynamicColorConfig.value.musicColorMode = "movable-ordinal";
    const musicColor = useMusicColor();

    const cMajorDo = musicColor.getStaticPrimaryColorByScaleIndex(
      0,
      "major",
      "C",
      3
    );
    const dMajorDo = musicColor.getStaticPrimaryColorByScaleIndex(
      0,
      "major",
      "D",
      3
    );
    const cMajorLa = musicColor.getStaticPrimaryColorByScaleIndex(
      5,
      "major",
      "C",
      3
    );
    const cPentatonicLa = musicColor.getStaticPrimaryColorByScaleIndex(
      4,
      "major pentatonic",
      "C",
      3
    );

    expect(cMajorDo).toBe(dMajorDo);
    expect(cPentatonicLa).not.toBe(cMajorLa);
  });

  it("uses fixed pitch-class colors independent of key and mode", () => {
    dynamicColorConfig.value.musicColorMode = "fixed";
    const musicColor = useMusicColor();

    const cChromatic = musicColor.getStaticPrimaryColorByPitchClass(
      0,
      "chromatic",
      "C",
      3
    );
    const dMinorC = musicColor.getStaticPrimaryColorByPitchClass(
      0,
      "minor",
      "D",
      3
    );

    expect(cChromatic).toBe(dMinorC);
  });

  it("returns neutral off-scale colors for pitch classes in movable mode", () => {
    dynamicColorConfig.value.musicColorMode = "movable-ordinal";
    const musicColor = useMusicColor();

    expect(musicColor.getStaticPrimaryColor("C#", "major", 3, "C")).toBe(
      "hsla(0, 0%, 16%, 1)"
    );
  });

  it("gives exact borrowed pitch classes a chromatic fallback color", () => {
    dynamicColorConfig.value.musicColorMode = "movable-ordinal";
    const musicColor = useMusicColor();

    expect(musicColor.getStaticPrimaryColorByPitchClass(3, "major", "C", 4))
      .not.toBe("hsla(0, 0%, 16%, 1)");
  });

  it("applies key adjustments to exact-pitch primary colors", () => {
    dynamicColorConfig.value.musicColorMode = "movable-ordinal";
    const musicColor = useMusicColor();

    const adjusted = musicColor.getKeyBackgroundByPitchClass(
      0,
      "major",
      "C",
      4,
      "colored",
      false,
      { keyBrightness: 0.5, keySaturation: 0.5 },
    );
    const unadjusted = musicColor.getStaticPrimaryColorByPitchClass(
      0,
      "major",
      "C",
      4,
    );

    expect(adjusted.primaryColor).toBe(adjusted.background);
    expect(adjusted.background).not.toBe(unadjusted);
    expect(adjusted.background).toMatch(/^rgba\(/);
  });

  it("prefers exact pitch identity when an active note provides it", () => {
    dynamicColorConfig.value.musicColorMode = "movable-ordinal";
    const musicColor = useMusicColor();

    expect(musicColor.getStaticPrimaryColorForPitch(-1, 3, "major", "C", 4))
      .toBe(musicColor.getStaticPrimaryColorByPitchClass(3, "major", "C", 4));
    expect(musicColor.getStaticPrimaryColorForPitch(2, undefined, "major", "C", 4))
      .toBe(musicColor.getStaticPrimaryColorByScaleIndex(2, "major", "C", 4));
    expect(musicColor.getPrimaryColorForPitch(-1, 3, "major", "C", 4))
      .toBe(musicColor.getNoteColorsByPitchClass(3, "major", "C", 4).primary);
  });

  it("resolves altered syllables without falling back to the default error color", () => {
    dynamicColorConfig.value.musicColorMode = "movable-ordinal";
    const musicColor = useMusicColor();

    const fi = musicColor.getStaticPrimaryColor("Fi", "lydian", 3, "C");
    const se = musicColor.getStaticPrimaryColor("Se", "minor blues", 3, "C");

    expect(fi).not.toBe("hsla(0, 0%, 16%, 1)");
    expect(se).not.toBe("hsla(0, 0%, 16%, 1)");
  });
});
