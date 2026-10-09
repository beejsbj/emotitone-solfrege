<script lang="ts">
export type {
  CodeStripChordToken,
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripGlyph,
  CodeStripNote,
  CodeStripNoteToken,
  CodeStripToken,
} from "./types";
</script>

<script setup lang="ts">
import {
  createPatternTransport,
  disposePatternTransport,
  type PatternTransport,
} from "@/services/patternPlayback";
import {
  computed,
  markRaw,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { toStrudelSound } from "@/composables/useStrudel";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import {
  createNoteColorResolver,
  createStaticNoteColorResolver,
  staticNoteColorResolver,
} from "@/components/primatives/noteColorContext";
import { useMusicColorClock } from "@/composables/useMusicColorClock";
import { CodeStripViewport } from "./viewport";
import {
  generatedStrudelBarPosition,
  uiBeatClock,
} from "@/composables/useUIBeat";
import {
  getAudioContext,
  stopStrudelVisuals,
} from "@/services/superdoughAudio";
import { renderStrudelNotation } from "@/services/StrudelNotation";
import { useInstrumentStore } from "@/stores/instrument";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { LogNote } from "@/types/patterns";
import type { NotationSpan, SpannedNotation } from "@/types/notation";
import HighlightStrip from "./HighlightStrip.vue";
import { buildRecordedCodeStripTokens } from "./recordingTokens";
import { serializeCodeStripTokens } from "./serialize";
import type {
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripToken,
} from "./types";

const props = withDefaults(
  defineProps<{
    usage?: "production" | "controlled";
    tokens?: CodeStripToken[];
    source?: string;
    density?: CodeStripDensity;
    durationMode?: CodeStripDurationMode;
    timeSignature?: string;
    wrapped?: boolean;
    scrollable?: boolean;
    showChevron?: boolean;
    framed?: boolean;
    ariaLabel?: string;
  }>(),
  {
    usage: undefined,
    tokens: undefined,
    source: undefined,
    density: "default",
    durationMode: "bar",
    timeSignature: "4/4",
    wrapped: false,
    scrollable: true,
    showChevron: true,
    framed: true,
    ariaLabel: "Pattern code, read-only",
  },
);

const EMPTY_EDITOR_CODE = "// Record a pattern";
const isControlledUsage = props.usage === "controlled"
  || (props.usage === undefined && (props.tokens !== undefined || props.source !== undefined));
const isControlled = computed(() => isControlledUsage);

function createProductionWiring() {
  return {
    instrumentStore: useInstrumentStore(),
    phrasesStore: usePhrasesStore(),
    visualConfigStore: useVisualConfigStore(),
    playback: useCodeStripStrudel(),
  };
}

type PlaybackWiring = Pick<
  ReturnType<typeof useCodeStripStrudel>,
  "attachEditor" | "detachEditor" | "syncCode" | "setPlaying" | "setError" | "isPlaying"
>;
const controlledPlayback: PlaybackWiring = {
  attachEditor: () => {},
  detachEditor: () => {},
  syncCode: () => {},
  setPlaying: () => {},
  setError: () => {},
  isPlaying: ref(false),
};
const productionWiring = isControlledUsage ? undefined : createProductionWiring();
const viewport = productionWiring ? new CodeStripViewport() : undefined;
const stillColorResolver = productionWiring
  ? createStaticNoteColorResolver(() => productionWiring.visualConfigStore.config.dynamicColors)
  : staticNoteColorResolver;
// Share the production Music Color clock, but subscribe only while the strip
// has a visible glyph. The viewport owner gates each glyph's phase reads too.
const colorClock = productionWiring && viewport ? useMusicColorClock(
  () => viewport.visibleCount.value > 0 &&
    productionWiring.visualConfigStore.config.dynamicColors.hueMotionEnabled,
  () => productionWiring.visualConfigStore.config.dynamicColors.animationSpeed,
  productionWiring.visualConfigStore.config,
) : null;
const colorResolver = productionWiring && colorClock
  ? createNoteColorResolver(
    () => productionWiring.visualConfigStore.config.dynamicColors,
    () => productionWiring.visualConfigStore.config.dynamicColors.hueMotionEnabled &&
      !colorClock.reducedMotion.value ? colorClock.phaseCycles.value : null,
  )
  : stillColorResolver;
const {
  attachEditor,
  detachEditor,
  syncCode,
  setPlaying,
  setError,
  isPlaying,
} = productionWiring?.playback ?? controlledPlayback;

const initError = ref<string | null>(null);
const visibleCode = ref("");
// The sounding transport is stateful third-party code; keep its identity raw.
const transport = shallowRef<PatternTransport | null>(null);
// Play turns the strip to Ink at once, before the scheduler confirms.
const stripPlaying = ref(false);
let attachedController: Parameters<typeof detachEditor>[0] | undefined;
let codeSyncQueued = false;
let codeSyncCancelled = false;
let pendingGeneratedCode: string | undefined;
let pendingPreserveUIBeat = false;
interface ActiveUIBeatRun {
  generation: number;
  mappingAvailable: boolean;
  phaseSourceKey: string | null;
  bpm: number;
  beatsPerBar: number;
  preservePhase: boolean;
  ready: boolean;
  failed: boolean;
  error: unknown;
}

let activeUIBeatRun: ActiveUIBeatRun | null = null;
let evaluatingUIBeatRun: ActiveUIBeatRun | null = null;
let evaluationQueue: Promise<unknown> = Promise.resolve();
let evaluationEpoch = 0;
let preserveUIBeatPhaseForNextEvaluation = false;
let tempoEvaluationQueued = false;
let uiBeatAudioContext: AudioContext | null = null;

const GENERATED_BEATS_PER_BAR = 4;

function invalidateQueuedEvaluations() {
  evaluationEpoch += 1;
}

const controlledCodeStripConfig = {
  enabled: true,
  opacity: 1,
  bpm: 120,
  notation: "solfege",
  durationMode: "bar",
  showRests: true,
} as const;
const controlledKeyboardConfig = {
  mainOctave: 4,
  surfaceStyle: "colored",
  keyBrightness: 1,
  keySaturation: 1,
} as const;
const controlledSketchMeta = {
  bpm: 120,
  mode: "major",
  key: "C",
  instrument: "sine",
} as const;
const codeStripConfig = computed(() =>
  productionWiring?.visualConfigStore.config.codeStrip ?? controlledCodeStripConfig
);
const resolvedDurationMode = computed(() =>
  isControlled.value ? props.durationMode : codeStripConfig.value.durationMode
);
const keyboardConfig = computed(() =>
  productionWiring?.visualConfigStore.config.keyboard ?? controlledKeyboardConfig
);
const sketchMeta = computed(() =>
  productionWiring?.phrasesStore.takeContext ?? controlledSketchMeta
);
const barMs = computed(() => (60000 / sketchMeta.value.bpm) * 4);
const recordedTokens = computed(() => {
  const phrasesStore = productionWiring?.phrasesStore;
  if (!phrasesStore) return [];
  return buildRecordedCodeStripTokens({
    notes: phrasesStore.takeNotes,
    mode: sketchMeta.value.mode,
    musicKey: sketchMeta.value.key,
    notation: codeStripConfig.value.notation,
    barMs: barMs.value,
    sourceBpm: sketchMeta.value.bpm,
    surfaceStyle: keyboardConfig.value.surfaceStyle,
    keyBrightness: keyboardConfig.value.keyBrightness,
    keySaturation: keyboardConfig.value.keySaturation,
  });
});
const presentationTokens = computed(() => props.tokens ?? recordedTokens.value);

const generatedNotation = computed<SpannedNotation>(() => {
  if (isControlled.value) {
    if (props.source !== undefined) {
      return { code: props.source.trim() ? props.source : EMPTY_EDITOR_CODE, spans: [] };
    }
    return {
      code: props.tokens?.length ? serializeCodeStripTokens(props.tokens) : EMPTY_EDITOR_CODE,
      spans: [],
    };
  }

  const phrasesStore = productionWiring!.phrasesStore;
  if (!phrasesStore.takeNotes.length) {
    return { code: EMPTY_EDITOR_CODE, spans: [] };
  }

  const sound = toStrudelSound(sketchMeta.value.instrument ?? "triangle");
  return renderStrudelNotation(phrasesStore.takeNotes as LogNote[], {
    bpm: codeStripConfig.value.bpm,
    sourceBpm: sketchMeta.value.bpm,
    notationType: codeStripConfig.value.notation === "note" ? "absolute" : "relative",
    scaleKey: sketchMeta.value.key,
    scaleMode: sketchMeta.value.mode,
    scaleOctave: keyboardConfig.value.mainOctave,
    patternDurationMs: phrasesStore.takeDuration,
    sound,
    // The pattern's own Shape, not the live knobs.
    shape: phrasesStore.takeContext.shape,
    inline: true,
  });
});
const generatedCode = computed(() => generatedNotation.value.code);
const generatedPhaseSourceKey = computed(() => {
  const code = generatedCode.value.trim();
  const tempoSuffix = `.cpm(${codeStripConfig.value.bpm} / ${GENERATED_BEATS_PER_BAR})`;
  // Only the canonical generated playback-tempo suffix is phase-neutral.
  // Notes, durations, scale, instrument and any other source must still match.
  return code.endsWith(tempoSuffix) ? code.slice(0, -tempoSuffix.length) : null;
});

function spansFor(code: string): readonly NotationSpan[] {
  return code === generatedNotation.value.code ? generatedNotation.value.spans : [];
}

function armUIBeatForEvaluation(
  instance: PatternTransport,
  preservePhase: boolean,
) {
  const currentDocument = instance.code.trim();
  const mappingAvailable =
    !isControlled.value &&
    currentDocument !== EMPTY_EDITOR_CODE &&
    currentDocument === generatedCode.value.trim();
  const bpm = codeStripConfig.value.bpm;
  const phaseSourceKey = mappingAvailable ? generatedPhaseSourceKey.value : null;
  const currentRun = activeUIBeatRun;
  const currentSnapshot = uiBeatClock.snapshot;
  const canPreservePhase =
    preservePhase &&
    mappingAvailable &&
    currentRun?.ready === true &&
    currentRun.mappingAvailable &&
    phaseSourceKey !== null &&
    currentRun.phaseSourceKey === phaseSourceKey &&
    currentSnapshot.generation === currentRun.generation &&
    currentSnapshot.status === "running" &&
    currentSnapshot.barPosition !== null &&
    typeof instance.repl?.scheduler?.setCps === "function";

  if (mappingAvailable && typeof instance.repl?.scheduler?.setCps === "function") {
    const generatedBarCps = bpm / GENERATED_BEATS_PER_BAR / 60;
    instance.repl.scheduler.setCps(generatedBarCps);
  }

  if (canPreservePhase && currentRun) {
    currentRun.bpm = bpm;
    uiBeatClock.retime(currentRun.generation, bpm);
    observeUIBeatAudioContext();
    return {
      generation: currentRun.generation,
      mappingAvailable,
      phaseSourceKey,
      bpm,
      beatsPerBar: GENERATED_BEATS_PER_BAR,
      preservePhase: true,
      ready: false,
      failed: false,
      error: undefined,
    } satisfies ActiveUIBeatRun;
  }

  const generation = uiBeatClock.arm({
    mappingAvailable,
    bpm: mappingAvailable ? bpm : undefined,
    meter: mappingAvailable
      ? { beatsPerBar: GENERATED_BEATS_PER_BAR, beatUnit: 4 }
      : undefined,
  });

  activeUIBeatRun = {
    generation,
    mappingAvailable,
    phaseSourceKey,
    bpm,
    beatsPerBar: GENERATED_BEATS_PER_BAR,
    preservePhase: false,
    ready: false,
    failed: false,
    error: undefined,
  };
  observeUIBeatAudioContext();
  return activeUIBeatRun;
}

function publishUIBeatFrame(instance: PatternTransport, rawPosition: number) {
  const run = activeUIBeatRun;
  if (!run?.ready) return;

  if (uiBeatAudioContext?.state !== "running") {
    uiBeatClock.suspend(run.generation);
    return;
  }

  const schedulerCps = instance.repl?.scheduler?.cps;
  const barPosition = run.mappingAvailable && typeof schedulerCps === "number"
    ? generatedStrudelBarPosition(
        rawPosition,
        run.bpm,
        run.beatsPerBar,
        schedulerCps,
      )
    : null;

  uiBeatClock.publish(run.generation, {
    rawPosition,
    barPosition: barPosition ?? undefined,
  });
}

function stopUIBeatRun(expectedGeneration?: number) {
  if (!activeUIBeatRun) return;
  if (
    expectedGeneration !== undefined &&
    activeUIBeatRun.generation !== expectedGeneration
  ) {
    return;
  }
  uiBeatClock.stop(activeUIBeatRun.generation);
  activeUIBeatRun = null;
}

function handleUIBeatAudioState() {
  const run = activeUIBeatRun;
  if (!run || !uiBeatAudioContext) return;

  if (uiBeatAudioContext.state === "closed") {
    stopUIBeatRun();
  } else if (uiBeatAudioContext.state !== "running") {
    uiBeatClock.suspend(run.generation);
  }
}

function observeUIBeatAudioContext() {
  const audioContext = getAudioContext();
  if (audioContext === uiBeatAudioContext) {
    handleUIBeatAudioState();
    return;
  }

  uiBeatAudioContext?.removeEventListener("statechange", handleUIBeatAudioState);
  uiBeatAudioContext = audioContext;
  uiBeatAudioContext.addEventListener("statechange", handleUIBeatAudioState);
  handleUIBeatAudioState();
}

function releaseUIBeatAudioContext() {
  uiBeatAudioContext?.removeEventListener("statechange", handleUIBeatAudioState);
  uiBeatAudioContext = null;
}

function canPreserveUIBeatPhase(instance: PatternTransport) {
  const run = activeUIBeatRun;
  const snapshot = uiBeatClock.snapshot;
  return Boolean(
    run?.ready === true &&
    run.mappingAvailable &&
    run.phaseSourceKey !== null &&
    run.phaseSourceKey === generatedPhaseSourceKey.value &&
    snapshot.generation === run.generation &&
    snapshot.status === "running" &&
    snapshot.barPosition !== null &&
    typeof instance.repl?.scheduler?.setCps === "function"
  );
}

async function evaluateTransport(instance: PatternTransport): Promise<boolean> {
  if (productionWiring?.instrumentStore.isInteractionLocked) return false;
  syncCode(instance.code);
  stripPlaying.value = true;
  try {
    const accepted = await evaluateSerialized(instance);
    if (accepted === false) stripPlaying.value = false;
    return accepted !== false;
  } catch (error) {
    stripPlaying.value = false;
    throw error;
  }
}

function queueTempoEvaluation() {
  if (tempoEvaluationQueued) return;
  tempoEvaluationQueued = true;
  queueMicrotask(() => {
    tempoEvaluationQueued = false;
    const instance = transport.value;
    if (isControlled.value || !instance || !isPlaying.value) return;

    preserveUIBeatPhaseForNextEvaluation = canPreserveUIBeatPhase(instance);
    void evaluateTransport(instance)
      // The serialized evaluation boundary has already published the error.
      .catch(() => undefined)
      .finally(() => {
        preserveUIBeatPhaseForNextEvaluation = false;
      });
  });
}

/** Hand the transport the code the strip shows; playback follows on the next evaluation. */
function publishCode(code: string, preserveUIBeat = false) {
  const instance = transport.value;
  if (instance && instance.code !== code && !preserveUIBeat) stopUIBeatRun();
  instance?.setCode(code, spansFor(code));
  visibleCode.value = code;
  syncCode(code);
}

function syncGeneratedCode() {
  if (codeSyncCancelled || codeSyncQueued) return;
  codeSyncQueued = true;
  queueMicrotask(() => {
    codeSyncQueued = false;
    if (codeSyncCancelled) return;
    const code = pendingGeneratedCode;
    const instance = transport.value;
    const preserveUIBeat = pendingPreserveUIBeat && code === generatedCode.value &&
      instance !== null && canPreserveUIBeatPhase(instance);
    pendingGeneratedCode = undefined;
    pendingPreserveUIBeat = false;
    if (code !== undefined) publishCode(code, preserveUIBeat);
  });
}

async function stopTransportForWarmup(instance: PatternTransport) {
  invalidateQueuedEvaluations();
  stripPlaying.value = false;

  try {
    await instance.stop();
  } finally {
    stopUIBeatRun();
    setPlaying(false);
    stopStrudelVisuals();
  }
}

// Serialize evaluations, so a stale run can never stop a newer one, and
// respect sample warmup for every evaluation already pending when it begins.
function evaluateSerialized(instance: PatternTransport): Promise<boolean> {
  const queuedAtEpoch = evaluationEpoch;
  const preservePhase = preserveUIBeatPhaseForNextEvaluation;
  preserveUIBeatPhaseForNextEvaluation = false;
  const task = evaluationQueue.then(async () => {
    if (
      queuedAtEpoch !== evaluationEpoch
      || productionWiring?.instrumentStore.isInteractionLocked
    ) return false;
    const run = armUIBeatForEvaluation(instance, preservePhase);
    evaluatingUIBeatRun = run;
    try {
      await instance.evaluate();
      if (queuedAtEpoch !== evaluationEpoch) {
        stopUIBeatRun(run.generation);
        await instance.stop();
        return false;
      }
      if (run.failed) {
        throw run.error ?? new Error("Strudel evaluation failed");
      }
      if (run.preservePhase) {
        if (uiBeatClock.retime(run.generation, run.bpm)) {
          run.ready = true;
          activeUIBeatRun = run;
        }
      } else if (activeUIBeatRun === run) {
        activeUIBeatRun.ready = true;
      }
      if (productionWiring?.instrumentStore.isInteractionLocked) {
        await stopTransportForWarmup(instance);
        return false;
      }
      return true;
    } catch (error) {
      stopUIBeatRun(run.generation);
      try {
        await instance.stop();
      } catch (stopError) {
        console.error("[CodeStrip] Strudel stop after evaluation error failed:", stopError);
      }
      if (queuedAtEpoch !== evaluationEpoch) return false;
      stripPlaying.value = false;
      setPlaying(false);
      stopStrudelVisuals();
      setError(error);
      throw error;
    } finally {
      if (evaluatingUIBeatRun?.generation === run.generation) {
        evaluatingUIBeatRun = null;
      }
    }
  });
  evaluationQueue = task.catch(() => undefined);
  return task;
}

function initializeTransport() {
  visibleCode.value = generatedCode.value;

  const instance: PatternTransport = markRaw(createPatternTransport({
    initialCode: generatedCode.value,
    initialSpans: generatedNotation.value.spans,
    onFrame: (time: number) => publishUIBeatFrame(instance, time),
    onToggle: (started: boolean) => {
      if (started && productionWiring?.instrumentStore.isInteractionLocked) {
        void stopTransportForWarmup(instance);
        return;
      }
      setPlaying(started);
      stripPlaying.value = started;
      if (!started) {
        stopUIBeatRun(evaluatingUIBeatRun?.generation);
        stopStrudelVisuals();
      }
    },
    onEvalError: (error: unknown) => {
      const failedRun = evaluatingUIBeatRun;
      if (failedRun) {
        failedRun.failed = true;
        failedRun.error = error;
      }
    },
  }));
  transport.value = instance;

  attachedController = {
    getCode: () => instance.code,
    setCode: (code: string) => {
      // An explicit load wins over a previously queued recording publication.
      pendingGeneratedCode = undefined;
      pendingPreserveUIBeat = false;
      if (instance.code === code) return;
      stopUIBeatRun();
      publishCode(code);
    },
    evaluate: () => evaluateTransport(instance),
    stop: () => {
      // Every explicit stop invalidates work that was queued before it.
      invalidateQueuedEvaluations();
      stripPlaying.value = false;
      const result = instance.stop();
      stopUIBeatRun();
      return result;
    },
  };
  attachEditor(attachedController, generatedCode.value);
  syncCode(generatedCode.value);
}

watch(
  () => productionWiring?.instrumentStore.isInteractionLocked ?? false,
  (isLocked) => {
    if (isLocked && transport.value) {
      void stopTransportForWarmup(transport.value);
    }
  },
  { flush: "sync" },
);

onMounted(() => {
  if (isControlled.value) {
    visibleCode.value = generatedCode.value;
    return;
  }
  try {
    initializeTransport();
  } catch (error) {
    initError.value = error instanceof Error
      ? error.message
      : "CodeStrip failed to initialize.";
    setError(error);
    console.error("[CodeStrip] pattern transport init error:", error);
  }
});

watch(generatedCode, (code) => {
  if (isControlled.value) {
    visibleCode.value = code;
    return;
  }
  pendingGeneratedCode = code;
  syncGeneratedCode();
});

watch(
  [
    () => sketchMeta.value.bpm,
    () => codeStripConfig.value.bpm,
    () => sketchMeta.value.instrument,
    () => sketchMeta.value.key,
    () => sketchMeta.value.mode,
    () => keyboardConfig.value.mainOctave,
  ],
  () => {
    const instance = transport.value;
    if (isControlled.value || !instance || !isPlaying.value) return;
    pendingGeneratedCode = generatedCode.value;
    pendingPreserveUIBeat = canPreserveUIBeatPhase(instance);
    syncGeneratedCode();
    queueTempoEvaluation();
  },
);

onBeforeUnmount(() => {
  viewport?.destroy();
  codeSyncCancelled = true;
  codeSyncQueued = false;

  const instance = transport.value;
  if (!instance) return;
  detachEditor(attachedController);
  invalidateQueuedEvaluations();
  stopUIBeatRun();
  releaseUIBeatAudioContext();
  try {
    void disposePatternTransport(instance).catch((error) => {
      console.error("[CodeStrip] Strudel transport stop failed:", error);
    });
  } catch (error) {
    console.error("[CodeStrip] Strudel transport teardown error:", error);
  } finally {
    transport.value = null;
    attachedController = undefined;
  }
});
</script>

<template>
  <div
    v-show="isControlled || codeStripConfig.enabled"
    class="code-strip"
    :style="{ opacity: isControlled ? 1 : codeStripConfig.opacity }"
  >
    <div v-if="initError" class="code-strip__error">{{ initError }}</div>
    <HighlightStrip
      class="code-strip__view"
      :tokens="presentationTokens"
      :playing="isControlled ? false : stripPlaying"
      :listening="!isControlled"
      :density="density"
      :duration-mode="resolvedDurationMode"
      :time-signature="timeSignature"
      :show-rests="codeStripConfig.showRests"
      :framed="framed"
      :aria-label="ariaLabel"
      :empty-label="EMPTY_EDITOR_CODE"
      :viewport="viewport"
      :color-resolver="colorResolver"
      :still-color-resolver="stillColorResolver"
      :follow-latest-key="productionWiring?.phrasesStore.lastLiveNoteId"
      :reset-scroll-key="productionWiring?.phrasesStore.takeId"
    />
  </div>
</template>

<style scoped>
.code-strip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.code-strip__view {
  flex: 0 0 auto;
}

.code-strip__error {
  padding: .3rem .4rem;
  color: hsl(0 100% 80% / .92);
  font-size: .72rem;
}
</style>
