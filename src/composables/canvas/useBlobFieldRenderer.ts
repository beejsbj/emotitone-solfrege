import type {
  HarmonicGeometryScene,
  PreparedBlobFrame,
} from "@/types/canvas";
import type {
  BlobConfig,
} from "@/types/visual";
import { withMusicColorAlpha } from "@/services/musicColor";

export const BLOB_FIELD_PIXEL_BUDGET = 30_000;
const MAX_FIELD_SCALE = 0.5;

export interface FieldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlobFieldConnection {
  from: PreparedBlobFrame;
  to: PreparedBlobFrame;
  distance: number;
  gap: number;
  role: "boundary" | "interior";
}

interface FieldPoint {
  x: number;
  y: number;
}

export interface BlobFieldConnectionGeometry {
  startAttachment: FieldPoint;
  endAttachment: FieldPoint;
  centerline: FieldPoint[];
  widths: number[];
  leftEdge: FieldPoint[];
  rightEdge: FieldPoint[];
  bend: number;
}

export interface BlobFieldMaterialPass {
  filter: string;
  opacity: number;
}

interface FieldSurfaces {
  source: HTMLCanvasElement;
  visibility: HTMLCanvasElement;
  output: HTMLCanvasElement;
}

interface FieldBuffers {
  size: number;
  width: number;
  height: number;
  alpha: Float32Array;
  red: Float32Array;
  green: Float32Array;
  blue: Float32Array;
  weight: Float32Array;
  opacity: Float32Array;
  horizontal: Float32Array;
  vertical: Float32Array;
  output: ImageData;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const progress = Math.max(
    0,
    Math.min(1, (value - edge0) / Math.max(0.0001, edge1 - edge0))
  );
  return progress * progress * (3 - 2 * progress);
}

function smootherstep(value: number) {
  const progress = Math.max(0, Math.min(1, value));
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

export function getBlobFieldBounds(
  frames: readonly PreparedBlobFrame[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number
): FieldBounds | null {
  const points = frames.flatMap((frame) => frame.contour);
  if (points.length === 0) {
    return null;
  }

  const rawMinX = Math.max(
    0,
    Math.floor(Math.min(...points.map((point) => point.x)) - padding)
  );
  const rawMinY = Math.max(
    0,
    Math.floor(Math.min(...points.map((point) => point.y)) - padding)
  );
  const rawMaxX = Math.min(
    canvasWidth,
    Math.ceil(Math.max(...points.map((point) => point.x)) + padding)
  );
  const rawMaxY = Math.min(
    canvasHeight,
    Math.ceil(Math.max(...points.map((point) => point.y)) + padding)
  );

  // Keep tiny drift movements from resizing every surface and pixel buffer on
  // every animation frame.
  const grid = 16;
  const minX = Math.max(0, Math.floor(rawMinX / grid) * grid);
  const minY = Math.max(0, Math.floor(rawMinY / grid) * grid);
  const maxX = Math.min(canvasWidth, Math.ceil(rawMaxX / grid) * grid);
  const maxY = Math.min(canvasHeight, Math.ceil(rawMaxY / grid) * grid);

  if (maxX <= minX || maxY <= minY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function blurHorizontal(
  input: Float32Array,
  output: Float32Array,
  width: number,
  height: number,
  radius: number
) {
  const windowSize = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    let sum = 0;
    for (let x = 0; x <= radius && x < width; x += 1) {
      sum += input[row + x];
    }

    for (let x = 0; x < width; x += 1) {
      output[row + x] = sum / windowSize;
      const leaving = x - radius;
      const entering = x + radius + 1;
      if (leaving >= 0) sum -= input[row + leaving];
      if (entering < width) sum += input[row + entering];
    }
  }
}

function blurVertical(
  input: Float32Array,
  output: Float32Array,
  width: number,
  height: number,
  radius: number
) {
  const windowSize = radius * 2 + 1;

  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = 0; y <= radius && y < height; y += 1) {
      sum += input[y * width + x];
    }

    for (let y = 0; y < height; y += 1) {
      output[y * width + x] = sum / windowSize;
      const leaving = y - radius;
      const entering = y + radius + 1;
      if (leaving >= 0) sum -= input[leaving * width + x];
      if (entering < height) sum += input[entering * width + x];
    }
  }
}

/** Approximate a Gaussian blur with two separable box passes. */
export function blurFieldChannel(
  channel: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: Float32Array,
  vertical: Float32Array
) {
  if (radius <= 0) {
    return channel;
  }

  for (let pass = 0; pass < 2; pass += 1) {
    blurHorizontal(channel, horizontal, width, height, radius);
    blurVertical(horizontal, vertical, width, height, radius);
    channel.set(vertical);
  }

  return channel;
}

function traceFrame(
  context: CanvasRenderingContext2D,
  frame: PreparedBlobFrame
) {
  context.beginPath();
  frame.contour.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.closePath();
}

function getRadiusPointTowards(
  frame: PreparedBlobFrame,
  direction: FieldPoint
) {
  return {
    x: frame.blob.x + direction.x * frame.scaledRadius,
    y: frame.blob.y + direction.y * frame.scaledRadius,
  };
}

function getConnectionBendDirection(connection: BlobFieldConnection) {
  const pairKey = [connection.from.key, connection.to.key].sort().join("::");
  return [...pairKey].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  ) %
    2 ===
    0
    ? 1
    : -1;
}

/** Sample the body's existing vibration without introducing another clock.
 * Angular weighting avoids jumping between contour vertices. A circular frame
 * contributes zero, including the real Motion-off and Reduced Motion states.
 */
function contourDisplacement(frame: PreparedBlobFrame, direction: FieldPoint) {
  let displacement = 0;
  let weight = 0;
  for (const point of frame.contour) {
    const dx = point.x - frame.blob.x;
    const dy = point.y - frame.blob.y;
    const radius = Math.hypot(dx, dy);
    if (radius === 0) continue;
    const influence = Math.pow(Math.max(0, (dx * direction.x + dy * direction.y) / radius), 8);
    displacement += (radius - frame.scaledRadius) * influence;
    weight += influence;
  }
  const value = displacement / Math.max(0.0001, weight);
  return Math.abs(value) < 0.00001 ? 0 : value;
}

/**
 * Grow a Web ribbon from inside each body, narrowing over a body-sized shoulder
 * into a fine strand. The anchors stay rooted while the body's own contour
 * vibration travels through the span; endpoint tangents remain continuous.
 */
export function getBlobFieldConnectionGeometry(
  connection: BlobFieldConnection,
  waistWidth: number,
  fieldScale: number,
  shoulderScale = 0.95,
  bendScale = 0.46
): BlobFieldConnectionGeometry {
  const centerDeltaX = connection.to.blob.x - connection.from.blob.x;
  const centerDeltaY = connection.to.blob.y - connection.from.blob.y;
  const centerDistance = Math.hypot(centerDeltaX, centerDeltaY) || 1;
  const direction = {
    x: centerDeltaX / centerDistance,
    y: centerDeltaY / centerDistance,
  };
  const startAttachment = getRadiusPointTowards(connection.from, direction);
  const endAttachment = getRadiusPointTowards(connection.to, {
    x: -direction.x,
    y: -direction.y,
  });
  const normal = { x: -direction.y, y: direction.x };
  const shoulderWidths = {
    from: Math.max(waistWidth, connection.from.scaledRadius * shoulderScale),
    to: Math.max(waistWidth, connection.to.scaledRadius * shoulderScale),
  };
  const attachmentInset = (radius: number) => radius * 0.82;
  const start = {
    x: startAttachment.x - direction.x * attachmentInset(connection.from.scaledRadius),
    y: startAttachment.y - direction.y * attachmentInset(connection.from.scaledRadius),
  };
  const end = {
    x: endAttachment.x + direction.x * attachmentInset(connection.to.scaledRadius),
    y: endAttachment.y + direction.y * attachmentInset(connection.to.scaledRadius),
  };
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const smallerRadius = Math.min(
    connection.from.scaledRadius,
    connection.to.scaledRadius
  );
  const bendLimit = Math.min(72, Math.max(24, smallerRadius * 0.62));
  const bendActivation = smoothstep(
    0,
    Math.max(1, smallerRadius * 1.5),
    connection.gap
  );
  const bend =
    Math.min(connection.gap * 0.095, bendLimit) *
    bendActivation *
    getConnectionBendDirection(connection) *
    bendScale;
  const estimatedLength = Math.hypot(deltaX, deltaY) + Math.abs(bend) * 1.5;
  const segments = Math.max(
    24,
    Math.min(192, Math.ceil((estimatedLength * Math.max(0.01, fieldScale)) / 2))
  );
  const fromVibration = contourDisplacement(connection.from, normal);
  const toVibration = contourDisplacement(connection.to, normal);
  const vibrationAt = (progress: number) =>
    2.5 * (
      fromVibration * (1 - progress) * Math.sin(progress * Math.PI * 3) +
      toVibration * progress * Math.sin(progress * Math.PI * 4)
    );
  const pointAt = (progress: number) => {
    const inverse = 1 - progress;
    const envelope = 16 * progress * progress * inverse * inverse;
    const offset = (bend + vibrationAt(progress)) * envelope;
    return {
      x: start.x + deltaX * progress + normal.x * offset,
      y: start.y + deltaY * progress + normal.y * offset,
    };
  };
  const tangentAt = (progress: number) => {
    const curveSlope = 32 * progress * (1 - progress) * (1 - progress * 2);
    const envelope = 16 * progress * progress * (1 - progress) * (1 - progress);
    const vibrationSlope = 2.5 * (
      fromVibration * ((1 - progress) * Math.PI * 3 * Math.cos(progress * Math.PI * 3) - Math.sin(progress * Math.PI * 3)) +
      toVibration * (progress * Math.PI * 4 * Math.cos(progress * Math.PI * 4) + Math.sin(progress * Math.PI * 4))
    );
    const slope = (bend + vibrationAt(progress)) * curveSlope + vibrationSlope * envelope;
    return { x: deltaX + normal.x * slope, y: deltaY + normal.y * slope };
  };
  const length = Math.hypot(deltaX, deltaY);
  const fromShoulderLength = Math.min(length / 2, connection.from.scaledRadius * 2.5);
  const toShoulderLength = Math.min(length / 2, connection.to.scaledRadius * 2.5);
  const widthAt = (progress: number) => waistWidth +
    (shoulderWidths.from - waistWidth) * (1 - smootherstep(progress * length / Math.max(1, fromShoulderLength))) +
    (shoulderWidths.to - waistWidth) * (1 - smootherstep((1 - progress) * length / Math.max(1, toShoulderLength)));
  const centerline: FieldPoint[] = [];
  const widths: number[] = [];
  const leftEdge: FieldPoint[] = [];
  const rightEdge: FieldPoint[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const point = pointAt(progress);
    const tangent = tangentAt(progress);
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
    const edgeNormal = {
      x: -tangent.y / tangentLength,
      y: tangent.x / tangentLength,
    };
    const width = widthAt(progress);
    const halfWidth = width / 2;

    centerline.push(point);
    widths.push(width);
    leftEdge.push({
      x: point.x + edgeNormal.x * halfWidth,
      y: point.y + edgeNormal.y * halfWidth,
    });
    rightEdge.push({
      x: point.x - edgeNormal.x * halfWidth,
      y: point.y - edgeNormal.y * halfWidth,
    });
  }

  return {
    startAttachment,
    endAttachment,
    centerline,
    widths,
    leftEdge,
    rightEdge,
    bend,
  };
}

function traceSmoothEdge(
  context: CanvasRenderingContext2D,
  points: readonly FieldPoint[],
  moveToStart: boolean,
  reverse = false
) {
  const pointAt = (index: number) =>
    points[reverse ? points.length - 1 - index : index];
  const first = pointAt(0);

  if (moveToStart) {
    context.moveTo(first.x, first.y);
  } else {
    context.lineTo(first.x, first.y);
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = pointAt(index);
    const next = pointAt(index + 1);
    context.quadraticCurveTo(
      point.x,
      point.y,
      (point.x + next.x) / 2,
      (point.y + next.y) / 2
    );
  }

  const last = pointAt(points.length - 1);
  if (last) {
    context.lineTo(last.x, last.y);
  }
}

function traceConnection(
  context: CanvasRenderingContext2D,
  geometry: BlobFieldConnectionGeometry
) {
  context.beginPath();
  traceSmoothEdge(context, geometry.leftEdge, true);
  traceSmoothEdge(context, geometry.rightEdge, false, true);
  context.closePath();
}

function resizeSurface(canvas: HTMLCanvasElement, width: number, height: number) {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

function createSurface() {
  return document.createElement("canvas");
}

export function orderBlobFramesForVisibility(
  frames: readonly PreparedBlobFrame[]
) {
  return [...frames].sort((left, right) => left.opacity - right.opacity);
}

function createConnection(
  parent: PreparedBlobFrame,
  frame: PreparedBlobFrame,
  role: BlobFieldConnection["role"]
): BlobFieldConnection {
  const distance = Math.hypot(
    frame.blob.x - parent.blob.x,
    frame.blob.y - parent.blob.y
  );

  return {
    from: parent,
    to: frame,
    distance,
    gap: Math.max(0, distance - parent.scaledRadius - frame.scaledRadius),
    role,
  };
}

function getConnectionPairKey(connection: BlobFieldConnection) {
  return [connection.from.key, connection.to.key].sort().join("::");
}

/** Resolve the already-analyzed graph into exact prepared blob bodies. */
export function getBlobWebConnections(
  frames: readonly PreparedBlobFrame[],
  scene: HarmonicGeometryScene | null
): BlobFieldConnection[] {
  if (!scene || scene.orderedPoints.length < 2) {
    return [];
  }

  const frameForPoint = (point: HarmonicGeometryScene["points"][number]) =>
    frames.find((frame) => frame.blob === point.blob);
  const connections: BlobFieldConnection[] = [];
  const connectedPairs = new Set<string>();

  const addConnection = (
    fromPoint: HarmonicGeometryScene["points"][number] | undefined,
    toPoint: HarmonicGeometryScene["points"][number] | undefined,
    role: Extract<BlobFieldConnection["role"], "boundary" | "interior">
  ) => {
    if (!fromPoint || !toPoint) return;
    const from = frameForPoint(fromPoint);
    const to = frameForPoint(toPoint);
    if (!from || !to || from === to) return;

    const connection = createConnection(from, to, role);
    const pairKey = getConnectionPairKey(connection);
    if (connectedPairs.has(pairKey)) return;
    connectedPairs.add(pairKey);
    connections.push(connection);
  };

  if (scene.orderedPoints.length === 2) {
    addConnection(scene.orderedPoints[0], scene.orderedPoints[1], "boundary");
    return connections;
  }

  const pointForNote = (noteId: string) =>
    scene.points.find((point) => point.note.noteId === noteId);

  scene.boundaryEdges.forEach((edge) =>
    addConnection(
      pointForNote(edge.fromNoteId),
      pointForNote(edge.toNoteId),
      "boundary"
    )
  );
  scene.interiorEdges.forEach((edge) =>
    addConnection(
      pointForNote(edge.fromNoteId),
      pointForNote(edge.toNoteId),
      "interior"
    )
  );

  return connections;
}

/** Keep perimeter/interior emphasis from flickering while the same bodies drift. */
export function createBlobWebConnectionPlanner() {
  let members = new Set<string>();
  const roles = new Map<string, BlobFieldConnection["role"]>();

  const getConnections = (
    frames: readonly PreparedBlobFrame[],
    scene: HarmonicGeometryScene | null
  ) => {
    const connections = getBlobWebConnections(frames, scene);
    const nextMembers = new Set(
      connections.flatMap((connection) => [
        connection.from.key,
        connection.to.key,
      ])
    );
    const addedMember = [...nextMembers].some((key) => !members.has(key));

    if (connections.length === 0 || members.size === 0 || addedMember) {
      roles.clear();
      connections.forEach((connection) =>
        roles.set(getConnectionPairKey(connection), connection.role)
      );
    } else {
      const activePairs = new Set(connections.map(getConnectionPairKey));
      [...roles.keys()].forEach((pairKey) => {
        if (!activePairs.has(pairKey)) roles.delete(pairKey);
      });
      connections.forEach((connection) => {
        const pairKey = getConnectionPairKey(connection);
        if (!roles.has(pairKey)) roles.set(pairKey, connection.role);
      });
    }
    members = nextMembers;

    return connections.map((connection) => ({
      ...connection,
      role: roles.get(getConnectionPairKey(connection)) ?? connection.role,
    }));
  };

  const clear = () => {
    members = new Set<string>();
    roles.clear();
  };

  return { getConnections, clear };
}

/** Web is drawn at target resolution, independent of the soft body field. */
export function getBlobWebConnectionWidth(connection: BlobFieldConnection) {
  const radius = Math.min(connection.from.scaledRadius, connection.to.scaledRadius);
  const distanceFalloff = 1 / (1 + connection.gap / Math.max(160, radius * 6));
  const width = Math.max(1.2, Math.min(3, radius * 0.075 * distanceFalloff));
  return width * (connection.role === "boundary" ? 1 : 0.72);
}

/** Keep a filled envelope, but let the free spans pull inward between soft
 * lobes. Prepared contours own its live vibration; the field rounds the result.
 */
function getMergeEnvelope(frames: readonly PreparedBlobFrame[], blur: number) {
  const points = frames.flatMap((frame) => frame.contour.map((point) => {
    // Keep small/growing dyads and collinear chords wide enough to survive the
    // field threshold, just as area chords do. Ordinary body radii are unchanged.
    const expansion = Math.max(0, blur * 0.9 - frame.scaledRadius);
    const dx = point.x - frame.blob.x;
    const dy = point.y - frame.blob.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: point.x + dx / length * expansion, y: point.y + dy / length * expansion, frame };
  })).sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: FieldPoint, b: FieldPoint, c: FieldPoint) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (ordered: typeof points) => {
    const hull: typeof points = [];
    for (const point of ordered) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) hull.pop();
      hull.push(point);
    }
    hull.pop();
    return hull;
  };
  const hull = [...half(points), ...half([...points].reverse())];
  const center = {
    x: frames.reduce((sum, frame) => sum + frame.blob.x, 0) / frames.length,
    y: frames.reduce((sum, frame) => sum + frame.blob.y, 0) / frames.length,
  };
  return hull.flatMap((from, index): FieldPoint[] => {
    const to = hull[(index + 1) % hull.length];
    if (from.frame === to.frame) return [from];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return [from];
    const normal = { x: -dy / length, y: dx / length };
    const clearance = (center.x - (from.x + to.x) / 2) * normal.x +
      (center.y - (from.y + to.y) / 2) * normal.y;
    // Preserve a threshold-safe core even for a dyad or collinear chord. The
    // inward limit also prevents opposing spans from crossing through a face.
    const limit = Math.max(0, Math.min(clearance * 0.38, clearance - blur * 0.9));
    const pull = Math.min(length * 0.2, limit);
    const fromMotion = contourDisplacement(from.frame, normal);
    const toMotion = contourDisplacement(to.frame, normal);
    const protectedBodies = frames.filter((frame) => frame !== from.frame && frame !== to.frame).map((frame) => ({
      along: ((frame.blob.x - from.x) * dx + (frame.blob.y - from.y) * dy) / length,
      inward: (frame.blob.x - from.x) * normal.x + (frame.blob.y - from.y) * normal.y,
      radius: Math.max(blur * 0.9, ...frame.contour.map((point) =>
        Math.hypot(point.x - frame.blob.x, point.y - frame.blob.y))),
    }));
    const segments = Math.max(8, Math.min(128, Math.ceil(length / 4)));
    return Array.from({ length: segments }, (_, segment) => {
      const t = segment / segments;
      const envelope = 16 * t * t * (1 - t) * (1 - t);
      const motion = 2 * (fromMotion * Math.sin(t * Math.PI * 3) + toMotion * Math.sin(t * Math.PI * 4));
      let inset = Math.max(0, Math.min(limit, pull + motion)) * envelope;
      // A note near a free edge must shape that edge too, even when none of its
      // contour vertices lies on the convex hull. Never pull past its footprint.
      for (const body of protectedBodies) {
        const along = t * length - body.along;
        if (Math.abs(along) < body.radius) {
          const outside = body.inward - Math.sqrt(body.radius * body.radius - along * along);
          inset = Math.min(inset, Math.max(0, outside));
        }
      }
      return { x: from.x + dx * t + normal.x * inset, y: from.y + dy * t + normal.y * inset };
    });
  });
}

function traceEnvelope(context: CanvasRenderingContext2D, points: readonly FieldPoint[]) {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
}

export function getBlobFieldResolution(bounds: FieldBounds) {
  const area = bounds.width * bounds.height;
  const scale = Math.min(
    MAX_FIELD_SCALE,
    Math.sqrt(BLOB_FIELD_PIXEL_BUDGET / area)
  );

  return {
    scale,
    width: Math.max(1, Math.floor(bounds.width * scale)),
    height: Math.max(1, Math.floor(bounds.height * scale)),
  };
}

/**
 * The field determines topology, while Blob remains the sole owner of the
 * rendered material. Drawing the color field itself as the glow preserves each
 * note's color instead of collapsing a multi-note body into one shadow color.
 */
export function getBlobFieldMaterialPasses(
  blobConfig: Pick<BlobConfig, "blurRadius" | "glowEnabled" | "glowIntensity">
): BlobFieldMaterialPass[] {
  const bodyBlur = Math.max(0, blobConfig.blurRadius);
  const bodyPass = {
    filter: bodyBlur > 0 ? `blur(${bodyBlur}px)` : "none",
    opacity: 1,
  };

  if (!blobConfig.glowEnabled || blobConfig.glowIntensity <= 0) {
    return [bodyPass];
  }

  return [
    {
      filter: `blur(${bodyBlur + blobConfig.glowIntensity}px)`,
      opacity: 0.62,
    },
    bodyPass,
  ];
}

export function useBlobFieldRenderer() {
  let surfaces: FieldSurfaces | null = null;
  let buffers: FieldBuffers | null = null;
  const webConnectionPlanner = createBlobWebConnectionPlanner();

  const getSurfaces = (width: number, height: number) => {
    if (!surfaces) {
      surfaces = {
        source: createSurface(),
        visibility: createSurface(),
        output: createSurface(),
      };
    }

    Object.values(surfaces).forEach((canvas) =>
      resizeSurface(canvas, width, height)
    );
    return surfaces;
  };

  const getBuffers = (
    pixelCount: number,
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    if (
      !buffers ||
      buffers.size !== pixelCount ||
      buffers.width !== width ||
      buffers.height !== height
    ) {
      buffers = {
        size: pixelCount,
        width,
        height,
        alpha: new Float32Array(pixelCount),
        red: new Float32Array(pixelCount),
        green: new Float32Array(pixelCount),
        blue: new Float32Array(pixelCount),
        weight: new Float32Array(pixelCount),
        opacity: new Float32Array(pixelCount),
        horizontal: new Float32Array(pixelCount),
        vertical: new Float32Array(pixelCount),
        output: context.createImageData(width, height),
      };
    }

    return buffers;
  };

  const renderBodies = (
    target: CanvasRenderingContext2D,
    frames: readonly PreparedBlobFrame[],
    config: BlobConfig
  ) => {
    // Use the same Blob blur/glow material as Merge, above the unblurred strands.
    // A faint releasing body paints before a held body at coincident positions.
    const orderedFrames = orderBlobFramesForVisibility(frames);
    getBlobFieldMaterialPasses(config).forEach((pass) => {
      target.save();
      target.filter = pass.filter;
      orderedFrames.forEach((frame) => {
        target.globalAlpha = pass.opacity * Math.max(0, Math.min(1, frame.opacity));
        target.fillStyle = withMusicColorAlpha(frame.primaryColor, 1);
        traceFrame(target, frame);
        target.fill();
      });
      target.restore();
    });
  };

  const compositeMaterial = (
    target: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    bounds: FieldBounds,
    config: BlobConfig
  ) => {
    getBlobFieldMaterialPasses(config).forEach((pass) => {
      target.save();
      target.imageSmoothingEnabled = true;
      target.imageSmoothingQuality = "high";
      target.globalAlpha = pass.opacity;
      target.filter = pass.filter;
      target.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height);
      target.restore();
    });
  };

  const renderWeb = (
    target: CanvasRenderingContext2D,
    frames: readonly PreparedBlobFrame[],
    config: BlobConfig,
    scene: HarmonicGeometryScene | null
  ) => {
    const connections = webConnectionPlanner.getConnections(frames, scene).map((connection) => {
      const width = getBlobWebConnectionWidth(connection);
      const bend = connection.role === "boundary" ? 0.46 : 0.3;
      return {
        connection,
        root: getBlobFieldConnectionGeometry(connection, 0, 1,
          connection.role === "boundary" ? 0.95 : 0.8, bend),
        strand: getBlobFieldConnectionGeometry(connection, width, 1, 0, bend),
      };
    });
    const paint = (context: CanvasRenderingContext2D, roots: boolean) => {
      connections.forEach(({ connection, root, strand }) => {
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1,
          connection.from.opacity, connection.to.opacity
        )) * config.webOpacity * (connection.role === "boundary" ? 0.92 : 0.46);
        const gradient = context.createLinearGradient(
          connection.from.blob.x, connection.from.blob.y,
          connection.to.blob.x, connection.to.blob.y
        );
        // Fade the buried cross-section inside the body, then let the shoulder
        // emerge with the same soft material instead of an exposed flat fin.
        const fromRoot = Math.min(0.25, connection.from.scaledRadius * 1.2 / Math.max(1, connection.distance));
        const toRoot = Math.min(0.25, connection.to.scaledRadius * 1.2 / Math.max(1, connection.distance));
        gradient.addColorStop(0, withMusicColorAlpha(connection.from.primaryColor, 0));
        gradient.addColorStop(fromRoot, withMusicColorAlpha(connection.from.primaryColor, 1));
        gradient.addColorStop(1 - toRoot, withMusicColorAlpha(connection.to.primaryColor, 1));
        gradient.addColorStop(1, withMusicColorAlpha(connection.to.primaryColor, 0));
        context.fillStyle = gradient;
        traceConnection(context, roots ? root : strand);
        context.fill();
        context.restore();
      });
    };

    // Soften all shoulders together on one budgeted surface. No threshold is
    // applied; the fine cores and note bodies remain at target resolution.
    const bounds = connections.length ? getBlobFieldBounds(
      frames, target.canvas.width, target.canvas.height,
      config.blurRadius * 3 + (config.glowEnabled ? config.glowIntensity * 3 : 0)
    ) : null;
    if (bounds) {
      const { scale, width, height } = getBlobFieldResolution(bounds);
      const roots = getSurfaces(width, height).source;
      const context = roots.getContext("2d");
      if (context) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, width, height);
        context.setTransform(scale, 0, 0, scale, -bounds.x * scale, -bounds.y * scale);
        paint(context, true);
        compositeMaterial(target, roots, bounds, config);
      }
    }
    target.save();
    target.filter = "blur(0.65px)";
    paint(target, false);
    target.restore();
    renderBodies(target, frames, config);
  };

  const renderBlobField = (
    target: CanvasRenderingContext2D,
    frames: readonly PreparedBlobFrame[],
    config: BlobConfig,
    scene: HarmonicGeometryScene | null
  ) => {
    const mode = config.connectionMode;
    if (frames.length === 0) {
      return false;
    }

    // A single note has no relationship field to form. Preserve its prepared
    // body directly: field thresholds otherwise erase small held notes and
    // truncate release tails when the last other chord member disappears.
    if (frames.length === 1) {
      renderBodies(target, frames, config);
      return true;
    }

    // The public Connection Strength control owns both backing fields. Its
    // zero endpoint means separate bodies in either Merge or Web—not the
    // historical minimum-visible Web opacity or a residual merge threshold.
    if (config.fusionStrength <= 0 && config.webOpacity <= 0.15) {
      renderBodies(target, frames, config);
      return true;
    }

    if (mode === "web") {
      renderWeb(target, frames, config, scene);
      return true;
    }

    const blur = Math.max(
      6, config.fieldSoftness * (0.82 + config.fusionStrength * 0.72)
    );
    const bounds = getBlobFieldBounds(
      frames,
      target.canvas.width,
      target.canvas.height,
      blur * 3 +
        config.blurRadius +
        (config.glowEnabled ? config.glowIntensity : 0)
    );
    if (!bounds) {
      return false;
    }

    const { scale, width, height } = getBlobFieldResolution(bounds);
    const visibleFrames = frames.filter((frame) => frame.opacity > 0);
    const envelope = visibleFrames.length > 1
      ? getMergeEnvelope(visibleFrames, blur)
      : [];
    // Paint opacity tiers from faintest to strongest. A releasing outer member
    // may fade its extension, but can never dim the envelope of held members.
    const envelopeLayers = envelope.length ? [...new Set(visibleFrames.map(
      (frame) => Math.max(0, Math.min(1, frame.opacity))
    ))].sort((a, b) => a - b).flatMap((opacity) => {
      const members = visibleFrames.filter((frame) => frame.opacity >= opacity);
      return members.length > 1 ? [{ opacity, points: getMergeEnvelope(members, blur) }] : [];
    }) : [];
    const field = getSurfaces(width, height);
    const sourceContext = field.source.getContext("2d", {
      willReadFrequently: true,
    });
    const visibilityContext = field.visibility.getContext("2d", {
      willReadFrequently: true,
    });
    const outputContext = field.output.getContext("2d");
    if (!sourceContext || !visibilityContext || !outputContext) {
      return false;
    }

    visibilityContext.setTransform(1, 0, 0, 1, 0, 0);
    visibilityContext.clearRect(0, 0, width, height);
    visibilityContext.setTransform(
      scale,
      0,
      0,
      scale,
      -bounds.x * scale,
      -bounds.y * scale
    );

    // A sustained body must win over a releasing body at an overlap. Painting
    // low opacity first and high opacity last gives the union its maximum local
    // visibility instead of allowing a fading body to punch a hole in it.
    visibilityContext.globalCompositeOperation = "source-over";
    const visibilityLayers = [
      ...frames.map((frame) => ({
        opacity: Math.max(0, Math.min(1, frame.opacity)),
        paint: () => {
          traceFrame(visibilityContext, frame);
          visibilityContext.fill();
        },
      })),
      ...envelopeLayers.map(({ opacity, points }) => ({
        opacity,
        paint: () => {
          traceEnvelope(visibilityContext, points);
          visibilityContext.fill();
        },
      })),
    ].sort((left, right) => left.opacity - right.opacity);

    visibilityLayers.forEach((layer) => {
      const level = Math.round(layer.opacity * 255);
      visibilityContext.fillStyle = `rgb(${level}, ${level}, ${level})`;
      layer.paint();
    });

    const visibilityImage = visibilityContext.getImageData(
      0,
      0,
      width,
      height
    );
    const pixelCount = width * height;
    const frameBuffers = getBuffers(pixelCount, outputContext, width, height);
    const {
      alpha,
      red,
      green,
      blue,
      weight,
      opacity,
      horizontal,
      vertical,
    } = frameBuffers;

    red.fill(0);
    green.fill(0);
    blue.fill(0);
    weight.fill(0);

    // Color is an opaque RGB value plus a numeric spatial weight. Canvas alpha
    // is used only to sample contour coverage, never as a color-blending weight.
    // Visibility is resolved independently below from prepared note opacity.
    for (const frame of visibleFrames) {
      sourceContext.setTransform(1, 0, 0, 1, 0, 0);
      sourceContext.globalAlpha = 1;
      sourceContext.globalCompositeOperation = "source-over";
      sourceContext.fillStyle = withMusicColorAlpha(frame.primaryColor, 1);
      sourceContext.fillRect(0, 0, 1, 1);
      const color = sourceContext.getImageData(0, 0, 1, 1).data;
      sourceContext.clearRect(0, 0, width, height);
      sourceContext.setTransform(
        scale,
        0,
        0,
        scale,
        -bounds.x * scale,
        -bounds.y * scale
      );
      sourceContext.fillStyle = "white";
      traceFrame(sourceContext, frame);
      sourceContext.fill();
      const contourMask = sourceContext.getImageData(0, 0, width, height).data;
      const reach = envelope.length ? Math.max(...envelope.map((point) =>
        Math.hypot(point.x - frame.blob.x, point.y - frame.blob.y)
      )) * 1.05 : 0;
      const contribution = Math.max(0, Math.min(1, frame.opacity));
      const inverseReach = reach > 0 ? 1 / reach : 0;
      const pixelStep = 1 / scale;
      const startDx = bounds.x + pixelStep * 0.5 - frame.blob.x;
      const startDy = bounds.y + pixelStep * 0.5 - frame.blob.y;
      const r = color[0] / 255;
      const g = color[1] / 255;
      const b = color[2] / 255;
      let pixel = 0;
      for (let y = 0; y < height; y++) {
        const dy = startDy + y * pixelStep;
        const dySquared = dy * dy;
        let dx = startDx;
        for (let x = 0; x < width; x++, pixel++, dx += pixelStep) {
          const radialWeight = reach > 0
            ? Math.max(0, 1 - Math.sqrt(dx * dx + dySquared) * inverseReach)
            : 0;
          const colorWeight = contribution * (contourMask[pixel * 4 + 3] / 255 + radialWeight);
          weight[pixel] += colorWeight;
          red[pixel] += r * colorWeight;
          green[pixel] += g * colorWeight;
          blue[pixel] += b * colorWeight;
        }
      }
    }

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * 4;
      const visibilityCoverage = visibilityImage.data[offset + 3] / 255;
      alpha[pixel] = visibilityCoverage;
      opacity[pixel] =
        (visibilityImage.data[offset] / 255) *
        visibilityCoverage;
    }

    const blurRadius = Math.max(1, Math.round(blur * scale));
    [alpha, red, green, blue, weight, opacity].forEach((channel) =>
      blurFieldChannel(
        channel,
        width,
        height,
        blurRadius,
        horizontal,
        vertical
      )
    );

    const threshold = 0.54 - config.fusionStrength * 0.24;
    const output = frameBuffers.output;
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * 4;
      const fieldAlpha = alpha[pixel];
      const coverage = smoothstep(
        threshold - 0.075,
        threshold + 0.045,
        fieldAlpha
      );
      const localOpacity = Math.max(
        0,
        Math.min(1, opacity[pixel] / Math.max(0.0001, fieldAlpha))
      );
      const colorWeight = weight[pixel] || 1;
      const normalizedRed = red[pixel] / colorWeight;
      const normalizedGreen = green[pixel] / colorWeight;
      const normalizedBlue = blue[pixel] / colorWeight;

      const finalAlpha = coverage * localOpacity;

      output.data[offset] = Math.round(
        Math.max(0, Math.min(1, normalizedRed)) * 255
      );
      output.data[offset + 1] = Math.round(
        Math.max(0, Math.min(1, normalizedGreen)) * 255
      );
      output.data[offset + 2] = Math.round(
        Math.max(0, Math.min(1, normalizedBlue)) * 255
      );
      output.data[offset + 3] = Math.round(
        Math.max(0, Math.min(1, finalAlpha)) * 255
      );
    }

    outputContext.putImageData(output, 0, 0);
    compositeMaterial(target, field.output, bounds, config);

    return true;
  };

  const dispose = () => {
    surfaces = null;
    buffers = null;
    webConnectionPlanner.clear();
  };

  return {
    renderBlobField,
    dispose,
  };
}
