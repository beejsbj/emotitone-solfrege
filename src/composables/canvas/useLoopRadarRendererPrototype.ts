/**
 * PROTOTYPE — throwaway. Not for main.
 *
 * The loop as Stage presence. While a loop runs, the Atmosphere turns into a
 * slow radar: an Ivory beam sweeps once per loop, clockwise from twelve, and
 * every layer's notes sit in the field as spots of Music Color light.
 *
 *   angle  = time in the loop
 *   radius = layer (oldest innermost), pitch rising outward inside its band
 *   light  = phosphor: a spot blooms as the beam crosses it, holds while the
 *            note sounds, then decays behind the beam to a resting ember
 *
 * Silent layers stay as dim embers that never bloom. Notes of the open take
 * that are not laid down yet ride the outermost band as hollow ghosts.
 * See src/stores/loopPrototype.ts for the question the prototype answers.
 */
import { computed } from "vue";
import { CHROMATIC_NOTES } from "@/data";
import { resolveMusicColorSampleByPitchClass } from "@/services/musicColor";
import { useLoopPrototypeStore, type LoopLayer } from "@/stores/loopPrototype";
import { useMusicStore } from "@/stores/music";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";
import { useVisualConfig } from "../useVisualConfig";
import type { StageComposition } from "./stageRuntime";

const TAU = Math.PI * 2;
const IVORY = "244, 239, 230";
const INK = "#0A0908";
const IVORY_CSS = `rgb(${IVORY})`;
/** Beam trail behind the leading edge, as a fraction of a turn. */
const TRAIL = 0.3;
const BEAM_SCALE = 0.5;
const SPRITE = 64;
const INNER = 0.3;
/** Ember a spot rests at between sweeps (audible / silent). */
const FLOOR = 0.2;
const SILENT = 0.26;
const FADE_S = 0.9;
const NO_DASH: number[] = [];
const SILENT_DASH = [2, 5];

interface Spot {
  cos: number;
  sin: number;
  angle: number;
  /** 0..1 of the radar radius. */
  radius: number;
  phase: number;
  durationMs: number;
  sweep: number;
  css: string;
  sprite: HTMLCanvasElement;
  silent: boolean;
}

interface Ring {
  radius: number;
  silent: boolean;
}

interface Tint {
  css: string;
  sprite: HTMLCanvasElement;
}

function glowSprite(rgb: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  const ctx = canvas.getContext("2d")!;
  const half = SPRITE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `rgba(${rgb}, 1)`);
  gradient.addColorStop(0.2, `rgba(${rgb}, 0.55)`);
  gradient.addColorStop(0.5, `rgba(${rgb}, 0.18)`);
  gradient.addColorStop(0.75, `rgba(${rgb}, 0.05)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE, SPRITE);
  return canvas;
}

export function useLoopRadarRendererPrototype() {
  const loop = useLoopPrototypeStore();
  const musicStore = useMusicStore();
  const { dynamicColorConfig } = useVisualConfig();

  // Music Color per (pitch class, octave) in the current key and mode.
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
      const rgb = srgb
        ? `${Math.round(srgb.r * 255)}, ${Math.round(srgb.g * 255)}, ${Math.round(srgb.b * 255)}`
        : IVORY;
      tint = { css: `rgb(${rgb})`, sprite: glowSprite(rgb) };
      tints.set(id, tint);
    }
    return tint;
  }

  /** One band per layer plus the groove the open take lands in. */
  const bandWidth = computed(() => (1 - INNER) / Math.max(2, loop.layers.length + 1));

  function place(notes: PatternNote[], band: number, lengthMs: number, silent: boolean, into: Spot[]) {
    if (!notes.length) return;
    let low = Infinity;
    let high = -Infinity;
    for (const note of notes) {
      const midi = loop.describe(note).midi;
      if (midi < low) low = midi;
      if (midi > high) high = midi;
    }
    const span = Math.max(1, high - low);
    const base = INNER + band * bandWidth.value;
    for (const note of notes) {
      const { chroma, midi, octave } = loop.describe(note);
      const phase = (((note.pressTime % lengthMs) + lengthMs) % lengthMs) / lengthMs;
      const angle = phase * TAU - Math.PI / 2;
      const tint = tintOf(chroma, octave);
      into.push({
        cos: Math.cos(angle),
        sin: Math.sin(angle),
        angle,
        radius: base + bandWidth.value * (0.22 + 0.56 * ((midi - low) / span)),
        phase,
        durationMs: Math.max(30, note.duration),
        sweep: Math.min(TAU * 0.98, Math.max(0, (note.duration / lengthMs) * TAU)),
        css: tint.css,
        sprite: tint.sprite,
        silent,
      });
    }
  }

  // Rebuilt only when layers, mutes, solo, key, mode or colour config change.
  const field = computed(() => {
    void dynamicColorConfig.value;
    const spots: Spot[] = [];
    const rings: Ring[] = [];
    const lengthMs = loop.lengthMs;
    if (!lengthMs) return { spots, rings };
    loop.layers.forEach((layer: LoopLayer, index) => {
      const silent = loop.isSilent(layer);
      rings.push({ radius: INNER + (index + 0.5) * bandWidth.value, silent });
      place(loop.soundingNotes(layer), index, lengthMs, silent, spots);
    });
    return { spots, rings };
  });

  let spots: Spot[] = [];
  let rings: Ring[] = [];
  let ghosts: Spot[] = [];
  let lengthMs = 0;
  let bars = 0;
  let phase = 0;
  let presence = 0;
  let lastNow = 0;
  let frame = 0;

  // The beam: an Ivory conic trail with radial falloff, painted once per size.
  let beam: HTMLCanvasElement | null = null;
  let beamRadius = 0;

  function beamSprite(radius: number): HTMLCanvasElement {
    if (beam && Math.abs(beamRadius - radius) < 2) return beam;
    beamRadius = radius;
    const size = Math.max(2, Math.ceil(radius * 2 * BEAM_SCALE));
    beam = beam ?? document.createElement("canvas");
    beam.width = size;
    beam.height = size;
    const bctx = beam.getContext("2d")!;
    const half = size / 2;
    bctx.clearRect(0, 0, size, size);
    const conic = bctx.createConicGradient(0, half, half);
    conic.addColorStop(0, `rgba(${IVORY}, 0)`);
    conic.addColorStop(1 - TRAIL, `rgba(${IVORY}, 0)`);
    conic.addColorStop(1 - TRAIL * 0.6, `rgba(${IVORY}, 0.016)`);
    conic.addColorStop(1 - TRAIL * 0.3, `rgba(${IVORY}, 0.04)`);
    conic.addColorStop(1 - TRAIL * 0.08, `rgba(${IVORY}, 0.075)`);
    conic.addColorStop(1, `rgba(${IVORY}, 0.11)`);
    bctx.fillStyle = conic;
    bctx.fillRect(0, 0, size, size);
    bctx.globalCompositeOperation = "destination-in";
    const falloff = bctx.createRadialGradient(half, half, 0, half, half, half);
    falloff.addColorStop(0, "rgba(0,0,0,0.4)");
    falloff.addColorStop(0.1, "rgba(0,0,0,1)");
    falloff.addColorStop(0.45, "rgba(0,0,0,0.7)");
    falloff.addColorStop(0.75, "rgba(0,0,0,0.25)");
    falloff.addColorStop(1, "rgba(0,0,0,0)");
    bctx.fillStyle = falloff;
    bctx.fillRect(0, 0, size, size);
    bctx.globalCompositeOperation = "source-over";
    return beam;
  }

  let edge: CanvasGradient | null = null;
  let edgeRadius = 0;
  function edgeGradient(ctx: CanvasRenderingContext2D, radius: number) {
    if (edge && edgeRadius === radius) return edge;
    edgeRadius = radius;
    edge = ctx.createLinearGradient(0, 0, radius, 0);
    edge.addColorStop(0, `rgba(${IVORY}, 0.04)`);
    edge.addColorStop(0.12, `rgba(${IVORY}, 0.24)`);
    edge.addColorStop(0.62, `rgba(${IVORY}, 0.08)`);
    edge.addColorStop(1, `rgba(${IVORY}, 0)`);
    return edge;
  }

  function refreshGhosts() {
    ghosts = [];
    const pending = loop.pendingNotes();
    if (pending.length && lengthMs) place(pending, loop.layers.length, lengthMs, false, ghosts);
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
    if (loop.hasLoop) {
      const built = field.value;
      spots = built.spots;
      rings = built.rings;
      lengthMs = loop.lengthMs;
      bars = loop.bars;
      phase = loop.phase();
      if (++frame % 8 === 0) refreshGhosts();
    } else {
      ghosts = [];
    }
    if (!lengthMs) return;

    const { usable, centerX: cx } = composition;
    // Sit a touch above centre: the drawer's edge pulls the eye downward.
    const cy = composition.centerY - usable.height * 0.03;
    const radius = Math.min(usable.width, usable.height) * 0.47;
    const reach = radius * 1.45;
    const hand = phase * TAU - Math.PI / 2;

    ctx.save();
    // The normal Atmosphere recedes so the radar can carry the field.
    ctx.globalAlpha = 0.5 * presence;
    ctx.fillStyle = INK;
    ctx.fillRect(usable.x, usable.y, usable.width, usable.height);

    // Range rings: one hairline per layer, dashed when the layer is silent.
    ctx.lineWidth = 1;
    for (const ring of rings) {
      ctx.globalAlpha = presence * (ring.silent ? 0.07 : 0.1);
      ctx.strokeStyle = IVORY_CSS;
      ctx.setLineDash(ring.silent ? SILENT_DASH : NO_DASH);
      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius * radius, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash(NO_DASH);
    ctx.globalAlpha = presence * 0.07;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.04, 0, TAU);
    ctx.stroke();

    // Bar and beat ticks on the rim.
    const beats = Math.max(1, bars) * 4;
    for (let index = 0; index < beats; index += 1) {
      const isBar = index % 4 === 0;
      const angle = (index / beats) * TAU - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const outer = radius * 1.04;
      const inner = outer - (isBar ? 9 : 4);
      ctx.globalAlpha = presence * (isBar ? 0.3 : 0.12);
      ctx.beginPath();
      ctx.moveTo(cx + cos * inner, cy + sin * inner);
      ctx.lineTo(cx + cos * outer, cy + sin * outer);
      ctx.stroke();
    }

    // The sweep. Reduced Motion keeps the field still: no beam.
    if (!reducedMotion) {
      const sprite = beamSprite(reach);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(hand);
      ctx.globalAlpha = presence;
      ctx.drawImage(sprite, -reach, -reach, reach * 2, reach * 2);
      ctx.strokeStyle = edgeGradient(ctx, reach);
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(reach, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Phosphor: blooms as the beam crosses, holds while sounding, decays behind.
    const decayMs = Math.min(2600, Math.max(500, lengthMs * 0.4));
    const glowBase = Math.max(18, radius * bandWidth.value * 1.25);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const spot of spots) {
      let since = phase - spot.phase;
      if (since < 0) since += 1;
      const sinceMs = since * lengthMs;
      const sounding = sinceMs < spot.durationMs;
      let glow: number;
      let flash: number;
      if (reducedMotion) {
        glow = sounding ? 1 : 0;
        flash = 0;
      } else {
        glow = sounding ? 1 : Math.exp(-(sinceMs - spot.durationMs) / decayMs);
        flash = Math.exp(-sinceMs / 260);
      }
      if (spot.silent) {
        glow = 0;
        flash = 0;
      }
      const level = (spot.silent ? SILENT : FLOOR + (1 - FLOOR) * glow) * presence;
      const x = cx + spot.cos * spot.radius * radius;
      const y = cy + spot.sin * spot.radius * radius;

      // Atmosphere: the soft light the spot throws into the field.
      const size = glowBase * (0.9 + glow * 1.1 + flash * 1.6);
      ctx.globalAlpha = Math.min(1, level * (0.45 + flash * 0.45));
      ctx.drawImage(spot.sprite, x - size / 2, y - size / 2, size, size);

      // The trace of the note's length along its ring.
      if (spot.sweep > 0.02) {
        ctx.globalAlpha = level * 0.55;
        ctx.strokeStyle = spot.css;
        ctx.lineWidth = 1.5 + glow * 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, spot.radius * radius, spot.angle, spot.angle + spot.sweep);
        ctx.stroke();
      }

      // The core.
      ctx.globalAlpha = Math.min(1, level * 1.2);
      ctx.fillStyle = spot.css;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + glow * 1.6 + flash * 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    // The open take, not yet laid down: hollow ghosts on the outer groove.
    ctx.lineWidth = 1.25;
    for (const ghost of ghosts) {
      const x = cx + ghost.cos * ghost.radius * radius;
      const y = cy + ghost.sin * ghost.radius * radius;
      ctx.globalAlpha = presence * 0.55;
      ctx.strokeStyle = ghost.css;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, TAU);
      ctx.stroke();
    }

    // Hub.
    ctx.globalAlpha = presence * 0.4;
    ctx.fillStyle = IVORY_CSS;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  return { render };
}
