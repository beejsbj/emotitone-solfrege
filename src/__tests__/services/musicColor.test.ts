import { describe, expect, it } from "vitest";
import {
  resolveMusicColorsByPitchClass,
  resolveMusicColorsByScaleIndex,
} from "@/services/musicColor";

const movableConfig = {
  isEnabled: true,
  musicColorMode: "movable" as const,
  hueAnimationAmplitude: 0,
  animationSpeed: 1,
  saturation: 0.8,
  baseLightness: 0.5,
  lightnessRange: 0.3,
};

const fixedConfig = {
  ...movableConfig,
  musicColorMode: "fixed" as const,
};

describe("musicColor", () => {
  it("anchors movable tonic colors to the same centered hue across keys", () => {
    const cMajorDo = resolveMusicColorsByScaleIndex(
      0,
      "major",
      "C",
      4,
      movableConfig
    );
    const dMajorDo = resolveMusicColorsByScaleIndex(
      0,
      "major",
      "D",
      4,
      movableConfig
    );

    expect(cMajorDo?.primary).toBe(dMajorDo?.primary);
  });

  it("keeps fixed pitch-class colors stable across musical contexts", () => {
    const chromaticC = resolveMusicColorsByScaleIndex(
      0,
      "chromatic",
      "C",
      4,
      fixedConfig
    );
    const dMinorC = resolveMusicColorsByScaleIndex(
      6,
      "minor",
      "D",
      4,
      fixedConfig
    );

    expect(chromaticC?.primary).toBe(dMinorC?.primary);
  });

  it("returns null for out-of-scale pitch classes in movable mode", () => {
    expect(
      resolveMusicColorsByPitchClass("C#", "major", "C", 4, movableConfig)
    ).toBeNull();
  });

  it("still colors all pitch classes in fixed mode", () => {
    expect(
      resolveMusicColorsByPitchClass("C#", "major", "C", 4, fixedConfig)
    ).not.toBeNull();
  });
});
