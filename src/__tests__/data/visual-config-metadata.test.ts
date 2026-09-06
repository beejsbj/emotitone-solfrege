import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  describeVisualConfigSection,
  replaceVisualConfig,
  resolveVisualConfig,
  updateVisualConfigSection,
  updateVisualConfigValue,
} from "@/data/visual-config-metadata";
import type { VisualEffectsConfig } from "@/types/visual";

describe("visual configuration module", () => {
  it("defaults invalid fields while preserving valid partial and out-of-range values", () => {
    const resolved = resolveVisualConfig({
      blobs: {
        isEnabled: false,
        opacity: "opaque",
        minSize: Number.POSITIVE_INFINITY,
        maxSize: 2400,
        unknownField: true,
      },
      dynamicColors: { musicColorMode: "random" },
      keyboard: { primaryLabel: 4 },
      unknownSection: { enabled: true },
    });

    expect(resolved.blobs.isEnabled).toBe(false);
    expect(resolved.blobs.opacity).toBe(DEFAULT_CONFIG.blobs.opacity);
    expect(resolved.blobs.minSize).toBe(DEFAULT_CONFIG.blobs.minSize);
    expect(resolved.blobs.maxSize).toBe(2400);
    expect(resolved.dynamicColors.musicColorMode).toBe(
      DEFAULT_CONFIG.dynamicColors.musicColorMode
    );
    expect(resolved.keyboard.primaryLabel).toBe(
      DEFAULT_CONFIG.keyboard.primaryLabel
    );
    expect(resolved.particles).toEqual(DEFAULT_CONFIG.particles);
    expect(resolved.blobs).not.toHaveProperty("unknownField");
    expect(resolved).not.toHaveProperty("unknownSection");
  });

  it("migrates legacy fields before applying current validity rules", () => {
    const resolved = resolveVisualConfig({
      dynamicColors: { chromaticMapping: true },
      keyboard: { colorMode: "glassmorphism", keyboardPadding: true },
      liveStrip: { bpm: 144, notation: "degree", showRests: false },
    });

    expect(resolved.dynamicColors.musicColorMode).toBe("fixed");
    expect(resolved.keyboard.surfaceStyle).toBe("colored");
    expect(resolved.keyboard.keyboardPadding).toBe(true);
    expect(resolved.codeStrip).toMatchObject({
      bpm: 144,
      notation: "degree",
      showRests: false,
    });
  });

  it("keeps current values for invalid live edits and accepts the same valid values as loads", () => {
    const config = resolveVisualConfig({
      blobs: { opacity: 0.25 },
      dynamicColors: { musicColorMode: "fixed" },
    });

    updateVisualConfigSection(config, "blobs", {
      isEnabled: false,
      opacity: Number.NaN,
    });
    expect(config.blobs).toMatchObject({ isEnabled: false, opacity: 0.25 });

    expect(
      updateVisualConfigValue(
        config,
        "dynamicColors",
        "musicColorMode",
        "random"
      )
    ).toBe(false);
    expect(config.dynamicColors.musicColorMode).toBe("fixed");

    expect(updateVisualConfigValue(config, "blobs", "opacity", 1.4)).toBe(true);
    expect(config.blobs.opacity).toBe(1.4);
    expect(resolveVisualConfig({ blobs: { opacity: 1.4 } }).blobs.opacity).toBe(
      1.4
    );
    expect(updateVisualConfigValue(config, "blobs", "unknown", true)).toBe(
      false
    );
  });

  it("describes controls from field rules rather than runtime value types", () => {
    const config = resolveVisualConfig(undefined);
    (config.dynamicColors as unknown as Record<string, unknown>).musicColorMode =
      42;

    const colors = describeVisualConfigSection(config, "dynamicColors");
    const mode = colors.fields.find(
      (field) => field.key === "musicColorMode"
    );
    const codeStrip = describeVisualConfigSection(config, "codeStrip");

    expect(mode).toMatchObject({
      control: "options",
      value: DEFAULT_CONFIG.dynamicColors.musicColorMode,
      options: ["fixed", "movable"],
      label: "Music Color Mode",
    });
    expect(colors.enableField).toMatchObject({
      key: "isEnabled",
      control: "boolean",
    });
    expect(codeStrip.enableField?.key).toBe("enabled");
    expect(codeStrip.fields).not.toContainEqual(
      expect.objectContaining({ key: "enabled" })
    );
  });

  it("loads into existing section objects for reactive consumers", () => {
    const config = resolveVisualConfig(undefined);
    const blobs = config.blobs;
    const keyboard = config.keyboard;
    (config.blobs as unknown as Record<string, unknown>).unknown = true;

    replaceVisualConfig(config, {
      blobs: { opacity: 0.75 },
      keyboard: { surfaceStyle: "monochrome" },
    });

    expect(config.blobs).toBe(blobs);
    expect(config.keyboard).toBe(keyboard);
    expect(blobs.opacity).toBe(0.75);
    expect(keyboard.surfaceStyle).toBe("monochrome");
    expect(blobs).not.toHaveProperty("unknown");
  });

  it("returns a complete independent snapshot", () => {
    const source = resolveVisualConfig({ blobs: { opacity: 0.2 } });
    const snapshot: VisualEffectsConfig = resolveVisualConfig(source);

    expect(snapshot).toEqual(source);
    expect(snapshot).not.toBe(source);
    expect(snapshot.blobs).not.toBe(source.blobs);
  });
});
