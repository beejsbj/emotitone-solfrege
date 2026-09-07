import { describe, expect, it } from "vitest";
import {
  BLOB_FIELD_PIXEL_BUDGET,
  blurFieldChannel,
  getBlobFieldConnections,
  getBlobFieldConnectionGeometry,
  getBlobFieldConnectionWidth,
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

function createFrameAt(key: string, x: number, y: number) {
  const frame = createFrame(
    key,
    Array.from({ length: 48 }, (_, index) => {
      const angle = (index / 48) * Math.PI * 2;
      return {
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
      };
    })
  );
  frame.blob.x = x;
  frame.blob.y = y;
  return frame;
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

  it("keeps every merge body connected without drawing a complete graph", () => {
    const first = createFrameAt("first", 80, 100);
    const second = createFrameAt("second", 900, 100);
    const third = createFrameAt("third", 860, 180);

    const connections = getBlobFieldConnections([first, second, third]);

    expect(connections).toHaveLength(2);
    expect(connections[0]).toMatchObject({ from: first, to: second, gap: 740 });
    expect(connections[1]).toMatchObject({ from: second, to: third });
  });

  it("keeps a threshold-safe filament while thinning with distance", () => {
    const first = createFrameAt("first", 80, 100);
    const near = createFrameAt("near", 180, 100);
    const far = createFrameAt("far", 900, 100);
    const nearConnection = getBlobFieldConnections([first, near])[0];
    const farConnection = getBlobFieldConnections([first, far])[0];

    const nearWidth = getBlobFieldConnectionWidth(
      nearConnection,
      12,
      0.5,
      0.4
    );
    const farWidth = getBlobFieldConnectionWidth(
      farConnection,
      12,
      0.5,
      0.4
    );

    expect(nearWidth).toBeGreaterThan(farWidth);
    expect(farWidth).toBeGreaterThanOrEqual(16.2);
  });

  it("curves long filaments into smoothly inset, resolution-aware shoulders", () => {
    const first = createFrameAt("first", 80, 100);
    const far = createFrameAt("far", 900, 100);
    const connection = getBlobFieldConnections([first, far])[0];
    const fieldScale = 0.5;
    const waistWidth = getBlobFieldConnectionWidth(
      connection,
      12,
      fieldScale,
      0.4
    );
    const geometry = getBlobFieldConnectionGeometry(
      connection,
      waistWidth,
      fieldScale
    );
    const finalIndex = geometry.centerline.length - 1;
    const midpointIndex = finalIndex / 2;
    const quarterIndex = finalIndex / 4;
    const midpoint = geometry.centerline[midpointIndex];
    const linearMidpoint = {
      x: (geometry.centerline[0].x + geometry.centerline[finalIndex].x) / 2,
      y: (geometry.centerline[0].y + geometry.centerline[finalIndex].y) / 2,
    };
    const maxFieldSegment = geometry.centerline
      .slice(1)
      .reduce((largest, point, index) => {
        const previous = geometry.centerline[index];
        return Math.max(
          largest,
          Math.hypot(point.x - previous.x, point.y - previous.y) * fieldScale
        );
      }, 0);
    const startDirection = {
      x: geometry.centerline[1].x - geometry.centerline[0].x,
      y: geometry.centerline[1].y - geometry.centerline[0].y,
    };

    expect(geometry.centerline.length).toBeGreaterThan(17);
    expect(maxFieldSegment).toBeLessThanOrEqual(2.1);
    expect(Math.abs(midpoint.y - linearMidpoint.y)).toBeGreaterThan(20);
    expect(Math.abs(startDirection.y / startDirection.x)).toBeLessThan(0.02);

    expect(geometry.widths[0]).toBeGreaterThan(waistWidth * 2);
    expect(geometry.widths[midpointIndex]).toBeCloseTo(waistWidth, 6);
    expect(Math.abs(geometry.widths[1] - geometry.widths[0])).toBeLessThan(
      Math.abs(
        geometry.widths[quarterIndex + 1] - geometry.widths[quarterIndex]
      ) * 0.05
    );

    [geometry.leftEdge[0], geometry.rightEdge[0]].forEach((point) => {
      expect(
        Math.hypot(point.x - first.blob.x, point.y - first.blob.y)
      ).toBeLessThan(first.scaledRadius);
    });
    [geometry.leftEdge[finalIndex], geometry.rightEdge[finalIndex]].forEach(
      (point) => {
        expect(
          Math.hypot(point.x - far.blob.x, point.y - far.blob.y)
        ).toBeLessThan(far.scaledRadius);
      }
    );
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
