import { describe, expect, it } from "vitest";
import {
  projectCircleOfFifths,
  resolveAmbientLevel,
  resolveStageComposition,
} from "@/composables/canvas/stageRuntime";
import { UNIFIED_CONFIG } from "@/data/visual-config-metadata";

describe("Stage runtime", () => {
  it.each([
    [900, 420],
    [390, 180],
  ])(
    "enlarges the previous deck-safe Hilbert radius by 80 percent at %i×%i",
    (width, height) => {
      const composition = resolveStageComposition(
        { x: 0, y: 0, width, height },
        75,
        0.6,
      );
      const paddedMinorAxis = Math.min(width - 40, height - 40);
      const priorBodyExtent = Math.min(75 * 1.3, paddedMinorAxis * 0.115);
      const priorOrbit = paddedMinorAxis / 2 - priorBodyExtent;
      const priorClearance = Math.max(18, priorOrbit * 0.28);
      const priorRadius = priorOrbit - priorBodyExtent - priorClearance;

      expect(composition.hilbertRadius).toBeCloseTo(priorRadius * 1.8, 6);
    },
  );

  it("keeps the configured Hilbert Size range visually effective", () => {
    const sizeControl = UNIFIED_CONFIG.hilbertScope.sizeRatio;
    const smallerSize = resolveStageComposition(
      { x: 0, y: 0, width: 900, height: 420 },
      75,
      sizeControl.value / 2,
    );
    const defaultSize = resolveStageComposition(
      { x: 0, y: 0, width: 900, height: 420 },
      75,
      sizeControl.value,
    );
    const maximumSize = resolveStageComposition(
      { x: 0, y: 0, width: 900, height: 420 },
      75,
      sizeControl.max,
    );

    expect(smallerSize.hilbertRadius).toBeCloseTo(
      defaultSize.hilbertRadius / 2,
      6,
    );
    expect(maximumSize.hilbertRadius).toBeGreaterThan(
      defaultSize.hilbertRadius,
    );
  });

  it("preserves disabled and undersized Stage behavior", () => {
    expect(
      resolveStageComposition({ x: 0, y: 0, width: 900, height: 420 }, 75, 0)
        .hilbertRadius,
    ).toBe(0);
    expect(
      resolveStageComposition({ x: 0, y: 0, width: 95, height: 95 }, 75, 0.6)
        .suspended,
    ).toBe(true);
  });

  it.each([
    [900, 420],
    [390, 180],
  ])("preserves the original Blob orbit at %i×%i", (width, height) => {
    const composition = resolveStageComposition(
      { x: 0, y: 0, width, height },
      75,
      0.6,
    );
    const priorBodyExtent = Math.min(
      75 * 1.3,
      Math.min(width - 40, height - 40) * 0.115,
    );

    expect(composition.orbitRadiusX).toBeCloseTo(
      (width - 40) / 2 - priorBodyExtent,
      6,
    );
    expect(composition.orbitRadiusY).toBeCloseTo(
      (height - 40) / 2 - priorBodyExtent,
      6,
    );
  });

  it("centers the focal system in the host-supplied usable region", () => {
    const composition = resolveStageComposition(
      { x: 0, y: 0, width: 900, height: 420 },
      75,
      0.6,
    );

    expect(composition.centerX).toBe(450);
    expect(composition.centerY).toBe(210);
    expect(composition.hilbertRadius).toBeLessThan(composition.orbitRadiusY);
    expect(composition.suspended).toBe(false);
  });

  it("fits desired blob bodies on short screens without changing saved size", () => {
    const composition = resolveStageComposition(
      { x: 0, y: 0, width: 390, height: 180 },
      75,
      0.6,
    );
    const top = projectCircleOfFifths(composition, 0, 0);
    const fittedExtent = 75 * 1.3 * composition.blobFitScale;

    expect(composition.blobFitScale).toBeLessThan(1);
    expect(top.y - fittedExtent).toBeGreaterThanOrEqual(19);
  });

  it("fits the actual full-canvas Blob radius when it exceeds the usable-size estimate", () => {
    const composition = resolveStageComposition(
      { x: 0, y: 0, width: 1280, height: 180 },
      400,
      0.6,
    );
    const fittedExtent = 400 * 1.3 * composition.blobFitScale;
    expect(fittedExtent).toBeLessThanOrEqual(17);
    expect(composition.orbitRadiusY + fittedExtent).toBeLessThanOrEqual(70);
  });

  it("cycles the silent Ambient breath every ten elapsed seconds", () => {
    const silence = { envelope: 0, hasSignal: false };
    expect(resolveAmbientLevel(silence, 0, false)).toBeCloseTo(0.68, 6);
    expect(resolveAmbientLevel(silence, 2.5, false)).toBeCloseTo(0.72, 6);
    expect(resolveAmbientLevel(silence, 5, false)).toBeCloseTo(0.76, 6);
    expect(resolveAmbientLevel(silence, 10, false)).toBeCloseTo(0.68, 6);
    expect(resolveAmbientLevel(silence, 0, true)).toBe(
      resolveAmbientLevel(silence, 5, true),
    );
    expect(resolveAmbientLevel({ envelope: 1, hasSignal: true }, 0, true)).toBe(0.72);
    expect(resolveAmbientLevel({ envelope: 0.5, hasSignal: true }, 0, false)).toBe(0.86);
  });
});
