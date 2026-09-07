import { describe, expect, it } from "vitest";
import {
  BLOB_FIELD_PIXEL_BUDGET,
  blurFieldChannel,
  createBlobFieldConnectionPlanner,
  createBlobWebConnectionPlanner,
  getBlobFieldConnections,
  getBlobFieldConnectionGeometry,
  getBlobFieldConnectionWidth,
  getBlobFieldColorBatchSize,
  getBlobFieldBounds,
  getBlobFieldMaterialPasses,
  getBlobFieldResolution,
  getBlobWebConnections,
  getBlobWebConnectionWidth,
  orderBlobFramesForVisibility,
} from "@/composables/canvas/useBlobFieldRenderer";
import type {
  ActiveBlob,
  HarmonicGeometryScene,
  PreparedBlobFrame,
} from "@/types/canvas";
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

function createWebScene(
  frames: readonly PreparedBlobFrame[],
  boundaryPairs: Array<[number, number]>,
  interiorPairs: Array<[number, number]>
) {
  const points = frames.map((frame, index) => ({
    note: { noteId: frame.key },
    blob: frame.blob,
    x: frame.blob.x,
    y: frame.blob.y,
    angle: index,
  }));
  const createEdge = ([fromIndex, toIndex]: [number, number]) => ({
    fromNoteId: frames[fromIndex].key,
    toNoteId: frames[toIndex].key,
    fromIndex,
    toIndex,
    interval: `${fromIndex}-${toIndex}`,
  });

  return {
    points,
    orderedPoints: points,
    centroid: { x: 0, y: 0 },
    radius: 1,
    boundaryEdges: boundaryPairs.map(createEdge),
    interiorEdges: interiorPairs.map(createEdge),
    primaryLabel: null,
    auxiliaryLabels: [],
  } as unknown as HarmonicGeometryScene;
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

  it("keeps merge parents stable while bodies drift", () => {
    const first = createFrameAt("first", 80, 100);
    const second = createFrameAt("second", 300, 100);
    const third = createFrameAt("third", 290, 180);
    const planner = createBlobFieldConnectionPlanner();

    expect(planner.getConnections([first, second, third])[1].from.key).toBe(
      "second"
    );

    third.blob.x = 90;
    third.blob.y = 120;

    expect(planner.getConnections([first, second, third])[1].from.key).toBe(
      "second"
    );
  });

  it("turns the analyzed web into perimeter and interior field connections", () => {
    const frames = [
      createFrameAt("first", 80, 80),
      createFrameAt("second", 320, 80),
      createFrameAt("third", 320, 320),
      createFrameAt("fourth", 80, 320),
    ];
    const scene = createWebScene(
      frames,
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ],
      [
        [0, 2],
        [1, 3],
      ]
    );

    const connections = getBlobWebConnections(frames, scene);

    expect(connections).toHaveLength(6);
    expect(
      connections.filter((connection) => connection.role === "boundary")
    ).toHaveLength(4);
    expect(
      connections.filter((connection) => connection.role === "interior")
    ).toHaveLength(2);
  });

  it("keeps web emphasis stable while the same graph drifts", () => {
    const frames = [
      createFrameAt("first", 80, 80),
      createFrameAt("second", 320, 80),
      createFrameAt("third", 320, 320),
      createFrameAt("fourth", 80, 320),
    ];
    const initialScene = createWebScene(
      frames,
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ],
      [
        [0, 2],
        [1, 3],
      ]
    );
    const driftedScene = createWebScene(
      frames,
      [
        [0, 2],
        [1, 2],
        [2, 3],
        [1, 3],
      ],
      [
        [0, 1],
        [0, 3],
      ]
    );
    const planner = createBlobWebConnectionPlanner();

    const initial = planner.getConnections(frames, initialScene);
    const drifted = planner.getConnections(frames, driftedScene);
    const roleForPair = (
      connections: typeof initial,
      first: string,
      second: string
    ) =>
      connections.find(
        (connection) =>
          [connection.from.key, connection.to.key].sort().join("::") ===
          [first, second].sort().join("::")
      )?.role;

    expect(roleForPair(initial, "first", "second")).toBe("boundary");
    expect(roleForPair(drifted, "first", "second")).toBe("boundary");
    expect(roleForPair(initial, "first", "third")).toBe("interior");
    expect(roleForPair(drifted, "first", "third")).toBe("interior");
  });

  it("preserves surviving web emphasis when a released body disappears", () => {
    const frames = [
      createFrameAt("first", 80, 80),
      createFrameAt("second", 320, 80),
      createFrameAt("third", 320, 320),
      createFrameAt("releasing", 80, 320),
    ];
    const fullScene = createWebScene(
      frames,
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ],
      [
        [0, 2],
        [1, 3],
      ]
    );
    const survivingFrames = frames.slice(0, 3);
    const reducedScene = createWebScene(
      survivingFrames,
      [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
      []
    );
    const planner = createBlobWebConnectionPlanner();

    expect(
      planner
        .getConnections(frames, fullScene)
        .find(
          (connection) =>
            [connection.from.key, connection.to.key].sort().join("::") ===
            "first::third"
        )?.role
    ).toBe("interior");
    expect(
      planner
        .getConnections(survivingFrames, reducedScene)
        .find(
          (connection) =>
            [connection.from.key, connection.to.key].sort().join("::") ===
            "first::third"
        )?.role
    ).toBe("interior");
  });

  it("reconnects held bodies before attaching a releasing intermediate", () => {
    const first = createFrameAt("first", 80, 100);
    const intermediate = createFrameAt("intermediate", 300, 100);
    const third = createFrameAt("third", 520, 100);
    const planner = createBlobFieldConnectionPlanner();

    planner.getConnections([first, intermediate, third]);
    intermediate.blob.isFadingOut = true;
    intermediate.opacity = 0.1;

    const connections = planner.getConnections([first, intermediate, third]);
    const heldConnection = connections.find(
      (connection) =>
        connection.from.key === "first" && connection.to.key === "third"
    );
    const releasingConnection = connections.find(
      (connection) => connection.to.key === "intermediate"
    );

    expect(heldConnection).toBeDefined();
    expect(heldConnection?.from.opacity).toBe(1);
    expect(heldConnection?.to.opacity).toBe(1);
    expect(releasingConnection).toBeDefined();
    expect(connections).toHaveLength(2);
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

  it("keeps distant web filaments continuous with quieter interior weight", () => {
    const first = createFrameAt("first", 80, 100);
    const far = createFrameAt("far", 900, 100);
    const boundary = getBlobWebConnections(
      [first, far],
      createWebScene([first, far], [[0, 1]], [])
    )[0];
    const interior = { ...boundary, role: "interior" as const };

    const boundaryWidth = getBlobWebConnectionWidth(
      boundary,
      10,
      0.5,
      0.4
    );
    const interiorWidth = getBlobWebConnectionWidth(
      interior,
      10,
      0.5,
      0.4
    );

    expect(boundaryWidth).toBeGreaterThan(interiorWidth);
    expect(interiorWidth).toBeGreaterThanOrEqual(10.2);
  });

  it("keeps dense Web color contributions above 8-bit quantization", () => {
    const divisor = getBlobFieldColorBatchSize(78);
    const quietHeldInteriorOpacity = 0.1 * 0.46;

    expect(divisor).toBe(8);
    expect((quietHeldInteriorOpacity / divisor) * 255).toBeGreaterThan(1);
    expect(getBlobFieldColorBatchSize(4)).toBe(4);
  });

  it("keeps Blob blur and glow as the field material", () => {
    expect(
      getBlobFieldMaterialPasses({
        blurRadius: 10,
        glowEnabled: true,
        glowIntensity: 5,
      })
    ).toEqual([
      { filter: "blur(15px)", opacity: 0.62 },
      { filter: "blur(10px)", opacity: 1 },
    ]);
    expect(
      getBlobFieldMaterialPasses({
        blurRadius: 0,
        glowEnabled: false,
        glowIntensity: 50,
      })
    ).toEqual([{ filter: "none", opacity: 1 }]);
  });

  it("keeps Web attachments stable when only the contours vibrate", () => {
    const first = createFrameAt("first", 80, 100);
    const far = createFrameAt("far", 900, 100);
    const connection = getBlobWebConnections(
      [first, far],
      createWebScene([first, far], [[0, 1]], [])
    )[0];
    const initial = getBlobFieldConnectionGeometry(
      connection,
      12,
      0.5,
      0.46,
      0.46,
      "radius"
    );

    first.contour = first.contour.map((point, index) => ({
      x: point.x + (index % 2 === 0 ? 18 : -12),
      y: point.y + (index % 3 === 0 ? 14 : -9),
    }));
    far.contour = far.contour.map((point, index) => ({
      x: point.x + (index % 2 === 0 ? -16 : 10),
      y: point.y + (index % 3 === 0 ? -13 : 8),
    }));
    const vibrated = getBlobFieldConnectionGeometry(
      connection,
      12,
      0.5,
      0.46,
      0.46,
      "radius"
    );

    expect(vibrated.startAttachment).toEqual(initial.startAttachment);
    expect(vibrated.endAttachment).toEqual(initial.endAttachment);
    expect(vibrated.centerline).toEqual(initial.centerline);
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
