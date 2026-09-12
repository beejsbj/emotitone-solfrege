import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import {
  DECK_CONTROL_GROUPS,
  GLOBAL_CONTROL_GROUPS,
  readDeckControls,
  readGlobalControls,
  updateDeckControl,
  updateGlobalControl,
} from "@/services/configPublicSurface";
import type { VisualEffectsConfig } from "@/types/visual";

function freshConfig(): VisualEffectsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as VisualEffectsConfig;
}

describe("Config public surface", () => {
  it("publishes four Global and seven Deck controls", () => {
    expect(GLOBAL_CONTROL_GROUPS.flatMap((group) => group.controls).map((control) => control.id))
      .toEqual(["musicColorMapping", "colorIntensity", "colorMotion", "uiRhythm"]);
    expect(DECK_CONTROL_GROUPS.flatMap((group) => group.controls).map((control) => control.id))
      .toEqual([
        "notation",
        "keyboardLabels",
        "keyboardSpacing",
        "noteSurface",
        "touchFeedback",
        "codeStrip",
        "showRests",
      ]);
  });

  it("maps Music Color onto three opinionated controls without touching hidden calibration", () => {
    const config = freshConfig();
    config.dynamicColors.lightnessCenter = 0.66;
    config.dynamicColors.lightnessSpan = 0.35;

    updateGlobalControl(config, "musicColorMapping", "movable-relative");
    updateGlobalControl(config, "colorIntensity", "vivid");
    updateGlobalControl(config, "colorMotion", "gentle");

    expect(config.dynamicColors).toMatchObject({
      musicColorMode: "movable-relative",
      chroma: 0.24,
      hueMotionEnabled: true,
      animationSpeed: 0.6,
      lightnessCenter: 0.66,
      lightnessSpan: 0.35,
    });
    expect(readGlobalControls(config)).toMatchObject({
      musicColorMapping: "movable-relative",
      colorIntensity: "vivid",
      colorMotion: "gentle",
    });
  });

  it("turns Color Motion off without erasing the chosen live speed", () => {
    const config = freshConfig();
    config.dynamicColors.animationSpeed = 1.9;

    updateGlobalControl(config, "colorMotion", "off");

    expect(config.dynamicColors.hueMotionEnabled).toBe(false);
    expect(config.dynamicColors.animationSpeed).toBe(1.9);
    expect(readGlobalControls(config).colorMotion).toBe("off");
  });

  it("maps one Deck notation choice to Keyboard and Code Strip", () => {
    const config = freshConfig();

    updateDeckControl(config, "notation", "pitch");
    expect(config.keyboard.primaryLabel).toBe("raw");
    expect(config.codeStrip.notation).toBe("note");

    updateDeckControl(config, "notation", "degree");
    expect(config.keyboard.primaryLabel).toBe("degree");
    expect(config.codeStrip.notation).toBe("degree");
    expect(readDeckControls(config).notation).toBe("degree");
  });

  it("maps Deck spacing onto gaps and outer padding", () => {
    const config = freshConfig();

    updateDeckControl(config, "keyboardSpacing", "compact");
    expect(config.keyboard).toMatchObject({ keyGaps: "none", keyboardPadding: false });
    expect(readDeckControls(config).keyboardSpacing).toBe("compact");

    updateDeckControl(config, "keyboardSpacing", "open");
    expect(config.keyboard).toMatchObject({ keyGaps: "medium", keyboardPadding: true });
    expect(readDeckControls(config).keyboardSpacing).toBe("open");
  });

  it("reads legacy mixed notation without normalizing stored values", () => {
    const config = freshConfig();
    config.keyboard.primaryLabel = "raw";
    config.codeStrip.notation = "solfege";
    const before = JSON.parse(JSON.stringify(config));

    expect(readDeckControls(config).notation).toBe("pitch");
    expect(config).toEqual(before);
  });
});
