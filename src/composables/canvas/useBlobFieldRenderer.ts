import type { PreparedBlobFrame } from "@/types/canvas";
import type {
  HarmonicGeometryConfig,
  HarmonicGeometryMode,
} from "@/types/visual";

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

function getContourPointTowards(frame: PreparedBlobFrame, target: FieldPoint) {
  const directionX = target.x - frame.blob.x;
  const directionY = target.y - frame.blob.y;

  return frame.contour.reduce((best, point) => {
    const score =
      (point.x - frame.blob.x) * directionX +
      (point.y - frame.blob.y) * directionY;
    const bestScore =
      (best.x - frame.blob.x) * directionX +
      (best.y - frame.blob.y) * directionY;
    return score > bestScore ? point : best;
  }, frame.contour[0]);
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

/**
 * Build one smooth material ribbon. Its broad endpoints sit inside the two
 * prepared bodies, so the field owns a rounded shoulder instead of exposing a
 * hard cross-section at either contour. A quartic bump curves the centerline
 * while retaining contour-normal endpoint tangents, and a quintic taper makes
 * the width derivative settle to zero at both bodies and at the waist.
 */
export function getBlobFieldConnectionGeometry(
  connection: BlobFieldConnection,
  waistWidth: number,
  fieldScale: number
): BlobFieldConnectionGeometry {
  const startAttachment = getContourPointTowards(
    connection.from,
    connection.to.blob
  );
  const endAttachment = getContourPointTowards(
    connection.to,
    connection.from.blob
  );
  const centerDeltaX = connection.to.blob.x - connection.from.blob.x;
  const centerDeltaY = connection.to.blob.y - connection.from.blob.y;
  const centerDistance = Math.hypot(centerDeltaX, centerDeltaY) || 1;
  const direction = {
    x: centerDeltaX / centerDistance,
    y: centerDeltaY / centerDistance,
  };
  const normal = { x: -direction.y, y: direction.x };
  const shoulderWidths = {
    from: Math.max(waistWidth, connection.from.scaledRadius * 1.05),
    to: Math.max(waistWidth, connection.to.scaledRadius * 1.05),
  };
  const start = {
    x: startAttachment.x - direction.x * connection.from.scaledRadius * 0.22,
    y: startAttachment.y - direction.y * connection.from.scaledRadius * 0.22,
  };
  const end = {
    x: endAttachment.x + direction.x * connection.to.scaledRadius * 0.22,
    y: endAttachment.y + direction.y * connection.to.scaledRadius * 0.22,
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
    getConnectionBendDirection(connection);
  const estimatedLength = Math.hypot(deltaX, deltaY) + Math.abs(bend) * 1.5;
  const segments = Math.max(
    24,
    Math.min(192, Math.ceil((estimatedLength * Math.max(0.01, fieldScale)) / 2))
  );
  const pointAt = (progress: number) => {
    const inverse = 1 - progress;
    const curve = 16 * progress * progress * inverse * inverse;
    return {
      x: start.x + deltaX * progress + normal.x * bend * curve,
      y: start.y + deltaY * progress + normal.y * bend * curve,
    };
  };
  const tangentAt = (progress: number) => {
    const curveSlope = 32 * progress * (1 - progress) * (1 - progress * 2);
    return {
      x: deltaX + normal.x * bend * curveSlope,
      y: deltaY + normal.y * bend * curveSlope,
    };
  };
  const widthAt = (progress: number) =>
    progress <= 0.5
      ? shoulderWidths.from +
        (waistWidth - shoulderWidths.from) * smootherstep(progress * 2)
      : waistWidth +
        (shoulderWidths.to - waistWidth) * smootherstep((progress - 0.5) * 2);
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
  frame: PreparedBlobFrame
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
  };
}

function findNearestFrame(
  frame: PreparedBlobFrame,
  candidates: readonly PreparedBlobFrame[]
) {
  return candidates.reduce((nearest, candidate) => {
    const nearestDistance = Math.hypot(
      frame.blob.x - nearest.blob.x,
      frame.blob.y - nearest.blob.y
    );
    const candidateDistance = Math.hypot(
      frame.blob.x - candidate.blob.x,
      frame.blob.y - candidate.blob.y
    );
    return candidateDistance < nearestDistance ? candidate : nearest;
  }, candidates[0]);
}

function connectInInsertionOrder(
  frames: readonly PreparedBlobFrame[],
  parentKeys: Map<string, string>
) {
  return frames.slice(1).map((frame, index) => {
    const previousFrames = frames.slice(0, index + 1);
    const cachedParent = previousFrames.find(
      (candidate) => candidate.key === parentKeys.get(frame.key)
    );
    const parent = cachedParent ?? findNearestFrame(frame, previousFrames);
    parentKeys.set(frame.key, parent.key);
    return createConnection(parent, frame);
  });
}

/**
 * Keep held bodies connected independently from bodies that are releasing.
 * Parent keys are cached by the caller for the lifetime of one membership set,
 * so normal drift can update geometry without snapping the sparse topology.
 */
export function getBlobFieldConnections(
  frames: readonly PreparedBlobFrame[],
  parentKeys = new Map<string, string>()
): BlobFieldConnection[] {
  const heldFrames = frames.filter((frame) => !frame.blob.isFadingOut);
  const releasingFrames = frames.filter((frame) => frame.blob.isFadingOut);

  if (heldFrames.length === 0) {
    return connectInInsertionOrder(frames, parentKeys);
  }

  const heldConnections = connectInInsertionOrder(heldFrames, parentKeys);
  const releaseConnections = releasingFrames.map((frame) => {
    const cachedParent = heldFrames.find(
      (candidate) => candidate.key === parentKeys.get(frame.key)
    );
    const parent = cachedParent ?? findNearestFrame(frame, heldFrames);
    parentKeys.set(frame.key, parent.key);
    return createConnection(parent, frame);
  });

  return [...heldConnections, ...releaseConnections];
}

export function createBlobFieldConnectionPlanner() {
  let membershipSignature = "";
  const parentKeys = new Map<string, string>();

  const getConnections = (frames: readonly PreparedBlobFrame[]) => {
    const nextSignature = frames
      .map((frame) => `${frame.key}:${frame.blob.isFadingOut ? "release" : "held"}`)
      .join("|");

    if (nextSignature !== membershipSignature) {
      membershipSignature = nextSignature;
      parentKeys.clear();
    }

    return getBlobFieldConnections(frames, parentKeys);
  };

  const clear = () => {
    membershipSignature = "";
    parentKeys.clear();
  };

  return { getConnections, clear };
}

export function getBlobFieldConnectionWidth(
  connection: BlobFieldConnection,
  blur: number,
  fieldScale: number,
  fusionStrength: number
) {
  const smallerRadius = Math.min(
    connection.from.scaledRadius,
    connection.to.scaledRadius
  );
  const falloffDistance = Math.max(120, smallerRadius * 4);
  const distanceFalloff = 1 / (1 + connection.gap / falloffDistance);
  const organicWidth =
    smallerRadius * (0.72 + fusionStrength * 0.28) * distanceFalloff;

  // Two box-blur passes need a few occupied field pixels to survive the alpha
  // threshold. This floor guarantees a continuous but slender distant neck.
  const continuityFloor = Math.max(blur * 1.35, 3 / fieldScale);
  return Math.max(continuityFloor, organicWidth);
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

export function useBlobFieldRenderer() {
  let surfaces: FieldSurfaces | null = null;
  let buffers: FieldBuffers | null = null;
  const connectionPlanner = createBlobFieldConnectionPlanner();

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

  const renderBlobField = (
    target: CanvasRenderingContext2D,
    frames: readonly PreparedBlobFrame[],
    mode: Extract<HarmonicGeometryMode, "outline" | "merge">,
    config: HarmonicGeometryConfig
  ) => {
    if (frames.length === 0 || config.glassmorphOpacity <= 0) {
      return false;
    }

    const blur = Math.max(
      6,
      config.backdropBlur * (0.82 + config.glassmorphOpacity * 0.72)
    );
    const bounds = getBlobFieldBounds(
      frames,
      target.canvas.width,
      target.canvas.height,
      blur * 3
    );
    if (!bounds) {
      return false;
    }

    const { scale, width, height } = getBlobFieldResolution(bounds);
    const connections =
      mode === "merge" ? connectionPlanner.getConnections(frames) : [];
    const connectionLayers = connections.map((connection) => {
      const connectionWidth = getBlobFieldConnectionWidth(
        connection,
        blur,
        scale,
        config.glassmorphOpacity
      );

      return {
        connection,
        geometry: getBlobFieldConnectionGeometry(
          connection,
          connectionWidth,
          scale
        ),
      };
    });
    const contributionDivisor = frames.length + connectionLayers.length;
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

    sourceContext.setTransform(1, 0, 0, 1, 0, 0);
    visibilityContext.setTransform(1, 0, 0, 1, 0, 0);
    sourceContext.clearRect(0, 0, width, height);
    visibilityContext.clearRect(0, 0, width, height);
    sourceContext.setTransform(
      scale,
      0,
      0,
      scale,
      -bounds.x * scale,
      -bounds.y * scale
    );
    visibilityContext.setTransform(
      scale,
      0,
      0,
      scale,
      -bounds.x * scale,
      -bounds.y * scale
    );

    // Scale every body contribution so additive compositing cannot saturate,
    // weight it by its current opacity, then reconstruct that color weight
    // from the pixel alpha below. This makes mixing order-independent while a
    // releasing body's color leaves the shared material continuously.
    sourceContext.globalCompositeOperation = "lighter";

    frames.forEach((frame) => {
      sourceContext.globalAlpha =
        Math.max(0, Math.min(1, frame.opacity)) / contributionDivisor;
      traceFrame(sourceContext, frame);
      sourceContext.fillStyle = frame.primaryColor;
      sourceContext.fill();
    });

    connectionLayers.forEach(({ connection, geometry }) => {
      const opacity = Math.min(
        Math.max(0, Math.min(1, connection.from.opacity)),
        Math.max(0, Math.min(1, connection.to.opacity))
      );
      const start = geometry.centerline[0];
      const end = geometry.centerline[geometry.centerline.length - 1] ?? start;
      const gradient = sourceContext.createLinearGradient(
        start.x,
        start.y,
        end.x,
        end.y
      );
      gradient.addColorStop(0, connection.from.primaryColor);
      gradient.addColorStop(1, connection.to.primaryColor);

      sourceContext.globalAlpha = opacity / contributionDivisor;
      sourceContext.fillStyle = gradient;
      traceConnection(sourceContext, geometry);
      sourceContext.fill();
    });

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
      ...connectionLayers.map(({ connection, geometry }) => ({
        opacity: Math.min(
          Math.max(0, Math.min(1, connection.from.opacity)),
          Math.max(0, Math.min(1, connection.to.opacity))
        ),
        paint: () => {
          traceConnection(visibilityContext, geometry);
          visibilityContext.fill();
        },
      })),
    ].sort((left, right) => left.opacity - right.opacity);

    visibilityLayers.forEach((layer) => {
      const level = Math.round(layer.opacity * 255);
      visibilityContext.fillStyle = `rgb(${level}, ${level}, ${level})`;
      layer.paint();
    });

    sourceContext.globalAlpha = 1;
    sourceContext.globalCompositeOperation = "source-over";

    const sourceImage = sourceContext.getImageData(0, 0, width, height);
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

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * 4;
      const accumulatedColorWeight =
        (sourceImage.data[offset + 3] / 255) * contributionDivisor;
      const visibilityCoverage = visibilityImage.data[offset + 3] / 255;
      weight[pixel] = accumulatedColorWeight;
      alpha[pixel] = visibilityCoverage;
      red[pixel] =
        (sourceImage.data[offset] / 255) * accumulatedColorWeight;
      green[pixel] =
        (sourceImage.data[offset + 1] / 255) * accumulatedColorWeight;
      blue[pixel] =
        (sourceImage.data[offset + 2] / 255) * accumulatedColorWeight;
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

    const threshold = 0.54 - config.glassmorphOpacity * 0.24;
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
      const colorWeight = Math.max(0.0001, weight[pixel]);
      const normalizedRed = red[pixel] / colorWeight;
      const normalizedGreen = green[pixel] / colorWeight;
      const normalizedBlue = blue[pixel] / colorWeight;

      let finalAlpha = coverage * localOpacity;
      if (mode === "outline") {
        const innerCoverage = smoothstep(
          threshold + 0.13,
          threshold + 0.23,
          fieldAlpha
        );
        const perimeter = Math.max(0, coverage - innerCoverage);
        finalAlpha = Math.max(
          coverage * localOpacity * 0.34,
          perimeter * localOpacity * config.glassmorphOpacity
        );
      }

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
    target.save();
    target.imageSmoothingEnabled = true;
    target.imageSmoothingQuality = "high";
    target.drawImage(
      field.output,
      0,
      0,
      width,
      height,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );
    target.restore();

    return true;
  };

  const dispose = () => {
    surfaces = null;
    buffers = null;
    connectionPlanner.clear();
  };

  return {
    renderBlobField,
    dispose,
  };
}
