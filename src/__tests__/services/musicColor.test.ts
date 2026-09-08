import { describe, expect, it } from "vitest";
import {
  resolveExactMusicColorsByPitchClass,
  resolveMusicColorsByPitchClass,
  resolveMusicColorsByScaleIndex,
} from "@/services/musicColor";
import { buildHarmony, HARMONY_ALTERATIONS } from "@/domain/harmony";

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

  it("keeps borrowed pitches off the general movable palette", () => {
    expect(resolveMusicColorsByPitchClass(
      "C#",
      "major",
      "C",
      4,
      movableConfig
    )).toBeNull();
  });

  it("gives borrowed exact-pitch visuals a chromatic fallback", () => {
    const borrowed = resolveExactMusicColorsByPitchClass(
      "C#",
      "major",
      "C",
      4,
      movableConfig
    );
    const fixed = resolveMusicColorsByPitchClass(
      "C#",
      "major",
      "C",
      4,
      fixedConfig
    );

    expect(borrowed).not.toBeNull();
    expect(borrowed?.primary).toBe(fixed?.primary);
  });

  it("still colors all pitch classes in fixed mode", () => {
    expect(
      resolveMusicColorsByPitchClass("C#", "major", "C", 4, fixedConfig)
    ).not.toBeNull();
  });

  it("keeps every directional C-major chord member colored", () => {
    const pitches = HARMONY_ALTERATIONS.flatMap((alteration) =>
      buildHarmony({ tonic: "C", scaleType: "major", octave: 4, alteration })
        .flatMap((chord) => chord.voicing.pitches),
    );

    expect(pitches.some((pitch) => pitch.scaleIndex === null)).toBe(true);
    expect(pitches.every((pitch) =>
      resolveExactMusicColorsByPitchClass(
        pitch.pitchClass,
        "major",
        "C",
        pitch.octave,
        movableConfig,
      ) !== null,
    )).toBe(true);
  });
});
