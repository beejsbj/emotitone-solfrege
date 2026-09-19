import { Chord } from "@tonaljs/tonal";
import type { HarmonicGeometryScene } from "@/types/canvas";
import type { StageRect } from "./stageRuntime";
import { layoutIntervalLettering, paintIntervalLettering, type IntervalLettering } from "./intervalLettering";
import { organicGlyph, sampleLetteringShape } from "./organicLettering";
import { createBlobGlyphPainter } from "./blobGlyph";

type Glyph = { text: string; x: number; width: number };
type Line = { text: string; glyphs: Glyph[]; width: number; y: number; size: number; chord: boolean };
type Box = { x: number; y: number; width: number; height: number };
export type HarmonicLabelFrame = { now: number; reducedMotion: boolean; bounds?: StageRect; settled?: boolean };
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const overlaps = (a: Box, b: Box, padding = 8) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 + padding
  && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + padding;
const hash = (text: string) => Array.from(text).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Canvas-only musical lettering. Each canvas owns bounded metrics and entrance state. */
export function createHarmonicTypography() {
  const states = new WeakMap<CanvasRenderingContext2D, {
    key: string; identity: string; started: number; previous: number;
    x: number; y: number; lines: Line[]; width: number; height: number;
    font: string; ink: string; ivory: string; ready: boolean; gesture: string;
    measures: Map<string, number>;
    blobGlyph: ReturnType<typeof createBlobGlyphPainter>;
  }>();

  return (ctx: CanvasRenderingContext2D, scene: HarmonicGeometryScene | null,
    opacity: number, intervals: boolean, frame?: HarmonicLabelFrame) => {
    if (!scene || opacity <= 0) { states.delete(ctx); return; }
    ctx.save();
    let cachedState = states.get(ctx);
    if (!cachedState) {
      const style = typeof HTMLCanvasElement !== "undefined" && ctx.canvas instanceof HTMLCanvasElement
        ? getComputedStyle(ctx.canvas) : null;
      cachedState = { key: "", identity: "", started: 0, previous: 0, x: 0, y: 0,
        lines: [], width: 0, height: 0, gesture: "settle",
        font: style?.getPropertyValue("--font-display").trim() || '"Lets Jazz", sans-serif',
        ink: style?.getPropertyValue("--ink").trim() || "#0a0908",
        ivory: style?.getPropertyValue("--ivory").trim() || "#f4efe6",
        ready: typeof document === "undefined" || !document.fonts || document.fonts.check('16px "Lets Jazz"'),
        measures: new Map(), blobGlyph: createBlobGlyphPainter() };
      states.set(ctx, cachedState);
    }
    const state = cachedState;
    // A font arriving after the first frame invalidates fallback metrics once.
    if (!state.ready && document.fonts.check('16px "Lets Jazz"')) {
      state.ready = true; state.key = ""; state.measures.clear(); state.blobGlyph.clear();
    }
    const measure = (text: string, size: number) => {
      ctx.font = `${size >= 30 ? 700 : 400} ${size}px ${state.font}`;
      const key = `${size}:${text}`;
      let width = state.measures.get(key);
      if (width === undefined) {
        width = ctx.measureText(text).width;
        if (state.measures.size > 512) state.measures.clear();
        state.measures.set(key, width);
      }
      return width;
    };
    const viewport = scene.viewport ?? { width: ctx.canvas?.width || 1024, height: ctx.canvas?.height || 768 };
    const bounds = frame?.bounds ?? { x: 0, y: 0, ...viewport };
    const maxWidth = Math.max(24, Math.min(260, bounds.width - 48));
    const label = scene.primaryLabel;
    const identity = JSON.stringify([label?.lines, label?.roles]);
    const layoutKey = `${identity}:${maxWidth}`;
    const now = frame?.now ?? 0;
    const still = !frame || frame.reducedMotion;
    const shape = sampleLetteringShape(still ? [] : scene.preparedBodies);
    const chordText = label?.lines.find((_, i) => label.roles?.[i] === "chord") ?? "";
    if (state.identity !== identity) {
      state.identity = identity; state.started = now;
      const chord = Chord.get(chordText.split("/")[0]);
      state.gesture = chord.quality === "Augmented" ? "open"
        : chord.intervals.includes("4P") || chord.intervals.includes("2M") ? "hang" : "settle";
      state.x = label?.x ?? 0; state.y = label?.y ?? 0;
    }
    if (state.key !== layoutKey) {
      state.key = layoutKey; state.lines = [];
      let y = 0;
      label?.lines.forEach((text, index) => {
        const chord = label.roles ? label.roles[index] === "chord" : index === 0;
        const size = chord ? 38 : 18;
        // Swollen contours need air between symbols, especially short names like CM.
        const tracking = chord ? 3.2 : 0.75;
        const widthOf = (s: string) => Array.from(s).reduce((width, char) => width + measure(char, size), 0)
          + Math.max(0, Array.from(s).length - 1) * tracking;
        const wrapped: string[] = [];
        let line = "";
        for (const word of text.trim().split(/\s+/)) {
          if (line && widthOf(`${line} ${word}`) > maxWidth) { wrapped.push(line); line = ""; }
          // Break a single unusually long symbol/word rather than compressing its glyphs.
          for (const char of `${line ? " " : ""}${word}`) {
            if (line && widthOf(line + char) > maxWidth) { wrapped.push(line); line = ""; }
            line += char;
          }
        }
        if (line) wrapped.push(line);
        wrapped.slice(0, 3).forEach((text, row) => {
          if (row === 2 && wrapped.length > 3) {
            while (text && widthOf(text + "…") > maxWidth) text = text.slice(0, -1);
            text += "…";
          }
          const width = widthOf(text);
          let x = -width / 2;
          const glyphs = Array.from(text).map((char) => {
            const w = measure(char, size);
            const glyph = { text: char, x: x + w / 2, width: w };
            x += w + tracking; return glyph;
          });
          state.lines.push({ text, glyphs, width, y: y + size / 2, size, chord });
          y += chord ? 44 : 25;
        });
        if (chord) y += 7;
      });
      state.height = y + 14;
      state.width = Math.max(0, ...state.lines.map(l => l.width)) + 22;
    }
    const duration = state.gesture === "hang" ? 280 : 220;
    const t = still || frame?.settled ? 1 : clamp((now - state.started) / duration, 0, 1);
    const remaining = Math.pow(1 - t, 3);
    const dt = clamp(now - state.previous, 0, 64);
    state.previous = now;
    const follow = still || frame?.settled ? 1 : 1 - Math.exp(-dt / 100);
    state.x += ((label?.x ?? state.x) - state.x) * follow;
    state.y += ((label?.y ?? state.y) - state.y) * follow;
    const merge = scene.connectionMode === "merge";
    const chordLine = state.lines.find(line => line.chord);
    const centre = scene.mergeCenter ?? { x: state.x, y: state.y };
    const primaryFits = label && state.lines.length && (merge && chordLine ? 68 : state.height + 24) <= bounds.height;
    const primaryBox = {
      x: clamp(merge ? centre.x : state.x,
        bounds.x + (merge && chordLine ? chordLine.width + 12 : state.width) / 2 + 8,
        bounds.x + bounds.width - (merge && chordLine ? chordLine.width + 12 : state.width) / 2 - 8),
      y: merge && chordLine
        ? clamp(centre.y, bounds.y + 34, bounds.y + bounds.height - 34) + state.height / 2 - chordLine.y
        : clamp(merge ? centre.y : state.y, bounds.y + state.height / 2 + 12, bounds.y + bounds.height - state.height / 2 - 12),
      width: state.width, height: state.height,
    };
    const chordBox: Box | null = primaryFits && merge && chordLine ? {
      x: primaryBox.x, y: primaryBox.y - state.height / 2 + chordLine.y,
      width: chordLine.width + 12, height: 44,
    } : null;
    const integrated: IntervalLettering[] = [];
    if (intervals) for (const label of scene.auxiliaryLabels) {
      const path = scene.renderedConnections?.find(connection => label.notePair
        && connection.notePair.every(id => label.notePair!.includes(id)));
      if (!path) continue;
      const width = measure(label.lines.join(" "), merge ? 16 : 18);
      const candidates: IntervalLettering[] = [];
      // Slide along the same filament before falling back to a separate tab.
      for (const fraction of merge ? [0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9] : [0.5, 0.35, 0.65, 0.2, 0.8]) {
        const layout = layoutIntervalLettering(label, path, width, fraction);
        if (!layout) break;
        const box = layout.box;
        if (box.x - box.width / 2 < bounds.x + 8 || box.x + box.width / 2 > bounds.x + bounds.width - 8
          || box.y - box.height / 2 < bounds.y + 8 || box.y + box.height / 2 > bounds.y + bounds.height - 8) continue;
        if (integrated.some(other => overlaps(box, other.box))) continue;
        if (chordBox && overlaps(box, chordBox)) continue;
        candidates.push(layout);
        if (!merge || fraction === 0.5) break;
      }
      if (merge && candidates.length > 1) {
        // Leave room for neighbouring joins instead of spending their only
        // clear patch on the first interval (common in a narrow phone orbit).
        const neighbours = scene.renderedConnections!.filter(other => other !== path)
          .map(other => other.points[Math.floor(other.points.length / 2)]).filter(Boolean);
        const clearance = (layout: IntervalLettering) => neighbours.length
          ? Math.min(...neighbours.map(point => Math.hypot(layout.box.x - point.x, layout.box.y - point.y))) : 0;
        candidates.sort((a, b) => clearance(b) - clearance(a));
      }
      if (candidates[0]) integrated.push(candidates[0]);
    }
    const occupied: Box[] = integrated.map(layout => layout.box);
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    integrated.forEach(layout => paintIntervalLettering(ctx, layout,
      { opacity, font: state.font, ink: state.ink, ivory: state.ivory, deform: !still,
        paintGlyph: (text, flex) => state.blobGlyph.paint(ctx, text, {
          size: layout.fontSize, font: ctx.font, ivory: state.ivory, ink: state.ink,
          color: layout.path.colors[0], role: "interval", seed: hash(text),
          shape: { stretch: shape.stretch, bend: still ? 0 : clamp(shape.bend + flex * 4, -1, 1) },
        }),
      }));
    if (primaryFits) {
      const box = primaryBox;
      // The interval belongs to the filament. Move the central annotation,
      // not the interval, when the two need the same space (common for dyads).
      const fits = (candidate: Box) => candidate.x - candidate.width / 2 >= bounds.x + 8
        && candidate.x + candidate.width / 2 <= bounds.x + bounds.width - 8
        && candidate.y - candidate.height / 2 >= bounds.y + 8
        && candidate.y + candidate.height / 2 <= bounds.y + bounds.height - 8
        && !occupied.some(other => overlaps(candidate, other));
      if (!merge && !fits(box) && occupied.length) {
        const candidates = occupied.flatMap(other => [
          { ...box, y: other.y - (other.height + box.height) / 2 - 12 },
          { ...box, y: other.y + (other.height + box.height) / 2 + 12 },
          { ...box, x: other.x - (other.width + box.width) / 2 - 12 },
          { ...box, x: other.x + (other.width + box.width) / 2 + 12 },
        ]).sort((a, b) => Math.hypot(a.x - box.x, a.y - box.y) - Math.hypot(b.x - box.x, b.y - box.y));
        const free = candidates.find(fits);
        if (free) { box.x = free.x; box.y = free.y; }
      }
      // If there is genuinely no room, preserve the interval rather than
      // painting the primary phrase over it. Merge keeps its original policy.
      if (merge || !occupied.length || fits(box)) {
        occupied.push(box);
        ctx.save(); ctx.translate(box.x, box.y - state.height / 2);
        ctx.globalAlpha = opacity * (0.45 + 0.55 * (1 - remaining));
        const emotionRows: Box[] = [];
        for (const line of state.lines) {
          const lineBox = { x: box.x, y: box.y - state.height / 2 + line.y,
            width: line.width + 12, height: line.size + 14 };
          const originalY = lineBox.y;
          if (merge && !line.chord) {
            lineBox.x = clamp(lineBox.x, bounds.x + lineBox.width / 2 + 8, bounds.x + bounds.width - lineBox.width / 2 - 8);
            lineBox.y = clamp(lineBox.y, bounds.y + lineBox.height / 2 + 8, bounds.y + bounds.height - lineBox.height / 2 - 8);
            if ((chordBox && overlaps(chordBox, lineBox, 2)) || integrated.some(layout => overlaps(layout.box, lineBox))) continue;
            const rowBox = { ...lineBox, y: lineBox.y + 3, height: 24 };
            if (emotionRows.some(other => overlaps(other, rowBox, 0))) continue;
            emotionRows.push(rowBox);
          }
          ctx.save(); ctx.translate(lineBox.x - box.x, lineBox.y - originalY);
          ctx.font = `${line.chord ? 700 : 400} ${line.size}px ${state.font}`;
          const seed = hash(chordText || line.text);
          for (const [index, glyph] of line.glyphs.entries()) {
            const unit = line.width ? glyph.x / (line.width / 2) : 0;
            const curve = line.chord ? 0 : 5 * unit * unit;
            const jitter = line.chord ? ((seed + index * 17) % 7 - 3) * 0.4 : 0;
            const tilt = line.chord ? ((seed + index * 11) % 7 - 3) * 0.018 : unit * 0.11;
            const organic = organicGlyph(shape, unit, line.chord);
            ctx.save();
            ctx.translate(glyph.x * (state.gesture === "open" ? 1 - remaining * 0.12 : 1) + organic.x,
              line.y + curve + jitter + organic.y + remaining * (state.gesture === "hang" ? -7 : 6));
            ctx.rotate(tilt + organic.angle + (line.chord ? -0.035 : 0) + (state.gesture === "hang" ? remaining * -0.08 : 0));
            ctx.scale(organic.scaleX, organic.scaleY);
            const bodies = scene.preparedBodies ?? [];
            const color = bodies[Math.min(bodies.length - 1, Math.floor((unit + 1) / 2 * bodies.length))]?.primaryColor;
            if (!state.blobGlyph.paint(ctx, glyph.text, {
              // Inflation owns stroke weight; synthetic bold would close narrow counters twice.
              size: line.size, font: `400 ${line.size}px ${state.font}`, ivory: state.ivory, ink: state.ink, color,
              shape, seed: seed + index * 17, role: line.chord ? "chord" : "emotion",
            })) {
              // Plain fallback only for contexts without a scratch raster surface.
              ctx.fillStyle = state.ivory;
              ctx.fillText(glyph.text, 0, 0);
            }
            ctx.restore();
          }
          ctx.restore();
        }
        ctx.restore();
      }
    }
    if (intervals) for (const stamp of scene.auxiliaryLabels) {
      // Merge labels belong only to material joins, never detached fallback tabs.
      if (merge) continue;
      if (integrated.some(layout => layout.label === stamp)) continue;
      const text = stamp.lines.join(" ");
      const width = measure(text, 15) + 16;
      let direction = stamp.angle ?? 0;
      if (direction > Math.PI / 2) direction -= Math.PI;
      if (direction < -Math.PI / 2) direction += Math.PI;
      const angle = clamp(direction, -0.55, 0.55);
      const height = 23;
      const rotatedWidth = Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height;
      const rotatedHeight = Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height;
      const dx = stamp.x - scene.centroid.x, dy = stamp.y - scene.centroid.y;
      const distance = Math.hypot(dx, dy) || 1;
      // A wide emotion line can block every short radial move, especially for
      // dyads whose anchor nearly coincides with the centroid. Search around
      // occupied boxes too, rather than silently losing the only interval.
      const candidates = [0, 18, 36].map(offset => ({
        x: stamp.x + dx / distance * offset, y: stamp.y + dy / distance * offset,
        width: rotatedWidth, height: rotatedHeight,
      }));
      for (const obstacle of occupied) {
        const horizontalGap = (obstacle.width + rotatedWidth) / 2 + 10;
        const verticalGap = (obstacle.height + rotatedHeight) / 2 + 10;
        candidates.push(
          { x: stamp.x, y: obstacle.y - verticalGap, width: rotatedWidth, height: rotatedHeight },
          { x: stamp.x, y: obstacle.y + verticalGap, width: rotatedWidth, height: rotatedHeight },
          { x: obstacle.x - horizontalGap, y: stamp.y, width: rotatedWidth, height: rotatedHeight },
          { x: obstacle.x + horizontalGap, y: stamp.y, width: rotatedWidth, height: rotatedHeight },
        );
      }
      candidates.sort((a, b) => Math.hypot(a.x - stamp.x, a.y - stamp.y)
        - Math.hypot(b.x - stamp.x, b.y - stamp.y));
      const box = candidates.find(candidate => {
        if (candidate.x - rotatedWidth / 2 < bounds.x + 8 || candidate.x + rotatedWidth / 2 > bounds.x + bounds.width - 8
          || candidate.y - rotatedHeight / 2 < bounds.y + 8 || candidate.y + rotatedHeight / 2 > bounds.y + bounds.height - 8) return false;
        return !occupied.some(other => overlaps(candidate, other));
      });
      if (!box) continue;
      occupied.push(box);
      if (Math.hypot(box.x - stamp.x, box.y - stamp.y) > 22) {
        ctx.save(); ctx.globalAlpha = opacity * 0.3;
        ctx.strokeStyle = state.ivory; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(stamp.x, stamp.y); ctx.lineTo(box.x, box.y); ctx.stroke();
        ctx.restore();
      }
      ctx.save(); ctx.translate(box.x, box.y); ctx.rotate(angle);
      ctx.globalAlpha = opacity * 0.88;
      ctx.fillStyle = state.ink;
      ctx.beginPath(); ctx.moveTo(-width / 2 - 2, -height / 2 + 2);
      ctx.lineTo(width / 2, -height / 2); ctx.lineTo(width / 2 + 2, height / 2 - 2);
      ctx.lineTo(-width / 2, height / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = state.ivory; ctx.font = `400 15px ${state.font}`;
      if (!state.blobGlyph.paint(ctx, text, { size: 15, font: ctx.font,
        ivory: state.ivory, ink: state.ink, shape, seed: hash(text), role: "interval" })) ctx.fillText(text, 0, 0);
      ctx.fillRect(-width / 2 + 2, -3, 1.5, 6);
      ctx.restore();
    }
    ctx.restore();
  };
}
