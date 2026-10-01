import type { HarmonicGeometryScene, PreparedBlobFrame } from "@/types/canvas";
import { hash, publishConnections, scenePairs, seeded, spanningTree, tracePolygon, type Point } from "./shared";
import type { GeometryDirectionPainter, LabFrame } from "./types";

/*
 * Geometry A · Cut Facets. Each note is cut paper, faceted like the Let's
 * Jazz illustrations, with its fill off-register from an Ivory keyline.
 * Merge pastes the bodies into one piece with wide two-tone bands; Web tapes
 * every analyzed pair with thin two-tone strips. Colour never blends: it
 * meets at a hard cut.
 */

const REGISTER = { x: -3, y: -2 };
// Paper has no blur halo, so the cut takes the size the soft body used to read at.
const CUT_SCALE = 1.22;

function facetPolygon(body: PreparedBlobFrame): { points: Point[]; apex: Point } {
  const random = seeded(hash(body.key));
  const sides = 7 + Math.floor(random() * 3);
  const contour = body.contour;
  const points: Point[] = [];
  for (let k = 0; k < sides; k++) {
    // Vertices ride the production contour, so the cut still breathes with it.
    const at = (k + (random() - 0.5) * 0.55) / sides;
    const p = contour[Math.floor(((at % 1) + 1) % 1 * contour.length) % contour.length];
    points.push({ x: body.blob.x + (p.x - body.blob.x) * CUT_SCALE, y: body.blob.y + (p.y - body.blob.y) * CUT_SCALE });
  }
  const cx = body.blob.x;
  const cy = body.blob.y;
  const r = body.scaledRadius;
  return { points, apex: { x: cx + (random() - 0.5) * r * 0.5, y: cy + (random() - 0.5) * r * 0.5 } };
}

function band(
  ctx: CanvasRenderingContext2D,
  from: PreparedBlobFrame,
  to: PreparedBlobFrame,
  width: number,
  alpha: number,
) {
  const dx = to.blob.x - from.blob.x;
  const dy = to.blob.y - from.blob.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy * (width / 2);
  const ny = ux * (width / 2);
  const slant = width * 0.6;
  const mid = { x: from.blob.x + dx / 2, y: from.blob.y + dy / 2 };
  // The seam is a slanted cut, not a blend.
  const seamA = { x: mid.x + nx + ux * slant, y: mid.y + ny + uy * slant };
  const seamB = { x: mid.x - nx - ux * slant, y: mid.y - ny - uy * slant };
  ctx.save();
  ctx.globalAlpha = alpha * Math.min(from.opacity, to.opacity);
  ctx.fillStyle = from.primaryColor;
  tracePolygon(ctx, [
    { x: from.blob.x + nx, y: from.blob.y + ny }, seamA, seamB, { x: from.blob.x - nx, y: from.blob.y - ny },
  ]);
  ctx.fill();
  ctx.fillStyle = to.primaryColor;
  tracePolygon(ctx, [seamA, { x: to.blob.x + nx, y: to.blob.y + ny }, { x: to.blob.x - nx, y: to.blob.y - ny }, seamB]);
  ctx.fill();
  ctx.restore();
}

export function createFacetsPainter(): GeometryDirectionPainter {
  return {
    bodies(frame: LabFrame, bodies, scene: HarmonicGeometryScene | null, mode) {
      const { ctx, tokens } = frame;
      const visible = bodies.filter((body) => body.opacity > 0.01 && body.contour.length > 3);
      const byKey = new Map(visible.map((body) => [body.key, body]));

      const tree = spanningTree(visible.map((body) => ({ x: body.blob.x, y: body.blob.y })))
        .map(([a, b]) => [visible[a], visible[b]] as [PreparedBlobFrame, PreparedBlobFrame]);
      publishConnections(scene, mode === "merge" ? tree : scenePairs(scene, visible), mode);
      if (visible.length > 1 && mode === "merge") {
        // One pasted piece: wide two-tone bands the bodies overlap at both ends.
        tree.forEach(([a, b]) => band(ctx, a, b, Math.min(a.scaledRadius, b.scaledRadius) * 1.7, 1));
      } else if (visible.length > 1 && scene) {
        scene.boundaryEdges.forEach((edge) => {
          const from = byKey.get(edge.fromNoteId);
          const to = byKey.get(edge.toNoteId);
          if (from && to) band(ctx, from, to, 4, 0.95);
        });
        scene.interiorEdges.forEach((edge) => {
          const from = byKey.get(edge.fromNoteId);
          const to = byKey.get(edge.toNoteId);
          if (from && to) band(ctx, from, to, 2, 0.6);
        });
      }

      visible.forEach((body) => {
        const { points, apex } = facetPolygon(body);
        ctx.save();
        ctx.globalAlpha = body.opacity;
        ctx.fillStyle = body.primaryColor;
        tracePolygon(ctx, points);
        ctx.fill();
        // Flat facet shading: some planes in shadow, some catching light.
        points.forEach((point, index) => {
          const next = points[(index + 1) % points.length];
          const tone = index % 3;
          if (tone === 1) return;
          ctx.fillStyle = tone === 0 ? tokens.ink : tokens.ivory;
          ctx.globalAlpha = body.opacity * (tone === 0 ? 0.22 : 0.12);
          tracePolygon(ctx, [apex, point, next]);
          ctx.fill();
        });
        ctx.globalAlpha = body.opacity * 0.75;
        ctx.strokeStyle = tokens.ivory;
        ctx.lineWidth = 1.25;
        ctx.lineJoin = "miter";
        tracePolygon(ctx, points, REGISTER.x, REGISTER.y);
        ctx.stroke();
        ctx.restore();
      });
    },
    clear() {},
  };
}
