<template>
  <Drawer
    class="performance-deck-drawer"
    data-stage-occlusion-host
    :model-value="store.drawer.isOpen"
    fixed
    anchor="bottom"
    handle-align="center"
    accessible-name="Keyboard"
    :handle-resize-description="`${rowCount} keyboard rows. Drag or use Up and Down Arrow keys to resize.`"
    handle-test-id="keyboard-drawer-handle"
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
    <template #persistent>
      <PatternList @context-change="bumpPatternControls" />
      <CodeStripBar
        data-stage-occluder
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
        :listening-status="liveListeningStatus"
        :listening-error="liveListeningError"
        :listening-status-message="liveListeningStatusMessage"
        haptic
        @toggle="toggleHummingCapture"
        @toggle-listening="toggleLiveListeningInput"
        @cancel="cancelHummingCapture"
        @select-take="selectHummingTake"
      />
      <ControlBar
        :key-value="musicStore.currentKey"
        :mode-value="musicStore.currentMode"
        :bpm="visualConfigStore.config.codeStrip.bpm"
        :octave="store.keyboardConfig.mainOctave"
        :play-style="musicStore.playStyle"
        :play-rate="musicStore.playRate"
        :harmony-value="harmonyLatched"
        :change-signals="patternControlSignals"
        @update:key-value="musicStore.setKey"
        @update:mode-value="updateMode"
        @update:bpm="updateBpm"
        @update:octave="store.setMainOctave"
        @update:play-style="musicStore.setPlayStyle"
        @update:play-rate="musicStore.setPlayRate"
        @update:harmony-value="updateHarmonyLatch"
        @harmony-effective="harmonyEffective = $event"
      />
    </template>
    <template #default="{ height }">
      <div class="relative h-full" :aria-busy="instrumentStore.isInteractionLocked || undefined">
        <Keyboard
          :available-height="height"
          :harmony-alteration="harmonyEffective"
          :class="{ 'pointer-events-none opacity-35 grayscale': instrumentStore.isInteractionLocked }"
        />
        <div
          v-if="instrumentStore.isInteractionLocked"
          data-testid="keyboard-warmup-overlay"
          role="status"
          aria-live="polite"
          class="absolute inset-0 z-20 flex items-center justify-center bg-[#090909]/75 px-5 text-center backdrop-blur-[2px]"
        >
          <div class="max-w-sm border border-[#5d5d5d] bg-[#181818]/95 px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.32)] [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]">
            <div class="flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.22em] text-[#e2e2e2]">
              <span class="relative h-3.5 w-3.5 shrink-0" aria-hidden="true">
                <span class="absolute inset-0 rounded-full border border-white/20" />
                <span class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-white border-t-neutral-400 motion-reduce:animate-none" />
              </span>
              <span>{{ instrumentStore.warmupMessage }}</span>
            </div>
            <div class="mt-2 text-[11px] font-mono uppercase tracking-[0.18em] text-white">
              {{ warmingInstrumentName }}
            </div>
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
import { useLiveListening } from "@/composables/useLiveListening";
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

// Store
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
const {
  status: liveListeningStatus,
  error: liveListeningError,
  statusMessage: liveListeningStatusMessage,
  toggle: toggleLiveListening,
  stop: stopLiveListening,
} = useLiveListening();
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
  if (liveListeningStatus.value !== "idle") {
    await stopLiveListening();
  }
  await toggle();
}

async function toggleHummingCapture() {
  if (isPlaying.value && hummingStatus.value !== "recording") {
    await stopSketchPlayback();
  }
  if (liveListeningStatus.value !== "idle" && hummingStatus.value !== "recording") {
    await stopLiveListening();
  }
  await toggleHumming();
}

async function cancelHummingCapture() {
  await cancelHumming();
}

async function toggleLiveListeningInput() {
  if (isPlaying.value && liveListeningStatus.value !== "listening") {
    await stopSketchPlayback();
  }
  if (
    liveListeningStatus.value !== "listening"
    && ["requesting", "recording", "preparing", "analyzing"].includes(hummingStatus.value)
  ) {
    await cancelHumming();
  }
  await toggleLiveListening();
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
  background: transparent;
}

@media (forced-colors: active) {
  .performance-deck-drawer {
    background: Canvas;
  }
}
</style>
