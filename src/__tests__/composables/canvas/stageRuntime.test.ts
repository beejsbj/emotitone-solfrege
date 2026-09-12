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
    "doubles the accepted Hilbert base radius at %i×%i",
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

      expect(composition.hilbertRadius).toBeCloseTo(priorRadius * 1.8 * 2, 6);
    },
  );

  it("preserves the fitted range shape after doubling presentation size", () => {
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
    expect(maximumSize.hilbertRadius).toBeCloseTo(
      defaultSize.hilbertRadius,
      6,
    );
  });

  it.each([150, 180, 240, 375, 600, 800])(
    "keeps blob size and orbit independent of Scope Size at a %ipx edge",
    (height) => {
      const usable = { x: 12, y: 24, width: 1200, height };
      const radius = Math.max(75, height * 0.1);
      for (const bodyScale of [0.5, 1, 1.5]) {
        const baseline = resolveStageComposition(usable, radius, 0.6, bodyScale);
        for (const scopeSize of [0, 0.15, 0.3, 0.6, 0.9, 1.5]) {
          const actual = resolveStageComposition(usable, radius, scopeSize, bodyScale);
          expect(actual.blobFitScale).toBe(baseline.blobFitScale);
          expect(actual.orbitRadiusX).toBe(baseline.orbitRadiusX);
          expect(actual.orbitRadiusY).toBe(baseline.orbitRadiusY);
        }
      }
    },
  );

  it.each([240, 375, 600, 800])(
    "keeps the complete public Body Size range visible at a %ipx short edge",
    (height) => {
      const usable = { x: 0, y: 0, width: 1200, height };
      const canonicalRadius = Math.max(75, height * 0.1);
      const renderedRadii = [0.05, 0.1, 0.15].map((ratio) => {
        const composition = resolveStageComposition(
          usable,
          canonicalRadius,
          0.6,
          ratio / 0.1,
        );
        return canonicalRadius * composition.blobFitScale;
      });

      expect(renderedRadii[0]).toBeCloseTo(renderedRadii[1]! * 0.5, 6);
      expect(renderedRadii[2]).toBeCloseTo(renderedRadii[1]! * 1.5, 6);
      expect(renderedRadii[0]).toBeLessThan(renderedRadii[1]!);
      expect(renderedRadii[1]).toBeLessThan(renderedRadii[2]!);
    },
  );

  it("keeps the accepted Blob orbit while Body Size changes within its normal range", () => {
    const usable = { x: 0, y: 0, width: 1200, height: 420 };
    const smaller = resolveStageComposition(usable, 75, 0.6, 0.5);
    const baseline = resolveStageComposition(usable, 75, 0.6, 1);
    const larger = resolveStageComposition(usable, 75, 0.6, 1.5);

    expect(smaller.orbitRadiusX).toBe(baseline.orbitRadiusX);
    expect(smaller.orbitRadiusY).toBe(baseline.orbitRadiusY);
    expect(larger.orbitRadiusX).toBe(baseline.orbitRadiusX);
    expect(larger.orbitRadiusY).toBe(baseline.orbitRadiusY);
  });

  it("preserves disabled and undersized Stage behavior", () => {
    expect(
      resolveStageComposition({ x: 0, y: 0, width: 900, height: 420 }, 75, 0)
        .hilbertRadius,
    ).toBe(0);
    expect(
      resolveStageComposition({ x: 0, y: 0, width: 149, height: 149 }, 75, 0.6)
        .suspended,
    ).toBe(true);
    expect(
      resolveStageComposition({ x: 0, y: 0, width: 150, height: 150 }, 75, 0.6)
        .suspended,
    ).toBe(false);
  });

  it.each([150, 180, 240, 375, 600, 800])(
    "keeps the Scope larger than a maximum-size support body at a %ipx drawable edge",
    (height) => {
      const canonicalRadius = Math.max(75, height * 0.1);
      const composition = resolveStageComposition(
        { x: 0, y: 0, width: 1200, height },
        canonicalRadius,
        0.6,
        1.5,
      );
      const bodyRadius = canonicalRadius * composition.blobFitScale;

      expect(composition.suspended).toBe(false);
      expect(composition.hilbertRadius).toBeGreaterThan(bodyRadius);
    },
  );

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
    expect(composition.hilbertRadius).toBeGreaterThan(composition.orbitRadiusY);
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

  it("hands the released audio envelope continuously back to the silent breath", () => {
    const releaseThreshold = 0.08;
    const audioLevelAtThreshold = 0.72 + releaseThreshold * 0.28;

    expect(resolveAmbientLevel(
      { envelope: 0.5, hasSignal: false },
      0,
      false,
    )).toBeCloseTo(0.86, 6);
    expect(resolveAmbientLevel(
      { envelope: releaseThreshold, hasSignal: false },
      0,
      false,
    )).toBeCloseTo(audioLevelAtThreshold, 6);
    expect(resolveAmbientLevel(
      { envelope: releaseThreshold - 0.000001, hasSignal: false },
      0,
      false,
    )).toBeCloseTo(audioLevelAtThreshold, 5);
    expect(resolveAmbientLevel(
      { envelope: 0.04579, hasSignal: true },
      2.272,
      false,
    )).toBeCloseTo(resolveAmbientLevel(
      { envelope: 0.04579, hasSignal: false },
      2.272,
      false,
    ), 8);
    expect(resolveAmbientLevel(
      { envelope: 0, hasSignal: false },
      0,
      false,
    )).toBeCloseTo(0.68, 6);
  });
});
