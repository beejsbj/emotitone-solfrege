<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Not for main.
 * Loop mode's controls: the loop button beside the mic, and one mini Loop Dial
 * per layer climbing the left edge. The loop's "clock" lives on the Stage.
 * See src/stores/loopPrototype.ts for the question it answers.
 */
import { computed, onBeforeUnmount, onMounted } from "vue";
import { Repeat } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import LoopDial from "@/components/primatives/LoopDial.vue";
import { useMusicColor } from "@/composables/useMusicColor";
import { useLoopPrototypeStore } from "@/stores/loopPrototype";
import { useMusicStore } from "@/stores/music";
import type { ChromaticNote, MusicalMode } from "@/types/music";

const loop = useLoopPrototypeStore();
const musicStore = useMusicStore();
const { getStaticPrimaryColorByPitchClass } = useMusicColor();

const key = computed(() => musicStore.currentKey as ChromaticNote);
const mode = computed(() => musicStore.currentMode as MusicalMode);

const dials = computed(() =>
  loop.layers.map((layer) => ({
    layer,
    segments: loop.soundingNotes(layer).map((note) => {
      const { chroma, midi, octave } = loop.describe(note);
      return {
        color: getStaticPrimaryColorByPitchClass(chroma, mode.value, key.value, octave),
        startMs: note.pressTime,
        durationMs: note.duration,
        height: midi,
      };
    }),
  })),
);

// Each disc turns under its fixed hand, so the note at twelve is the one sounding.
const discs = new Map<string, HTMLElement>();
function setDisc(id: string, element: unknown) {
  if (element instanceof HTMLElement) discs.set(id, element);
  else discs.delete(id);
}

let frame = 0;
function turn() {
  frame = requestAnimationFrame(turn);
  loop.publishBeat();
  for (const layer of loop.layers) {
    discs.get(layer.id)?.style.setProperty("--turn", `${(-loop.phase(layer.lengthMs) * 360).toFixed(2)}deg`);
  }
}
onMounted(turn);
onBeforeUnmount(() => cancelAnimationFrame(frame));

const readout = computed(() =>
  loop.hasLoop ? `${loop.bars} bar${loop.bars === 1 ? "" : "s"} · ${loop.layers.length}` : "play · add",
);

// A layer's dial: tap mutes, double-tap solos, hold takes the layer off.
// The first tap mutes at once; a second tap undoes that and solos instead.
const DOUBLE_TAP_MS = 320;
let lastTap = { id: "", at: 0 };
let holdTimer: ReturnType<typeof setTimeout> | undefined;
let held = false;
function dialDown(id: string) {
  held = false;
  holdTimer = setTimeout(() => {
    held = true;
    loop.removeLayer(id);
  }, 550);
}
function dialCancel() {
  clearTimeout(holdTimer);
  held = true;
}
function dialUp(id: string) {
  clearTimeout(holdTimer);
  if (held) return;
  const now = performance.now();
  const double = lastTap.id === id && now - lastTap.at < DOUBLE_TAP_MS;
  lastTap = double ? { id: "", at: 0 } : { id, at: now };
  loop.toggleMute(id);
  if (double) loop.toggleSolo(id);
}
</script>

<template>
  <Teleport to="body">
    <div class="loop-mode-button">
      <Button
        class="loop-mode-button__button"
        size="md"
        :tone="loop.armed ? 'ivory' : 'brass'"
        haptic
        :accessible-name="loop.armed ? 'Leave loop mode' : 'Loop mode'"
        :title="loop.armed ? 'Leave loop mode' : 'Loop mode'"
        @click="loop.toggleMode()"
      >
        <Repeat />
      </Button>
    </div>
  </Teleport>

  <div v-if="loop.armed" class="loop-platter">
    <!-- One mini Loop Dial per layer, climbing the left edge as layers are added. -->
    <div class="loop-platter__layers">
      <button
        v-for="dial in dials"
        :key="dial.layer.id"
        :ref="(element) => setDisc(dial.layer.id, element)"
        type="button"
        class="loop-platter__layer"
        :class="{
          'loop-platter__layer--muted': loop.isSilent(dial.layer),
          'loop-platter__layer--solo': loop.soloId === dial.layer.id,
        }"
        :aria-pressed="!loop.isSilent(dial.layer)"
        :aria-label="`${dial.layer.label}: tap to mute, double-tap to solo, hold to remove`"
        @pointerdown="dialDown(dial.layer.id)"
        @pointerup="dialUp(dial.layer.id)"
        @pointerleave="dialCancel"
        @contextmenu.prevent
      >
        <LoopDial :segments="dial.segments" :length-ms="dial.layer.lengthMs" :aria-label="dial.layer.label" />
      </button>
    </div>

    <div class="loop-platter__readout">
      <span>{{ readout }}</span>
      <template v-if="loop.hasLoop">
        <button type="button" :aria-label="loop.running ? 'Stop loop' : 'Start loop'" @click="loop.toggle()">
          {{ loop.running ? "■" : "▶" }}
        </button>
        <button type="button" aria-label="Earlier" @click="loop.nudgeMs += 10">−</button>
        <span class="loop-platter__nudge">{{ Math.round(loop.latencyMs()) }}ms</span>
        <button type="button" aria-label="Later" @click="loop.nudgeMs -= 10">+</button>
        <button type="button" aria-label="Clear loop" @click="loop.clear()">×</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Zero-height anchor: loop mode floats over the Stage and takes no Drawer height. */
.loop-platter {
  position: relative;
  height: 0;
  z-index: 3;
}

.loop-platter__layers {
  position: absolute;
  left: 6px;
  bottom: 30px;
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  pointer-events: auto;
  touch-action: manipulation;
  user-select: none;
}

.loop-platter__layer {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  -webkit-touch-callout: none;
}

.loop-platter__layer :deep(.loop-dial__disc) {
  transform-box: view-box;
  transform-origin: 50% 50%;
  transform: rotate(var(--turn, 0deg));
}

.loop-platter__layer :deep(.loop-dial__masthead) {
  stroke: var(--ivory);
}

.loop-platter__layer--solo {
  box-shadow: 0 0 0 1.5px var(--ivory);
}

.loop-platter__layer--muted {
  opacity: 0.3;
}

.loop-platter__readout {
  position: absolute;
  right: 10px;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  background: var(--ink);
  color: var(--ivory-2);
  font: var(--t-caption);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  pointer-events: auto;
  touch-action: manipulation;
  user-select: none;
}

.loop-platter__readout button {
  width: 28px;
  height: 28px;
  color: var(--ivory);
}

.loop-platter__nudge {
  color: var(--ivory-3);
}

@media (prefers-reduced-motion: reduce) {
  .loop-platter__layer :deep(.loop-dial__disc) {
    transform: none;
  }
}
</style>

<style>
/* Sits beside the mic button, which is centred at the top of the screen. */
.loop-mode-button {
  position: fixed;
  z-index: 110;
  top: calc(env(safe-area-inset-top, 0px) + var(--s-5));
  right: calc(50% + 14px + var(--s-4));
  display: inline-flex;
  pointer-events: auto;
}

.loop-mode-button .loop-mode-button__button {
  --button-size: 28px;
  inline-size: 28px;
  block-size: 28px;
}
</style>
