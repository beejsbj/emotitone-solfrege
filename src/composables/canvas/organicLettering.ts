import type { PreparedBlobFrame } from "@/types/canvas";

const limit = (value: number) => Math.max(-1, Math.min(1, value));

/** Low-frequency strain from the actual body contours, not a synthetic wiggle.
 * Averaging suppresses high-frequency edge vibration so musical text stays readable.
 * Translation and uniform body size cancel out; no history or timer is retained.
 */
export function sampleLetteringShape(bodies: readonly PreparedBlobFrame[] = []) {
  let stretch = 0, bend = 0, weight = 0;
  for (const body of bodies) {
    if (body.contour.length < 3 || body.scaledRadius <= 0 || body.opacity <= 0) continue;
    let xx = 0, yy = 0, xy = 0;
    for (const point of body.contour) {
      const x = (point.x - body.blob.x) / body.scaledRadius;
      const y = (point.y - body.blob.y) / body.scaledRadius;
      xx += x * x; yy += y * y; xy += x * y;
    }
    const mass = xx + yy;
    if (!Number.isFinite(mass) || mass <= 0) continue;
    const influence = Math.min(1, body.opacity);
    stretch += (xx - yy) / mass * influence;
    bend += 2 * xy / mass * influence;
    weight += influence;
  }
  return weight ? { stretch: limit(stretch / weight * 5), bend: limit(bend / weight * 5) }
    : { stretch: 0, bend: 0 };
}

/** Pixel budgets fit within existing label clearance, including long chord symbols. */
export function organicGlyph(shape: ReturnType<typeof sampleLetteringShape>, unit: number, chord: boolean) {
  const u = limit(unit);
  return {
    x: u * shape.stretch * 2,
    y: shape.bend * (u * u - 0.5) * (chord ? 2 : 1.5),
    angle: shape.bend * u * 0.055,
    scaleX: 1 + shape.stretch * 0.035,
    scaleY: 1 - shape.stretch * 0.025,
  };
}
