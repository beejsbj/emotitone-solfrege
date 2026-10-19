import { describe, expect, it } from "vitest";
import {
  MONOCHROME_ACCIDENTAL_KEY_SURFACE,
  MONOCHROME_NATURAL_KEY_SURFACE,
  resolveKeySurfaceColor,
  resolveMusicColorKeySurface,
} from "@/services/keySurfaceColor";
import { resolveMusicColorSampleByScaleIndex } from "@/services/musicColor";
import { readTokenDeclarations } from "../helpers/designTokens";
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

  it("owns the natural and accidental monochrome bases as Ink and Ivory", () => {
    expect(resolveKeySurfaceColor("ignored", "monochrome", false)).toEqual({
      background: "#1C1916",
      primaryColor: "#1C1916",
    });
    expect(resolveKeySurfaceColor("ignored", "monochrome", true)).toEqual({
      background: "#F4EFE6",
      primaryColor: "#F4EFE6",
    });
  });

  it("tunes monochrome bases in HSL without leaving the Ink or Ivory hue", () => {
    const dimmed = resolveKeySurfaceColor("ignored", "monochrome", true, {
      keyBrightness: 0.5,
      keySaturation: 0,
    });
    expect(dimmed.background).toMatch(/^hsla\(\d+(\.\d+)?, 0%, 46\.\d+%, 1\)$/);
    const muted = resolveKeySurfaceColor("ignored", "monochrome", false, {
      keyBrightness: 1.5,
    });
    expect(muted.background).toMatch(/^hsla\(30, 1\d(\.\d+)?%, 1\d(\.\d+)?%, 1\)$/);
  });

  it("takes the monochrome bases from the design-system tokens", () => {
    const tokens = readTokenDeclarations();
    expect(MONOCHROME_NATURAL_KEY_SURFACE.toLowerCase()).toBe(tokens.get("--ink-3")?.toLowerCase());
    expect(MONOCHROME_ACCIDENTAL_KEY_SURFACE.toLowerCase()).toBe(tokens.get("--ivory")?.toLowerCase());
  });
});
