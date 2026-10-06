/**
 * Looper · the turning light a running loop casts on the Stage
 *
 * The loop's clock becomes a Stage thing. A broad, edgeless front of Ivory
 * light (with an Ink shadow opposite it) turns once per turn, clockwise from
 * twelve. One turn is the longest playing member; shorter members tile around
 * it, so the light matches what is heard.
 *
 * Every note is an arc on its own unseen orbit, from onset angle to release
 * angle: the arc is the note's length. Its head waits at the onset; as the
 * turn reaches it, the head travels the arc for exactly as long as the note
 * sounds and arrives at the far end at release.
 *
 * Light goes outward only. Each arc throws its Music Color away from the
 * centre in fans that fade with distance, so an inner member's light washes
 * across the orbits outside it and mixes with theirs while the middle stays
 * dark. At low Definition the arcs dissolve into haze and the outward wash is
 * the whole picture; at high Definition arcs and heads resolve into comets
 * curving along their orbits over a thinner wash. Nothing is drawn as a ring,
 * tick or hairline, and nothing reads as a Note Body.
 *
 *   angle    = time in the turn
 *   distance = member (oldest nearest the centre), nudged outward by pitch
 *
 * What is being played right now draws itself live on the outermost orbit;
 * released notes not yet joined stay there as a faint trace. Silent members
 * stay as faint, unresponsive light.
 *
 * Accepted by Burooj over the Looper prototype (#132): "too much structure,
 * it's meant to be atmosphere"; light "emanating outwards ... light doesn't
 * go inward but it does intersect with light from outer loop arcs".
 *
 * Cost: sprites are built once per pitch and octave in the current key, mode
 * and Music Color recipe; the wash is painted at 1/6 scale and upscaled;
 * per-frame work reuses pooled records and draws only images.
 */

import { Note as TonalNote } from "@tonaljs/tonal";
import { CHROMATIC_NOTES } from "@/data";
import { resolveMusicColorSampleByPitchClass } from "@/services/musicColor";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { DynamicColorConfig, LooperConfig } from "@/types/visual";
import { useMusicColorProvider } from "../useMusicColorConfig";
import {
  looperBarMs,
  looperPhase,
  looperTurnMs,
  type LooperStageNote,
  type LooperStageSource,
} from "./looperStageSource";
import type { StageComposition } from "./stageRuntime";

type Rgb = readonly [number, number, number];

const TAU = Math.PI * 2;
const FALLBACK_IVORY: Rgb = [244, 239, 230];
const FALLBACK_INK: Rgb = [10, 9, 8];
/** The outward wash is painted at 1/WASH_SCALE and upscaled: softness without blur. */
const WASH_SCALE = 6;
const SPRITE = 48;
const FAN = 64;
/** The front: how far its light leads and trails the turning point, in turns. */
const LEAD = 0.07;
const TRAIL = 0.38;
/** Seconds to fade in when the loop starts and out when it stops. */
const FADE_S = 0.9;
/** Arcs are stamped as overlapping straight pieces at most this many radians apart. */
const ARC_STEP = 0.07;
const ARC_PIECES = 48;
/** The wash is coarser: fewer, wider fans that overlap into one field. */
const WASH_STEP = 0.16;
const WASH_PIECES = 8;
/** Fan width at its source, as a fraction of the sprite's height. */
const FAN_SOURCE = 0.09;
/** Shortest arc drawn, in radians, so a staccato note still has a place. */
const MIN_ARC = 0.05;
/** A sounding note holds its swell at least this long, in loop ms. */
const MIN_SOUNDING_MS = 30;

/** How a placed note is lit this frame. */
const PLAYING = 0;
const HELD = 1;
const PENDING = 2;
type NoteKind = typeof PLAYING | typeof HELD | typeof PENDING;

interface Tint {
  head: HTMLCanvasElement;
  arc: HTMLCanvasElement;
  fan: HTMLCanvasElement;
}

/** One note placed on its orbit. Pooled: rewritten in place, never per frame allocated. */
interface PlacedNote {
  tint: Tint;
  /** Onset, 0..1 through its period. */
  phase: number;
  /** Length, 0..1 of its period. */
  span: number;
  /** The cycle it repeats on, in loop ms: the turn, or its member's own length. */
  period: number;
  /** Distance from the centre by member depth, 0..1 of the Looper radius. */
  distance: number;
  /** Pitch and scatter offset from that distance; Spread scales it. */
  jitter: number;
  silent: boolean;
}

interface PlacedList {
  items: PlacedNote[];
  length: number;
}

interface PitchFacts {
  chroma: number;
  midi: number;
  octave: number;
}

/** The knobs resolved into render terms; recomputed only when a knob moves. */
interface LooperTerms {
  gain: number;
  frontAlpha: number;
  washGain: number;
  washReach: number;
  /** Arc and head visibility: 0 at Definition 0.05, 1 by 0.75. */
  line: number;
  /** 1 at Definition 0, 0 by 0.75: fans widen, lean and pool into one field. */
  haze: number;
  thickness: number;
  reach: number;
  jitter: number;
}

function createPlacedList(): PlacedList {
  return { items: [], length: 0 };
}

/** Deterministic 0..1 from a number, so nothing jumps between rebuilds. */
function scatter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function parseHex(value: string, fallback: Rgb): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return fallback;
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readTokens(ctx: CanvasRenderingContext2D): { ivory: Rgb; ink: Rgb } {
  const style = typeof HTMLCanvasElement !== "undefined"
    && ctx.canvas instanceof HTMLCanvasElement
    ? getComputedStyle(ctx.canvas)
    : null;
  return {
    ivory: parseHex(style?.getPropertyValue("--ivory") ?? "", FALLBACK_IVORY),
    ink: parseHex(style?.getPropertyValue("--ink") ?? "", FALLBACK_INK),
  };
}

function rgbString(rgb: Rgb): string {
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

function mixToward(rgb: Rgb, target: Rgb, amount: number): string {
  return rgbString([
    Math.round(rgb[0] + (target[0] - rgb[0]) * amount),
    Math.round(rgb[1] + (target[1] - rgb[1]) * amount),
    Math.round(rgb[2] + (target[2] - rgb[2]) * amount),
  ]);
}

function createSprite(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") };
}

/** The head: a whitened pinpoint with a quick falloff into the note's colour. */
function headSprite(rgb: Rgb, ivory: Rgb): HTMLCanvasElement {
  const { canvas, ctx } = createSprite(SPRITE, SPRITE);
  if (!ctx) return canvas;
  const half = SPRITE / 2;
  const core = mixToward(rgb, ivory, 0.6);
  const tint = mixToward(rgb, ivory, 0.2);
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
function arcSprite(rgb: Rgb, ivory: Rgb): HTMLCanvasElement {
  const { canvas, ctx } = createSprite(SPRITE, 16);
  if (!ctx) return canvas;
  const tint = mixToward(rgb, ivory, 0.3);
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
 * The emission fan as an alpha mask, built once for every pitch: x runs
 * outward from the source (nothing inward of x = 0), widening like light
 * fanning from a slit and fading with distance.
 */
let fanMask: HTMLCanvasElement | null = null;
function getFanMask(): HTMLCanvasElement {
  if (fanMask) return fanMask;
  const { canvas, ctx } = createSprite(FAN, FAN);
  fanMask = canvas;
  if (!ctx) return canvas;
  const image = ctx.createImageData(FAN, FAN);
  for (let y = 0; y < FAN; y += 1) {
    const v = (y + 0.5) / (FAN / 2) - 1;
    for (let x = 0; x < FAN; x += 1) {
      const u = (x + 0.5) / FAN;
      // Widens from a slit at the source to most of the height far out. It
      // stays inside the sprite and is windowed to exactly zero at the edges,
      // so overlapping fans never show a side.
      const width = FAN_SOURCE + (0.65 - FAN_SOURCE) * Math.pow(u, 0.8);
      const rise = Math.min(1, u / 0.05);
      const fall = Math.exp(-2.6 * u) * Math.sqrt(Math.max(0, 1 - u));
      const edge = (1 - v * v) * (1 - v * v);
      const across = Math.exp(-2.4 * (v / width) * (v / width)) * edge;
      image.data[(y * FAN + x) * 4 + 3] = Math.round(255 * rise * fall * across);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function fanSprite(rgb: Rgb): HTMLCanvasElement {
  const { canvas, ctx } = createSprite(FAN, FAN);
  if (!ctx) return canvas;
  ctx.fillStyle = `rgb(${rgbString(rgb)})`;
  ctx.fillRect(0, 0, FAN, FAN);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(getFanMask(), 0, 0);
  return canvas;
}

/** The turning front, painted once per size: Ivory light ahead, Ink shadow opposite. */
function frontSprite(size: number, ivory: Rgb, ink: Rgb): HTMLCanvasElement | null {
  const { canvas, ctx } = createSprite(size, size);
  // Conic gradients are missing from older WebKit; the front is then omitted.
  if (!ctx || typeof ctx.createConicGradient !== "function") return null;
  const half = size / 2;
  const lightRgb = rgbString(ivory);
  const shadeRgb = rgbString(ink);
  const light = (alpha: number) => `rgba(${lightRgb}, ${alpha})`;
  const shade = (alpha: number) => `rgba(${shadeRgb}, ${alpha})`;
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

/** Resolve the three knobs into render terms. */
function resolveTerms(config: LooperConfig, into: LooperTerms) {
  const strength = Math.max(0, Math.min(1, config.strength));
  const definition = Math.max(0, Math.min(1, config.definition));
  const spread = Math.max(0, Math.min(1, config.spread));
  // Strength: 0 absent, 0.5 as accepted; above that it eases off, because
  // additive light washes to white long before the knob would end.
  into.gain = strength < 0.5 ? strength * 2 : 1 + (strength - 0.5) * 1.1;
  into.frontAlpha = strength < 0.5 ? strength : 0.5 + (strength - 0.5) * 0.6;
  // Definition: the wash is the whole picture at 0 and thins toward 1 while
  // the arcs and heads resolve out of it and sharpen.
  const high = Math.max(0, (definition - 0.25) / 0.75);
  into.washGain = definition < 0.25 ? 1.3 - definition * 1.2 : 1 - 0.55 * high;
  const washReach = definition < 0.25 ? 1.3 - definition * 1.2 : 1 - 0.3 * high;
  // Spread: how far the light reaches, 0.55x gathered to 1.6x filling the Stage.
  into.reach = spread < 0.5 ? 0.55 + spread * 0.9 : 1 + (spread - 0.5) * 1.2;
  into.washReach = washReach * (0.75 + 0.25 * into.reach);
  into.line = Math.min(1, Math.max(0, (definition - 0.05) / 0.7));
  into.haze = Math.max(0, 1 - definition / 0.75);
  into.thickness = 1.45 - 0.6 * definition;
  into.jitter = 0.4 + spread * 1.2;
}

export function useLooperRenderer() {
  const { config: dynamicColorConfig } = useMusicColorProvider();

  let ivory: Rgb = FALLBACK_IVORY;
  let ink: Rgb = FALLBACK_INK;
  let tokensFor: CanvasRenderingContext2D | null = null;

  const terms: LooperTerms = {
    gain: 0, frontAlpha: 0, washGain: 0, washReach: 0, line: 0,
    haze: 0, thickness: 0, reach: 0, jitter: 0,
  };
  let termsStrength = Number.NaN;
  let termsDefinition = Number.NaN;
  let termsSpread = Number.NaN;

  // Music Color sprites per (pitch class, octave) in the current key and mode.
  const tints = new Map<number, Tint>();
  let tintKey: ChromaticNote | null = null;
  let tintMode: MusicalMode | null = null;
  let tintRecipe: DynamicColorConfig | null = null;
  const pitches = new Map<string, PitchFacts>();

  // Placed notes. Members rebuild only when the source hands over a new
  // members array (or key, mode or colour changes); held notes re-place into
  // their pool every frame; pending notes rebuild when their array changes.
  const field = createPlacedList();
  const held = createPlacedList();
  const pending = createPlacedList();
  let fieldMembers: LooperStageSource["members"] | null = null;
  let fieldBpm = 0;
  let fieldKey: ChromaticNote | null = null;
  let fieldMode: MusicalMode | null = null;
  let fieldRecipe: DynamicColorConfig | null = null;
  let pendingNotes: readonly LooperStageNote[] | null = null;
  let pendingTurn = 0;

  let turnMs = 0;
  let positionMs = 0;
  let turnPhase = 0;
  let presence = 0;
  let lastNow = 0;

  // Phases of the few distinct periods in play, refreshed once per frame.
  const periods: number[] = [];
  const periodPhases: number[] = [];
  let periodCount = 0;

  let front: HTMLCanvasElement | null = null;
  let frontSize = 0;
  let wash: HTMLCanvasElement | null = null;
  let washCtx: CanvasRenderingContext2D | null = null;

  function pitchOf(note: string): PitchFacts {
    let facts = pitches.get(note);
    if (!facts) {
      const parsed = TonalNote.get(note);
      facts = {
        chroma: parsed.chroma ?? 0,
        midi: parsed.midi ?? 60,
        octave: parsed.oct ?? 4,
      };
      pitches.set(note, facts);
    }
    return facts;
  }

  function tintOf(chroma: number, octave: number, key: ChromaticNote, mode: MusicalMode): Tint {
    const recipe = dynamicColorConfig.value;
    if (key !== tintKey || mode !== tintMode || recipe !== tintRecipe) {
      tints.clear();
      tintKey = key;
      tintMode = mode;
      tintRecipe = recipe;
    }
    const safeOctave = Math.max(0, Math.min(15, octave));
    const id = chroma * 16 + safeOctave;
    let tint = tints.get(id);
    if (!tint) {
      const srgb = resolveMusicColorSampleByPitchClass(
        CHROMATIC_NOTES[((chroma % 12) + 12) % 12],
        mode,
        key,
        safeOctave,
        recipe,
        "fixed-chromatic",
      )?.sample.primary.srgb;
      const rgb: Rgb = srgb
        ? [Math.round(srgb.r * 255), Math.round(srgb.g * 255), Math.round(srgb.b * 255)]
        : ivory;
      tint = { head: headSprite(rgb, ivory), arc: arcSprite(rgb, ivory), fan: fanSprite(rgb) };
      tints.set(id, tint);
    }
    return tint;
  }

  /**
   * Place one member's notes at depth `depth` of `depths`. `copies` tiles a
   * shorter member around the turn when it divides it; otherwise its notes
   * map by their own phase.
   */
  function place(
    notes: readonly LooperStageNote[],
    depth: number,
    depths: number,
    period: number,
    copies: number,
    silent: boolean,
    into: PlacedList,
    key: ChromaticNote,
    mode: MusicalMode,
  ) {
    if (!notes.length || period <= 0) return;
    let low = Infinity;
    let high = -Infinity;
    for (const note of notes) {
      const { midi } = pitchOf(note.note);
      if (midi < low) low = midi;
      if (midi > high) high = midi;
    }
    const range = Math.max(1, high - low);
    const reach = depths > 1 ? depth / (depths - 1) : 0.5;
    const cycle = period * copies;
    for (const note of notes) {
      const { chroma, midi, octave } = pitchOf(note.note);
      const tint = tintOf(chroma, octave, key, mode);
      const onset = ((note.pressTime % period) + period) % period;
      // Pitch and a fixed per-note scatter keep a member off one circle.
      const jitter = ((midi - low) / range - 0.5) * 0.22
        + (scatter(note.pressTime + midi) - 0.5) * 0.08;
      for (let copy = 0; copy < copies; copy += 1) {
        let placed = into.items[into.length];
        if (!placed) {
          placed = {
            tint, phase: 0, span: 0, period: 0, distance: 0, jitter: 0, silent: false,
          };
          into.items.push(placed);
        }
        placed.tint = tint;
        placed.phase = (onset + copy * period) / cycle;
        placed.span = Math.min(0.98, Math.max(0, note.duration) / cycle);
        placed.period = cycle;
        placed.distance = 0.34 + reach * 0.42;
        placed.jitter = jitter;
        placed.silent = silent;
        into.length += 1;
      }
    }
  }

  function rebuildField(source: LooperStageSource, key: ChromaticNote, mode: MusicalMode) {
    field.length = 0;
    fieldMembers = source.members;
    fieldBpm = source.bpm;
    fieldKey = key;
    fieldMode = mode;
    fieldRecipe = dynamicColorConfig.value;
    const turn = turnMs;
    if (!turn) return;
    const barMs = looperBarMs(source.bpm);
    const depths = source.members.length + 1;
    source.members.forEach((member, index) => {
      const own = member.bars > 0 ? member.bars * barMs : turn;
      const ratio = turn / own;
      const whole = Math.abs(ratio - Math.round(ratio)) < 1e-3;
      place(
        member.notes,
        index,
        depths,
        own,
        whole ? Math.max(1, Math.round(ratio)) : 1,
        !member.audible,
        field,
        key,
        mode,
      );
    });
  }

  function phaseOf(period: number): number {
    if (period === turnMs) return turnPhase;
    for (let i = 0; i < periodCount; i += 1) {
      if (periods[i] === period) return periodPhases[i];
    }
    const value = looperPhase(positionMs, period);
    periods[periodCount] = period;
    periodPhases[periodCount] = value;
    periodCount += 1;
    return value;
  }

  // Frame state, written once per render and read by `paintNote`, so the hot
  // loop needs no closures or per-note objects.
  let frameCtx: CanvasRenderingContext2D | null = null;
  let frameWash: CanvasRenderingContext2D | null = null;
  let frameReducedMotion = false;
  let frameCx = 0;
  let frameCy = 0;
  let frameRadius = 0;
  let frameScale = 1;
  let frameWashLength = 0;
  let frameLineAlpha = 0;
  let frameWashX = 0;
  let frameWashY = 0;

  // Per-note light, written by `lightNote`.
  let since = 0;
  let swell = 0;
  let sounding = false;

  /** Where the turn is relative to a note: swells just ahead, holds while sounding, sinks after. */
  function lightNote(placed: PlacedNote) {
    since = phaseOf(placed.period) - placed.phase;
    if (since < 0) since += 1;
    // Reduced Motion is still: every note rests, nothing swells or travels.
    if (frameReducedMotion || placed.silent) {
      sounding = false;
      swell = 0;
      return;
    }
    const sinceMs = since * placed.period;
    const durationMs = placed.span * placed.period;
    sounding = sinceMs < Math.max(MIN_SOUNDING_MS, durationMs);
    if (sounding) {
      swell = 1;
      return;
    }
    const ahead = 1 - since;
    const lead = ahead < LEAD ? 1 - ahead / LEAD : 0;
    const decayMs = Math.min(2800, Math.max(600, turnMs * 0.45));
    swell = Math.max(lead * lead * 0.6, Math.exp(-(sinceMs - durationMs) / decayMs));
  }

  /** One note: its outward wash into the wash layer, then its arc and head. */
  function paintNote(placed: PlacedNote, kind: NoteKind) {
    const ctx = frameCtx!;
    const washTarget = frameWash!;
    const cx = frameCx;
    const cy = frameCy;
    if (kind === HELD) {
      since = placed.span;
      swell = 1;
      sounding = true;
    } else if (kind === PENDING) {
      since = 1;
      swell = 0;
      sounding = false;
    } else {
      lightNote(placed);
    }
    const orbit = (placed.distance + placed.jitter * terms.jitter) * frameRadius * terms.reach;
    const start = placed.phase * TAU - Math.PI / 2;
    const arc = Math.max(MIN_ARC, placed.span * TAU);
    // How far along the arc the note has got.
    const progress = kind === HELD ? arc : sounding ? Math.min(arc, since * TAU) : 0;

    // Outward emission: fans along the arc, brighter where the note has sounded.
    // Wider fans need fewer of them: 1-4 per note in haze, up to 8 when crisp.
    const haze = terms.haze;
    const fans = Math.min(
      WASH_PIECES - Math.round(4 * haze),
      Math.ceil(arc / (WASH_STEP + 0.34 * haze)),
    );
    const fanStep = arc / fans;
    const rest = placed.silent ? 0.045 : kind === PENDING ? 0.05 : 0.11;
    const chord = Math.max(fanStep, 0.12 + 0.2 * haze) * orbit;
    const fanWidth = (chord * (1.5 + 3.5 * haze)) / FAN_SOURCE;
    const reachLength = frameWashLength * (1 - 0.3 * haze);
    // In haze the emission leans along the turn, so the light billows round.
    const curl = 0.35 * haze;
    const washScale = terms.gain * terms.washGain * (1 - 0.3 * haze);
    for (let piece = 0; piece < fans; piece += 1) {
      const at = start + (piece + 0.5) * fanStep;
      const reached = (piece + 0.5) * fanStep <= progress || !sounding;
      const glow = rest + swell * (reached ? 0.42 : 0.14);
      const ux = Math.cos(at);
      const uy = Math.sin(at);
      const dx = Math.cos(at + curl);
      const dy = Math.sin(at + curl);
      washTarget.setTransform(
        (dx * reachLength) / WASH_SCALE, (dy * reachLength) / WASH_SCALE,
        (-dy * fanWidth) / WASH_SCALE, (dx * fanWidth) / WASH_SCALE,
        (cx + ux * orbit * 0.97 - frameWashX) / WASH_SCALE,
        (cy + uy * orbit * 0.97 - frameWashY) / WASH_SCALE,
      );
      washTarget.globalAlpha = Math.min(1, glow * washScale);
      washTarget.drawImage(placed.tint.fan, 0, -0.5, 1, 1);
    }

    const lineAlpha = frameLineAlpha;
    if (lineAlpha <= 0) return;
    // The arc itself: the note's length on its orbit.
    const pieces = Math.min(ARC_PIECES, 1 + Math.ceil(arc / ARC_STEP));
    const step = arc / pieces;
    const length = (step * orbit) / 0.75;
    const thickness = (4 + swell * 4) * frameScale * terms.thickness;
    const base = placed.silent ? 0.12 : kind === PENDING ? 0.22 : 0.28;
    for (let piece = 0; piece < pieces; piece += 1) {
      const at = start + (piece + 0.5) * step;
      const reached = (piece + 0.5) * step <= progress;
      const ux = Math.cos(at);
      const uy = Math.sin(at);
      ctx.setTransform(-uy, ux, -ux, -uy, cx + ux * orbit, cy + uy * orbit);
      ctx.globalAlpha = lineAlpha * Math.min(1, base + swell * (reached ? 0.6 : 0.25));
      ctx.drawImage(placed.tint.arc, -length / 2, -thickness / 2, length, thickness);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (kind === PENDING) return;

    // The head waits at the onset, travels while the note sounds, and lingers
    // at the release as it fades, with a dim twin already waiting at the onset.
    const after = kind === PLAYING && !frameReducedMotion && !sounding && since < 0.5;
    const headAt = start + (after ? arc : progress);
    const size = (14 + swell * 22) * frameScale;
    ctx.globalAlpha = lineAlpha * (placed.silent ? 0.15 : 0.3 + swell * 0.7);
    ctx.drawImage(
      placed.tint.head,
      cx + Math.cos(headAt) * orbit - size / 2,
      cy + Math.sin(headAt) * orbit - size / 2,
      size,
      size,
    );
    if (after) {
      const waiting = 14 * frameScale;
      ctx.globalAlpha = lineAlpha * 0.3;
      ctx.drawImage(
        placed.tint.head,
        cx + Math.cos(start) * orbit - waiting / 2,
        cy + Math.sin(start) * orbit - waiting / 2,
        waiting,
        waiting,
      );
    }
  }

  /**
   * Paint the Looper. Cheap when nothing plays: with no running loop and the
   * fade finished, it returns before touching the canvas.
   */
  function renderLooper(
    ctx: CanvasRenderingContext2D,
    config: LooperConfig,
    composition: StageComposition,
    source: LooperStageSource,
    key: ChromaticNote,
    mode: MusicalMode,
    reducedMotion: boolean,
    now: number,
  ) {
    const dt = lastNow ? Math.min(0.1, Math.max(0, now - lastNow) / 1000) : 0;
    lastNow = now;
    const hasMembers = source.members.length > 0;
    const live = hasMembers && source.running;
    const target = live ? 1 : 0;
    presence = reducedMotion
      ? target
      : presence + (target - presence) * (1 - Math.exp(-dt / (FADE_S / 3)));
    if (presence < 0.004 && !live) {
      presence = 0;
      return;
    }
    if (!config.isEnabled || config.strength <= 0 || composition.suspended) return;

    // Sprites carry Ivory; a canvas with other tokens rebuilds them.
    if (tokensFor !== ctx) {
      const tokens = readTokens(ctx);
      if (tokens.ivory.join() !== ivory.join() || tokens.ink.join() !== ink.join()) {
        ivory = tokens.ivory;
        ink = tokens.ink;
        tints.clear();
        tintKey = null;
        fieldMembers = null;
        front = null;
      }
      tokensFor = ctx;
    }

    // Keep the last field while fading out after the loop is cleared.
    periodCount = 0;
    if (hasMembers) {
      turnMs = looperTurnMs(source);
      positionMs = source.positionMs();
      turnPhase = looperPhase(positionMs, turnMs);
      if (
        source.members !== fieldMembers
        || source.bpm !== fieldBpm
        || key !== fieldKey
        || mode !== fieldMode
        || dynamicColorConfig.value !== fieldRecipe
      ) {
        rebuildField(source, key, mode);
        pendingNotes = null;
      }
      held.length = 0;
      place(source.heldNotes(), source.members.length, source.members.length + 1,
        turnMs, 1, false, held, key, mode);
      const nextPending = source.pendingNotes();
      if (nextPending !== pendingNotes || turnMs !== pendingTurn) {
        pendingNotes = nextPending;
        pendingTurn = turnMs;
        pending.length = 0;
        place(nextPending, source.members.length, source.members.length + 1,
          turnMs, 1, true, pending, key, mode);
      }
    } else {
      held.length = 0;
      pending.length = 0;
      pendingNotes = null;
    }
    if (!turnMs) return;

    if (config.strength !== termsStrength
      || config.definition !== termsDefinition
      || config.spread !== termsSpread) {
      termsStrength = config.strength;
      termsDefinition = config.definition;
      termsSpread = config.spread;
      resolveTerms(config, terms);
    }
    if (terms.gain <= 0) return;

    if (!wash) {
      wash = document.createElement("canvas");
      washCtx = wash.getContext("2d");
    }
    if (!washCtx) return;

    const { usable, centerX: cx } = composition;
    const cy = composition.centerY - usable.height * 0.04;
    const radius = Math.min(usable.width, usable.height) * 0.5;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // The front turns the whole field. Reduced Motion keeps it out.
    if (!reducedMotion) {
      const frontReach = Math.hypot(usable.width, usable.height) * 0.62;
      const size = Math.max(8, Math.ceil((frontReach * 2) / WASH_SCALE));
      if (!front || Math.abs(frontSize - size) > 1) {
        frontSize = size;
        front = frontSprite(size, ivory, ink);
      }
      if (front) {
        ctx.translate(cx, cy);
        ctx.rotate(turnPhase * TAU - Math.PI / 2);
        const span = frontReach * (0.6 + terms.reach * 0.4);
        ctx.globalAlpha = presence * terms.frontAlpha;
        ctx.drawImage(front, -span, -span, span * 2, span * 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }

    const washWidth = Math.max(2, Math.ceil(usable.width / WASH_SCALE));
    const washHeight = Math.max(2, Math.ceil(usable.height / WASH_SCALE));
    if (wash!.width !== washWidth || wash!.height !== washHeight) {
      wash!.width = washWidth;
      wash!.height = washHeight;
    }
    washCtx.setTransform(1, 0, 0, 1, 0, 0);
    washCtx.globalCompositeOperation = "source-over";
    washCtx.clearRect(0, 0, washWidth, washHeight);
    washCtx.globalCompositeOperation = "lighter";
    ctx.globalCompositeOperation = "lighter";

    frameCtx = ctx;
    frameWash = washCtx;
    frameReducedMotion = reducedMotion;
    frameCx = cx;
    frameCy = cy;
    frameRadius = radius;
    frameScale = radius / 190;
    frameWashLength = radius * 0.62 * terms.washReach;
    frameLineAlpha = Math.min(1, terms.line * terms.gain * presence);
    frameWashX = usable.x;
    frameWashY = usable.y;

    for (let i = 0; i < field.length; i += 1) paintNote(field.items[i], PLAYING);
    for (let i = 0; i < pending.length; i += 1) paintNote(pending.items[i], PENDING);
    for (let i = 0; i < held.length; i += 1) paintNote(held.items[i], HELD);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = presence;
    ctx.drawImage(wash!, usable.x, usable.y, washWidth * WASH_SCALE, washHeight * WASH_SCALE);
    ctx.restore();
    frameCtx = null;
    frameWash = null;
  }

  function dispose() {
    tints.clear();
    pitches.clear();
    field.items.length = 0;
    held.items.length = 0;
    pending.items.length = 0;
    field.length = held.length = pending.length = 0;
    fieldMembers = null;
    pendingNotes = null;
    front = null;
    wash = null;
    washCtx = null;
    presence = 0;
    lastNow = 0;
    turnMs = 0;
  }

  return { renderLooper, dispose };
}
