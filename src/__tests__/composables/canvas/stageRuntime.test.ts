import { describe, expect, it } from "vitest";
import {
  projectCircleOfFifths,
  resolveAmbientLevel,
  resolveStageComposition,
} from "@/composables/canvas/stageRuntime";

describe("Stage runtime", () => {
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

  it("keeps idle breath out of the shared audio signal and still under Reduced Motion", () => {
    const silence = { envelope: 0, hasSignal: false };
    expect(resolveAmbientLevel(silence, 0, false)).not.toBe(
      resolveAmbientLevel(silence, 5_000, false),
    );
    expect(resolveAmbientLevel(silence, 0, true)).toBe(
      resolveAmbientLevel(silence, 5_000, true),
    );
    expect(resolveAmbientLevel({ envelope: 1, hasSignal: true }, 0, true)).toBe(0.72);
    expect(resolveAmbientLevel({ envelope: 0.5, hasSignal: true }, 0, false)).toBe(0.86);
  });
});
