import { createHarmonicVibration } from "@/utils/visualEffects";
import type { VibratingStringConfig } from "@/types/visual";
import type { LabFrame, StringsPainter } from "./types";

/*
 * Strings directions D–F. Production still decides which strings exist, which
 * one sounds and how hard (Presence, Response, exact pitch); these only change
 * the instrument the strings belong to.
 */

const sounding = (string: VibratingStringConfig) => string.isActive && string.amplitude > 0.5;

/** The production vibration at one point along a string of `length`, with fixed ends. */
const swing = (frame: LabFrame, string: VibratingStringConfig, along: number, length: number) =>
  frame.reducedMotion
    ? 0
    : createHarmonicVibration(frame.elapsed, string.frequency, string.amplitude, along, string.phase)
      * Math.sin((along / Math.max(1, length)) * Math.PI);

/**
 * Strings D · Harp Fan. The strings leave the top of the Stage at their own
 * places and converge toward one point at the deck, like a harp's neck to its
 * soundboard. The fan points at where you play.
 */
export const harpStrings: StringsPainter = {
  paint(frame, strings) {
    const { ctx, composition } = frame;
    const { usable, centerX } = composition;
    const bottom = usable.y + usable.height;
    strings.forEach((string) => {
      if (string.opacity <= 0.001) return;
      const top = { x: string.x, y: usable.y };
      const end = { x: centerX + (string.x - centerX) * 0.22, y: bottom };
      const length = Math.hypot(end.x - top.x, end.y - top.y);
      const nx = (end.y - top.y) / length;
      const ny = -(end.x - top.x) / length;
      ctx.save();
      ctx.strokeStyle = string.color;
      ctx.globalAlpha = sounding(string) ? 1 : string.opacity * 0.8;
      ctx.lineWidth = sounding(string) ? 2 : 1;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const along = t * length;
        const offset = swing(frame, string, along, length);
        const x = top.x + (end.x - top.x) * t + nx * offset;
        const y = top.y + (end.y - top.y) * t + ny * offset;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    });
  },
};

/**
 * Strings E · Standing Waves. A sounding string shows its mode: filled lobes
 * between nodes, one lobe for its lowest register and more as it climbs, with
 * the lobes swapping sides as it vibrates. Idle strings carry their node ticks.
 */
export const standingStrings: StringsPainter = {
  paint(frame, strings) {
    const { ctx, composition, elapsed, reducedMotion } = frame;
    const h = composition.usable.height;
    const lowest = Math.min(...strings.map((string) => string.octave));
    strings.forEach((string) => {
      if (string.opacity <= 0.001) return;
      const mode = Math.max(1, Math.min(4, string.octave - lowest + 1));
      ctx.save();
      ctx.strokeStyle = string.color;
      ctx.fillStyle = string.color;
      if (!sounding(string)) {
        ctx.globalAlpha = string.opacity * 0.8;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(string.x, 0); ctx.lineTo(string.x, h);
        for (let k = 1; k < mode + 1; k++) {
          const y = (k / (mode + 1)) * h;
          ctx.moveTo(string.x - 4, y); ctx.lineTo(string.x + 4, y);
        }
        ctx.stroke();
        ctx.restore();
        return;
      }
      const phase = reducedMotion ? 1 : Math.cos(elapsed * Math.max(1.5, string.frequency) * Math.PI * 2);
      const reach = Math.min(40, Math.abs(string.amplitude) * 1.4 + 6) * phase;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(string.x, 0);
      for (let i = 0; i <= 120; i++) {
        const y = (i / 120) * h;
        ctx.lineTo(string.x + Math.sin((y / h) * Math.PI * mode) * reach, y);
      }
      ctx.lineTo(string.x, h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(string.x, 0); ctx.lineTo(string.x, h);
      ctx.stroke();
      ctx.restore();
    });
  },
};

/**
 * Strings F · Stave. The strings turn on their side and become a staff: one
 * horizontal line per pitch, low at the bottom and high at the top, in Ivory
 * ink. The sounding pitch's line takes its colour and vibrates along its length.
 */
export const staveStrings: StringsPainter = {
  paint(frame, strings) {
    const { ctx, composition, tokens } = frame;
    const { usable } = composition;
    const ordered = [...strings].sort((a, b) => a.octave * 7 + a.noteIndex - (b.octave * 7 + b.noteIndex));
    const margin = usable.height * 0.1;
    const step = (usable.height - margin * 2) / Math.max(1, ordered.length - 1);
    const left = usable.x + 12;
    const width = usable.width - 24;
    ordered.forEach((string, index) => {
      if (string.opacity <= 0.001) return;
      const y = usable.y + usable.height - margin - index * step;
      ctx.save();
      if (sounding(string)) {
        ctx.strokeStyle = string.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i <= 80; i++) {
          const along = (i / 80) * width;
          const x = left + along;
          const offset = swing(frame, string, along, width) * 0.7;
          if (i === 0) ctx.moveTo(x, y + offset); else ctx.lineTo(x, y + offset);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = tokens.ivory4;
        ctx.globalAlpha = Math.min(1, 0.4 + string.opacity);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, y); ctx.lineTo(left + width, y);
        ctx.stroke();
      }
      ctx.restore();
    });
  },
};
