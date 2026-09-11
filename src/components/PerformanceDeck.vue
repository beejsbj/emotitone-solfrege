<template>
  <Drawer
    class="performance-deck-drawer"
    :model-value="store.drawer.isOpen"
    fixed
    anchor="bottom"
    handle-align="center"
    handle-placement="persistent"
    accessible-name="Keyboard"
    :handle-resize-description="`${rowCount} keyboard rows. Drag or use Up and Down Arrow keys to resize.`"
    handle-test-id="performance-deck-handle"
    storage-key="keyboard"
    :initial-content-height="initialKeyboardHeight"
    :min-content-height="minimumHeight"
    :max-content-height="maximumHeight"
    :max-height-ratio="0.95"
    :scroll="false"
    :drag-to-collapse="false"
    :keyboard-resize-step="8"
    :haptic="store.keyboardConfig.hapticFeedback"
    @update:model-value="updateDrawerOpen"
    @content-resize="resizeKeyboard"
  >
    <template #icon><KeyboardIcon /></template>
    <template #persistent-leading>
      <PatternList @context-change="bumpPatternControls" />
    </template>
    <template #persistent>
      <div class="performance-deck__instrument-surface">
        <CodeStripBar
          :is-playing="isPlaying"
          :play-disabled="!hasPlayableCode || (instrumentStore.isInteractionLocked && !isPlaying)"
          haptic
          @toggle-playback="toggleSketchPlayback"
          @backspace="patternsStore.removeLastFromCurrentSketch()"
          @return="patternsStore.sendCurrentPattern()"
        />
        <HummingCaptureTransport
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
          :key-value="musicStore.currentKey"
          :mode-value="musicStore.currentMode"
          :bpm="visualConfigStore.config.codeStrip.bpm"
          :octave="store.keyboardConfig.mainOctave"
          :harmony-value="harmonyLatched"
          :change-signals="patternControlSignals"
          @update:key-value="musicStore.setKey"
          @update:mode-value="updateMode"
          @update:bpm="updateBpm"
          @update:octave="store.setMainOctave"
          @update:harmony-value="updateHarmonyLatch"
          @harmony-effective="harmonyEffective = $event"
        />
      </div>
    </template>
    <template #default="{ height }">
      <div
        class="performance-deck__keyboard-surface"
        :aria-busy="instrumentStore.isInteractionLocked || undefined"
      >
        <Keyboard
          :available-height="height"
          :harmony-alteration="harmonyEffective"
          :class="{ 'pointer-events-none': instrumentStore.isInteractionLocked }"
        />
        <div
          v-if="instrumentStore.isInteractionLocked"
          data-testid="keyboard-warmup-overlay"
          role="status"
          aria-live="polite"
          class="performance-deck__warmup"
        >
          <div class="performance-deck__warmup-status">
            <span class="performance-deck__warmup-spinner" aria-hidden="true" />
            <span>{{ instrumentStore.warmupMessage }}</span>
          </div>
          <div class="performance-deck__warmup-instrument">
            {{ warmingInstrumentName }}
          </div>
        </div>
      </div>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useInstrumentStore } from "@/stores/instrument";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useVisualConfigStore } from "@/stores/visualConfig";
import Drawer from "@/components/uniques/Drawer/index.vue";
import { Keyboard as KeyboardIcon } from "lucide-vue-next";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import { useHummingCapture } from "@/composables/useHummingCapture";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import HummingCaptureTransport from "@/components/humming/HummingCaptureTransport.vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import PatternList from "@/components/patterns/PatternList.vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import {
  defaultKeyboardHeight,
  maximumKeyboardHeight,
  minimumKeyboardHeight,
  resolveKeyboardLayout,
} from "@/components/compounds/keyboardSizing";
import type { MusicalMode } from "@/types/music";
import type { HarmonyAlteration } from "@/domain/harmony";
import { displayInstrumentName } from "@/data/instruments";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

// Production wiring
const store = useKeyboardDrawerStore();
const instrumentStore = useInstrumentStore();
const musicStore = useMusicStore();
const patternsStore = usePatternsStore();
const visualConfigStore = useVisualConfigStore();
const {
  toggle,
  stop: stopSketchPlayback,
  isPlaying,
  hasPlayableCode,
} = useCodeStripStrudel();
const {
  status: hummingStatus,
  error: hummingError,
  statusMessage: hummingStatusMessage,
  takeLabels: hummingTakeLabels,
  selectedTakeIndex: selectedHummingTake,
  toggle: toggleHumming,
  cancel: cancelHumming,
  selectTake: selectHummingTake,
} = useHummingCapture();
const harmonyLatched = ref<HarmonyAlteration>("auto");
const harmonyEffective = ref<HarmonyAlteration>("auto");
type PatternControl = "key" | "mode" | "bpm" | "octave";
const patternControlSignals = reactive<Record<PatternControl, number>>({
  key: 0,
  mode: 0,
  bpm: 0,
  octave: 0,
});

function bumpPatternControls(controls: PatternControl[]) {
  for (const control of controls) patternControlSignals[control] += 1;
}

async function toggleSketchPlayback() {
  if (isPlaying.value) {
    await toggle();
    return;
  }
  if (!hasPlayableCode.value || instrumentStore.isInteractionLocked) return;
  if (["requesting", "recording", "preparing", "analyzing"].includes(hummingStatus.value)) {
    await cancelHumming();
  }
  await toggle();
}

async function toggleHummingCapture() {
  if (isPlaying.value && hummingStatus.value !== "recording") {
    await stopSketchPlayback();
  }
  await toggleHumming();
}

async function cancelHummingCapture() {
  await cancelHumming();
}

function updateMode(mode: string) {
  musicStore.setMode(mode as MusicalMode);
}

function updateBpm(bpm: number) {
  visualConfigStore.updateConfig("codeStrip", { bpm });
}

function updateHarmonyLatch(value: HarmonyAlteration) {
  harmonyLatched.value = value;
  harmonyEffective.value = value;
}

function updateDrawerOpen(isOpen: boolean) {
  if (isOpen) store.openDrawer();
  else store.closeDrawer();
}

function resizeKeyboard(contentHeight: number, source?: "pointer") {
  const padding = store.keyboardConfig.keyboardPadding ? 8 : 0;
  const layout = resolveKeyboardLayout(contentHeight - padding, rowCount.value);
  if (layout.rowCount !== store.keyboardConfig.rowCount) {
    store.setRowCount(layout.rowCount);
    if (source === "pointer" && store.keyboardConfig.hapticFeedback) {
      triggerUIHaptic();
    }
  }
}

const rowCount = computed(() => store.visibleOctaves?.length ?? store.keyboardConfig.rowCount);
const keyboardPadding = computed(() => store.keyboardConfig.keyboardPadding ? 8 : 0);
const minimumHeight = computed(() => minimumKeyboardHeight(1) + keyboardPadding.value);
const maximumHeight = computed(() => maximumKeyboardHeight(8) + keyboardPadding.value);
const initialKeyboardHeight = computed(() =>
  defaultKeyboardHeight(rowCount.value) + keyboardPadding.value,
);
const warmingInstrumentName = computed(() =>
  instrumentStore.warmingInstrument
    ? displayInstrumentName(instrumentStore.warmingInstrument)
    : ""
);

// Expose methods for external control if needed
defineExpose({
  openDrawer: store.openDrawer,
  closeDrawer: store.closeDrawer,
  toggleDrawer: store.toggleDrawer,
  store,
});
</script>

<style scoped>
.performance-deck-drawer {
  --drawer-handle-rail-surface: var(--ink);

  background: transparent;
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
