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
} from "@/services/patternTransport";
import {
  computed,
  markRaw,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import {
  createNoteColorResolver,
  createStaticNoteColorResolver,
  staticNoteColorResolver,
} from "@/components/primatives/noteColorContext";
import { useMusicColorClock } from "@/composables/useMusicColorClock";
import { CodeStripViewport } from "./viewport";
import { ensureSoundfontCatalog, initAudioEngine } from "@/services/audioEngine";
import { cutLiveWetTails, getAudioContext, getMasterGain } from "@/services/audioRuntime";
import { renderStrudelNotation, type StrudelConfig } from "@/services/StrudelNotation";
import { createHeardClock } from "@/services/heardClock";
import { useLooperStore } from "@/stores/looper";
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
    phrasesStore: usePhrasesStore(),
    looperStore: useLooperStore(),
    visualConfigStore: useVisualConfigStore(),
    code: useCodeStripStrudel(),
  };
}

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

const initError = ref<string | null>(null);
// Play is the loop: while the desk's pattern sounds in the Looper, the strip
// follows it, lighting only that member's notes while the others sound. The
// strip has no playback of its own; only the looper store starts and stops
// the transport (BJS-569).
const looperMemberId = computed(() => productionWiring?.looperStore.deskMemberId ?? null);
const followsLooper = computed(() => looperMemberId.value !== null);
// The highlight is timed on what is heard, so it stops while audio does.
const heardClock = createHeardClock();
let player: PatternPlayer | null = null;

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

/** The export configuration: what the strip shows (the Looper plays the same notes). */
const notationConfig = computed<Partial<StrudelConfig>>(() => ({
  bpm: codeStripConfig.value.bpm,
  sourceBpm: sketchMeta.value.bpm,
  notationType: codeStripConfig.value.notation === "note" ? "absolute" : "relative",
  scaleKey: sketchMeta.value.key,
  scaleMode: sketchMeta.value.mode,
  scaleOctave: keyboardConfig.value.mainOctave,
  patternDurationMs: productionWiring?.phrasesStore.takeDuration,
  sound: resolveLiveSoundName(sketchMeta.value.instrument ?? "triangle"),
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

/** Create the app's single pattern player; the looper store drives it. */
function initializeTransport() {
  player = markRaw(createPatternPlayer({
    audio: {
      getContext() {
        const context = getAudioContext();
        heardClock.attach(context);
        return context;
      },
      async ensureReady(instrumentId) {
        await initAudioEngine();
        if (instrumentId.startsWith("gm_")) await ensureSoundfontCatalog();
        return getMasterGain();
      },
      // Stop All's cut silences the shared room and delay too (BJS-598).
      cutWetTails() { cutLiveWetTails(); },
    },
  }));
  setProductionPatternPlayer(player);
}

onMounted(() => {
  if (isControlled.value) return;
  productionWiring?.code.syncCode(generatedCode.value);
  try {
    initializeTransport();
  } catch (error) {
    initError.value = error instanceof Error
      ? error.message
      : "CodeStrip failed to initialize.";
    console.error("[CodeStrip] pattern transport init error:", error);
  }
});

// Open in Strudel reads the text the strip shows.
watch(generatedCode, (code) => {
  if (!isControlled.value) productionWiring?.code.syncCode(code);
});

onBeforeUnmount(() => {
  viewport?.destroy();
  heardClock.dispose();
  productionWiring?.code.clearCode();
  if (!player) return;
  try {
    player.dispose();
  } catch (error) {
    console.error("[CodeStrip] pattern transport teardown error:", error);
  } finally {
    setProductionPatternPlayer(undefined);
    player = null;
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
      :playing="isControlled ? false : followsLooper"
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
      :clock="isControlled ? undefined : heardClock"
      :member-id="followsLooper ? looperMemberId ?? undefined : undefined"
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
