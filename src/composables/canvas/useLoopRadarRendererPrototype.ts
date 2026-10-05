/**
 * PROTOTYPE — throwaway. Not for main.
 *
 * The loop as weather. While a loop runs, the Atmosphere starts turning: a
 * broad, edgeless front of light (with a shadow opposite it) rotates once per
 * loop, clockwise from twelve, and every layer's notes hang in the fog as
 * diffuse pools of Music Color that swell as the front pushes through them and
 * sink back behind it. Nothing is drawn as a line, ring or point.
 *
 *   angle    = time in the loop
 *   distance = layer (oldest nearest the centre), nudged outward by pitch
 *   depth    = later layers sit further out, larger and softer
 *
 * Three Stage knobs (Loop Glow: Strength, Definition, Spread) shape it; their
 * defaults reproduce the look this shipped with.
 *
 * Silent layers stay as faint, unresponsive haze. Notes of the open take that
 * are not laid down yet are a barely-there tint.
 * See src/stores/loopPrototype.ts for the question the prototype answers.
 */
import { computed } from "vue";
import { CHROMATIC_NOTES } from "@/data";
import { resolveMusicColorSampleByPitchClass } from "@/services/musicColor";
import { useLoopPrototypeStore, type LoopLayer } from "@/stores/loopPrototype";
import { useMusicStore } from "@/stores/music";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";
import { readLoopGlow } from "@/services/stageAppearance";
import { useVisualConfig } from "../useVisualConfig";
import type { StageComposition } from "./stageRuntime";

const TAU = Math.PI * 2;
const IVORY = "244, 239, 230";
const INK = "10, 9, 8";
/** Fog is painted at 1/SCALE and upscaled: softness without a blur pass. */
const SCALE = 6;
const SPRITE = 48;
/** Front: how far light leads and trails the turning point, in turns. */
const LEAD = 0.07;
const TRAIL = 0.38;
const FADE_S = 0.9;

interface Pool {
  cos: number;
  sin: number;
  /** Tangent to the turn, so the pool smears along the weather's motion. */
  angle: number;
  phase: number;
  /** Distance from the centre by layer depth, 0..1 of the radar radius. */
  distance: number;
  /** Pitch and scatter offset from that distance; Spread scales it. */
  jitter: number;
  /** Diameter, 0..1 of the radar radius. */
  size: number;
  durationMs: number;
  sprite: HTMLCanvasElement;
  silent: boolean;
}

/** Deterministic 0..1 from a number, so pools do not jump between rebuilds. */
function scatter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function poolSprite(rgb: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  const ctx = canvas.getContext("2d")!;
  const half = SPRITE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  // Roughly Gaussian, so neighbouring pools melt into one another.
  gradient.addColorStop(0, `rgba(${rgb}, 1)`);
  gradient.addColorStop(0.2, `rgba(${rgb}, 0.78)`);
  gradient.addColorStop(0.42, `rgba(${rgb}, 0.38)`);
  gradient.addColorStop(0.65, `rgba(${rgb}, 0.12)`);
  gradient.addColorStop(0.85, `rgba(${rgb}, 0.03)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE, SPRITE);
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

  /**
   * The Loop Glow knobs, resolved to render terms only when they change.
   * Every curve passes through 1 (or the shipped constant) at its default.
   */
  const knobs = computed(() => {
    const { strength, definition, spread } = readLoopGlow(ambientConfig.value);
    // Strength: 0 absent, 0.5 as shipped; above that it eases off, because
    // additive pools wash to white long before the knob would end.
    const gain = strength < 0.5 ? strength * 2 : 1 + (strength - 0.5) * 1.1;
    // Definition: pools shrink geometrically from 1.38x (haze) to 0.38x
    // (countable nodes), un-smear to round, and brighten to keep their energy.
    const tightness = 1.38 * Math.pow(0.2755, definition);
    const smear = Math.max(0, (1 - definition) / 0.75);
    // Spread: how far the light reaches, 0.55x gathered to 1.6x filling the Stage.
    const reach = spread < 0.5 ? 0.55 + spread * 0.9 : 1 + (spread - 0.5) * 1.2;
    return {
      gain,
      frontAlpha: strength < 0.5 ? strength : 0.5 + (strength - 0.5) * 0.6,
      size: tightness * Math.sqrt(reach),
      stretch: 1 + 0.5 * smear,
      swellStretch: 0.5 * smear,
      energy: 1 / tightness,
      reach,
      jitter: 0.4 + spread * 1.2,
    };
  });

  // Music Color per (pitch class, octave) in the current key and mode.
  const sprites = new Map<number, HTMLCanvasElement>();
  let tintKey: ChromaticNote | null = null;
  let tintMode: MusicalMode | null = null;
  let tintConfig: unknown = null;

  function spriteOf(chroma: number, octave: number): HTMLCanvasElement {
    const key = musicStore.currentKey as ChromaticNote;
    const mode = musicStore.currentMode as MusicalMode;
    const config = dynamicColorConfig.value;
    if (key !== tintKey || mode !== tintMode || config !== tintConfig) {
      sprites.clear();
      tintKey = key;
      tintMode = mode;
      tintConfig = config;
    }
    const id = chroma * 16 + octave;
    let sprite = sprites.get(id);
    if (!sprite) {
      const srgb = resolveMusicColorSampleByPitchClass(
        CHROMATIC_NOTES[((chroma % 12) + 12) % 12],
        mode,
        key,
        octave,
        config,
        "fixed-chromatic",
      )?.sample.primary.srgb;
      sprite = poolSprite(srgb
        ? `${Math.round(srgb.r * 255)}, ${Math.round(srgb.g * 255)}, ${Math.round(srgb.b * 255)}`
        : IVORY);
      sprites.set(id, sprite);
    }
    return sprite;
  }

  function place(notes: PatternNote[], depth: number, depths: number, lengthMs: number, silent: boolean, into: Pool[]) {
    if (!notes.length) return;
    let low = Infinity;
    let high = -Infinity;
    for (const note of notes) {
      const midi = loop.describe(note).midi;
      if (midi < low) low = midi;
      if (midi > high) high = midi;
    }
    const span = Math.max(1, high - low);
    const reach = depths > 1 ? depth / (depths - 1) : 0.5;
    for (const note of notes) {
      const { chroma, midi, octave } = loop.describe(note);
      const phase = (((note.pressTime % lengthMs) + lengthMs) % lengthMs) / lengthMs;
      const angle = phase * TAU - Math.PI / 2;
      into.push({
        cos: Math.cos(angle),
        sin: Math.sin(angle),
        angle: angle + Math.PI / 2,
        phase,
        // Pitch and a fixed per-note scatter break up any ring the layer would draw.
        distance: 0.36 + reach * 0.4,
        jitter: ((midi - low) / span - 0.5) * 0.3 + (scatter(note.pressTime + midi) - 0.5) * 0.14,
        size: (0.8 + reach * 0.35) * (0.85 + Math.min(0.5, note.duration / lengthMs) * 0.8),
        durationMs: Math.max(30, note.duration),
        sprite: spriteOf(chroma, octave),
        silent,
      });
    }
  }

  // Rebuilt only when layers, mutes, solo, key, mode or colour config change.
  const field = computed(() => {
    void dynamicColorConfig.value;
    const pools: Pool[] = [];
    const lengthMs = loop.lengthMs;
    if (!lengthMs) return pools;
    const depths = loop.layers.length;
    loop.layers.forEach((layer: LoopLayer, index) => {
      place(loop.soundingNotes(layer), index, depths, lengthMs, loop.isSilent(layer), pools);
    });
    return pools;
  });

  let pools: Pool[] = [];
  let ghosts: Pool[] = [];
  let lengthMs = 0;
  let phase = 0;
  let presence = 0;
  let lastNow = 0;
  let frame = 0;

  let front: HTMLCanvasElement | null = null;
  let frontReach = 0;
  let fog: HTMLCanvasElement | null = null;
  let fogCtx: CanvasRenderingContext2D | null = null;

  function refreshGhosts() {
    ghosts = [];
    const pending = loop.pendingNotes();
    if (pending.length && lengthMs) {
      const depths = loop.layers.length + 1;
      place(pending, depths - 1, depths, lengthMs, true, ghosts);
    }
  }

  /** How strongly the front is on a pool: swells just ahead, holds while sounding, sinks after. */
  function push(pool: Pool, reducedMotion: boolean): number {
    let since = phase - pool.phase;
    if (since < 0) since += 1;
    const sinceMs = since * lengthMs;
    if (sinceMs < pool.durationMs) return 1;
    if (reducedMotion) return 0;
    const ahead = 1 - since;
    const lead = ahead < LEAD ? 1 - ahead / LEAD : 0;
    const decayMs = Math.min(2800, Math.max(600, lengthMs * 0.45));
    return Math.max(lead * lead * 0.6, Math.exp(-(sinceMs - pool.durationMs) / decayMs));
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
      pools = field.value;
      lengthMs = loop.lengthMs;
      phase = loop.phase();
      if (++frame % 8 === 0) refreshGhosts();
    } else {
      ghosts = [];
    }
    if (!lengthMs) return;
    if (!fogCtx) {
      fog = document.createElement("canvas");
      fogCtx = fog.getContext("2d");
      if (!fogCtx) return;
    }

    const { usable, centerX: cx } = composition;
    const cy = composition.centerY - usable.height * 0.04;
    const radius = Math.min(usable.width, usable.height) * 0.5;
    const hand = phase * TAU - Math.PI / 2;
    const knob = knobs.value;
    if (knob.gain <= 0) return;

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

    // Pools of colour, painted small into the fog and upscaled.
    const fw = Math.max(2, Math.ceil(usable.width / SCALE));
    const fh = Math.max(2, Math.ceil(usable.height / SCALE));
    if (!fog) {
      ctx.restore();
      return;
    }
    if (fog.width !== fw || fog.height !== fh) {
      fog.width = fw;
      fog.height = fh;
    }
    fogCtx.setTransform(1, 0, 0, 1, 0, 0);
    fogCtx.globalCompositeOperation = "source-over";
    fogCtx.clearRect(0, 0, fw, fh);
    fogCtx.setTransform(1 / SCALE, 0, 0, 1 / SCALE, -usable.x / SCALE, -usable.y / SCALE);
    fogCtx.globalCompositeOperation = "lighter";
    for (const pool of pools) {
      const swell = pool.silent ? 0 : push(pool, reducedMotion);
      // Pushed: the front shoves a pool outward and along as it passes.
      const shove = reducedMotion ? 0 : swell * 0.07;
      const distance = (pool.distance + pool.jitter * knob.jitter + shove) * radius * knob.reach;
      const along = shove * 0.6 * radius;
      const x = cx + pool.cos * distance - pool.sin * along;
      const y = cy + pool.sin * distance + pool.cos * along;
      const size = pool.size * radius * knob.size * (1 + swell * 0.4);
      fogCtx.globalAlpha = Math.min(
        1,
        (pool.silent ? 0.06 : 0.1 + swell * 0.36) * knob.gain * knob.energy,
      );
      // Smeared along the turn: the front stretches what it pushes.
      const stretch = knob.stretch + swell * knob.swellStretch;
      const cos = Math.cos(pool.angle) / SCALE;
      const sin = Math.sin(pool.angle) / SCALE;
      fogCtx.setTransform(
        cos * stretch, sin * stretch, -sin, cos,
        (x - usable.x) / SCALE, (y - usable.y) / SCALE,
      );
      fogCtx.drawImage(pool.sprite, -size / 2, -size / 2, size, size);
    }
    fogCtx.setTransform(1 / SCALE, 0, 0, 1 / SCALE, -usable.x / SCALE, -usable.y / SCALE);
    for (const ghost of ghosts) {
      const size = ghost.size * radius * knob.size;
      const distance = (ghost.distance + ghost.jitter * knob.jitter) * radius * knob.reach;
      fogCtx.globalAlpha = Math.min(1, 0.045 * knob.gain * knob.energy);
      fogCtx.drawImage(
        ghost.sprite,
        cx + ghost.cos * distance - size / 2,
        cy + ghost.sin * distance - size / 2,
        size,
        size,
      );
    }

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = presence;
    ctx.drawImage(fog, usable.x, usable.y, fw * SCALE, fh * SCALE);
    ctx.restore();
  }

  return { render };
}
