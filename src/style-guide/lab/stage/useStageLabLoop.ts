import { onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { useMusicColorProvider } from "@/composables/useMusicColorConfig";
import { useMusicColorClock } from "@/composables/useMusicColorClock";
import { useHarmonicAnalysis } from "@/composables/useHarmonicAnalysis";
import { useAmbientRenderer } from "@/composables/canvas/useAmbientRenderer";
import { useStringRenderer } from "@/composables/canvas/useStringRenderer";
import { useHilbertScopeRenderer } from "@/composables/canvas/useHilbertScopeRenderer";
import { useBlobRenderer } from "@/composables/canvas/useBlobRenderer";
import { useBlobFieldRenderer } from "@/composables/canvas/useBlobFieldRenderer";
import { useHarmonicGeometryRenderer } from "@/composables/canvas/useHarmonicGeometryRenderer";
import { useParticleSystem } from "@/composables/canvas/useParticleSystem";
import { resolveStageComposition, type StageRect } from "@/composables/canvas/stageRuntime";
import { STAGE_BODY_SIZE_BASE_RATIO } from "@/services/stageAppearance";
import {
  musicColorValueToCss,
  resolveMusicColorSampleByPitchClass,
  tuneMusicColorValue,
} from "@/services/musicColor";
import { CHROMATIC_NOTES } from "@/data";
import type { ActiveNote, ChromaticNote } from "@/types/music";
import type { StageLabGeometryDirection, StageLabStageDirection } from "@/types/stageLab";
import type { StageLabConductor } from "./labConductor";
import { connectLabHilbert, type LabHilbertPair } from "./labHilbert";
import type {
  GeometryDirectionPainter,
  LabFrame,
  LabNoteColor,
  LabTokens,
  StageDirectionPainter,
} from "./painters/types";
import { createPhosphorPainter } from "./painters/phosphor";
import { createPasteUpPainter } from "./painters/pasteUp";
import { createLedPainter } from "./painters/led";
import { createFacetsPainter } from "./painters/facets";
import { createChordShapePainter } from "./painters/chordShape";
import { createResonancePainter } from "./painters/resonance";

/*
 * The lab's frame loop. It mirrors production `useUnifiedCanvas.renderFrame`
 * layer order and inputs, but lets one unit's layers come from a direction
 * painter. Production renderers keep every layer the direction does not own,
 * on their own CSS-resolution canvases; direction layers paint at device
 * resolution (capped at 2×) on separate canvases stacked in the same order.
 */

export interface StageLabCanvases {
  back: Ref<HTMLCanvasElement | null>;
  middle: Ref<HTMLCanvasElement | null>;
  front: Ref<HTMLCanvasElement | null>;
}

export interface StageLabLoopOptions {
  stage: StageLabStageDirection;
  geometry: StageLabGeometryDirection;
  mode: Ref<"merge" | "web">;
  conductor: StageLabConductor;
  usableRect: Readonly<Ref<StageRect>>;
  reducedMotion: Readonly<Ref<boolean>>;
}

function readTokens(): LabTokens {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: read("--ink", "#0A0908"),
    ink2: read("--ink-2", "#141210"),
    ink3: read("--ink-3", "#1C1916"),
    ink4: read("--ink-4", "#25211D"),
    ink5: read("--ink-5", "#3A352F"),
    ivory: read("--ivory", "#F4EFE6"),
    ivory2: read("--ivory-2", "#C9C2B5"),
    ivory3: read("--ivory-3", "#8F877B"),
    ivory4: read("--ivory-4", "#514B42"),
    display: read("--font-display", '"Lets Jazz", sans-serif'),
    mono: read("--font-mono", "monospace"),
  };
}

const STAGE_PAINTERS: Record<Exclude<StageLabStageDirection, "production">, () => StageDirectionPainter> = {
  phosphor: createPhosphorPainter,
  "paste-up": createPasteUpPainter,
  led: createLedPainter,
};

const GEOMETRY_PAINTERS: Record<Exclude<StageLabGeometryDirection, "production">, () => GeometryDirectionPainter> = {
  facets: createFacetsPainter,
  "chord-shape": createChordShapePainter,
  resonance: createResonancePainter,
};

export function useStageLabLoop(canvases: StageLabCanvases, options: StageLabLoopOptions) {
  const { conductor } = options;
  const musicStore = useMusicStore();
  const {
    blobConfig,
    ambientConfig,
    particleConfig,
    stringConfig,
    animationConfig,
    hilbertScopeConfig,
  } = useVisualConfig();
  // The same Music Color provider and phase clock production consumers sample.
  const { config: dynamicColorConfig, clockKey } = useMusicColorProvider();
  const colorClock = useMusicColorClock(
    () => dynamicColorConfig.value.hueMotionEnabled,
    () => dynamicColorConfig.value.animationSpeed,
    clockKey,
  );
  const getNotes = () => conductor.activeNotes.value;
  const harmonic = useHarmonicAnalysis(getNotes);

  const ambient = useAmbientRenderer();
  const strings = useStringRenderer();
  const hilbert = useHilbertScopeRenderer();
  const blobs = useBlobRenderer();
  const blobField = useBlobFieldRenderer();
  const geometryLabels = useHarmonicGeometryRenderer();
  const particles = useParticleSystem();

  const stagePainter = options.stage === "production" ? null : STAGE_PAINTERS[options.stage]();
  const geometryPainter = options.geometry === "production" ? null : GEOMETRY_PAINTERS[options.geometry]();

  let tokens: LabTokens | null = null;
  let labHilbert: LabHilbertPair | null = null;
  let frameRequest = 0;
  let startedAt = 0;
  let previous = 0;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let lastLead: Pick<ActiveNote, "pitchClassIndex" | "octave"> = { pitchClassIndex: 0, octave: 4 };
  const gradientCache = new Map<string, CanvasGradient>();
  const expiryTimers = new Set<number>();

  const noteColor: LabNoteColor = (note, tune) => {
    const pitch = CHROMATIC_NOTES[((note.pitchClassIndex ?? 0) % 12 + 12) % 12] as ChromaticNote;
    const sample = resolveMusicColorSampleByPitchClass(
      pitch, "major", "C", note.octave ?? 4, dynamicColorConfig.value, "fixed-chromatic",
      dynamicColorConfig.value.hueMotionEnabled && !options.reducedMotion.value ? colorClock.phaseCycles.value : null,
    )?.sample.primary;
    if (!sample) return "transparent";
    return musicColorValueToCss(tune
      ? tuneMusicColorValue(sample, { lightnessMultiplier: tune.l, chromaMultiplier: tune.c, alpha: tune.alpha })
      : sample);
  };

  const dprFor = (owner: "production" | "direction") =>
    owner === "production" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const owners = () => ({
    back: stagePainter ? "direction" : "production",
    middle: geometryPainter ? "direction" : "production",
    front: stagePainter ? "direction" : "production",
  } as const);

  const sizeCanvases = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const own = owners();
    (["back", "middle", "front"] as const).forEach((layer) => {
      const canvas = canvases[layer].value;
      if (!canvas) return;
      const dpr = dprFor(own[layer]);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    });
    gradientCache.clear();
  };

  const contextFor = (layer: "back" | "middle" | "front") => {
    const canvas = canvases[layer].value;
    const ctx = canvas?.getContext("2d") ?? null;
    if (!ctx || !canvas) return null;
    const dpr = canvas.width / Math.max(1, width);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return ctx;
  };

  const getComposition = () => {
    const usable = options.usableRect.value;
    const radius = Math.max(
      blobConfig.value.minSize,
      Math.min(blobConfig.value.maxSize, Math.min(usable.width, usable.height) * STAGE_BODY_SIZE_BASE_RATIO),
    );
    return resolveStageComposition(usable, radius, hilbertScopeConfig.value.sizeRatio, 1);
  };

  const hydrate = (notes: readonly ActiveNote[]) => {
    notes.forEach((note) => {
      if (blobs.activeBlobs.has(note.noteId)) return;
      blobs.createBlob(note.solfege, note.frequency, 0, 0, width, height, blobConfig.value,
        note.noteId, note.key, note.mode, note.octave, note.noteName);
    });
  };

  const frameBase = (ctx: CanvasRenderingContext2D, now: number): LabFrame => {
    const elapsed = (now - startedAt) / 1000;
    const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
    const notes = getNotes();
    if (notes[0]) lastLead = notes[0];
    return {
      ctx,
      width,
      height,
      elapsed,
      dt,
      composition: getComposition(),
      audio: conductor.audio.sample(now),
      reducedMotion: options.reducedMotion.value,
      notes,
      wave: labHilbert && conductor.isAudioRunning() && !options.reducedMotion.value ? labHilbert.read() : null,
      tokens: tokens ?? (tokens = readTokens()),
      noteColor,
      leadNote: lastLead,
    };
  };

  const render = (now: number) => {
    frameRequest = requestAnimationFrame(render);
    const back = contextFor("back");
    const middle = contextFor("middle");
    const front = contextFor("front");
    if (!back || !middle || !front) return;

    const base = frameBase(back, now);
    previous = now;
    const { composition, audio, reducedMotion, notes, elapsed } = base;
    hydrate(notes);

    // Back: atmosphere, strings, scope.
    if (stagePainter) {
      stagePainter.atmosphere(base);
      if (!composition.suspended) {
        strings.updateStringProperties(stringConfig.value, animationConfig.value, musicStore, audio, reducedMotion, notes);
        stagePainter.strings(base, strings.strings.value);
        stagePainter.scope(base);
      }
    } else {
      if (ambientConfig.value.isEnabled) {
        ambient.renderAmbientBackground(back, elapsed, ambientConfig.value, width, height, musicStore,
          (key, create) => gradientCache.get(key) ?? gradientCache.set(key, create()).get(key)!,
          audio, reducedMotion, notes);
      }
      if (!composition.suspended) {
        if (stringConfig.value.isEnabled) {
          strings.updateStringProperties(stringConfig.value, animationConfig.value, musicStore, audio, reducedMotion, notes);
          strings.renderStrings(back, elapsed, composition.usable.height, reducedMotion);
        }
        if (hilbertScopeConfig.value.isEnabled) {
          hilbert.renderHilbertScope(back, elapsed, hilbertScopeConfig.value, width, height, composition,
            audio, reducedMotion, notes);
        }
      }
    }
    if (composition.suspended) return;

    // Middle: bodies and relationships, then production lettering.
    blobs.reprojectBlobs(composition, blobConfig.value, reducedMotion);
    blobs.prepareBlobs(middle, blobConfig.value, { reducedMotion, bounds: composition.usable, elapsed });
    const scene = geometryLabels.buildScene(harmonic.snapshot.value, blobs.activeBlobs, blobConfig.value, width, height);
    const prepared = blobs.getPreparedBlobFrames();
    if (geometryPainter) {
      geometryPainter.bodies({ ...base, ctx: middle }, prepared, scene, options.mode.value);
    } else if (!blobField.renderBlobField(middle, prepared, blobConfig.value, scene)) {
      blobs.renderBlobs(middle, elapsed, blobConfig.value, musicStore, true);
    }

    // Front: flecks, then lettering above everything, as in production.
    if (stagePainter) {
      if (!reducedMotion) stagePainter.flecks({ ...base, ctx: front });
    } else if (particleConfig.value.isEnabled && !reducedMotion) {
      particles.renderParticles(front, elapsed, particleConfig.value);
    }
    geometryLabels.renderLabels(front, scene, blobConfig.value, { now, reducedMotion, bounds: composition.usable });
  };

  const onPlayed = (event: Event) => {
    const detail = (event as CustomEvent).detail as ActiveNote;
    const note = getNotes().find((candidate) => candidate.noteId === detail.noteId) ?? detail;
    blobs.createBlob(note.solfege, note.frequency, 0, 0, width, height, blobConfig.value,
      note.noteId, note.key, note.mode, note.octave, note.noteName);
    blobs.reprojectBlobs(getComposition(), blobConfig.value, true);
    harmonic.notePlayed(note);
    const ctx = canvases.front.value?.getContext("2d");
    if (options.reducedMotion.value || !ctx) return;
    if (stagePainter) {
      stagePainter.attack(frameBase(ctx, performance.now()), note);
    } else {
      const count = Math.max(5, Math.floor(particleConfig.value.count / Math.max(1, getNotes().length - 1)));
      particles.createParticles(note.solfege, particleConfig.value, width, getComposition().usable.height,
        note.mode, note.key, count, { pitchClassIndex: note.pitchClassIndex, octave: note.octave });
    }
  };

  const onReleased = (event: Event) => {
    const detail = (event as CustomEvent).detail as ActiveNote;
    harmonic.noteReleased(detail.noteId);
    blobs.startBlobFadeOutById(detail.noteId);
    const exit = Math.min(blobConfig.value.fadeOutDuration, blobConfig.value.scaleOutDuration);
    const timer = window.setTimeout(() => {
      expiryTimers.delete(timer);
      harmonic.noteExpired(detail.noteId);
    }, exit * 1000 + 16);
    expiryTimers.add(timer);
  };

  const stopReducedMotion = watch(options.reducedMotion, (still) => {
    if (!still) return;
    particles.clearAllParticles();
    stagePainter?.clear();
  });

  onMounted(() => {
    sizeCanvases();
    const source = conductor.audio.initialize();
    strings.initializeStrings(stringConfig.value, width, height, musicStore.solfegeData);
    strings.addEventListeners(conductor.eventTarget);
    hilbert.initializeHilbertScope(width, height, hilbertScopeConfig.value, source);
    if (source) labHilbert = connectLabHilbert(source);
    conductor.eventTarget.addEventListener("note-played", onPlayed);
    conductor.eventTarget.addEventListener("note-released", onReleased);
    window.addEventListener("resize", sizeCanvases);
    startedAt = previous = performance.now();
    frameRequest = requestAnimationFrame(render);
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(frameRequest);
    stopReducedMotion();
    window.removeEventListener("resize", sizeCanvases);
    conductor.eventTarget.removeEventListener("note-played", onPlayed);
    conductor.eventTarget.removeEventListener("note-released", onReleased);
    expiryTimers.forEach((timer) => window.clearTimeout(timer));
    strings.removeEventListeners();
    strings.clearAllStrings();
    hilbert.cleanup();
    labHilbert?.disconnect();
    conductor.audio.cleanup();
    blobs.clearAllBlobs();
    blobField.dispose();
    particles.clearAllParticles();
    stagePainter?.clear();
    geometryPainter?.clear();
    harmonic.reset();
  });
}
