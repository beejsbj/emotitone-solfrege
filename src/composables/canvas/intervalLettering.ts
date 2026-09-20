import type { HarmonicConnectionPath, HarmonicGeometryLabel } from "@/types/canvas";

type Point = { x: number; y: number };
export type IntervalLettering = {
  label: HarmonicGeometryLabel;
  path: HarmonicConnectionPath;
  lengths: number[];
  total: number;
  position: number;
  gap: number;
  fontSize: number;
  angle: number;
  box: Point & { width: number; height: number };
};

function pointAt(path: HarmonicConnectionPath, lengths: number[], distance: number) {
  const points = path.points;
  const end = lengths.findIndex(length => length >= distance);
  if (end <= 0) return end === 0 ? points[0] : points[points.length - 1];
  const t = (distance - lengths[end - 1]) / Math.max(0.001, lengths[end] - lengths[end - 1]);
  return { x: points[end - 1].x + (points[end].x - points[end - 1].x) * t,
    y: points[end - 1].y + (points[end].y - points[end - 1].y) * t };
}

/** Position derives from the rendered filament, not a second chord/arc recipe. */
export function layoutIntervalLettering(label: HarmonicGeometryLabel, path: HarmonicConnectionPath,
  textWidth: number, fraction = 0.5): IntervalLettering | null {
  if (path.points.length < 2) return null;
  const lengths = [0];
  for (let i = 1; i < path.points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(path.points[i].x - path.points[i - 1].x,
      path.points[i].y - path.points[i - 1].y));
  }
  const total = lengths[lengths.length - 1];
  const merge = path.material === "merge";
  const fontSize = merge ? 16 : 18;
  const width = textWidth + 14, height = merge ? 22 : 24;
  if (!merge && total < width + 16) return null;
  // A Merge join remains an anchor even after its visible neck disappears.
  const position = merge ? total * Math.max(0.1, Math.min(0.9, fraction))
    : Math.max(width / 2 + 8, Math.min(total - width / 2 - 8, total * fraction));
  const centre = pointAt(path, lengths, position);
  const before = pointAt(path, lengths, Math.max(0, position - 2));
  const after = pointAt(path, lengths, Math.min(total, position + 2));
  let angle = Math.atan2(after.y - before.y, after.x - before.x);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;
  return { label, path, lengths, total, position, gap: width / 2, fontSize, angle,
    box: { ...centre,
      width: Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height,
      height: Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height } };
}

/** Fine chromatic core with a genuine unpainted gap; never erase the Stage below. */
export function paintIntervalLettering(ctx: CanvasRenderingContext2D, layout: IntervalLettering,
  style: { opacity: number; font: string; ink: string; ivory: string }) {
  const { path, lengths, total, position, gap, box, angle, label } = layout;
  const trace = (start: number, end: number) => {
    if (end <= start) return;
    const first = pointAt(path, lengths, start);
    ctx.moveTo(first.x, first.y);
    path.points.forEach((point, i) => {
      if (lengths[i] > start && lengths[i] < end) ctx.lineTo(point.x, point.y);
    });
    const last = pointAt(path, lengths, end);
    ctx.lineTo(last.x, last.y);
  };
  ctx.save();
  if (path.material !== "merge") {
    const first = path.points[0], last = path.points[path.points.length - 1];
    const color = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
    color.addColorStop(0, path.colors[0]); color.addColorStop(1, path.colors[1]);
    ctx.globalAlpha = path.opacity * 0.85;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = color;
    ctx.beginPath();
    trace(0, Math.max(0, position - gap));
    trace(Math.min(total, position + gap), total);
    ctx.stroke();
    // A narrow ivory grain keeps dark pitch colours legible on the Ink stage.
    ctx.globalAlpha = path.opacity * 0.24;
    ctx.lineWidth = 0.65; ctx.strokeStyle = style.ivory; ctx.stroke();
  }
  ctx.translate(box.x, box.y); ctx.rotate(angle);
  ctx.globalAlpha = style.opacity;
  ctx.font = `400 ${layout.fontSize}px ${style.font}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = style.ink;
  ctx.strokeText(label.lines.join(" "), 0, 0);
  ctx.fillStyle = style.ivory; ctx.fillText(label.lines.join(" "), 0, 0);
  ctx.restore();
}
