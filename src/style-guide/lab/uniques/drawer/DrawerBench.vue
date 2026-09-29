<script setup lang="ts">
import { computed, ref } from "vue";
import { Keyboard as KeyboardIcon } from "lucide-vue-next";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import MidiSettingsIcon from "@/components/primatives/MidiSettingsIcon.vue";
import Drawer from "@/components/uniques/Drawer/index.vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import {
  defaultKeyboardHeight,
  maximumKeyboardHeight,
  minimumKeyboardHeight,
  resolveKeyboardLayout,
} from "@/components/compounds/keyboardSizing";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import { CHROMATIC_NOTES } from "@/data";
import "./drawer-skins.css";

/**
 * The real Drawer at both edges inside a phone-height frame: two top drawers
 * sharing the upper edge and the Keyboard drawer with its persistent bar.
 * `skin` is applied around the real source; `--ulab-fill` and `--ulab-rows`
 * relay the Drawer's own resize events for skins that show extent.
 */
const props = withDefaults(defineProps<{ skin?: string | null; startOpen?: "instrument" | null }>(), {
  skin: null,
  startOpen: null,
});

const FRAME = 560;
const top = ref<"instrument" | "config" | null>(props.startOpen);
const keyboardOpen = ref(true);
const rowCount = ref(2);
const topFill = ref({ instrument: 0, config: 0 });
const instrumentIcon = computed(() => instrumentIconFor("Piano"));

function resizeKeyboard(contentHeight: number) {
  rowCount.value = resolveKeyboardLayout(contentHeight, rowCount.value).rowCount;
}
function resizeTop(which: "instrument" | "config", height: number) {
  topFill.value[which] = Math.min(1, height / (FRAME * 0.85));
}
const rows = computed(() => Array.from({ length: rowCount.value }, (_, index) => {
  const octave = 4 + Math.floor(rowCount.value / 2) - index;
  return { octave, keys: CHROMATIC_NOTES.map((pitch, degree) => ({
    id: `${pitch}${octave}`, rawPitch: `${pitch}${octave}`,
    syllable: ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Se", "Sol", "Le", "La", "Te", "Ti"][degree],
    degree: String(degree + 1), scaleIndex: degree, pitchClassIndex: degree,
  })) };
}));
const tokens: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", duration: "@0.125", progress: 0 },
  { type: "note", note: "mi", text: "Mi", duration: "@0.125", progress: 0 },
  { type: "note", note: "sol", text: "Sol", duration: "@0.25", progress: 0 },
];
</script>

<template>
  <div class="ulab-drawer" :class="skin ? `ulab-drawer--${skin}` : 'ulab-drawer--production'">
    <div class="ulab-drawer__frame" :style="{ height: `${FRAME}px` }">
      <Drawer
        :model-value="top === 'instrument'" anchor="top" handle-align="left"
        accessible-name="Instrument" handle-label="Piano"
        :initial-content-height="180" class="ulab-drawer__top" :class="{ 'ulab-drawer__top--open': top === 'instrument' }"
        :style="{ '--ulab-fill': topFill.instrument }"
        close-on-escape fit-content-on-open
        @update:model-value="top = $event ? 'instrument' : top === 'instrument' ? null : top"
        @resize="resizeTop('instrument', $event)"
      >
        <template v-if="instrumentIcon" #icon><component :is="instrumentIcon" /></template>
        <div class="ulab-drawer__panel">
          <button v-for="name in ['Piano', 'Guitar', 'Drums', 'Violin', 'Flute', 'Organ']" :key="name" type="button">{{ name }}</button>
        </div>
      </Drawer>
      <Drawer
        :model-value="top === 'config'" anchor="top" handle-align="right"
        accessible-name="Config" :initial-content-height="160"
        class="ulab-drawer__top" :class="{ 'ulab-drawer__top--open': top === 'config' }"
        :style="{ '--ulab-fill': topFill.config }"
        close-on-escape fit-content-on-open
        @update:model-value="top = $event ? 'config' : top === 'config' ? null : top"
        @resize="resizeTop('config', $event)"
      >
        <template #icon><MidiSettingsIcon state="connected" /></template>
        <div class="ulab-drawer__panel"><p>Config content</p></div>
      </Drawer>
      <Drawer
        v-model="keyboardOpen" anchor="bottom" handle-align="center"
        accessible-name="Keyboard"
        :handle-resize-description="`${rowCount} keyboard rows. Drag or use Up and Down Arrow keys to resize.`"
        :initial-content-height="defaultKeyboardHeight(rowCount)"
        :min-content-height="minimumKeyboardHeight(1)"
        :max-content-height="maximumKeyboardHeight(8)"
        :max-height-ratio="0.95"
        :drag-to-collapse="false"
        :keyboard-resize-step="8"
        :scroll="false"
        :style="{ '--ulab-rows': keyboardOpen ? rowCount : 0 }"
        @content-resize="resizeKeyboard"
      >
        <template #icon><KeyboardIcon /></template>
        <template #persistent>
          <CodeStripBar :tokens="tokens" />
        </template>
        <template #default="{ height }">
          <Keyboard usage="controlled" :rows="rows" :available-height="height" />
        </template>
      </Drawer>
    </div>
  </div>
</template>

<style scoped>
.ulab-drawer { min-width: 0; }

.ulab-drawer__frame {
  position: relative;
  max-inline-size: 390px;
  margin-inline: auto;
  overflow: hidden;
  background: var(--ink);
  isolation: isolate;
}

.ulab-drawer__top { z-index: 3; }
.ulab-drawer__top--open { z-index: 2; }

.ulab-drawer__panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-3);
  padding: var(--s-5);
}

.ulab-drawer__panel p { grid-column: 1 / -1; margin: 0; color: var(--ivory-3); font: var(--t-body-s-mono); }

.ulab-drawer__panel button {
  min-height: 40px;
  border: 0;
  background: var(--ink-4);
  color: var(--ivory);
  font: 700 16px/1 var(--font-display);
  text-transform: uppercase;
}
</style>
