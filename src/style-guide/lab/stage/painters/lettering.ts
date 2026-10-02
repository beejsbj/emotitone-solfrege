import { Progression } from "@tonaljs/tonal";
import type { HarmonicGeometryScene } from "@/types/canvas";
import { hash, seeded, tracePolygon, type Point } from "./shared";
import type { LabFrame, LetteringPainter } from "./types";

/*
 * Lettering directions. Both read the same scene production lettering reads:
 * the chord and emotion lines, interval labels with their note pairs, and the
 * relationship paths the bodies published. Neither repeats the rolled-back
 * organic trials; neither bends text into a filament or a Merge join.
 */

type Line = { text: string; role: "chord" | "emotion" | "interval" };

/** Chord symbols keep their case: "Am7" and "AM7" are different chords. Only prose is set in caps. */
const display = (line: Line) => (line.role === "chord" ? line.text : line.text.toUpperCase());

const linesOf = (scene: HarmonicGeometryScene): Line[] =>
  (scene.primaryLabel?.lines ?? []).map((text, index) => ({
    text,
    role: scene.primaryLabel?.roles?.[index] === "emotion" ? "emotion" : "chord",
  }));

/** Where an interval may sit: along its published path from the middle outward, else its own label position. */
function intervalAnchors(scene: HarmonicGeometryScene, notePair: [string, string] | undefined, fallback: Point) {
  const path = notePair && scene.renderedConnections?.find((connection) =>
    connection.notePair.every((id) => notePair.includes(id)));
  if (!path) return [fallback];
  return [0.5, 0.35, 0.65, 0.2, 0.8].map((at) => path.points[Math.round(at * (path.points.length - 1))]);
}

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 4 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + 4;

/** A strip of paper with ripped ends, centred on (0, 0). */
function tape(ctx: CanvasRenderingContext2D, width: number, height: number, seed: number) {
  const random = seeded(seed);
  const half = width / 2;
  const points: Point[] = [{ x: -half, y: -height / 2 }, { x: half, y: -height / 2 }];
  for (let i = 1; i < 5; i++) points.push({ x: half + (random() - 0.3) * 6, y: -height / 2 + (height * i) / 5 });
  points.push({ x: half, y: height / 2 }, { x: -half, y: height / 2 });
  for (let i = 4; i > 0; i--) points.push({ x: -half - (random() - 0.3) * 6, y: -height / 2 + (height * i) / 5 });
  tracePolygon(ctx, points);
}

/**
 * Lettering A · Label Tape. The words are applied paper stuck on the Stage:
 * the chord on Ivory tape with an Ink offset (the accepted panel-heading
 * band), emotion on a thinner Ink tape, and each interval on a small Ivory
 * stamp at its connection's midpoint.
 */
export function createTapeLettering(): LetteringPainter {
  let identity = "";
  let landedAt = 0;
  return {
    paint(frame: LabFrame, scene, config) {
      if (!scene || config.labelOpacity <= 0) { identity = ""; return; }
      const { ctx, tokens, composition, elapsed, reducedMotion } = frame;
      const lines = linesOf(scene);
      const nextIdentity = JSON.stringify([lines, scene.points.map((point) => point.note.noteId).sort()]);
      if (nextIdentity !== identity) { identity = nextIdentity; landedAt = elapsed; }
      // A slap onto the Stage: a hard 140ms settle, nothing recurring.
      const land = reducedMotion ? 1 : Math.min(1, (elapsed - landedAt) / 0.14);
      const scale = 1 + (1 - land) * 0.14;
      const center = scene.mergeCenter ?? { x: scene.primaryLabel?.x ?? scene.centroid.x, y: scene.primaryLabel?.y ?? scene.centroid.y };
      const bounds = composition.usable;
      ctx.save();
      ctx.globalAlpha = config.labelOpacity;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      let y = 0;
      const blocks = lines.map((line) => {
        const size = line.role === "chord" ? 34 : 15;
        ctx.font = `700 ${size}px ${tokens.display}`;
        const width = ctx.measureText(display(line)).width + (line.role === "chord" ? 26 : 16);
        const height = line.role === "chord" ? 44 : 22;
        const block = { line, size, width, height, y: y + height / 2 };
        y += height + 6;
        return block;
      });
      const total = Math.max(0, y - 6);
      const maxWidth = Math.max(0, ...blocks.map((block) => block.width));
      const cx = Math.max(bounds.x + maxWidth / 2 + 10, Math.min(bounds.x + bounds.width - maxWidth / 2 - 10, center.x));
      const cy = Math.max(bounds.y + total / 2 + 10, Math.min(bounds.y + bounds.height - total / 2 - 10, center.y));
      const taken: Box[] = [{ x: cx, y: cy, w: maxWidth, h: total }];
      blocks.forEach((block, index) => {
        const chord = block.line.role === "chord";
        ctx.save();
        ctx.translate(cx, cy - total / 2 + block.y);
        ctx.rotate(chord ? -0.05 : 0.035);
        ctx.scale(scale, scale);
        const seed = hash(block.line.text) + index;
        ctx.fillStyle = tokens.ink;
        ctx.save(); ctx.translate(4, 4); tape(ctx, block.width, block.height, seed); ctx.fill(); ctx.restore();
        ctx.fillStyle = chord ? tokens.ivory : tokens.ink3;
        tape(ctx, block.width, block.height, seed);
        ctx.fill();
        ctx.font = `700 ${block.size}px ${tokens.display}`;
        ctx.fillStyle = chord ? tokens.ink : tokens.ivory;
        ctx.fillText(display(block.line), 0, 2);
        ctx.restore();
      });

      if (config.showIntervalLabels) {
        scene.auxiliaryLabels.forEach((label) => {
          const text = label.lines.join(" ");
          ctx.font = `700 14px ${tokens.display}`;
          const w = ctx.measureText(text).width + 10;
          // Slide along the connection to keep clear of the chord and other stamps.
          const anchors = intervalAnchors(scene, label.notePair, label);
          const anchor = anchors.find((p) => !taken.some((box) => overlaps(box, { x: p.x, y: p.y, w, h: 20 })));
          if (!anchor) return;
          taken.push({ x: anchor.x, y: anchor.y, w, h: 20 });
          const random = seeded(hash(text + (label.notePair?.join() ?? "")));
          ctx.save();
          ctx.translate(anchor.x, anchor.y);
          ctx.rotate((random() - 0.5) * 0.24);
          ctx.scale(scale, scale);
          ctx.fillStyle = tokens.ink;
          ctx.fillRect(-w / 2 + 2, -10 + 2, w, 20);
          ctx.fillStyle = tokens.ivory;
          ctx.fillRect(-w / 2, -10, w, 20);
          ctx.fillStyle = tokens.ink;
          ctx.fillText(text, 0, 1);
          ctx.restore();
        });
      }
      ctx.restore();
    },
  };
}

/**
 * Lettering B · Readout. The words leave the canvas and become chassis: one
 * fixed Readout window at the top of the Stage, in the Readout primitive's
 * recipe (Ink window, Ink-4 bezel, mono caps, ghost segments, lit Ivory).
 * Member pips carry the only colour; the bodies stay free of text.
 */
export function createReadoutLettering(): LetteringPainter {
  let identity = "";
  let changedAt = 0;
  return {
    paint(frame: LabFrame, scene, config) {
      if (!scene || config.labelOpacity <= 0) { identity = ""; return; }
      const { ctx, tokens, composition, elapsed, reducedMotion } = frame;
      const lines = linesOf(scene);
      const chord = lines.find((line) => line.role === "chord")?.text ?? scene.chordSymbol ?? "";
      const emotion = lines.find((line) => line.role === "emotion")?.text ?? "";
      const intervals = config.showIntervalLabels
        ? scene.auxiliaryLabels.map((label) => label.lines.join(" ")).join(" · ")
        : "";
      const rows = [chord, intervals, emotion.toUpperCase()].filter(Boolean);
      if (!rows.length) return;
      const nextIdentity = rows.join("|");
      if (nextIdentity !== identity) { identity = nextIdentity; changedAt = elapsed; }
      // The Readout's refresh: two hard steps from dim to lit, once per change.
      const lit = reducedMotion || elapsed - changedAt > 0.14 ? 1 : elapsed - changedAt > 0.07 ? 0.68 : 0.35;

      const sizes = rows.map((_, i) => (i === 0 ? 22 : 11));
      ctx.save();
      ctx.globalAlpha = config.labelOpacity;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const widths = rows.map((row, i) => {
        ctx.font = `700 ${sizes[i]}px ${tokens.mono}`;
        return ctx.measureText(row).width;
      });
      const pips = scene.points.length;
      const pipRow = pips * 10;
      const padX = 12;
      const width = Math.min(composition.usable.width - 24, Math.max(...widths, pipRow) + padX * 2);
      const height = 14 + sizes.reduce((sum, size) => sum + size * 1.5, 0) + 12;
      const x = composition.usable.x + (composition.usable.width - width) / 2;
      const y = composition.usable.y + 14;

      // Bezel and window.
      ctx.fillStyle = tokens.ink4;
      ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
      ctx.fillStyle = tokens.ink;
      ctx.fillRect(x, y, width, height);

      // Member pips, in voicing order, the only colour in the window.
      [...scene.points].sort((a, b) => a.note.frequency - b.note.frequency).forEach((point, i) => {
        ctx.fillStyle = frame.noteColor(point.note);
        ctx.fillRect(x + padX + i * 10, y + 8, 6, 6);
      });

      let rowY = y + 18;
      rows.forEach((row, i) => {
        const text = row;
        ctx.font = `700 ${sizes[i]}px ${tokens.mono}`;
        rowY += sizes[i] * 0.75;
        ctx.fillStyle = tokens.ivory;
        ctx.globalAlpha = config.labelOpacity * 0.09;
        ctx.fillText(text.replace(/[^\s·]/g, "8"), x + padX, rowY, width - padX * 2);
        ctx.globalAlpha = config.labelOpacity * lit * (i === 0 ? 1 : 0.78);
        ctx.shadowColor = tokens.ivory;
        ctx.shadowBlur = i === 0 ? 8 : 0;
        ctx.fillText(text, x + padX, rowY, width - padX * 2);
        ctx.shadowBlur = 0;
        rowY += sizes[i] * 0.75;
      });
      ctx.restore();
    },
  };
}

const bodyRadius = (point: HarmonicGeometryScene["points"][number]) =>
  point.blob.baseRadius * (point.blob.renderScale ?? point.blob.scale ?? 1);

/**
 * Lettering C · Lead Sheet. The words a jazz player reads: the chord symbol
 * set above the chord like a lead sheet, and each note's solfège sung beneath
 * its body like a lyric. Intervals are left to the shapes.
 */
export function createLeadSheetLettering(): LetteringPainter {
  return {
    paint(frame: LabFrame, scene, config) {
      if (!scene || config.labelOpacity <= 0) return;
      const { ctx, tokens, composition } = frame;
      const bounds = composition.usable;
      const chord = linesOf(scene).find((line) => line.role === "chord")?.text ?? "";
      ctx.save();
      ctx.globalAlpha = config.labelOpacity;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      scene.points.forEach((point) => {
        ctx.font = `400 15px ${tokens.display}`;
        ctx.fillStyle = tokens.ivory2;
        ctx.fillText(point.note.solfege.name, point.x, point.y + bodyRadius(point) + 18);
      });
      if (chord) {
        const top = Math.min(...scene.points.map((point) => point.y - bodyRadius(point)));
        const x = Math.max(bounds.x + 40, Math.min(bounds.x + bounds.width - 40, scene.centroid.x));
        const y = Math.max(bounds.y + 34, top - 14);
        ctx.font = `italic 700 32px ${tokens.display}`;
        ctx.fillStyle = tokens.ivory;
        ctx.fillText(chord, x, y);
      }
      ctx.restore();
    },
  };
}

/**
 * Lettering D · Neon Sign. The chord as a jazz-club sign: the symbol bent in
 * tube light of its bass note's colour, with an Ivory-hot core, and the
 * emotion in a smaller Ivory tube. A new chord strikes once with a two-step
 * flicker; nothing flickers after that.
 */
export function createNeonLettering(): LetteringPainter {
  let identity = "";
  let struckAt = 0;
  return {
    paint(frame: LabFrame, scene, config) {
      if (!scene || config.labelOpacity <= 0) { identity = ""; return; }
      const { ctx, tokens, composition, elapsed, reducedMotion } = frame;
      const lines = linesOf(scene);
      const nextIdentity = JSON.stringify(lines);
      if (nextIdentity !== identity) { identity = nextIdentity; struckAt = elapsed; }
      const since = elapsed - struckAt;
      const lit = reducedMotion || since > 0.18 ? 1 : since < 0.06 ? 0.25 : since < 0.12 ? 1 : 0.4;
      const bass = [...scene.points].sort((a, b) => a.note.frequency - b.note.frequency)[0]?.note;
      const tube = bass ? frame.noteColor(bass, { l: 1.15 }) : tokens.ivory;
      const center = scene.mergeCenter ?? { x: scene.primaryLabel?.x ?? scene.centroid.x, y: scene.primaryLabel?.y ?? scene.centroid.y };
      const bounds = composition.usable;
      const x = Math.max(bounds.x + 70, Math.min(bounds.x + bounds.width - 70, center.x));
      let y = Math.max(bounds.y + 40, Math.min(bounds.y + bounds.height - 40, center.y));
      ctx.save();
      ctx.globalAlpha = config.labelOpacity * lit;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      lines.forEach((line) => {
        const chord = line.role === "chord";
        ctx.font = `700 ${chord ? 40 : 16}px ${tokens.display}`;
        const text = chord ? line.text : line.text.toUpperCase();
        ctx.shadowColor = chord ? tube : tokens.ivory;
        ctx.shadowBlur = chord ? 16 : 8;
        ctx.strokeStyle = chord ? tube : tokens.ivory2;
        ctx.lineWidth = chord ? 3 : 1.6;
        ctx.strokeText(text, x, y);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = tokens.ivory;
        ctx.lineWidth = chord ? 0.9 : 0.6;
        ctx.strokeText(text, x, y);
        y += chord ? 34 : 22;
      });
      ctx.restore();
    },
  };
}

/** Tonal's "VIm7" as a player writes it: "vi7"; "IM" → "I", "dim" → "°", "aug" → "+". */
function romanFigure(raw: string) {
  const match = /^([b#]?)([IV]+)(.*)$/.exec(raw);
  if (!match) return raw;
  const [, accidental, numeral, quality] = match;
  const accidentalSign = accidental.replace("b", "♭").replace("#", "♯");
  if (/^(m|mi|min)(?!aj)/.test(quality)) return `${accidentalSign}${numeral.toLowerCase()}${quality.replace(/^(min|mi|m)/, "")}`;
  if (/^(dim|o|°)/.test(quality)) return `${accidentalSign}${numeral.toLowerCase()}°${quality.replace(/^(dim|o|°)/, "")}`;
  if (/^(aug|\+)/.test(quality)) return `${accidentalSign}${numeral}+${quality.replace(/^(aug|\+)/, "")}`;
  if (quality === "M") return `${accidentalSign}${numeral}`;
  return `${accidentalSign}${numeral}${quality.replace(/^M7/, "Δ7")}`;
}

/**
 * Lettering E · Roman Function. The headline names what the chord does in
 * the key, not what it is called: vi7, V7, I. The chord symbol and key sit
 * underneath in small mono, and each interval is a plain mono figure on its
 * connection. The lesson moves from naming to hearing function.
 */
export function createRomanLettering(): LetteringPainter {
  return {
    paint(frame: LabFrame, scene, config) {
      if (!scene || config.labelOpacity <= 0) return;
      const { ctx, tokens, composition } = frame;
      const chord = scene.chordSymbol ?? linesOf(scene).find((line) => line.role === "chord")?.text ?? "";
      const key = scene.points[0]?.note.key ?? "C";
      const figure = chord ? romanFigure(Progression.toRomanNumerals(key, [chord.split("/")[0]])[0] ?? "") : "";
      const center = scene.mergeCenter ?? { x: scene.primaryLabel?.x ?? scene.centroid.x, y: scene.primaryLabel?.y ?? scene.centroid.y };
      const bounds = composition.usable;
      const x = Math.max(bounds.x + 50, Math.min(bounds.x + bounds.width - 50, center.x));
      const y = Math.max(bounds.y + 40, Math.min(bounds.y + bounds.height - 40, center.y));
      ctx.save();
      ctx.globalAlpha = config.labelOpacity;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (figure) {
        ctx.font = `700 46px ${tokens.display}`;
        ctx.fillStyle = tokens.ink;
        ctx.fillText(figure, x + 3, y + 3);
        ctx.fillStyle = tokens.ivory;
        ctx.fillText(figure, x, y);
        ctx.font = `500 11px ${tokens.mono}`;
        ctx.fillStyle = tokens.ivory3;
        ctx.fillText(`${chord} in ${key}`.toUpperCase(), x, y + 32);
      }
      if (config.showIntervalLabels) {
        ctx.font = `500 11px ${tokens.mono}`;
        scene.auxiliaryLabels.forEach((label) => {
          const anchor = intervalAnchors(scene, label.notePair, label)[0];
          ctx.fillStyle = tokens.ink;
          const text = label.lines.join(" ");
          const w = ctx.measureText(text).width + 8;
          ctx.fillRect(anchor.x - w / 2, anchor.y - 8, w, 16);
          ctx.fillStyle = tokens.ivory2;
          ctx.fillText(text, anchor.x, anchor.y + 1);
        });
      }
      ctx.restore();
    },
  };
}
