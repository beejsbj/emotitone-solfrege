import { describe, expect, it } from "vitest";
import {
  BLOB_FIELD_PIXEL_BUDGET,
  blurFieldChannel,
  getBlobFieldBounds,
  getBlobFieldResolution,
  orderBlobFramesForVisibility,
} from "@/composables/canvas/useBlobFieldRenderer";
import type { ActiveBlob, PreparedBlobFrame } from "@/types/canvas";
import { MAJOR_SOLFEGE } from "@/data";

function createFrame(
  key: string,
  contour: Array<{ x: number; y: number }>
): PreparedBlobFrame {
  const blob: ActiveBlob = {
    x: contour[0]?.x ?? 0,
    y: contour[0]?.y ?? 0,
    note: MAJOR_SOLFEGE[0],
    frequency: 261.63,
    startTime: 0,
    baseRadius: 40,
    opacity: 1,
    isFadingOut: false,
    driftVx: 0,
    driftVy: 0,
    vibrationPhase: 0,
    scale: 1,
    mode: "major",
    key: "C",
    octave: 4,
  };

  return {
    key,
    blob,
    contour,
    primaryColor: "hsl(270, 90%, 55%)",
    scaledRadius: 40,
    opacity: 1,
    glowIntensity: 0,
    elapsed: 1,
  };
}

describe("useBlobFieldRenderer", () => {
  it("bounds the field from the actual prepared contours", () => {
    const frames = [
      createFrame("a", [
        { x: 20, y: 30 },
        { x: 60, y: 30 },
        { x: 40, y: 70 },
      ]),
      createFrame("b", [
        { x: 80, y: 40 },
        { x: 120, y: 40 },
        { x: 100, y: 90 },
      ]),
    ];

    expect(getBlobFieldBounds(frames, 140, 120, 10)).toEqual({
      x: 0,
      y: 16,
      width: 140,
      height: 96,
    });
  });

  it("combines neighboring bodies through one blurred occupancy field", () => {
    const width = 17;
    const channel = new Float32Array(width);
    channel[5] = 1;
    channel[11] = 1;
    const horizontal = new Float32Array(width);
    const vertical = new Float32Array(width);

    blurFieldChannel(channel, width, 1, 2, horizontal, vertical);

    expect(channel[8]).toBeGreaterThan(0);
    expect(channel[0]).toBeLessThan(channel[8]);
  });

  it("lets sustained coverage win over a coincident releasing body", () => {
    const contour = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ];
    const sustained = createFrame("sustained", contour);
    const releasing = { ...createFrame("releasing", contour), opacity: 0.1 };

    const forward = orderBlobFramesForVisibility([sustained, releasing]);
    const reverse = orderBlobFramesForVisibility([releasing, sustained]);

    expect(forward.map((frame) => frame.key)).toEqual([
      "releasing",
      "sustained",
    ]);
    expect(reverse.map((frame) => frame.key)).toEqual([
      "releasing",
      "sustained",
    ]);
    expect(forward.at(-1)?.opacity).toBe(1);
  });

  it("keeps large viewports inside the hard pixel budget", () => {
    const resolution = getBlobFieldResolution({
      x: 0,
      y: 0,
      width: 3840,
      height: 2160,
    });

    expect(resolution.width * resolution.height).toBeLessThanOrEqual(
      BLOB_FIELD_PIXEL_BUDGET
    );
  });
});
