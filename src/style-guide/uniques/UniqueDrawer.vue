<script setup lang="ts">
import { computed, ref } from "vue";
import { Keyboard as KeyboardIcon } from "lucide-vue-next";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import MidiSettingsIcon from "@/components/primatives/MidiSettingsIcon.vue";
import Drawer from "@/components/uniques/Drawer/index.vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import {
  defaultKeyboardHeight,
  maximumKeyboardHeight,
  minimumKeyboardHeight,
  resolveKeyboardLayout,
} from "@/components/compounds/keyboardSizing";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import { CHROMATIC_NOTES } from "@/data";

const top = ref<"instrument" | "config" | null>(null);
const keyboardOpen = ref(true);
const rowCount = ref(3);
const width = ref("100%");
const midiState = ref<"idle" | "connecting" | "connected" | "error">("connected");
const instrumentName = ref("Piano");
const instrumentIcon = computed(() => instrumentIconFor(instrumentName.value));
const lastAction = ref("Drag any handle. Tap Keyboard to hide only its keys.");
const hostWidths = [
  { value: "320px", label: "320" },
  { value: "390px", label: "390" },
  { value: "768px", label: "768" },
  { value: "100%", label: "Fill" },
] as const;
const midiStates = ["idle", "connecting", "connected", "error"] as const;
function resizeKeyboard(contentHeight: number) {
  rowCount.value = resolveKeyboardLayout(contentHeight, rowCount.value).rowCount;
}
const rows = computed(() => Array.from({ length: rowCount.value }, (_, index) => {
  const octave = 4 + Math.floor(rowCount.value / 2) - index;
  return { octave, keys: CHROMATIC_NOTES.map((pitch, degree) => ({
    id: `${pitch}${octave}`, rawPitch: `${pitch}${octave}`, syllable: ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Se", "Sol", "Le", "La", "Te", "Ti"][degree],
    degree: String(degree + 1), scaleIndex: degree, pitchClassIndex: degree,
  })) };
}));
const tokens: CodeStripToken[] = [
  { type: "note" as const, note: "do", text: "Do", duration: "@0.125", progress: 1 },
  { type: "note" as const, note: "mi", text: "Mi", duration: "@0.125", progress: 1 },
  { type: "note" as const, note: "sol", text: "Sol", duration: "@0.25", progress: 1 },
];
</script>

<template>
  <section class="drawer-specimen">
    <p class="drawer-specimen__role">One source · both edges</p>
    <p class="drawer-specimen__intro">
      Ink surface, exposed icon/grip handle, and direct resize. Generic drawers
      clip continuously; the keyboard keeps complete rows and taps closed.
    </p>

    <div class="drawer-specimen__controls">
      <div class="drawer-specimen__field" role="group" aria-label="Host width">
        <h3 class="label">Host width</h3>
        <div class="drawer-specimen__chips">
          <button class="guide-chip"
            v-for="option in hostWidths" :key="option.value" type="button"
            :aria-pressed="width === option.value" @click="width = option.value"
          >{{ option.label }}</button>
        </div>
      </div>
      <label class="drawer-specimen__field">
        <span class="label">Instrument label</span>
        <input v-model="instrumentName" class="drawer-specimen__input" />
      </label>
      <div class="drawer-specimen__field" role="group" aria-label="MIDI status">
        <h3 class="label">MIDI status</h3>
        <div class="drawer-specimen__chips">
          <button class="guide-chip"
            v-for="state in midiStates" :key="state" type="button"
            :aria-pressed="midiState === state" @click="midiState = state"
          >{{ state }}</button>
        </div>
      </div>
    </div>

    <div class="drawer-specimen__viewport">
      <div class="drawer-specimen__stage" :style="{ width }">
        <button class="drawer-specimen__canvas-action" @click="lastAction = 'Canvas stays interactive'">Play with the canvas</button>
        <Drawer
          :model-value="top === 'instrument'" anchor="top" handle-align="left"
          accessible-name="Instrument specimen" :handle-label="instrumentName"
          :initial-content-height="240" class="drawer-specimen__top"
          :class="{ 'drawer-specimen__top--open': top === 'instrument' }"
          close-on-escape fit-content-on-open close-on-outside
          @update:model-value="top = $event ? 'instrument' : top === 'instrument' ? null : top"
        >
          <template v-if="instrumentIcon" #icon><component :is="instrumentIcon" /></template>
          <div class="drawer-specimen__panel">
            <h4>Instrument</h4>
            <p>Content scrolls as the available height shrinks.</p>
            <button v-for="name in ['Piano', 'Guitar', 'Drums', 'Violin', 'Flute', 'Marimba', 'Organ', 'Synth']" :key="name" @click="instrumentName = name; lastAction = name; top = null">{{ name }}</button>
          </div>
        </Drawer>
        <Drawer
          :model-value="top === 'config'" anchor="top" handle-align="right"
          accessible-name="Config specimen" :initial-content-height="240"
          class="drawer-specimen__top" :class="{ 'drawer-specimen__top--open': top === 'config' }"
          close-on-escape fit-content-on-open close-on-outside
          @update:model-value="top = $event ? 'config' : top === 'config' ? null : top"
        >
          <template #icon><MidiSettingsIcon :state="midiState" /></template>
          <div class="drawer-specimen__panel">
            <h4>Config</h4><p>MIDI {{ midiState }} · keyboard height and row count belong to its drawer handle.</p>
          </div>
        </Drawer>
        <Drawer
          v-model="keyboardOpen" anchor="bottom" handle-align="center"
          accessible-name="Keyboard specimen"
          :handle-resize-description="`${rowCount} keyboard rows. Drag or use Up and Down Arrow keys to resize.`"
          :initial-content-height="defaultKeyboardHeight(rowCount)"
          :min-content-height="minimumKeyboardHeight(1)"
          :max-content-height="maximumKeyboardHeight(8)"
          :max-height-ratio="0.95"
          :drag-to-collapse="false"
          :keyboard-resize-step="8"
          :scroll="false"
          @content-resize="resizeKeyboard"
        >
          <template #icon><KeyboardIcon /></template>
          <template #persistent>
            <div class="drawer-specimen__pattern">Piano · C major · saved pattern</div>
            <CodeStripBar :tokens="tokens" @backspace="lastAction = 'Backspace'" @return="lastAction = 'Return'" @toggle-playback="lastAction = 'Play (inert specimen)'" />
            <ControlBar joystick-visual="analog" />
          </template>
          <template #default="{ height }">
            <Keyboard usage="controlled" :rows="rows" :available-height="height" />
          </template>
        </Drawer>
      </div>
    </div>
    <output class="drawer-specimen__output">{{ lastAction }}</output>
    <p class="drawer-specimen__caption">Real Drawer, Keyboard, Control Bar, and CodeStrip Bar sources. The canvas, panel choices, and saved-pattern label are specimen scaffolding; no audio or production stores are driven here. The keyboard Drawer derives complete rows from its allocated height; top drawers reopen to fit their content and dismiss when touching outside.</p>
  </section>
</template>

<style scoped>
.drawer-specimen {
  display: grid;
  gap: var(--s-6);
  min-width: 0;
}

.drawer-specimen p { margin: 0; }

.drawer-specimen__role {
  font: 700 clamp(20px, 3vw, 26px)/1.05 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--guide-paper-text, var(--ivory-2));
}

.drawer-specimen__intro {
  max-width: 64ch;
  font: var(--t-body-mono);
  color: var(--ivory-2);
}

.drawer-specimen__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-6) var(--s-9);
}

.drawer-specimen__field {
  display: grid;
  align-content: start;
  gap: var(--s-4);
  min-width: 0;
}

.drawer-specimen__field .label { margin: 0; }

.drawer-specimen__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
}

.drawer-specimen__input {
  width: min(100%, 220px);
  min-height: 40px;
  padding: 8px 12px;
  border: 0;
  background: var(--ink);
  color: var(--ivory);
  font: var(--t-body-mono);
}

/* Fixed host widths wider than the sheet scroll inside this well only. */
.drawer-specimen__viewport {
  min-width: 0;
  overflow-x: auto;
  background: var(--ink);
}

.drawer-specimen__stage {
  position: relative;
  height: 640px;
  background: radial-gradient(ellipse at 50% 30%, var(--pine), var(--ink) 70%);
  isolation: isolate;
}

.drawer-specimen__canvas-action {
  position: absolute;
  top: 90px;
  left: 24px;
  padding: 10px 14px 8px;
  border: 0;
  background: var(--ivory);
  color: var(--ink);
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-offcut);
  transform: rotate(var(--rot-sticker));
  cursor: pointer;
}

.drawer-specimen__top { z-index: 3; }
.drawer-specimen__top--open { z-index: 2; }

.drawer-specimen__panel {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 96px), 1fr));
  gap: var(--s-3);
  padding: var(--s-6);
}

.drawer-specimen__panel h4,
.drawer-specimen__panel p { grid-column: 1 / -1; margin: 0; }

.drawer-specimen__panel h4 {
  font: 700 20px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.drawer-specimen__panel p {
  font: var(--t-body-s-mono);
  color: var(--ivory-3);
}

.drawer-specimen__panel button {
  min-height: 40px;
  padding: 8px 10px 6px;
  border: 0;
  background: var(--ink-4);
  color: var(--ivory);
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-tile);
  cursor: pointer;
}

.drawer-specimen__pattern {
  padding: 10px 12px;
  font: var(--t-body-s-mono);
  color: var(--ivory-2);
}

.drawer-specimen__output {
  display: block;
  font: var(--t-body-s-mono);
  color: var(--guide-paper-text, var(--ivory));
}

.drawer-specimen__caption {
  max-width: 72ch;
  font: var(--t-body-s-mono);
  color: var(--ivory-3);
}

</style>
