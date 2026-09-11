import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { BUILT_IN_STAGE_LOOKS } from "@/data/visual-config-presets";
import {
  STAGE_CONTROL_GROUPS,
  STAGE_CONTROL_DEFINITIONS,
  applyStageLook,
  createSeededStageLook,
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
  it("publishes exactly the accepted 22 controls", () => {
    const controls = STAGE_CONTROL_DEFINITIONS;
    expect(controls).toHaveLength(22);
    expect(new Set(controls.map((control) => control.id)).size).toBe(22);
    expect(STAGE_CONTROL_GROUPS.map((group) => group.label)).toEqual([
      "Scope",
      "Note Bodies",
      "Connections",
      "Atmosphere",
      "Pitch Strings",
      "Note Flecks",
      "Explanations",
    ]);
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

  it("creates deterministic seeded variations", () => {
    const first = createSeededStageLook("same-seed", BUILT_IN_STAGE_LOOKS);
    const second = createSeededStageLook("same-seed", BUILT_IN_STAGE_LOOKS);
    const different = createSeededStageLook("different-seed", BUILT_IN_STAGE_LOOKS);

    expect(first).toEqual(second);
    expect(different).not.toEqual(first);
    expect(first.patch).not.toHaveProperty("dynamicColors");
    expect(first.patch.hilbertScope).not.toHaveProperty("isEnabled");
    expect(first.patch.blobs).not.toHaveProperty("connectionMode");
    expect(first.patch.blobs).not.toHaveProperty("showChordLabel");
    expect(first.patch.blobs).not.toHaveProperty("showIntervalLabels");
    expect(first.patch.blobs).not.toHaveProperty("showEmotionLabel");
    expect(first.patch.blobs).not.toHaveProperty("labelOpacity");
  });
});
