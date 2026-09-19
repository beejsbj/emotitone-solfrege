import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { BUILT_IN_STAGE_LOOKS } from "@/data/visual-config-presets";
import {
  STAGE_CONTROL_GROUPS,
  STAGE_CONTROL_DEFINITIONS,
  applyStageLook,
  createSeededStageVariation,
  patchStageControl,
  readStageControls,
  resolveStageConfig,
} from "@/services/stageAppearance";
import type { VisualEffectsConfig } from "@/types/visual";

function config(): VisualEffectsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as VisualEffectsConfig;
}

function changedPaths(before: unknown, after: unknown, prefix = ""): string[] {
  if (Object.is(before, after)) return [];
  if (
    typeof before !== "object" || before === null ||
    typeof after !== "object" || after === null
  ) {
    return [prefix];
  }

  const keys = new Set([
    ...Object.keys(before as Record<string, unknown>),
    ...Object.keys(after as Record<string, unknown>),
  ]);
  return [...keys].flatMap((key) => changedPaths(
    (before as Record<string, unknown>)[key],
    (after as Record<string, unknown>)[key],
    prefix ? `${prefix}.${key}` : key,
  ));
}

describe("Stage appearance domain", () => {
  it("publishes exactly the accepted 23 controls", () => {
    const controls = STAGE_CONTROL_DEFINITIONS;
    expect(controls).toHaveLength(23);
    expect(new Set(controls.map((control) => control.id)).size).toBe(23);
    expect(STAGE_CONTROL_GROUPS.map((group) => group.label)).toEqual([
      "Scope",
      "Note Bodies",
      "Atmosphere",
      "Pitch Strings",
      "Note Flecks",
      "Explanations",
    ]);
    expect(
      controls.find((control) => control.id === "connectionMode")?.options,
    ).toEqual(["merge", "web"]);
  });

  it("keeps Hilbert present whenever Stage is enabled without rewriting legacy data", () => {
    const backing = config();
    backing.hilbertScope.isEnabled = false;

    const enabled = resolveStageConfig(backing);
    expect(enabled.hilbertScope.isEnabled).toBe(true);
    expect(backing.hilbertScope.isEnabled).toBe(false);

    backing.stage.isEnabled = false;
    const disabled = resolveStageConfig(backing);
    expect(disabled.hilbertScope.isEnabled).toBe(false);
    expect(disabled.blobs.isEnabled).toBe(false);
    expect(disabled.ambient.isEnabled).toBe(false);
    expect(disabled.strings.isEnabled).toBe(false);
    expect(disabled.particles.isEnabled).toBe(false);
  });

  it("rehydrates activation-capable Strings from a legacy zero-Presence config", () => {
    const backing = config();
    backing.strings.isEnabled = false;
    backing.strings.baseOpacity = 0;
    backing.strings.activeOpacity = 0;

    const effective = resolveStageConfig(backing);

    expect(effective.strings).toMatchObject({
      isEnabled: true,
      baseOpacity: 0,
    });
    expect(effective.strings.activeOpacity).toBe(0.5);
    expect(backing.strings.isEnabled).toBe(false);
    expect(backing.strings.activeOpacity).toBe(0);
  });

  it("makes Response authoritative for active String strength in legacy Looks", () => {
    const backing = config();
    backing.strings.activeOpacity = 0.9;
    backing.strings.maxAmplitude = 32;

    const effective = resolveStageConfig(backing);

    expect(effective.strings.activeOpacity).toBe(0.6);
    expect(backing.strings.activeOpacity).toBe(0.9);
  });

  it("preserves independent trail values until Trail is deliberately edited", () => {
    const backing = config();
    backing.hilbertScope.history = 0.17;
    backing.hilbertScope.smear = 0.73;

    readStageControls(backing);
    expect(backing.hilbertScope).toMatchObject({ history: 0.17, smear: 0.73 });

    const edited = patchStageControl(backing, "scopeTrail", 0.8);
    expect(changedPaths(backing, edited)).toEqual([
      "hilbertScope.smear",
      "hilbertScope.history",
    ]);
    expect(edited.hilbertScope.history).toBeCloseTo(0.76);
    expect(edited.hilbertScope.smear).toBeCloseTo(5 / 9);
  });

  it("consolidates each public edit onto only the fields it owns", () => {
    const backing = config();
    const edited = patchStageControl(backing, "bodyMotion", 0.6);
    expect(changedPaths(backing, edited)).toEqual([
      "blobs.oscillationAmplitude",
      "blobs.driftSpeed",
      "blobs.vibrationAmplitude",
    ]);
    expect(edited.blobs).toMatchObject({
      oscillationAmplitude: 0.6,
      driftSpeed: 12,
      vibrationAmplitude: 15,
    });
  });

  it("lets Presence hide idle Strings without suppressing played Strings", () => {
    const backing = config();
    backing.strings.isEnabled = false;
    backing.strings.activeOpacity = 0.9;

    const edited = patchStageControl(backing, "stringPresence", 0);

    expect(changedPaths(backing, edited)).toEqual(["strings.baseOpacity"]);
    expect(edited.strings).toMatchObject({
      isEnabled: false,
      baseOpacity: 0,
      activeOpacity: 0.9,
    });
    const effective = resolveStageConfig(edited);
    expect(effective.strings.isEnabled).toBe(true);
    expect(readStageControls(effective).stringPresence).toBe(0);
  });

  it("makes active String visibility part of Response", () => {
    const backing = config();

    const edited = patchStageControl(backing, "stringResponse", 0.75);

    expect(edited.strings).toMatchObject({
      activeOpacity: 0.75,
      maxAmplitude: 38.75,
      interpolationSpeed: 0.2,
    });
    expect(edited.strings.dampingFactor).toBeCloseTo(0.065);
    expect(edited.strings.opacityInterpolationSpeed).toBeCloseTo(0.1625);
    expect(readStageControls(edited).stringResponse).toBe(0.75);
  });

  it("publishes the accepted Stage defaults", () => {
    expect(readStageControls(config())).toMatchObject({
      stageEnabled: true,
      scopeSize: 0.65,
      scopeStrength: 0.75,
      scopeLineWeight: 1.5,
      scopeGlow: 0.25,
      scopeTrail: 0.2,
      bodiesVisible: true,
      bodySize: 0.2,
      bodyStrength: 0.75,
      bodyMotion: expect.closeTo(0.4),
      connectionMode: "merge",
      connectionStrength: 0.2,
      connectionSoftness: 0.25,
      atmosphereStrength: 0.3,
      atmosphereColorDepth: 0.6,
      stringPresence: 0.05,
      stringResponse: 0.5,
      fleckAmount: 3,
      fleckEnergy: expect.closeTo(0.35),
      showChords: true,
      showIntervals: true,
      showEmotion: false,
    });
  });

  it("keeps Body Size in the responsive 5–50% support-body range", () => {
    const definition = STAGE_CONTROL_DEFINITIONS.find(
      (control) => control.id === "bodySize",
    );
    expect(definition).toMatchObject({ min: 0.05, max: 0.5, step: 0.01 });

    const backing = config();
    backing.blobs.minSize = 321;
    backing.blobs.maxSize = 654;
    const edited = patchStageControl(backing, "bodySize", 0.3);
    expect(edited.blobs.baseSizeRatio).toBe(0.3);
    expect(edited.blobs.minSize).toBe(321);
    expect(edited.blobs.maxSize).toBe(654);
  });

  it("consolidates connection edge softness independently from strength", () => {
    const backing = config();
    const strengthened = patchStageControl(backing, "connectionStrength", 0.7);

    expect(changedPaths(backing, strengthened)).toEqual([
      "blobs.fusionStrength",
      "blobs.webOpacity",
    ]);
    expect(strengthened.blobs.fieldSoftness).toBe(backing.blobs.fieldSoftness);
    expect(strengthened.blobs.blurRadius).toBe(backing.blobs.blurRadius);

    const softened = patchStageControl(backing, "connectionSoftness", 0.6);
    expect(changedPaths(backing, softened)).toEqual([
      "blobs.blurRadius",
      "blobs.fieldSoftness",
    ]);
    expect(softened.blobs).toMatchObject({
      blurRadius: 24,
      fieldSoftness: 30,
    });
    expect(readStageControls(softened).connectionSoftness).toBe(0.6);
  });

  it("makes the zero Connection Strength endpoint exact", () => {
    const disconnected = patchStageControl(config(), "connectionStrength", 0);

    expect(disconnected.blobs.fusionStrength).toBe(0);
    expect(disconnected.blobs.webOpacity).toBe(0);
    expect(readStageControls(disconnected).connectionStrength).toBe(0);
  });

  it("enforces the Stage-only allowlist for Looks", () => {
    const backing = config();
    backing.dynamicColors.musicColorMode = "fixed";
    backing.uiBeat.isEnabled = false;
    backing.keyboard.mainOctave = 6;
    backing.codeStrip.bpm = 147;

    const applied = applyStageLook(backing, {
      hilbertScope: { opacity: 0.31 },
      ...({
        dynamicColors: { musicColorMode: "movable-relative" },
        keyboard: { mainOctave: 1 },
      } as any),
    });

    expect(applied.hilbertScope.opacity).toBe(0.31);
    expect(applied.dynamicColors).toEqual(backing.dynamicColors);
    expect(applied.uiBeat).toEqual(backing.uiBeat);
    expect(applied.keyboard).toEqual(backing.keyboard);
    expect(applied.codeStrip).toEqual(backing.codeStrip);
  });

  it("defines three complete built-ins while preserving learner preferences", () => {
    expect(BUILT_IN_STAGE_LOOKS.map((look) => look.name)).toEqual([
      "Clear",
      "Soft",
      "Luminous",
    ]);

    for (const look of BUILT_IN_STAGE_LOOKS) {
      expect(Object.keys(look.patch)).toEqual([
        "blobs",
        "ambient",
        "particles",
        "strings",
        "hilbertScope",
      ]);
      expect(look.patch.blobs).toHaveProperty("isEnabled");
      expect(look.patch.blobs).not.toHaveProperty("blurRadius");
      expect(look.patch.blobs).not.toHaveProperty("connectionMode");
      expect(look.patch.blobs).not.toHaveProperty("fusionStrength");
      expect(look.patch.blobs).not.toHaveProperty("fieldSoftness");
      expect(look.patch.blobs).not.toHaveProperty("webOpacity");
      expect(look.patch.blobs).not.toHaveProperty("showChordLabel");
      expect(look.patch.blobs).not.toHaveProperty("showIntervalLabels");
      expect(look.patch.blobs).not.toHaveProperty("showEmotionLabel");
      expect(look.patch.blobs).not.toHaveProperty("labelOpacity");
    }
  });

  it("creates deterministic small variations around one explicit root", () => {
    const root = config();
    root.blobs.connectionMode = "web";
    root.blobs.showChordLabel = false;
    root.blobs.showIntervalLabels = true;
    const first = createSeededStageVariation("same-seed", root, "Root Look");
    const second = createSeededStageVariation("same-seed", root, "Root Look");
    const different = createSeededStageVariation("different-seed", root, "Root Look");

    expect(first).toEqual(second);
    expect(different).not.toEqual(first);
    expect(first.name).toBe("Root Look · Variation SAME");
    expect(first.variationRoot).toEqual({
      name: "Root Look",
      patch: expect.any(Object),
    });
    expect(first.patch).not.toHaveProperty("dynamicColors");
    expect(first.patch.hilbertScope).not.toHaveProperty("isEnabled");
    expect(first.patch.blobs).toMatchObject({
      connectionMode: "web",
      blurRadius: root.blobs.blurRadius,
      fusionStrength: root.blobs.fusionStrength,
      fieldSoftness: root.blobs.fieldSoftness,
      webOpacity: root.blobs.webOpacity,
      showChordLabel: false,
      showIntervalLabels: true,
      showEmotionLabel: root.blobs.showEmotionLabel,
      labelOpacity: root.blobs.labelOpacity,
    });

    const variedConfig = applyStageLook(root, first.patch);
    const rootControls = readStageControls(root);
    const variedControls = readStageControls(variedConfig);
    const boundedControls = [
      ["scopeSize", .08],
      ["scopeStrength", .08],
      ["scopeLineWeight", .12],
      ["scopeGlow", .1],
      ["scopeTrail", .1],
      ["bodySize", .08],
      ["bodyStrength", .08],
      ["bodyMotion", .08],
      ["atmosphereStrength", .08],
      ["atmosphereColorDepth", .08],
      ["stringPresence", .1],
      ["stringResponse", .08],
      ["fleckEnergy", .1],
    ] as const;
    for (const [control, spread] of boundedControls) {
      expect(Math.abs(variedControls[control] - rootControls[control]))
        .toBeLessThanOrEqual(rootControls[control] * spread + Number.EPSILON * 10);
    }
    expect(variedConfig.blobs.isEnabled).toBe(root.blobs.isEnabled);
    expect(variedConfig.ambient.isEnabled).toBe(root.ambient.isEnabled);
    expect(variedConfig.particles.isEnabled).toBe(root.particles.isEnabled);
    expect(variedConfig.strings.isEnabled).toBe(root.strings.isEnabled);
  });
});
