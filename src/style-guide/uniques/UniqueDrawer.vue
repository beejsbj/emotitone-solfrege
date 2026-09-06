<script setup lang="ts">
import { computed, ref } from "vue";
import { Piano, Keyboard as KeyboardIcon } from "lucide-vue-next";
import MidiSettingsIcon from "@/components/primatives/MidiSettingsIcon.vue";
import Drawer from "@/components/uniques/Drawer/index.vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import { minimumKeyboardHeight } from "@/components/compounds/keyboardSizing";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import { CHROMATIC_NOTES } from "@/data";

const top = ref<"instrument" | "config" | null>(null);
const keyboardOpen = ref(true);
const rowCount = ref(3);
const width = ref("100%");
const midiState = ref<"idle" | "connecting" | "connected" | "error">("connected");
const instrumentName = ref("Piano");
const lastAction = ref("Drag any handle. Tap Keyboard to hide only its keys.");
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
    <h3>Drawer · one source, both edges</h3>
    <p>Ink surface, exposed icon/grip handle, continuous resize. Swing opening/closing, direct drag, and no scrim.</p>
    <label>Host width
      <select v-model="width">
        <option value="320px">320px</option><option value="390px">390px</option>
        <option value="768px">768px</option><option value="100%">Available width</option>
      </select>
    </label>
    <label>Instrument label <input v-model="instrumentName" /></label>
    <label>MIDI status
      <select v-model="midiState">
        <option>idle</option><option>connecting</option><option>connected</option><option>error</option>
      </select>
    </label>
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
          <template #icon><Piano /></template>
          <div class="drawer-specimen__panel">
            <h4>Instrument</h4>
            <p>Content scrolls as the available height shrinks.</p>
            <button v-for="name in ['Piano', 'Celesta', 'Vibraphone', 'Marimba', 'Organ', 'Strings', 'Synth', 'Bass']" :key="name" @click="lastAction = name; top = null">{{ name }}</button>
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
            <h4>Config</h4><p>MIDI {{ midiState }} · keyboard height belongs to its drawer.</p>
            <label>Keyboard rows <select v-model.number="rowCount"><option :value="1">1</option><option :value="3">3</option><option :value="5">5</option></select></label>
          </div>
        </Drawer>
        <Drawer
          v-model="keyboardOpen" anchor="bottom" handle-align="center"
          accessible-name="Keyboard specimen" :initial-content-height="200"
          :min-content-height="minimumKeyboardHeight(rows.length)" :scroll="false"
        >
          <template #icon><KeyboardIcon /></template>
          <template #persistent>
            <div class="drawer-specimen__pattern">Piano · C major · saved pattern</div>
            <CodeStripBar :tokens="tokens" @backspace="lastAction = 'Backspace'" @return="lastAction = 'Return'" @toggle-playback="lastAction = 'Play (inert specimen)'" />
            <ControlBar :rows="rowCount" @update:rows="rowCount = $event" />
          </template>
          <template #default="{ height }">
            <Keyboard usage="controlled" :rows="rows" :available-height="height" />
          </template>
        </Drawer>
      </div>
    </div>
    <output>{{ lastAction }}</output>
    <p>Real Drawer, Keyboard, Control Bar, and CodeStrip Bar sources. The canvas, panel choices, and saved-pattern label are specimen scaffolding; no audio or production stores are driven here. Keyboard retains its preferred height; top drawers reopen to fit their content and dismiss when touching outside.</p>
  </section>
</template>

<style scoped>
.drawer-specimen { display: grid; gap: 16px; width: min(960px, calc(100vw - 32px)); min-width: 0; }
.drawer-specimen p, .drawer-specimen output { font: var(--t-label); color: var(--ivory-3); }
.drawer-specimen label { display: flex; gap: 12px; align-items: center; }
.drawer-specimen select, .drawer-specimen input, .drawer-specimen__panel button, .drawer-specimen__canvas-action {
  padding: 8px; background: var(--ink-4); color: var(--ivory); border: 1px solid var(--ink-5);
}
.drawer-specimen input { min-width: 0; width: 160px; }
.drawer-specimen__viewport { overflow-x: auto; min-width: 0; }
.drawer-specimen__stage {
  position: relative; height: 640px; min-width: 320px;
  background: radial-gradient(ellipse at 50% 30%, var(--pine), var(--ink) 70%);
  isolation: isolate;
}
.drawer-specimen__canvas-action { position: absolute; top: 90px; left: 24px; }
.drawer-specimen__top { z-index: 3; }
.drawer-specimen__top--open { z-index: 2; }
.drawer-specimen__panel { display: grid; gap: 12px; padding: 20px; }
.drawer-specimen__pattern { padding: 10px; font: var(--t-label); }
</style>
