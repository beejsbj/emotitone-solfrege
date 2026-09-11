import { describe, expect, it } from "vitest";
import {
  MUSIC_COLOR_RECIPE_V1,
  mapOklchToSrgb,
  resolveMusicColor,
  sampleMusicColor,
  type MusicColorContext,
  type ResolvedMusicColor,
} from "@/services/musicColorCore";

const major: MusicColorContext = {
  tonicPitchClass: 0,
  intervals: [0, 2, 4, 5, 7, 9, 11],
};

function expectColor(
  resolution: ReturnType<typeof resolveMusicColor>,
): ResolvedMusicColor {
  expect(resolution.kind).toBe("color");
  return resolution as ResolvedMusicColor;
}

describe("musicColorCore", () => {
  it("keeps fixed identity absolute across musical contexts", () => {
    const cInCMajor = expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 0, octave: 4 },
      major,
      "fixed",
    ));
    const cInDMajor = expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 0, octave: 4 },
      { tonicPitchClass: 2, intervals: major.intervals },
      "fixed",
    ));

    expect(cInCMajor.cell).toEqual(cInDMajor.cell);
    expect(cInCMajor.cell).toEqual({ start: 0, center: 15, end: 30 });
  });

  it("distinguishes ordinal and relative movable geometry", () => {
    const ordinalRe = expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 2, octave: 4 },
      major,
      "movable-ordinal",
    ));
    const relativeRe = expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 2, octave: 4 },
      major,
      "movable-relative",
    ));

    expect(ordinalRe.cell.start).toBeCloseTo(360 / 7);
    expect(ordinalRe.cell.end).toBeCloseTo(720 / 7);
    expect(relativeRe.cell).toEqual({ start: 60, center: 75, end: 90 });
  });

  it("keeps relative interval identity through transposition", () => {
    const cMajorMi = expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 4, octave: 4 },
      major,
      "movable-relative",
    ));
    const dMajorMi = expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 6, octave: 4 },
      { tonicPitchClass: 2, intervals: major.intervals },
      "movable-relative",
    ));

    expect(cMajorMi.cell).toEqual(dMajorMi.cell);
  });

  it("carries a degree into its scientific octave", () => {
    const bMajorRe = expectColor(resolveMusicColor(
      { kind: "degree", degreeIndex: 1, tonicOctave: 4 },
      { tonicPitchClass: 11, intervals: major.intervals },
      "movable-relative",
    ));

    expect(bMajorRe.identity).toMatchObject({
      pitchClass: 1,
      octave: 5,
      relativePitchClass: 2,
      degreeIndex: 1,
    });
  });

  it("keeps omission and fixed borrowed fallback explicit", () => {
    const omitted = resolveMusicColor(
      { kind: "pitch", pitchClass: 1, octave: 4 },
      major,
      "movable-relative",
      MUSIC_COLOR_RECIPE_V1,
      "omit",
    );
    const borrowed = expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 1, octave: 4 },
      major,
      "movable-relative",
      MUSIC_COLOR_RECIPE_V1,
      "fixed-chromatic",
    ));

    expect(omitted.kind).toBe("off-scale");
    expect(borrowed.mapping).toBe("fixed-chromatic-fallback");
    expect(borrowed.cell).toEqual({ start: 30, center: 45, end: 60 });
  });

  it("uses octaves 1 through 9 as nine levels over eight intervals", () => {
    const octave = (value: number) => expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 0, octave: value },
      major,
      "fixed",
    )).lightness;

    expect(octave(1)).toBeCloseTo(0.275);
    expect(octave(5)).toBeCloseTo(0.575);
    expect(octave(9)).toBeCloseTo(0.875);
    expect(octave(-2)).toBeCloseTo(octave(1));
    expect(octave(12)).toBeCloseTo(octave(9));
  });

  it("samples the center and both full cell boundaries", () => {
    const resolved = expectColor(resolveMusicColor(
      { kind: "pitch", pitchClass: 0, octave: 5 },
      major,
      "fixed",
    ));

    expect(sampleMusicColor(resolved, null).primary.oklch.h).toBeCloseTo(15);
    expect(sampleMusicColor(resolved, 0.25).primary.oklch.h).toBeCloseTo(30);
    expect(sampleMusicColor(resolved, 0.75).primary.oklch.h).toBeCloseTo(0);
    expect(sampleMusicColor(resolved, 0.25).accent.oklch.h).toBeCloseTo(210);
  });

  it("returns deterministic bounded sRGB while preserving alpha", () => {
    const first = mapOklchToSrgb({ l: 0.575, c: 0.18, h: 15, alpha: 0.4 });
    const second = mapOklchToSrgb({ l: 0.575, c: 0.18, h: 15, alpha: 0.4 });

    expect(first).toEqual(second);
    expect(first.alpha).toBe(0.4);
    expect(Object.values(first).every((channel) => channel >= 0 && channel <= 1))
      .toBe(true);
  });

  it("maps chromatic colors at the lightness endpoints to neutral black and white", () => {
    const white = mapOklchToSrgb({ l: 1, c: 0.18, h: 180, alpha: 0.4 });
    const black = mapOklchToSrgb({ l: 0, c: 0.18, h: 180, alpha: 0.6 });

    expect(white).toMatchObject({ alpha: 0.4 });
    expect(white.r).toBeCloseTo(1);
    expect(white.g).toBeCloseTo(1);
    expect(white.b).toBeCloseTo(1);
    expect(black).toMatchObject({ alpha: 0.6 });
    expect(black.r).toBeCloseTo(0);
    expect(black.g).toBeCloseTo(0);
    expect(black.b).toBeCloseTo(0);
  });

  it("rejects malformed identities rather than wrapping them", () => {
    expect(resolveMusicColor(
      { kind: "pitch", pitchClass: 12, octave: 4 },
      major,
      "fixed",
    )).toMatchObject({ kind: "invalid" });
    expect(resolveMusicColor(
      { kind: "degree", degreeIndex: -1, tonicOctave: 4 },
      major,
      "movable-ordinal",
    )).toMatchObject({ kind: "invalid" });
  });
});
