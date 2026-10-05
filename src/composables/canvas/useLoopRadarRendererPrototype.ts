/**
 * PROTOTYPE — throwaway. Not for main.
 *
 * The Looper as weather. While patterns play, the Atmosphere turns: a broad,
 * edgeless front of light (with a shadow opposite it) rotates once per turn,
 * clockwise from twelve. One turn is the longest playing pattern; shorter
 * patterns are tiled around it, so the light matches what is heard.
 *
 * Every note is an arc on its own hidden orbit, from onset angle to release
 * angle: the arc is the note's length. Its head waits at the onset; as the
 * front arrives it travels the arc for exactly as long as the note sounds,
 * swelling, and reaches the far end at release.
 *
 * Light is emitted outward only. Each arc throws its Music Color away from
 * the centre in a fan that fades with distance, so an inner pattern's light
 * washes across the orbits outside it and mixes with theirs, while the middle
 * stays dark. At low Definition the arcs dissolve and the outward wash is the
 * whole picture; at high Definition the arc and its head are crisp and the
 * wash is thinner. Nothing is drawn as a ring, tick or hairline.
 *
 *   angle    = time in the turn
 *   distance = pattern (oldest nearest the centre), nudged outward by pitch
 *
 * What you are playing right now draws itself live on the outermost orbit;
 * released notes not yet playing stay as a faint trace there.
 * Silent patterns stay as faint, unresponsive light.
 * Knobs (Looper: Strength, Definition, Spread) via readLoopGlow.
 * See src/stores/loopPrototype.ts for the question the prototype answers.
 */
import { computed } from "vue";
import { CHROMATIC_NOTES } from "@/data";
import { resolveMusicColorSampleByPitchClass } from "@/services/musicColor";
import { readLoopGlow } from "@/services/stageAppearance";
import { useLoopPrototypeStore, type LoopLayer } from "@/stores/loopPrototype";
import { useMusicStore } from "@/stores/music";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";
import { useVisualConfig } from "../useVisualConfig";
import type { StageComposition } from "./stageRuntime";

const TAU = Math.PI * 2;
const IVORY = "244, 239, 230";
const INK = "10, 9, 8";
/** The outward wash is painted at 1/SCALE and upscaled: softness without blur. */
const SCALE = 6;
const SPRITE = 48;
const FAN = 64;
/** Front: how far light leads and trails the turning point, in turns. */
const LEAD = 0.07;
const TRAIL = 0.38;
const FADE_S = 0.9;
/** Arcs are stamped as overlapping straight pieces at most this many radians apart. */
const ARC_STEP = 0.07;
const ARC_PIECES = 48;
/** The wash is coarser: fewer, wider fans that overlap into one field. */
const WASH_STEP = 0.16;
const WASH_PIECES = 12;
/** Fan width at its source, as a fraction of the sprite's height. */
const FAN_SOURCE = 0.14;
/** Shortest arc drawn, in radians, so a staccato note still has a place. */
const MIN_ARC = 0.05;

interface Tint {
  head: HTMLCanvasElement;
  arc: HTMLCanvasElement;
  fan: HTMLCanvasElement;
}

interface Source extends Tint {
  /** Onset, 0..1 through its period. */
  phase: number;
  /** Length, 0..1 of its period. */
  span: number;
  /** The cycle it repeats on, in ms: the turn, or its pattern's own length. */
  period: number;
  /** Distance from the centre by pattern depth, 0..1 of the Looper radius. */
  distance: number;
  /** Pitch and scatter offset from that distance; Spread scales it. */
  jitter: number;
  silent: boolean;
}

/** Deterministic 0..1 from a number, so nothing jumps between rebuilds. */
function scatter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function mix(rgb: [number, number, number], toIvory: number): string {
  const ivory = [244, 239, 230];
  return rgb.map((channel, index) => Math.round(channel + (ivory[index] - channel) * toIvory)).join(", ");
}

/** The head: whitened pinpoint, quick falloff into the note's colour. */
function headSprite(rgb: [number, number, number]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  const ctx = canvas.getContext("2d")!;
  const half = SPRITE / 2;
  const core = mix(rgb, 0.6);
  const tint = mix(rgb, 0.2);
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `rgba(${core}, 1)`);
  gradient.addColorStop(0.1, `rgba(${core}, 0.85)`);
  gradient.addColorStop(0.24, `rgba(${tint}, 0.3)`);
  gradient.addColorStop(0.5, `rgba(${tint}, 0.07)`);
  gradient.addColorStop(1, `rgba(${tint}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE, SPRITE);
  return canvas;
}

/**
 * One piece of an arc: even along its length with linear ends that cross-fade
 * into the next piece (a quarter overlap sums flat), soft across.
 */
function arcSprite(rgb: [number, number, number]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE;
  canvas.height = 16;
  const ctx = canvas.getContext("2d")!;
  const tint = mix(rgb, 0.3);
  const along = ctx.createLinearGradient(0, 0, SPRITE, 0);
  along.addColorStop(0, `rgba(${tint}, 0)`);
  along.addColorStop(0.25, `rgba(${tint}, 0.6)`);
  along.addColorStop(0.75, `rgba(${tint}, 0.6)`);
  along.addColorStop(1, `rgba(${tint}, 0)`);
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, SPRITE, 16);
  ctx.globalCompositeOperation = "destination-in";
  const across = ctx.createLinearGradient(0, 0, 0, 16);
  across.addColorStop(0, "rgba(0,0,0,0)");
  across.addColorStop(0.5, "rgba(0,0,0,1)");
  across.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, SPRITE, 16);
  return canvas;
}

/**
 * The emission fan, as an alpha mask built once: x runs outward from the
 * source (nothing inward of x = 0), widening as it goes like light fanning
 * from a slit, fading with distance.
 */
let fanMask: HTMLCanvasElement | null = null;
function getFanMask(): HTMLCanvasElement {
  if (fanMask) return fanMask;
  const canvas = document.createElement("canvas");
  canvas.width = FAN;
  canvas.height = FAN;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(FAN, FAN);
  for (let y = 0; y < FAN; y += 1) {
    const v = (y + 0.5) / (FAN / 2) - 1;
    for (let x = 0; x < FAN; x += 1) {
      const u = (x + 0.5) / FAN;
      // Widens from a slit at the source to the full height far out.
      const width = FAN_SOURCE + (1 - FAN_SOURCE) * Math.pow(u, 0.8);
      const rise = Math.min(1, u / 0.05);
      const fall = Math.exp(-2.6 * u) * Math.sqrt(Math.max(0, 1 - u));
      const across = Math.exp(-3.6 * (v / width) * (v / width));
      image.data[(y * FAN + x) * 4 + 3] = Math.round(255 * rise * fall * across);
    }
  }
  ctx.putImageData(image, 0, 0);
  fanMask = canvas;
  return canvas;
}

function fanSprite(rgb: [number, number, number]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = FAN;
  canvas.height = FAN;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `rgb(${rgb.join(", ")})`;
  ctx.fillRect(0, 0, FAN, FAN);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(getFanMask(), 0, 0);
  return canvas;
}

/** The turning front, painted once: Ivory light ahead, Ink shadow opposite. */
function frontSprite(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const light = (alpha: number) => `rgba(${IVORY}, ${alpha})`;
  const shade = (alpha: number) => `rgba(${INK}, ${alpha})`;
  const conic = ctx.createConicGradient(0, half, half);
  // Offsets run clockwise from the turning point; it moves toward +offset.
  conic.addColorStop(0, light(0.26));
  conic.addColorStop(LEAD * 0.5, light(0.12));
  conic.addColorStop(LEAD, light(0));
  conic.addColorStop(0.3, shade(0));
  conic.addColorStop(0.5, shade(0.9));
  conic.addColorStop(0.62, shade(0));
  conic.addColorStop(1 - TRAIL, light(0));
  conic.addColorStop(1 - TRAIL * 0.55, light(0.07));
  conic.addColorStop(1 - TRAIL * 0.22, light(0.17));
  conic.addColorStop(1, light(0.26));
  ctx.fillStyle = conic;
  ctx.fillRect(0, 0, size, size);
  // Fade toward the hub and the far edge, so there is no point to find.
  ctx.globalCompositeOperation = "destination-in";
  const falloff = ctx.createRadialGradient(half, half, 0, half, half, half);
  falloff.addColorStop(0, "rgba(0,0,0,0.15)");
  falloff.addColorStop(0.22, "rgba(0,0,0,0.8)");
  falloff.addColorStop(0.45, "rgba(0,0,0,1)");
  falloff.addColorStop(0.8, "rgba(0,0,0,0.55)");
  falloff.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = falloff;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function useLoopRadarRendererPrototype() {
  const loop = useLoopPrototypeStore();
  const musicStore = useMusicStore();
  const { dynamicColorConfig, ambientConfig } = useVisualConfig();

  /** The Looper knobs, resolved to render terms only when they change. */
  const knobs = computed(() => {
    const { strength, definition, spread } = readLoopGlow(ambientConfig.value);
    // Strength: 0 absent, 0.5 as designed; above that it eases off, because
    // additive light washes to white long before the knob would end.
    const gain = strength < 0.5 ? strength * 2 : 1 + (strength - 0.5) * 1.1;
    // Definition: the wash is the whole picture at 0 and thins toward 1;
    // the arcs and heads resolve out of it and sharpen.
    const high = Math.max(0, (definition - 0.25) / 0.75);
    const washGain = definition < 0.25 ? 1.3 - definition * 1.2 : 1 - 0.55 * high;
    const washReach = definition < 0.25 ? 1.3 - definition * 1.2 : 1 - 0.3 * high;
    // Spread: how far the light reaches, 0.55x gathered to 1.6x filling the Stage.
    const reach = spread < 0.5 ? 0.55 + spread * 0.9 : 1 + (spread - 0.5) * 1.2;
    return {
      gain,
      frontAlpha: strength < 0.5 ? strength : 0.5 + (strength - 0.5) * 0.6,
      washGain,
      washReach: washReach * (0.75 + 0.25 * reach),
      line: Math.min(1, Math.max(0, (definition - 0.05) / 0.7)),
      thickness: 1.45 - 0.6 * definition,
      reach,
      jitter: 0.4 + spread * 1.2,
    };
  });

  // Music Color sprites per (pitch class, octave) in the current key and mode.
  const tints = new Map<number, Tint>();
  let tintKey: ChromaticNote | null = null;
  let tintMode: MusicalMode | null = null;
  let tintConfig: unknown = null;

  function tintOf(chroma: number, octave: number): Tint {
    const key = musicStore.currentKey as ChromaticNote;
    const mode = musicStore.currentMode as MusicalMode;
    const config = dynamicColorConfig.value;
    if (key !== tintKey || mode !== tintMode || config !== tintConfig) {
      tints.clear();
      tintKey = key;
      tintMode = mode;
      tintConfig = config;
    }
    const id = chroma * 16 + octave;
    let tint = tints.get(id);
    if (!tint) {
      const srgb = resolveMusicColorSampleByPitchClass(
        CHROMATIC_NOTES[((chroma % 12) + 12) % 12],
        mode,
        key,
        octave,
        config,
        "fixed-chromatic",
      )?.sample.primary.srgb;
      const rgb: [number, number, number] = srgb
        ? [Math.round(srgb.r * 255), Math.round(srgb.g * 255), Math.round(srgb.b * 255)]
        : [244, 239, 230];
      tint = { head: headSprite(rgb), arc: arcSprite(rgb), fan: fanSprite(rgb) };
      tints.set(id, tint);
    }
    return tint;
  }

  /**
   * Place one pattern's notes. `copies` tiles a shorter pattern around the
   * turn when it divides it; otherwise its notes map by its own phase.
   */
  function place(
    notes: PatternNote[],
    depth: number,
    depths: number,
    period: number,
    copies: number,
    silent: boolean,
    into: Source[],
  ) {
    if (!notes.length || period <= 0) return;
    let low = Infinity;
    let high = -Infinity;
    for (const note of notes) {
      const midi = loop.describe(note).midi;
      if (midi < low) low = midi;
      if (midi > high) high = midi;
    }
    const range = Math.max(1, high - low);
    const reach = depths > 1 ? depth / (depths - 1) : 0.5;
    const cycle = period * copies;
    for (const note of notes) {
      const { chroma, midi, octave } = loop.describe(note);
      const tint = tintOf(chroma, octave);
      const onset = ((note.pressTime % period) + period) % period;
      for (let copy = 0; copy < copies; copy += 1) {
        into.push({
          ...tint,
          phase: (onset + copy * period) / cycle,
          span: Math.min(0.98, Math.max(0, note.duration) / cycle),
          period: cycle,
          // Pitch and a fixed per-note scatter keep a pattern off one circle.
          distance: 0.34 + reach * 0.42,
          jitter: ((midi - low) / range - 0.5) * 0.22 + (scatter(note.pressTime + midi) - 0.5) * 0.08,
          silent,
        });
      }
    }
  }

  // Rebuilt only when patterns, mutes, solo, key, mode or colour config change.
  const field = computed(() => {
    void dynamicColorConfig.value;
    const sources: Source[] = [];
    const turn = loop.lengthMs;
    if (!turn) return sources;
    const depths = loop.layers.length + 1;
    loop.layers.forEach((layer: LoopLayer, index) => {
      const own = layer.lengthMs || turn;
      const ratio = turn / own;
      const whole = Math.abs(ratio - Math.round(ratio)) < 1e-3;
      place(
        loop.soundingNotes(layer),
        index,
        depths,
        own,
        whole ? Math.max(1, Math.round(ratio)) : 1,
        loop.isSilent(layer),
        sources,
      );
    });
    return sources;
  });

  let sources: Source[] = [];
  let held: Source[] = [];
  let pending: Source[] = [];
  let turnMs = 0;
  let phase = 0;
  let presence = 0;
  let lastNow = 0;
  let frame = 0;

  // Phases of the few distinct periods in play, refreshed once per frame.
  const periods: number[] = [];
  const periodPhases: number[] = [];
  let periodCount = 0;
  function phaseOf(period: number): number {
    if (period === turnMs) return phase;
    for (let i = 0; i < periodCount; i += 1) {
      if (periods[i] === period) return periodPhases[i];
    }
    const value = loop.hasLoop ? loop.phase(period) : 0;
    periods[periodCount] = period;
    periodPhases[periodCount] = value;
    periodCount += 1;
    return value;
  }

  let front: HTMLCanvasElement | null = null;
  let frontReach = 0;
  let fog: HTMLCanvasElement | null = null;
  let fogCtx: CanvasRenderingContext2D | null = null;

  function refreshPending() {
    pending = [];
    const notes = loop.pendingNotes();
    if (notes.length && turnMs) place(notes, loop.layers.length, loop.layers.length + 1, turnMs, 1, true, pending);
  }

  function refreshHeld() {
    held = [];
    const notes = loop.heldNotes();
    if (notes.length && turnMs) place(notes, loop.layers.length, loop.layers.length + 1, turnMs, 1, false, held);
  }

  // Per-source frame state, written by `light` and read by the painters.
  let since = 0;
  let swell = 0;
  let sounding = false;

  /** Where the turn is relative to a source: swells just ahead, holds while sounding, sinks after. */
  function light(source: Source, reducedMotion: boolean) {
    since = phaseOf(source.period) - source.phase;
    if (since < 0) since += 1;
    const sinceMs = since * source.period;
    const durationMs = source.span * source.period;
    sounding = sinceMs < Math.max(30, durationMs);
    if (source.silent) {
      swell = 0;
      return;
    }
    if (sounding) {
      swell = 1;
      return;
    }
    if (reducedMotion) {
      swell = 0;
      return;
    }
    const ahead = 1 - since;
    const lead = ahead < LEAD ? 1 - ahead / LEAD : 0;
    const decayMs = Math.min(2800, Math.max(600, turnMs * 0.45));
    swell = Math.max(lead * lead * 0.6, Math.exp(-(sinceMs - durationMs) / decayMs));
  }

  // Frame context for `paint`, set at the top of each render; no closures per frame.
  let paintCtx: CanvasRenderingContext2D | null = null;
  let paintFog: CanvasRenderingContext2D | null = null;
  let paintKnob: (typeof knobs)["value"] | null = null;
  let paintReduced = false;
  let pcx = 0;
  let pcy = 0;
  let pRadius = 0;
  let pScale = 1;
  let pWashLength = 0;
  let pLineAlpha = 0;
  let pfx = 0;
  let pfy = 0;

  /** One source: its outward wash into the fog, then its arc and head. */
  function paint(source: Source, kind: 0 | 1 | 2) {
    const ctx = paintCtx!;
    const fogCtx = paintFog!;
    const knob = paintKnob!;
    const reducedMotion = paintReduced;
    const cx = pcx;
    const cy = pcy;
    const radius = pRadius;
    const scale = pScale;
    const washLength = pWashLength;
    const lineAlpha = pLineAlpha;
    const fx = pfx;
    const fy = pfy;
    // kind 0 = playing, 1 = held under your hand, 2 = released, not yet playing.
    if (kind === 1) {
      since = source.span;
      swell = 1;
      sounding = true;
    } else if (kind === 2) {
      since = 1;
      swell = 0;
      sounding = false;
    } else {
      light(source, reducedMotion);
    }
    const orbit = (source.distance + source.jitter * knob.jitter) * radius * knob.reach;
    const start = source.phase * TAU - Math.PI / 2;
    const arc = Math.max(MIN_ARC, source.span * TAU);
    // How far along the arc the note has got. Reduced Motion: no travel.
    const progress = kind === 1
      ? arc
      : sounding && !reducedMotion
        ? Math.min(arc, since * TAU)
        : 0;
    // Outward emission: fans along the arc, brighter where the note has sounded.
    const fans = Math.min(WASH_PIECES, Math.ceil(arc / WASH_STEP));
    const fanStep = arc / fans;
    const rest = source.silent ? 0.045 : kind === 2 ? 0.05 : 0.11;
    const chord = Math.max(fanStep, 0.12) * orbit;
    const fanWidth = (chord * 1.5) / FAN_SOURCE;
    const washScale = knob.gain * knob.washGain;
    for (let piece = 0; piece < fans; piece += 1) {
      const at = start + (piece + 0.5) * fanStep;
      const reached = (piece + 0.5) * fanStep <= progress || !sounding;
      const glow = rest + swell * (reached ? 0.42 : 0.14);
      const ux = Math.cos(at);
      const uy = Math.sin(at);
      fogCtx.setTransform(
        (ux * washLength) / SCALE, (uy * washLength) / SCALE,
        (-uy * fanWidth) / SCALE, (ux * fanWidth) / SCALE,
        (cx + ux * orbit * 0.97 - fx) / SCALE, (cy + uy * orbit * 0.97 - fy) / SCALE,
      );
      fogCtx.globalAlpha = Math.min(1, glow * washScale);
      fogCtx.drawImage(source.fan, 0, -0.5, 1, 1);
    }

    if (lineAlpha <= 0) return;
    // The arc itself: the note's length on its orbit.
    const pieces = Math.min(ARC_PIECES, 1 + Math.ceil(arc / ARC_STEP));
    const step = arc / pieces;
    const length = (step * orbit) / 0.75;
    const thickness = (4 + swell * 4) * scale * knob.thickness;
    const base = source.silent ? 0.12 : kind === 2 ? 0.22 : 0.28;
    for (let piece = 0; piece < pieces; piece += 1) {
      const at = start + (piece + 0.5) * step;
      const reached = (piece + 0.5) * step <= progress;
      const ux = Math.cos(at);
      const uy = Math.sin(at);
      ctx.setTransform(-uy, ux, -ux, -uy, cx + ux * orbit, cy + uy * orbit);
      ctx.globalAlpha = lineAlpha * Math.min(1, base + swell * (reached ? 0.6 : 0.25));
      ctx.drawImage(source.arc, -length / 2, -thickness / 2, length, thickness);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (kind === 2) return;

    // The head: waits at the onset, travels while the note sounds, and
    // lingers at the release as it fades.
    const after = !sounding && since < 0.5 && kind === 0;
    const headAt = start + (after ? arc : progress);
    const size = (14 + swell * 22) * scale;
    ctx.globalAlpha = lineAlpha * (source.silent ? 0.15 : 0.3 + swell * 0.7);
    ctx.drawImage(
      source.head,
      cx + Math.cos(headAt) * orbit - size / 2,
      cy + Math.sin(headAt) * orbit - size / 2,
      size,
      size,
    );
    if (after) {
      // A dim head already waiting at the onset for the next turn.
      const waiting = 14 * scale;
      ctx.globalAlpha = lineAlpha * 0.3;
      ctx.drawImage(
        source.head,
        cx + Math.cos(start) * orbit - waiting / 2,
        cy + Math.sin(start) * orbit - waiting / 2,
        waiting,
        waiting,
      );
    }
  }

  function render(
    ctx: CanvasRenderingContext2D,
    composition: StageComposition,
    reducedMotion: boolean,
  ) {
    const now = performance.now();
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    const live = loop.hasLoop && loop.running;
    const target = live ? 1 : 0;
    presence = reducedMotion
      ? target
      : presence + (target - presence) * (1 - Math.exp(-dt / (FADE_S / 3)));
    if (presence < 0.004 && !live) {
      presence = 0;
      return;
    }

    // Keep the last field while fading out after the loop is cleared.
    periodCount = 0;
    if (loop.hasLoop) {
      sources = field.value;
      turnMs = loop.lengthMs;
      phase = loop.phase();
      frame += 1;
      if (frame % 2 === 0) refreshHeld();
      if (frame % 8 === 0) refreshPending();
    } else {
      held = [];
      pending = [];
    }
    if (!turnMs) return;
    const knob = knobs.value;
    if (knob.gain <= 0) return;
    if (!fogCtx) {
      fog = document.createElement("canvas");
      fogCtx = fog.getContext("2d");
    }
    if (!fog || !fogCtx) return;

    const { usable, centerX: cx } = composition;
    const cy = composition.centerY - usable.height * 0.04;
    const radius = Math.min(usable.width, usable.height) * 0.5;
    const hand = phase * TAU - Math.PI / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // The front turns the whole Atmosphere. Reduced Motion keeps it still.
    if (!reducedMotion) {
      const reach = Math.hypot(usable.width, usable.height) * 0.62;
      if (!front || Math.abs(frontReach - reach) > 4) {
        frontReach = reach;
        front = frontSprite(Math.max(8, Math.ceil((reach * 2) / SCALE)));
      }
      ctx.translate(cx, cy);
      ctx.rotate(hand);
      const span = reach * (0.6 + knob.reach * 0.4);
      ctx.globalAlpha = presence * knob.frontAlpha;
      ctx.drawImage(front, -span, -span, span * 2, span * 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    const fw = Math.max(2, Math.ceil(usable.width / SCALE));
    const fh = Math.max(2, Math.ceil(usable.height / SCALE));
    if (fog.width !== fw || fog.height !== fh) {
      fog.width = fw;
      fog.height = fh;
    }
    fogCtx.setTransform(1, 0, 0, 1, 0, 0);
    fogCtx.globalCompositeOperation = "source-over";
    fogCtx.clearRect(0, 0, fw, fh);
    fogCtx.globalCompositeOperation = "lighter";
    ctx.globalCompositeOperation = "lighter";

    paintCtx = ctx;
    paintFog = fogCtx;
    paintKnob = knob;
    paintReduced = reducedMotion;
    pcx = cx;
    pcy = cy;
    pRadius = radius;
    pScale = radius / 190;
    pWashLength = radius * 0.62 * knob.washReach;
    pLineAlpha = Math.min(1, knob.line * knob.gain * presence);
    pfx = usable.x;
    pfy = usable.y;

    for (const source of sources) paint(source, 0);
    for (const source of pending) paint(source, 2);
    for (const source of held) paint(source, 1);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = presence;
    ctx.drawImage(fog, usable.x, usable.y, fw * SCALE, fh * SCALE);
    ctx.restore();
    paintCtx = null;
    paintFog = null;
  }

  return { render };
}
