import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { DEFAULT_INSTRUMENT, displayInstrumentName } from "@/data/instruments";
import {
  getReadySounds,
  initSuperdoughAudio,
  isPrewarmed,
  prewarmSoundSamples,
  setLiveSynthControls,
} from "@/services/superdoughAudio";

import { needsLivePlaybackPreparation } from "@/services/livePlayback";
import { getLiveArticulation } from "@/services/liveArticulation";
import { canonicalShape, isSameShape, NEUTRAL_SHAPE } from "@/services/shape";
import { deserializeInstrumentState } from "@/services/instrumentPersistence";
import type { Shape } from "@/types/instrument";

export type InstrumentSelectionResult =
  | { status: "ready"; instrument: string }
  | { status: "failed"; instrument: string; fallback: string | null }
  | { status: "superseded"; instrument: string };

export interface SynthControls {
  cutoff: number;
  resonance: number;
  attack: number;
  release: number;
  room: number;
  delay: number;
}

export interface SynthControlOverrides {
  attack: boolean;
  release: boolean;
}

export const DEFAULT_SYNTH_CONTROLS: Readonly<SynthControls> = {
  cutoff: 12000,
  resonance: 0,
  attack: 0.003,
  release: 0.12,
  room: 0,
  delay: 0,
};

export const DEFAULT_SYNTH_CONTROL_OVERRIDES: Readonly<SynthControlOverrides> = {
  attack: false,
  release: false,
};

/**
 * Instrument Store
 * Manages instrument selection and delegates audio to superdough.
 * No Tone.js instruments are created here — superdough handles all audio.
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const lastReadyInstrument = ref<string | null>(null);
  const readyInstruments = ref<Set<string>>(new Set());
  const warmingInstrument = ref<string | null>(null);
  const warmupMessage = ref("");
  const lastWarmupError = ref<string | null>(null);
  const lastWarmupErrorInstrument = ref<string | null>(null);
  const isInitializing = ref(false);
  const warmupPromises = new Map<string, Promise<void>>();
  const selectionEpoch = ref(0);
  const synthControls = ref<SynthControls>({ ...DEFAULT_SYNTH_CONTROLS });
  const synthControlOverrides = ref<SynthControlOverrides>({
    ...DEFAULT_SYNTH_CONTROL_OVERRIDES,
  });
  const syncLiveSynthControls = () => {
    setLiveSynthControls({
      ...synthControls.value,
      overrides: { ...synthControlOverrides.value },
    });
  };
  syncLiveSynthControls();

  const setSynthControl = <K extends keyof SynthControls>(
    key: K,
    value: SynthControls[K],
  ) => {
    synthControls.value[key] = value;
    if (key === "attack") synthControlOverrides.value.attack = true;
    if (key === "release") synthControlOverrides.value.release = true;
    syncLiveSynthControls();
    rememberShape();
  };

  const resetSynthControls = () => applyShape(NEUTRAL_SHAPE);

  // The knobs as pattern context. An envelope stage that is untouched, or
  // turned back onto the instrument's natural value, stays natural (null).
  const shape = computed<Shape>(() => {
    const knobs = canonicalShape({
      cutoff: synthControls.value.cutoff,
      resonance: synthControls.value.resonance,
      room: synthControls.value.room,
      delay: synthControls.value.delay,
      attack: synthControlOverrides.value.attack ? synthControls.value.attack : null,
      release: synthControlOverrides.value.release ? synthControls.value.release : null,
    });
    const natural = getLiveArticulation(currentInstrument.value);
    return {
      ...knobs,
      attack: knobs.attack === natural.attack ? null : knobs.attack,
      release: knobs.release === natural.release ? null : knobs.release,
    };
  });

  // Untouched envelope knobs rest on the instrument's natural envelope, so
  // they show what is sounding and the first nudge starts from there.
  const applyShape = (next: Shape) => {
    const natural = getLiveArticulation(currentInstrument.value);
    synthControls.value = {
      cutoff: next.cutoff,
      resonance: next.resonance,
      room: next.room,
      delay: next.delay,
      attack: next.attack ?? natural.attack,
      release: next.release ?? natural.release,
    };
    synthControlOverrides.value = {
      attack: next.attack !== null,
      release: next.release !== null,
    };
    syncLiveSynthControls();
    rememberShape();
  };

  // Instrument + Shape is nearly a new instrument: each instrument remembers
  // the Shape it was last left with. Persisted with the selection; the live
  // knobs are derived from it, and neutral Shapes are not stored.
  const instrumentShapes = ref<Record<string, Shape>>({});
  function rememberShape() {
    if (isSameShape(shape.value, NEUTRAL_SHAPE)) delete instrumentShapes.value[currentInstrument.value];
    else instrumentShapes.value[currentInstrument.value] = { ...shape.value };
  }
  /** Apply the current instrument's remembered Shape (neutral if never shaped). */
  const recallShape = () => {
    applyShape(instrumentShapes.value[currentInstrument.value] ?? NEUTRAL_SHAPE);
  };
  // Sync, so every assignment (including warmup fallbacks) recalls the
  // Shape before anything reads the new instrument.
  watch(currentInstrument, recallShape, { flush: "sync" });

  const isInteractionLocked = computed(() => warmingInstrument.value !== null);
  const isLoading = computed(
    () => isInitializing.value || isInteractionLocked.value
  );

  const clearWarmupError = () => {
    lastWarmupError.value = null;
    lastWarmupErrorInstrument.value = null;
  };

  const clearWarmupState = () => {
    warmingInstrument.value = null;
    warmupMessage.value = "";
  };

  const markInstrumentReady = (instrumentName: string) => {
    readyInstruments.value.add(instrumentName);
  };

  const isInstrumentReady = (instrumentName: string) =>
    readyInstruments.value.has(instrumentName) || isPrewarmed(instrumentName);

  const findReadyFallback = (preferred: Array<string | null> = []) => {
    const candidates = [
      ...preferred,
      lastReadyInstrument.value,
      DEFAULT_INSTRUMENT,
      "triangle",
      ...readyInstruments.value,
    ];

    return (
      candidates.find(
        (candidate, index) =>
          candidate !== null &&
          candidates.indexOf(candidate) === index &&
          isInstrumentReady(candidate)
      ) ?? null
    );
  };

  const syncReadyInstrumentsFromAudio = (warmed: string[] = []) => {
    readyInstruments.value = new Set([...getReadySounds(), ...warmed]);

    const fallback = findReadyFallback([currentInstrument.value]);
    if (fallback) {
      markInstrumentReady(fallback);
      currentInstrument.value = fallback;
      lastReadyInstrument.value = fallback;
    } else {
      lastReadyInstrument.value = null;
    }
  };

  const isInstrumentWarming = (instrumentName: string) =>
    warmingInstrument.value === instrumentName;

  // Initialize — boots superdough and reports granular sample-pack progress
  // through the optional callback so loading screens can show real steps.
  const initializeInstruments = async (
    progressCallback?: (progress: number, message: string) => void
  ) => {
    isInitializing.value = true;
    try {
      await initSuperdoughAudio(progressCallback);
      // A persisted sampled instrument is still cold here. Warm it during
      // loading rather than silently replacing it with a ready fallback; if
      // it fails, the sync below falls back and recalls that one's Shape.
      const preferred = currentInstrument.value;
      const warmed: string[] = [];
      if (preferred !== DEFAULT_INSTRUMENT && !isInstrumentReady(preferred)) {
        progressCallback?.(99, `Preparing ${displayInstrumentName(preferred)}…`);
        try {
          await prewarmSoundSamples(preferred);
          warmed.push(preferred);
        } catch (error) {
          lastWarmupError.value =
            error instanceof Error && error.message
              ? error.message
              : "Could not download samples for this instrument.";
          lastWarmupErrorInstrument.value = preferred;
        }
      }
      syncReadyInstrumentsFromAudio(warmed);
      // Prewarming above already prepared the live renderer for that sound.
      if (!warmed.includes(currentInstrument.value) && needsLivePlaybackPreparation(currentInstrument.value)) {
        await prewarmSoundSamples(currentInstrument.value);
      }
      // Guarantee a 100% call even when already initialized (early return path)
      progressCallback?.(100, "Audio engine ready");
    } catch (error) {
      console.error("Error initializing superdough:", error);
      // Synth registration can succeed before a sample pack fails. Reconcile
      // that partial success so the app falls back to something truly playable.
      syncReadyInstrumentsFromAudio();
      throw error;
    } finally {
      isInitializing.value = false;
    }
  };

  // Set current instrument — any registered superdough sound name is valid.
  // Awaits pre-warming for cold instruments so the first keypress is never dropped.
  const setInstrument = async (
    instrumentName: string
  ): Promise<InstrumentSelectionResult> => {
    const selection = ++selectionEpoch.value;
    const previousReadyInstrument = findReadyFallback([
      currentInstrument.value,
      lastReadyInstrument.value,
    ]);
    currentInstrument.value = instrumentName;
    clearWarmupError();

    if (isInstrumentReady(instrumentName) && !needsLivePlaybackPreparation(instrumentName)) {
      markInstrumentReady(instrumentName);
      lastReadyInstrument.value = instrumentName;
      clearWarmupState();
      return { status: "ready", instrument: instrumentName };
    }

    warmingInstrument.value = instrumentName;
    warmupMessage.value = "Preparing instrument...";

    let warmupPromise = warmupPromises.get(instrumentName);
    if (!warmupPromise) {
      warmupPromise = prewarmSoundSamples(instrumentName)
        .then(() => markInstrumentReady(instrumentName))
        .finally(() => warmupPromises.delete(instrumentName));
      warmupPromises.set(instrumentName, warmupPromise);
    }

    try {
      await warmupPromise;

      if (selection !== selectionEpoch.value) {
        return { status: "superseded", instrument: instrumentName };
      }

      currentInstrument.value = instrumentName;
      lastReadyInstrument.value = instrumentName;
      clearWarmupState();
      return { status: "ready", instrument: instrumentName };
    } catch (error) {
      if (selection !== selectionEpoch.value) {
        return { status: "superseded", instrument: instrumentName };
      }

      const fallback = findReadyFallback([previousReadyInstrument]);
      if (fallback) {
        currentInstrument.value = fallback;
        lastReadyInstrument.value = fallback;
      }
      lastWarmupError.value =
        error instanceof Error && error.message
          ? error.message
          : "Could not download samples for this instrument.";
      lastWarmupErrorInstrument.value = instrumentName;
      clearWarmupState();
      return { status: "failed", instrument: instrumentName, fallback };
    }
  };

  return {
    // State
    currentInstrument,
    readyInstruments,
    warmingInstrument,
    warmupMessage,
    lastWarmupError,
    lastWarmupErrorInstrument,
    selectionEpoch,
    isLoading,
    isInteractionLocked,
    synthControls,
    synthControlOverrides,
    shape,
    instrumentShapes,

    // Actions
    initializeInstruments,
    setInstrument,
    isInstrumentReady,
    isInstrumentWarming,
    setSynthControl,
    resetSynthControls,
    applyShape,
    recallShape,
  };
}, {
  persist: {
    key: "emotitone-instrument",
    pick: ["currentInstrument", "instrumentShapes"],
    // Deserialization validates the instrument and sanitizes every Shape;
    // afterHydrate then pushes the restored Shape to live audio, since setup
    // synced defaults before hydration ran.
    serializer: { serialize: JSON.stringify, deserialize: deserializeInstrumentState },
    afterHydrate: ({ store }) => {
      (store as unknown as { recallShape: () => void }).recallShape();
    },
  },
});
