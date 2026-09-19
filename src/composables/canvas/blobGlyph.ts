/** Private Stage lettering material: cache the Jazz silhouette, then deform its edges. */
type Point = { x: number; y: number };
export interface BlobGlyphOptions {
  size: number;
  font: string;
  ivory: string;
  ink: string;
  color?: string;
  shape: { stretch: number; bend: number };
  seed: number;
  role: "chord" | "emotion" | "interval";
}
type ScratchFactory = (width: number, height: number) => CanvasRenderingContext2D | null;
const clamp = (value: number) => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));

/** Extract every boundary, including counters. Even-odd filling preserves the holes. */
export function traceGlyphMask(data: Uint8ClampedArray, width: number, height: number): Point[][] {
  type Edge = { x: number; y: number; ex: number; ey: number; direction: number; used: boolean };
  const edges: Edge[] = [];
  const starts = new Map<number, Edge[]>();
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3] >= 128;
  const add = (x: number, y: number, ex: number, ey: number, direction: number) => {
    const edge = { x, y, ex, ey, direction, used: false };
    edges.push(edge);
    const key = y * (width + 1) + x;
    const bucket = starts.get(key);
    if (bucket) bucket.push(edge); else starts.set(key, [edge]);
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!filled(x, y)) continue;
    if (!filled(x, y - 1)) add(x, y, x + 1, y, 0);
    if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
    if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
    if (!filled(x - 1, y)) add(x, y + 1, x, y, 3);
  }
  const loops: Point[][] = [];
  for (const first of edges) {
    if (first.used) continue;
    const points: Point[] = [];
    let edge: Edge | undefined = first;
    while (edge && !edge.used) {
      edge.used = true;
      points.push({ x: (edge.x - width / 2) / 2, y: (edge.y - height / 2) / 2 });
      const previous: Edge = edge;
      const choices: Edge[] = starts.get(edge.ey * (width + 1) + edge.ex) ?? [];
      // Turn right at diagonal contacts rather than sewing two components together.
      edge = [1, 0, 3, 2].flatMap(turn => choices.filter(candidate =>
        !candidate.used && (candidate.direction - previous.direction + 4) % 4 === turn))[0];
    }
    if (points.length >= 4) {
      // Average the raster stair steps before reducing controls. Tiny counters keep
      // all their points: smoothing must not collapse the dot or a narrow aperture.
      const reach = points.length > 32 ? 4 : points.length > 16 ? 2 : points.length > 8 ? 1 : 0;
      const smooth = points.map((_, index) => {
        let x = 0, y = 0;
        for (let offset = -reach; offset <= reach; offset++) {
          const point = points[(index + offset + points.length) % points.length];
          x += point.x; y += point.y;
        }
        return { x: x / (reach * 2 + 1), y: y / (reach * 2 + 1) };
      });
      loops.push(smooth.filter((_, index) => index % (points.length > 32 ? 4 : points.length > 16 ? 2 : 1) === 0));
    }
  }
  return loops;
}

/** Smooth spatial displacement, not an affine transform or a second animation clock. */
export function deformGlyphPoint(point: Point, options: BlobGlyphOptions): Point {
  const size = Math.max(1, options.size);
  const phase = (Number.isFinite(options.seed) ? options.seed % 997 : 0) * 0.031;
  const x = point.x / size, y = point.y / size;
  // Body moments are deliberately low-pass. Amplify that real signal here so
  // contour movement survives at Stage sizes, without raising displacement caps.
  const stretch = clamp(options.shape.stretch * 4), bend = clamp(options.shape.bend * 4);
  const limit = options.role === "chord" ? 2 : 0.7;
  const dx = limit * Math.tanh(
    Math.sin(y * 8 + phase) * (0.55 + stretch * 0.75)
    + Math.sin(x * 5 - y * 3 + phase) * bend * 0.55,
  );
  const dy = limit * Math.tanh(
    Math.cos(x * 7 + phase) * (0.4 + bend * 0.8)
    + Math.sin(y * 5 + x * 3) * stretch * 0.55,
  );
  return { x: point.x + dx, y: point.y + dy };
}

export function createBlobGlyphPainter(factory?: ScratchFactory) {
  const outlines = new Map<string, Point[][]>();

  function scratch(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (factory) return factory(width, height);
    const owner = ctx.canvas?.ownerDocument;
    if (owner) {
      const canvas = owner.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas.getContext("2d", { willReadFrequently: true });
    }
    if (typeof OffscreenCanvas !== "undefined") {
      return new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true }) as unknown as CanvasRenderingContext2D | null;
    }
    return null;
  }

  return {
    clear() { outlines.clear(); },
    paint(ctx: CanvasRenderingContext2D, text: string, options: BlobGlyphOptions): boolean {
      if (!text.trim()) return true;
      if (!Number.isFinite(options.size) || options.size <= 0 || options.size > 256 || text.length > 64) return false;
      const key = `${options.font}|${options.size}|${options.role}|${text}`;
      let loops = outlines.get(key);
      if (!loops) {
        const width = Math.ceil(options.size * (text.length * 1.5 + 2) * 2);
        const height = Math.ceil(options.size * 4);
        const mask = scratch(ctx, width, height);
        if (!mask || typeof mask.getImageData !== "function" || typeof mask.strokeText !== "function") return false;
        mask.setTransform(2, 0, 0, 2, width / 2, height / 2);
        mask.font = options.font;
        mask.textAlign = "center";
        mask.textBaseline = "middle";
        mask.lineJoin = "round";
        mask.lineCap = "round";
        mask.lineWidth = options.size * ({ chord: 0.075, emotion: 0.055, interval: 0.045 }[options.role]);
        mask.fillStyle = mask.strokeStyle = "#fff";
        mask.strokeText(text, 0, 0);
        mask.fillText(text, 0, 0);
        loops = traceGlyphMask(mask.getImageData(0, 0, width, height).data, width, height);
        if (!loops.length) return false;
        if (outlines.size >= 128) outlines.delete(outlines.keys().next().value!);
        outlines.set(key, loops);
      }
      ctx.save();
      try {
        const fill = ctx.createLinearGradient(0, -options.size / 2, 0, options.size / 2);
        fill.addColorStop(0, options.ivory);
        fill.addColorStop(0.58, options.ivory);
        fill.addColorStop(1, options.color ?? options.ivory);
        ctx.fillStyle = fill;
        ctx.beginPath();
        for (const loop of loops) {
          const points = loop.map(point => deformGlyphPoint(point, options));
          const last = points[points.length - 1], first = points[0];
          ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
          for (let index = 0; index < points.length; index++) {
            const point = points[index], next = points[(index + 1) % points.length];
            ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
          }
          ctx.closePath();
        }
        ctx.fill("evenodd");
      } finally {
        ctx.restore();
      }
      return true;
    },
  };
}
