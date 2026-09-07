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
        Math.max(0, Math.min(1, frame.opacity)) / frames.length;
      traceFrame(sourceContext, frame);
      sourceContext.fillStyle = frame.primaryColor;
      sourceContext.fill();
    });

    // A sustained body must win over a releasing body at an overlap. Painting
    // low opacity first and high opacity last gives the union its maximum local
    // visibility instead of allowing a fading body to punch a hole in it.
    visibilityContext.globalCompositeOperation = "source-over";
    orderBlobFramesForVisibility(frames).forEach((frame) => {
      const opacity = Math.max(0, Math.min(1, frame.opacity));
      const level = Math.round(opacity * 255);
      traceFrame(visibilityContext, frame);
      visibilityContext.fillStyle = `rgb(${level}, ${level}, ${level})`;
      visibilityContext.fill();
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
        (sourceImage.data[offset + 3] / 255) * frames.length;
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
  };

  return {
    renderBlobField,
    dispose,
  };
}
