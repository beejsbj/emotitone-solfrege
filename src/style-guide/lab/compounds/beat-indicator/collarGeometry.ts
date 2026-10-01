/*
 * Guide-only geometry for the lab faces: a rounded square centred on the
 * origin, measured along its outline clockwise from top centre, the way the
 * production ring counts from twelve o'clock.
 */
export interface RoundedSquare {
  half: number;
  radius: number;
}

export function perimeter({ half, radius }: RoundedSquare): number {
  return 8 * (half - radius) + 2 * Math.PI * radius;
}

/** Closed outline starting at top centre, clockwise. */
export function outlinePath({ half: h, radius: r }: RoundedSquare): string {
  const f = (value: number) => Number(value.toFixed(3));
  return [
    `M 0 ${f(-h)}`,
    `H ${f(h - r)}`,
    `A ${f(r)} ${f(r)} 0 0 1 ${f(h)} ${f(-h + r)}`,
    `V ${f(h - r)}`,
    `A ${f(r)} ${f(r)} 0 0 1 ${f(h - r)} ${f(h)}`,
    `H ${f(-h + r)}`,
    `A ${f(r)} ${f(r)} 0 0 1 ${f(-h)} ${f(h - r)}`,
    `V ${f(-h + r)}`,
    `A ${f(r)} ${f(r)} 0 0 1 ${f(-h + r)} ${f(-h)}`,
    "Z",
  ].join(" ");
}

/** Point at distance `d` along the outline from top centre, clockwise. */
export function pointAt(shape: RoundedSquare, d: number): { x: number; y: number } {
  const { half: h, radius: r } = shape;
  const straight = 2 * (h - r);
  const corner = (Math.PI * r) / 2;
  let rest = ((d % perimeter(shape)) + perimeter(shape)) % perimeter(shape);

  // Top-right half-side, then corner/side pairs clockwise, then the last half-side.
  if (rest <= h - r) return { x: rest, y: -h };
  rest -= h - r;
  const corners = [
    { cx: h - r, cy: -h + r, from: -90 },
    { cx: h - r, cy: h - r, from: 0 },
    { cx: -h + r, cy: h - r, from: 90 },
    { cx: -h + r, cy: -h + r, from: 180 },
  ];
  const sides = [
    (t: number) => ({ x: h, y: -h + r + t }),
    (t: number) => ({ x: h - r - t, y: h }),
    (t: number) => ({ x: -h, y: h - r - t }),
    (t: number) => ({ x: -h + r + t, y: -h }),
  ];
  for (let index = 0; index < 4; index += 1) {
    if (rest <= corner) {
      const angle = ((corners[index].from + (rest / corner) * 90) * Math.PI) / 180;
      return { x: corners[index].cx + r * Math.cos(angle), y: corners[index].cy + r * Math.sin(angle) };
    }
    rest -= corner;
    const length = index === 3 ? h - r : straight;
    if (rest <= length) return sides[index](rest);
    rest -= length;
  }
  return { x: 0, y: -h };
}

/** Bounding box of the outline between two distances, padded by `pad`. */
export function spanBounds(shape: RoundedSquare, start: number, end: number, pad: number) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const steps = 48;
  for (let step = 0; step <= steps; step += 1) {
    const { x, y } = pointAt(shape, start + ((end - start) * step) / steps);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}
