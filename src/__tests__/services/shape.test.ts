import { describe, expect, it } from "vitest";
import { canonicalShape, isSameShape, NEUTRAL_SHAPE, resolveLiveEnvelope } from "@/services/shape";
import { getLiveArticulation } from "@/services/liveArticulation";

describe("Shape", () => {
  it("rounds to the precision generated code prints", () => {
    expect(canonicalShape({
      cutoff: 1800.4, resonance: 4.54, room: 0.12345, delay: 0.5, attack: 0.0504, release: 0.804,
    })).toEqual({ cutoff: 1800, resonance: 4.5, room: 0.123, delay: 0.5, attack: 0.05, release: 0.8 });
  });

  it("treats an absent shape as neutral and compares canonical values", () => {
    expect(isSameShape(undefined, NEUTRAL_SHAPE)).toBe(true);
    expect(isSameShape(undefined, { ...NEUTRAL_SHAPE, cutoff: 11999.8 })).toBe(true);
    expect(isSameShape(undefined, { ...NEUTRAL_SHAPE, cutoff: 2000 })).toBe(false);
    // A natural envelope differs from an explicit one of the same value.
    expect(isSameShape(NEUTRAL_SHAPE, { ...NEUTRAL_SHAPE, attack: 0.003 })).toBe(false);
  });

  it("resolves Shape envelope stages over the natural articulation", () => {
    const natural = getLiveArticulation("piano");
    expect(resolveLiveEnvelope("piano", NEUTRAL_SHAPE)).toEqual(natural);
    expect(resolveLiveEnvelope("piano", { attack: 0.2, release: null })).toEqual({ ...natural, attack: 0.2 });
  });
});
