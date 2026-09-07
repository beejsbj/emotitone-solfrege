<template>
  <Drawer
    :model-value="store.drawer.isOpen"
    fixed
    anchor="bottom"
    handle-align="center"
    accessible-name="Keyboard"
    handle-test-id="keyboard-drawer-handle"
    storage-key="keyboard"
    :initial-content-height="initialKeyboardHeight"
    :min-content-height="minimumHeight"
    :scroll="false"
    @update:model-value="updateDrawerOpen"
  >
    <template #icon><KeyboardIcon /></template>
    <template #persistent>
      <PatternList />
      <CodeStripBar
        :is-playing="isPlaying"
        :play-disabled="!hasPlayableCode"
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
        :rows="store.keyboardConfig.rowCount"
        :harmony-value="harmonyLatched"
        @update:key-value="musicStore.setKey"
        @update:mode-value="updateMode"
        @update:bpm="updateBpm"
        @update:octave="store.setMainOctave"
        @update:rows="store.setRowCount"
        @update:harmony-value="updateHarmonyLatch"
        @harmony-effective="harmonyEffective = $event"
      />
    </template>
    <template #default="{ height }">
      <Keyboard
        :available-height="height"
        :harmony-alteration="harmonyEffective"
      />
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
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
import { minimumKeyboardHeight, defaultKeyboardHeight } from "@/components/compounds/keyboardSizing";
import type { MusicalMode } from "@/types/music";
import type { HarmonyAlteration } from "@/domain/harmony";

// Store
const store = useKeyboardDrawerStore();
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

async function toggleSketchPlayback() {
  if (!hasPlayableCode.value) return;
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

const rowCount = computed(() => store.visibleOctaves?.length ?? store.keyboardConfig.rowCount);
const minimumHeight = computed(() => minimumKeyboardHeight(rowCount.value));
const initialKeyboardHeight = computed(() => defaultKeyboardHeight(rowCount.value));

// Expose methods for external control if needed
defineExpose({
  openDrawer: store.openDrawer,
  closeDrawer: store.closeDrawer,
  toggleDrawer: store.toggleDrawer,
  store,
});
</script>
