<script lang="ts">
export type {
  CodeStripChordToken,
  CodeStripDensity,
  CodeStripGlyph,
  CodeStripNote,
  CodeStripNoteToken,
  CodeStripToken,
} from "./types";
</script>

<script setup lang="ts">
import {
  createPatternPlayer,
  setProductionPatternPlayer,
  type PatternPlayer,
  type PatternRequest,
} from "@/services/patternTransport";
import {
  computed,
  markRaw,
  onBeforeUnmount,
  onMounted,
  ref,
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
  ensureSoundfontCatalog,
  getAudioContext,
  getSuperdoughMasterGain,
  initSuperdoughAudio,
} from "@/services/superdoughAudio";
import { renderStrudelNotation, type StrudelConfig } from "@/services/StrudelNotation";
import { useInstrumentStore } from "@/stores/instrument";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { LogNote } from "@/types/patterns";
import type { SpannedNotation } from "@/types/notation";
import HighlightStrip from "./HighlightStrip.vue";
import { buildRecordedCodeStripTokens } from "./recordingTokens";
import { serializeCodeStripTokens } from "./serialize";
import type {
  CodeStripDensity,
  CodeStripToken,
} from "./types";

const props = withDefaults(
  defineProps<{
    usage?: "production" | "controlled";
    tokens?: CodeStripToken[];
    source?: string;
    density?: CodeStripDensity;
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
} = productionWiring?.playback ?? controlledPlayback;

const initError = ref<string | null>(null);
const visibleCode = ref("");
// Play turns the strip to Ink at once, before the transport confirms.
const stripPlaying = ref(false);
let player: PatternPlayer | null = null;
let attachedController: Parameters<typeof detachEditor>[0] | undefined;
// Every Play and Stop moves this; a Play superseded while it prepares is dropped.
let playEpoch = 0;

const GENERATED_BEATS_PER_BAR = 4;

const controlledCodeStripConfig = {
  enabled: true,
  opacity: 1,
  bpm: 120,
  notation: "solfege",
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
    laBasedMinor: productionWiring?.visualConfigStore.laBasedMinor,
    barMs: barMs.value,
    sourceBpm: sketchMeta.value.bpm,
    durationMs: phrasesStore.takeDuration,
    surfaceStyle: keyboardConfig.value.surfaceStyle,
    keyBrightness: keyboardConfig.value.keyBrightness,
    keySaturation: keyboardConfig.value.keySaturation,
  });
});
const presentationTokens = computed(() => props.tokens ?? recordedTokens.value);

/** The export configuration: what the strip shows and what the transport plays. */
const notationConfig = computed<Partial<StrudelConfig>>(() => ({
  bpm: codeStripConfig.value.bpm,
  sourceBpm: sketchMeta.value.bpm,
  notationType: codeStripConfig.value.notation === "note" ? "absolute" : "relative",
  scaleKey: sketchMeta.value.key,
  scaleMode: sketchMeta.value.mode,
  scaleOctave: keyboardConfig.value.mainOctave,
  patternDurationMs: productionWiring?.phrasesStore.takeDuration,
  sound: toStrudelSound(sketchMeta.value.instrument ?? "triangle"),
  // The pattern's own Shape, not the live knobs.
  shape: productionWiring?.phrasesStore.takeContext.shape,
  inline: true,
}));

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
  return renderStrudelNotation(phrasesStore.takeNotes as LogNote[], notationConfig.value);
});
const generatedCode = computed(() => generatedNotation.value.code);

/** The take as the transport plays it, from the same notes and configuration. */
function patternRequest(): PatternRequest | null {
  const wiring = productionWiring;
  if (!wiring || !wiring.phrasesStore.takeNotes.length) return null;
  return {
    id: wiring.phrasesStore.takeId,
    notes: wiring.phrasesStore.takeNotes as LogNote[],
    config: notationConfig.value,
    instrument: sketchMeta.value.instrument ?? "triangle",
    key: sketchMeta.value.key,
    mode: sketchMeta.value.mode,
    laBasedMinor: wiring.visualConfigStore.laBasedMinor,
    bpm: codeStripConfig.value.bpm,
  };
}

function stopPlayback() {
  playEpoch += 1;
  stripPlaying.value = false;
  player?.stop();
  setPlaying(false);
}

async function play(): Promise<boolean> {
  const epoch = ++playEpoch;
  const request = patternRequest();
  if (!player || !request || productionWiring?.instrumentStore.isInteractionLocked) return false;
  syncCode(visibleCode.value);
  stripPlaying.value = true;
  try {
    await player.play(request);
  } catch (error) {
    if (epoch === playEpoch) {
      stripPlaying.value = false;
      setPlaying(false);
      setError(error);
    }
    throw error;
  }
  if (epoch !== playEpoch) return false;
  if (productionWiring?.instrumentStore.isInteractionLocked) {
    stopPlayback();
    return false;
  }
  setPlaying(true);
  return true;
}

function initializeTransport() {
  visibleCode.value = generatedCode.value;
  player = markRaw(createPatternPlayer({
    audio: {
      getContext: getAudioContext,
      async ensureReady(instrumentId) {
        await initSuperdoughAudio();
        if (instrumentId.startsWith("gm_")) await ensureSoundfontCatalog();
        return getSuperdoughMasterGain();
      },
    },
    onInterrupted(error) {
      playEpoch += 1;
      stripPlaying.value = false;
      setPlaying(false);
      setError(error);
    },
  }));
  setProductionPatternPlayer(player);

  attachedController = {
    getCode: () => visibleCode.value,
    // Playback follows the take's note data, never edited text.
    setCode: (code: string) => {
      visibleCode.value = code;
      syncCode(code);
    },
    evaluate: play,
    stop: stopPlayback,
  };
  attachEditor(attachedController, generatedCode.value);
  syncCode(generatedCode.value);
}

watch(
  () => productionWiring?.instrumentStore.isInteractionLocked ?? false,
  (isLocked) => {
    if (isLocked && player?.isPlaying) stopPlayback();
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
  visibleCode.value = code;
  if (!isControlled.value) syncCode(code);
});

// Tempo, key, mode, octave and instrument changes rebuild the sounding table
// and swap it at the next quantum, keeping the bar phase. A new take does not
// replace a playing loop by itself (main's behaviour): playing over a loop
// records into the take, and swapping on every note would overdub.
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
    const request = patternRequest();
    if (isControlled.value || !player?.isPlaying || !request) return;
    player.update(request).catch((error) => {
      // The old table and instrument keep playing.
      setError(error);
    });
  },
);

onBeforeUnmount(() => {
  viewport?.destroy();
  if (!player) return;
  detachEditor(attachedController);
  playEpoch += 1;
  try {
    player.dispose();
  } catch (error) {
    console.error("[CodeStrip] pattern transport teardown error:", error);
  } finally {
    setProductionPatternPlayer(undefined);
    player = null;
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
      :code="visibleCode"
      :playing="isControlled ? false : stripPlaying"
      :listening="!isControlled"
      :density="density"
      :time-signature="timeSignature"
      :show-rests="codeStripConfig.showRests"
      :framed="framed"
      :aria-label="ariaLabel"
      :empty-label="EMPTY_EDITOR_CODE"
      :viewport="viewport"
      :color-resolver="colorResolver"
      :still-color-resolver="stillColorResolver"
      :unit-ms="isControlled ? undefined : (60000 / codeStripConfig.bpm) * GENERATED_BEATS_PER_BAR"
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
