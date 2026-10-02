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
import { STAGE_LAB_UNIT_IDS, type StageLabSelection, type StageLabUnitId } from "@/types/stageLab";
import type { StageLabConductor } from "./labConductor";
import { connectLabHilbert, type LabHilbertPair } from "./labHilbert";
import type {
  AtmospherePainter,
  BodiesPainter,
  FlecksPainter,
  LabFrame,
  LabNoteColor,
  LabTokens,
  LetteringPainter,
  ScopePainter,
  StringsPainter,
} from "./painters/types";
import { createPhosphorScope, createSparkFlecks, exposureStrings, graticuleAtmosphere } from "./painters/phosphor";
import { bandAtmosphere, createChadFlecks, createCutScope, stripStrings } from "./painters/pasteUp";
import { createColumnStrings, createDotScope, createPanelAtmosphere, createPixelFlecks } from "./painters/led";
import { createFacetsPainter } from "./painters/facets";
import { createChordShapePainter } from "./painters/chordShape";
import { createResonancePainter } from "./painters/resonance";
import { createReadoutLettering, createTapeLettering } from "./painters/lettering";

/*
 * The lab's frame loop. It mirrors production `useUnifiedCanvas.renderFrame`
 * layer order and inputs, but each Stage part can come from a direction
 * painter instead of its production renderer. Every part owns one canvas in
 * the same back-to-front order; production parts keep production's CSS
 * resolution, direction parts paint at device resolution (capped at 2×).
 */

export type StageLabCanvases = Record<StageLabUnitId, Ref<HTMLCanvasElement | null>>;

export interface StageLabLoopOptions {
  selection: StageLabSelection;
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

const ATMOSPHERE: Record<string, () => AtmospherePainter> = {
  graticule: () => graticuleAtmosphere,
  band: () => bandAtmosphere,
  panel: createPanelAtmosphere,
};
const STRINGS: Record<string, () => StringsPainter> = {
  exposure: () => exposureStrings,
  strips: () => stripStrings,
  columns: createColumnStrings,
};
const SCOPE: Record<string, () => ScopePainter> = {
  phosphor: createPhosphorScope,
  cut: createCutScope,
  dots: createDotScope,
};
const BODIES: Record<string, () => BodiesPainter> = {
  facets: createFacetsPainter,
  "chord-shape": createChordShapePainter,
  resonance: createResonancePainter,
};
const FLECKS: Record<string, () => FlecksPainter> = {
  sparks: createSparkFlecks,
  chads: createChadFlecks,
  pixels: createPixelFlecks,
};
const LETTERING: Record<string, () => LetteringPainter> = {
  tape: createTapeLettering,
  readout: createReadoutLettering,
};

const choose = <T>(registry: Record<string, () => T>, choice: string): T | null =>
  choice === "production" ? null : registry[choice]?.() ?? null;

export function useStageLabLoop(canvases: StageLabCanvases, options: StageLabLoopOptions) {
  const { conductor, selection } = options;
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

  const painters = {
    atmosphere: choose(ATMOSPHERE, selection.atmosphere),
    strings: choose(STRINGS, selection.strings),
    scope: choose(SCOPE, selection.scope),
    bodies: choose(BODIES, selection.bodies),
    flecks: choose(FLECKS, selection.flecks),
    lettering: choose(LETTERING, selection.lettering),
  };

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

  const sizeCanvases = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    STAGE_LAB_UNIT_IDS.forEach((unit) => {
      const canvas = canvases[unit].value;
      if (!canvas) return;
      const dpr = painters[unit] ? Math.min(2, window.devicePixelRatio || 1) : 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    });
    gradientCache.clear();
  };

  const contextFor = (unit: StageLabUnitId) => {
    const canvas = canvases[unit].value;
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
    const notes = getNotes();
    if (notes[0]) lastLead = notes[0];
    return {
      ctx,
      width,
      height,
      elapsed: (now - startedAt) / 1000,
      dt: Math.min(0.1, Math.max(0, (now - previous) / 1000)),
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
    const ctx = Object.fromEntries(STAGE_LAB_UNIT_IDS.map((unit) => [unit, contextFor(unit)])) as
      Record<StageLabUnitId, CanvasRenderingContext2D | null>;
    if (STAGE_LAB_UNIT_IDS.some((unit) => !ctx[unit])) return;
    const base = frameBase(ctx.atmosphere!, now);
    previous = now;
    const on = (unit: StageLabUnitId): LabFrame => ({ ...base, ctx: ctx[unit]! });
    const { composition, audio, reducedMotion, notes, elapsed } = base;
    hydrate(notes);

    if (painters.atmosphere) painters.atmosphere.paint(on("atmosphere"));
    else if (ambientConfig.value.isEnabled) {
      ambient.renderAmbientBackground(ctx.atmosphere!, elapsed, ambientConfig.value, width, height, musicStore,
        (key, create) => gradientCache.get(key) ?? gradientCache.set(key, create()).get(key)!,
        audio, reducedMotion, notes);
    }
    if (composition.suspended) return;

    if (stringConfig.value.isEnabled) {
      strings.updateStringProperties(stringConfig.value, animationConfig.value, musicStore, audio, reducedMotion, notes);
      if (painters.strings) painters.strings.paint(on("strings"), strings.strings.value);
      else strings.renderStrings(ctx.strings!, elapsed, composition.usable.height, reducedMotion);
    }

    if (painters.scope) painters.scope.paint(on("scope"));
    else if (hilbertScopeConfig.value.isEnabled) {
      hilbert.renderHilbertScope(ctx.scope!, elapsed, hilbertScopeConfig.value, width, height, composition,
        audio, reducedMotion, notes);
    }

    blobs.reprojectBlobs(composition, blobConfig.value, reducedMotion);
    blobs.prepareBlobs(ctx.bodies!, blobConfig.value, { reducedMotion, bounds: composition.usable, elapsed });
    const scene = geometryLabels.buildScene(harmonic.snapshot.value, blobs.activeBlobs, blobConfig.value, width, height);
    const prepared = blobs.getPreparedBlobFrames();
    if (painters.bodies) painters.bodies.paint(on("bodies"), prepared, scene, options.mode.value);
    else if (!blobField.renderBlobField(ctx.bodies!, prepared, blobConfig.value, scene)) {
      blobs.renderBlobs(ctx.bodies!, elapsed, blobConfig.value, musicStore, true);
    }

    if (!reducedMotion) {
      if (painters.flecks) painters.flecks.paint(on("flecks"));
      else if (particleConfig.value.isEnabled) particles.renderParticles(ctx.flecks!, elapsed, particleConfig.value);
    }

    if (painters.lettering) painters.lettering.paint(on("lettering"), scene, blobConfig.value);
    else geometryLabels.renderLabels(ctx.lettering!, scene, blobConfig.value, { now, reducedMotion, bounds: composition.usable });
  };

  const onPlayed = (event: Event) => {
    const detail = (event as CustomEvent).detail as ActiveNote;
    const note = getNotes().find((candidate) => candidate.noteId === detail.noteId) ?? detail;
    blobs.createBlob(note.solfege, note.frequency, 0, 0, width, height, blobConfig.value,
      note.noteId, note.key, note.mode, note.octave, note.noteName);
    blobs.reprojectBlobs(getComposition(), blobConfig.value, true);
    harmonic.notePlayed(note);
    const ctx = canvases.flecks.value?.getContext("2d");
    if (options.reducedMotion.value || !ctx) return;
    if (painters.flecks) {
      painters.flecks.attack(frameBase(ctx, performance.now()), note);
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

  const clearTransient = () => {
    particles.clearAllParticles();
    painters.flecks?.clear();
    painters.scope?.clear();
  };
  const stopReducedMotion = watch(options.reducedMotion, (still) => { if (still) clearTransient(); });

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
    clearTransient();
    painters.bodies?.clear();
    harmonic.reset();
  });
}
