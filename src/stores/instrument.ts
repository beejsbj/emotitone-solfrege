import { abortable } from "@/utils/abortable";
import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { DEFAULT_INSTRUMENT, displayInstrumentName } from "@/data/instruments";
import {
  getReadySounds,
  initAudioEngine,
  isPrewarmed,
  prewarmSoundSamples,
  setLiveSynthControls,
} from "@/services/audioEngine";

import { getLivePlaybackFailure, needsLivePlaybackPreparation } from "@/services/livePlayback";
import { getLiveArticulation } from "@/services/liveArticulation";
import { canonicalShape, isSameShape, NEUTRAL_SHAPE } from "@/services/shape";
import { instrumentPersistence } from "@/services/instrumentPersistence";
import { codecPersist } from "@/services/persistenceCodec";
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
 * Manages instrument selection and its Shape; the audio engine
 * (services/audioEngine.ts) loads each selected sound into the live worklet.
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
  /**
   * The audio engine has booted once (the app's audio graph and the live
   * renderer). Sticky: reopening the picker or a hung sample fetch never
   * takes it back.
   */
  const engineBooted = ref(false);
  let initializationGeneration = 0;
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

  // Recovery keeps held intent alive; only a new selection locks input.
  const recoveries = ref(new Map<number, number>());
  const displayedWarmingInstrument = computed({
    get: () => warmingInstrument.value ?? (recoveries.value.has(selectionEpoch.value) ? currentInstrument.value : null),
    set: (name: string | null) => { warmingInstrument.value = name; },
  });
  function waitForRecovery(pending: Promise<void>): Promise<void> {
    const epoch = selectionEpoch.value;
    recoveries.value.set(epoch, (recoveries.value.get(epoch) ?? 0) + 1);
    return pending.finally(() => {
      const remaining = recoveries.value.get(epoch)! - 1;
      if (remaining) recoveries.value.set(epoch, remaining);
      else recoveries.value.delete(epoch);
    });
  }

  const isInteractionLocked = computed(() => warmingInstrument.value !== null);
  const isLoading = computed(
    () => isInitializing.value || displayedWarmingInstrument.value !== null
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

  /** The first ready sound among `preferred` and the usual fallbacks, never `except`. */
  const findReadyFallback = (preferred: Array<string | null> = [], except?: string) => {
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
          candidate !== except &&
          candidates.indexOf(candidate) === index &&
          isInstrumentReady(candidate)
      ) ?? null
    );
  };

  const syncReadyInstrumentsFromAudio = (warmed: string[] = [], preserveSelection = false) => {
    readyInstruments.value = new Set([...getReadySounds(), ...warmed]);

    const fallback = findReadyFallback([currentInstrument.value]);
    if (fallback) {
      markInstrumentReady(fallback);
      if (!preserveSelection) currentInstrument.value = fallback;
      lastReadyInstrument.value = fallback;
    } else {
      lastReadyInstrument.value = null;
    }
  };

  const isInstrumentWarming = (instrumentName: string) =>
    displayedWarmingInstrument.value === instrumentName;

  // Initialize — boots the audio engine and reports granular sample-pack progress
  // through the optional callback so loading screens can show real steps.
  const initializeInstruments = async (
    progressCallback?: (progress: number, message: string) => void,
    { prepareSelected = true, signal }: { prepareSelected?: boolean; signal?: AbortSignal } = {},
  ) => {
    if (signal?.aborted) return;
    const generation = ++initializationGeneration;
    let settled = false;
    const isCurrent = () => generation === initializationGeneration && !signal?.aborted;
    const report = (progress: number, message: string) => {
      if (!settled && isCurrent()) progressCallback?.(progress, message);
    };
    isInitializing.value = true;
    try {
      // Keep the engine's single-flight promise intact: cancellation releases
      // this caller, while the next generation can reuse the same graph.
      await abortable(initAudioEngine(report), signal);
      engineBooted.value = true;
      if (!isCurrent()) return;
      // Boot preserves the saved selection without downloading its bank.
      // Play calls this again after the gesture and keeps the splash up until
      // the live renderer is prepared (or the established fallback is ready).
      const preferred = currentInstrument.value;
      const warmed: string[] = [];
      if (prepareSelected && preferred !== DEFAULT_INSTRUMENT && !isInstrumentReady(preferred)) {
        report(99, `Preparing ${displayInstrumentName(preferred)}…`);
        try {
          await abortable(prewarmSoundSamples(preferred), signal);
          if (!isCurrent()) return;
          warmed.push(preferred);
        } catch (error) {
          if (!isCurrent()) return;
          lastWarmupError.value =
            error instanceof Error && error.message
              ? error.message
              : "Could not download samples for this instrument.";
          lastWarmupErrorInstrument.value = preferred;
        }
      }
      syncReadyInstrumentsFromAudio(warmed, !prepareSelected);
      // Prewarming above already prepared the live renderer for that sound.
      // A sound refused for memory stays refused until something is released:
      // asking again cannot help, so that refusal is never retried here.
      const selected = currentInstrument.value;
      if (
        prepareSelected
        && !warmed.includes(selected)
        && needsLivePlaybackPreparation(selected)
        && !getLivePlaybackFailure(selected)?.budget
      ) {
        try {
          await abortable(prewarmSoundSamples(selected), signal);
        } catch (error) {
          if (!isCurrent()) return;
          // Memory full is the selection's problem, not the engine's: say so
          // and play on something that is loaded instead of failing startup.
          if (!getLivePlaybackFailure(selected)?.budget) throw error;
          lastWarmupError.value = error instanceof Error && error.message ? error.message : "Not enough memory for this instrument.";
          lastWarmupErrorInstrument.value = selected;
          const fallback = findReadyFallback([], selected);
          if (fallback) {
            currentInstrument.value = fallback;
            lastReadyInstrument.value = fallback;
          }
        }
        if (!isCurrent()) return;
      }
      // Guarantee a 100% call even when already initialized (early return path)
      report(100, "Audio engine ready");
    } catch (error) {
      if (!isCurrent()) return;
      console.error("Error initializing the audio engine:", error);
      // Synth registration can succeed before a sample pack fails. Reconcile
      // that partial success so the app falls back to something truly playable.
      syncReadyInstrumentsFromAudio();
      throw error;
    } finally {
      settled = true;
      if (generation === initializationGeneration) isInitializing.value = false;
    }
  };

  /**
   * Entering with basic synths after a failed or hung sample load: select the
   * default synth the synth-only start prepared, whatever was selected or
   * persisted, and supersede any warmup still pending so it cannot win later.
   * A cancelled load may finish caching resources, but cannot reconcile the
   * store or change this selection; a later active load can reuse its cache.
   */
  /**
   * The engine booted outside `initializeInstruments`: the sample-pack
   * fallback starts the synths alone (`initSynthOnlyAudio`), and Play must
   * not wait for a drawer that may never open.
   */
  const markEngineBooted = () => {
    engineBooted.value = true;
  };

  const fallBackToSynth = () => {
    selectionEpoch.value += 1;
    clearWarmupState();
    markInstrumentReady(DEFAULT_INSTRUMENT);
    currentInstrument.value = DEFAULT_INSTRUMENT;
    lastReadyInstrument.value = DEFAULT_INSTRUMENT;
  };

  // Set current instrument — any registered sound name is valid.
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

    // Known not to play here (no AudioWorklet, or a sound the worklet cannot
    // hold): say so at once rather than show "Preparing" and ask again.
    const known = needsLivePlaybackPreparation(instrumentName) ? undefined : getLivePlaybackFailure(instrumentName);
    if (known?.kind === "unavailable" && engineBooted.value) {
      const fallback = findReadyFallback([previousReadyInstrument], instrumentName);
      currentInstrument.value = fallback ?? instrumentName;
      if (fallback) lastReadyInstrument.value = fallback;
      lastWarmupError.value = known.reason;
      lastWarmupErrorInstrument.value = instrumentName;
      clearWarmupState();
      return { status: "failed", instrument: instrumentName, fallback };
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
    warmingInstrument: displayedWarmingInstrument,
    waitForRecovery,
    warmupMessage,
    lastWarmupError,
    lastWarmupErrorInstrument,
    selectionEpoch,
    isLoading,
    engineBooted,
    isInteractionLocked,
    synthControls,
    synthControlOverrides,
    shape,
    instrumentShapes,

    // Actions
    initializeInstruments,
    fallBackToSynth,
    markEngineBooted,
    setInstrument,
    isInstrumentReady,
    isInstrumentWarming,
    setSynthControl,
    resetSynthControls,
    applyShape,
    recallShape,
  };
}, {
  // Saved through the versioned codec: decoding validates the instrument and
  // sanitizes every Shape, and older formats are backed up before migrating.
  // afterHydrate then pushes the restored Shape to live audio, since setup
  // synced defaults before hydration ran.
  persist: codecPersist(instrumentPersistence, {
    pick: ["currentInstrument", "instrumentShapes"],
    afterHydrate: ({ store }) => {
      (store as unknown as { recallShape: () => void }).recallShape();
    },
  }),
});
