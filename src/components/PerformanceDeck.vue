<template>
  <Drawer
    class="performance-deck-drawer"
    :model-value="drawerOpen"
    fixed
    anchor="bottom"
    handle-align="center"
    persistent-overflow="visible"
    accessible-name="Performance deck"
    :handle-resize-description="`${rowCount} keyboard rows. Drag or use Up and Down Arrow keys to resize.`"
    handle-test-id="performance-deck-handle"
    :storage-key="isProductionUsage ? 'keyboard' : undefined"
    :initial-content-height="initialKeyboardHeight"
    :min-content-height="minimumHeight"
    :max-content-height="maximumHeight"
    :max-height-ratio="0.95"
    :scroll="false"
    :drag-to-collapse="false"
    :keyboard-resize-step="8"
    :haptic="haptic"
    :handle-pointer-disabled="patternReelGuardsHandle"
    @update:model-value="updateDrawerOpen"
    @content-resize="resizeKeyboard"
  >
    <template #icon><KeyboardIcon /></template>
    <template #persistent-leading>
      <PatternList
        v-if="isProductionUsage"
        @context-change="bumpPatternControls"
        @interaction-change="setPatternReelGuard"
      />
      <PatternReel
        v-else
        :items="patterns"
        :selected-id="selectedPatternId"
        :entry-signal="patternEntrySignal"
        :disabled="interactionLocked"
        @commit="(id, input) => emit('patternCommit', id, input)"
        @delete="(id) => emit('patternDelete', id)"
        @copy="(id) => emit('patternCopy', id)"
        @open-strudel="(id) => emit('patternOpenStrudel', id)"
        @rename="(id, title) => emit('patternRename', id, title)"
        @interaction-change="setPatternReelGuard"
      />
    </template>
    <template #persistent>
      <div class="performance-deck__instrument-surface">
        <CodeStripBar
          :usage="isProductionUsage ? 'production' : 'controlled'"
          :tokens="isProductionUsage ? undefined : codeStripTokens"
          :source="isProductionUsage ? undefined : codeStripSource"
          :is-playing="isPlaying"
          :play-disabled="playDisabled"
          :haptic="isProductionUsage"
          @toggle-playback="toggleSketchPlayback"
          @backspace="handleBackspace"
          @return="handleReturn"
        />
        <HummingCaptureTransport
          v-if="isProductionUsage"
          :status="hummingStatus"
          :error="hummingError"
          :status-message="hummingStatusMessage"
          :take-labels="hummingTakeLabels"
          :selected-take-index="selectedHummingTake"
          haptic
          @toggle="toggleHummingCapture"
          @cancel="cancelHummingCapture"
          @select-take="selectHummingTake"
        />
        <ControlBar
          :key-value="keyValue"
          :mode-value="modeValue"
          :bpm="bpm"
          :octave="octave"
          :harmony-value="isProductionUsage ? harmonyLatched : harmonyValue"
          :change-signals="patternControlSignals"
          :haptic="isProductionUsage"
          @update:key-value="updateKey"
          @update:mode-value="updateMode"
          @update:bpm="updateBpm"
          @update:octave="updateOctave"
          @update:harmony-value="updateHarmonyLatch"
          @harmony-effective="updateHarmonyEffective"
        />
      </div>
    </template>
    <template #default="{ height }">
      <div
        class="performance-deck__keyboard-surface"
        :aria-busy="interactionLocked || undefined"
      >
        <Keyboard
          :usage="isProductionUsage ? 'production' : 'controlled'"
          :rows="isProductionUsage ? undefined : keyboardRows"
          :main-octave="octave"
          :tonic="keyValue"
          :scale-type="modeValue"
          :available-height="height"
          :harmony-alteration="harmonyEffective"
          :interaction-locked="interactionLocked"
          :class="{ 'pointer-events-none': interactionLocked }"
          @press="(intent) => emit('keyboardPress', intent)"
          @release="(intent) => emit('keyboardRelease', intent)"
          @chord-press="(intent) => emit('chordPress', intent)"
          @chord-release="(intent) => emit('chordRelease', intent)"
        />
        <div
          v-if="interactionLocked"
          data-testid="keyboard-warmup-overlay"
          role="status"
          aria-live="polite"
          class="performance-deck__warmup"
        >
          <div class="performance-deck__warmup-status">
            <span class="performance-deck__warmup-spinner" aria-hidden="true" />
            <span>{{ resolvedWarmupMessage }}</span>
          </div>
          <div class="performance-deck__warmup-instrument">
            {{ resolvedWarmingInstrumentName }}
          </div>
        </div>
      </div>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Keyboard as KeyboardIcon } from "lucide-vue-next";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import type {
  KeyboardChordIntent,
  KeyboardIntent,
  KeyboardRowView,
} from "@/components/compounds/Keyboard.vue";
import PatternReel from "@/components/compounds/PatternReel.vue";
import type {
  PatternReelInput,
  PatternReelItem,
} from "@/components/compounds/PatternReel.vue";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import Drawer from "@/components/uniques/Drawer/index.vue";
import HummingCaptureTransport from "@/components/humming/HummingCaptureTransport.vue";
import PatternList from "@/components/patterns/PatternList.vue";
import {
  defaultKeyboardHeight,
  maximumKeyboardHeight,
  minimumKeyboardHeight,
  resolveKeyboardLayout,
} from "@/components/compounds/keyboardSizing";
import {
  hasPlayableContent,
  useCodeStripStrudel,
} from "@/composables/useCodeStripStrudel";
import { useHummingCapture } from "@/composables/useHummingCapture";
import { displayInstrumentName } from "@/data/instruments";
import type { HarmonyAlteration } from "@/domain/harmony";
import { useInstrumentStore } from "@/stores/instrument";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

const props = withDefaults(defineProps<{
  usage?: "production" | "controlled";
  drawerOpen?: boolean;
  patterns?: PatternReelItem[];
  selectedPatternId?: string;
  patternEntrySignal?: number;
  codeStripTokens?: CodeStripToken[];
  codeStripSource?: string;
  isPlaying?: boolean;
  playDisabled?: boolean;
  keyValue?: ChromaticNote;
  modeValue?: MusicalMode;
  bpm?: number;
  octave?: number;
  rowCount?: number;
  keyboardRows?: KeyboardRowView[];
  harmonyValue?: HarmonyAlteration;
  warming?: boolean;
  warmupMessage?: string;
  warmingInstrumentName?: string;
}>(), {
  usage: "production",
  drawerOpen: true,
  patterns: () => [],
  selectedPatternId: "",
  patternEntrySignal: 0,
  codeStripTokens: () => [],
  codeStripSource: undefined,
  isPlaying: false,
  playDisabled: false,
  keyValue: "C",
  modeValue: "major",
  bpm: 120,
  octave: 4,
  rowCount: 3,
  keyboardRows: () => [],
  harmonyValue: "auto",
  warming: false,
  warmupMessage: "Preparing instrument",
  warmingInstrumentName: "",
});

const emit = defineEmits<{
  "update:drawerOpen": [open: boolean];
  "update:keyValue": [value: ChromaticNote];
  "update:modeValue": [value: MusicalMode];
  "update:bpm": [value: number];
  "update:octave": [value: number];
  "update:harmonyValue": [value: HarmonyAlteration];
  harmonyEffective: [value: HarmonyAlteration];
  rowCountChange: [value: number];
  togglePlayback: [];
  backspace: [];
  return: [];
  patternCommit: [id: string, input: PatternReelInput];
  patternDelete: [id: string];
  patternCopy: [id: string];
  patternOpenStrudel: [id: string];
  patternRename: [id: string, title: string];
  keyboardPress: [intent: KeyboardIntent];
  keyboardRelease: [intent: KeyboardIntent];
  chordPress: [intent: KeyboardChordIntent];
  chordRelease: [intent: KeyboardChordIntent];
}>();

const isProductionUsage = props.usage === "production";
const store = isProductionUsage ? useKeyboardDrawerStore() : undefined;
const instrumentStore = isProductionUsage ? useInstrumentStore() : undefined;
const musicStore = isProductionUsage ? useMusicStore() : undefined;
const patternsStore = isProductionUsage ? usePatternsStore() : undefined;
const visualConfigStore = isProductionUsage ? useVisualConfigStore() : undefined;
const playback = isProductionUsage ? useCodeStripStrudel() : undefined;
const humming = isProductionUsage ? useHummingCapture() : undefined;

const harmonyLatched = ref<HarmonyAlteration>(props.harmonyValue);
const harmonyEffective = ref<HarmonyAlteration>(props.harmonyValue);
const patternReelGuardsHandle = ref(false);
type PatternControl = "key" | "mode" | "bpm" | "octave";
const patternControlSignals = reactive<Record<PatternControl, number>>({
  key: 0,
  mode: 0,
  bpm: 0,
  octave: 0,
});

const drawerOpen = computed(() => store?.drawer.isOpen ?? props.drawerOpen);
const isPlaying = computed(() => playback?.isPlaying.value ?? props.isPlaying);
const hasPlayableCode = computed(() => playback?.hasPlayableCode.value
  ?? Boolean(
    props.codeStripTokens.length
    || (props.codeStripSource && hasPlayableContent(props.codeStripSource)),
  ));
const interactionLocked = computed(() =>
  instrumentStore?.isInteractionLocked ?? props.warming
);
const playDisabled = computed(() => isProductionUsage
  ? !hasPlayableCode.value || (interactionLocked.value && !isPlaying.value)
  : props.playDisabled
    || !hasPlayableCode.value
    || (interactionLocked.value && !isPlaying.value)
);
const keyValue = computed(() => (musicStore?.currentKey ?? props.keyValue) as ChromaticNote);
const modeValue = computed(() => musicStore?.currentMode ?? props.modeValue);
const bpm = computed(() => visualConfigStore?.config.codeStrip.bpm ?? props.bpm);
const octave = computed(() => store?.keyboardConfig.mainOctave ?? props.octave);
const rowCount = computed(() =>
  store?.visibleOctaves?.length ?? store?.keyboardConfig.rowCount ?? props.rowCount
);
const keyboardPadding = computed(() => store?.keyboardConfig.keyboardPadding ? 8 : 0);
const haptic = computed(() => store?.keyboardConfig.hapticFeedback ?? false);
const minimumHeight = computed(() => minimumKeyboardHeight(1) + keyboardPadding.value);
const maximumHeight = computed(() => maximumKeyboardHeight(8) + keyboardPadding.value);
const initialKeyboardHeight = computed(() =>
  defaultKeyboardHeight(rowCount.value) + keyboardPadding.value
);
const hummingStatus = computed(() => humming?.status.value ?? "idle");
const hummingError = computed(() => humming?.error.value ?? null);
const hummingStatusMessage = computed(() => humming?.statusMessage.value ?? "");
const hummingTakeLabels = computed(() => humming?.takeLabels.value ?? []);
const selectedHummingTake = computed(() => humming?.selectedTakeIndex.value ?? 0);
const resolvedWarmupMessage = computed(() =>
  instrumentStore?.warmupMessage ?? props.warmupMessage
);
const resolvedWarmingInstrumentName = computed(() => {
  if (!instrumentStore) return props.warmingInstrumentName;
  return instrumentStore.warmingInstrument
    ? displayInstrumentName(instrumentStore.warmingInstrument)
    : "";
});

function bumpPatternControls(controls: PatternControl[]) {
  for (const control of controls) patternControlSignals[control] += 1;
}

function setPatternReelGuard(active: boolean) {
  patternReelGuardsHandle.value = active;
}

async function toggleSketchPlayback() {
  if (!playback) {
    if (playDisabled.value) return;
    emit("togglePlayback");
    return;
  }
  if (isPlaying.value) {
    await playback.toggle();
    return;
  }
  if (!hasPlayableCode.value || interactionLocked.value) return;
  if (["requesting", "recording", "preparing", "analyzing"].includes(hummingStatus.value)) {
    await humming?.cancel();
  }
  await playback.toggle();
}

async function toggleHummingCapture() {
  if (!humming || !playback) return;
  if (isPlaying.value && hummingStatus.value !== "recording") {
    await playback.stop();
  }
  await humming.toggle();
}

async function cancelHummingCapture() {
  await humming?.cancel();
}

function selectHummingTake(index: number) {
  humming?.selectTake(index);
}

function handleBackspace() {
  if (patternsStore) patternsStore.removeLastFromCurrentSketch();
  else emit("backspace");
}

function handleReturn() {
  if (!patternsStore) {
    emit("return");
    return;
  }

  patternsStore.sendCurrentPattern();
}

function updateKey(value: string) {
  if (musicStore) musicStore.setKey(value as ChromaticNote);
  else emit("update:keyValue", value as ChromaticNote);
}

function updateMode(value: string) {
  if (musicStore) musicStore.setMode(value as MusicalMode);
  else emit("update:modeValue", value as MusicalMode);
}

function updateBpm(value: number) {
  if (visualConfigStore) visualConfigStore.updateConfig("codeStrip", { bpm: value });
  else emit("update:bpm", value);
}

function updateOctave(value: number) {
  if (store) store.setMainOctave(value);
  else emit("update:octave", value);
}

function updateHarmonyLatch(value: HarmonyAlteration) {
  harmonyLatched.value = value;
  harmonyEffective.value = value;
  if (!isProductionUsage) emit("update:harmonyValue", value);
}

function updateHarmonyEffective(value: HarmonyAlteration) {
  harmonyEffective.value = value;
  if (!isProductionUsage) emit("harmonyEffective", value);
}

function updateDrawerOpen(isOpen: boolean) {
  if (store) {
    if (isOpen) store.openDrawer();
    else store.closeDrawer();
  } else emit("update:drawerOpen", isOpen);
}

function resizeKeyboard(contentHeight: number, source?: "pointer" | "target") {
  // A reactive row-count change publishes its new target height through Drawer.
  // It must not be interpreted as fresh geometry and fed back into row solving.
  if (source === "target") return;
  const layout = resolveKeyboardLayout(contentHeight - keyboardPadding.value, rowCount.value);
  if (layout.rowCount === rowCount.value) return;
  if (!store) {
    emit("rowCountChange", layout.rowCount);
    return;
  }
  store.setRowCount(layout.rowCount);
  if (source === "pointer" && store.keyboardConfig.hapticFeedback) triggerUIHaptic();
}

function openDrawer() {
  if (store) store.openDrawer();
  else emit("update:drawerOpen", true);
}

function closeDrawer() {
  if (store) store.closeDrawer();
  else emit("update:drawerOpen", false);
}

function toggleDrawer() {
  if (store) store.toggleDrawer();
  else emit("update:drawerOpen", !drawerOpen.value);
}

defineExpose({ openDrawer, closeDrawer, toggleDrawer, store });
</script>

<style scoped>
.performance-deck-drawer {
  background: transparent;
}

.performance-deck-drawer :deep(.drawer__handle) {
  z-index: 2;
}

.performance-deck__instrument-surface,
.performance-deck__keyboard-surface,
.performance-deck__warmup {
  background: var(--ink);
}

.performance-deck__keyboard-surface {
  position: relative;
  height: 100%;
}

.performance-deck__warmup {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--s-4);
  padding: var(--s-7);
  color: var(--ivory);
  text-align: center;
}

.performance-deck__warmup-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-3);
  color: var(--ivory-2);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.performance-deck__warmup-spinner {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  box-sizing: border-box;
  border: 2px solid var(--ivory-4);
  border-top-color: var(--ivory);
  border-right-color: var(--ivory-2);
  border-radius: 50%;
  animation: performance-deck-warmup-spin 800ms linear infinite;
}

.performance-deck__warmup-instrument {
  color: var(--ivory);
  font: var(--t-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

@keyframes performance-deck-warmup-spin {
  to { transform: rotate(1turn); }
}

@media (prefers-reduced-motion: reduce) {
  .performance-deck__warmup-spinner { animation: none; }
}

@media (forced-colors: active) {
  .performance-deck-drawer {
    background: Canvas;
  }
}
</style>
