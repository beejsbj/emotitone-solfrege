/** Canvas geometry stays in CSS pixels; only backing surfaces use device pixels. */
const sizes = new WeakMap<object, { width: number; height: number; dpr: number }>();

export function stagePixelRatio() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

export function sizeStageCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D | null,
  width: number,
  height: number,
  dpr = stagePixelRatio(),
) {
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  sizes.set(canvas, { width, height, dpr });
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function stageCanvasSize(canvas: HTMLCanvasElement | undefined) {
  return (canvas && sizes.get(canvas)) ?? { width: canvas?.width ?? 0, height: canvas?.height ?? 0, dpr: 1 };
}

/** Preserve the existing 60 Hz tuning with an exponential, elapsed-time blend. */
export function frameBlend(blendAt60Hz: number, deltaSeconds: number) {
  if (deltaSeconds <= 0) return 0;
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, blendAt60Hz)), deltaSeconds * 60);
}

export function smoothStageValue(from: number, to: number, blendAt60Hz: number, deltaSeconds: number) {
  return from + (to - from) * frameBlend(blendAt60Hz, deltaSeconds);
}
