import { describe, expect, it } from "vitest";
import {
  resolveKeySurfaceColor,
  resolveMusicColorKeySurface,
} from "@/services/keySurfaceColor";
import { resolveMusicColorSampleByScaleIndex } from "@/services/musicColor";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";

describe("key surface color projection", () => {
  it("applies brightness and saturation in OKLCH before CSS serialization", () => {
    const sample = resolveMusicColorSampleByScaleIndex(
      0,
      "major",
      "C",
      4,
      DEFAULT_CONFIG.dynamicColors,
    );
    const unadjusted = resolveMusicColorKeySurface(sample?.sample.primary);
    const adjusted = resolveMusicColorKeySurface(sample?.sample.primary, {
      keyBrightness: 0.5,
      keySaturation: 0.25,
    });

    expect(adjusted.background).toBe(adjusted.primaryColor);
    expect(adjusted.background).toMatch(/^rgba\(/);
    expect(adjusted.background).not.toBe(unadjusted.background);
  });

  it("applies the shared brightness and saturation tuning to colored surfaces", () => {
    expect(resolveKeySurfaceColor(
      "hsla(120, 80%, 60%, 1)",
      "colored",
      false,
      { keyBrightness: 0.5, keySaturation: 0.25 },
    )).toEqual({
      background: "hsla(120, 20%, 30%, 1)",
      primaryColor: "hsla(120, 20%, 30%, 1)",
    });
  });

  it("owns the natural and accidental monochrome bases", () => {
    expect(resolveKeySurfaceColor("ignored", "monochrome", false)).toEqual({
      background: "hsla(0, 0%, 10%, 1)",
      primaryColor: "hsla(0, 0%, 10%, 1)",
    });
    expect(resolveKeySurfaceColor("ignored", "monochrome", true)).toEqual({
      background: "hsla(0, 0%, 100%, 1)",
      primaryColor: "hsla(0, 0%, 100%, 1)",
    });
  });
});
