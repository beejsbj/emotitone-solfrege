<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Not for main.
 * The Looper's controls: one mini Loop Dial per playing pattern, climbing the
 * left edge, with Stop All on top. Play on the Code Strip bar is the loop.
 * The Looper's "clock" lives on the Stage.
 * See src/stores/loopPrototype.ts for the question it answers.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Square } from "lucide-vue-next";
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

// The mic key rides the Drawer's lip ("E, on the lip"); publish where that is.
const lipRef = ref<HTMLElement>();
let lipTop = -1;
function trackLip() {
  const top = Math.round(lipRef.value?.getBoundingClientRect().top ?? -1);
  if (top === lipTop || top < 0) return;
  lipTop = top;
  document.documentElement.style.setProperty("--looper-lip-top", `${top}px`);
}

let frame = 0;
function turn() {
  frame = requestAnimationFrame(turn);
  trackLip();
  loop.publishBeat();
  for (const layer of loop.layers) {
    discs.get(layer.id)?.style.setProperty("--turn", `${(-loop.phase(layer.lengthMs) * 360).toFixed(2)}deg`);
  }
}
onMounted(() => {
  document.documentElement.dataset.looperMic = "lip";
  turn();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  delete document.documentElement.dataset.looperMic;
  document.documentElement.style.removeProperty("--looper-lip-top");
});

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
  <!-- Always present: its top edge is the Drawer's lip, which the mic rides. -->
  <div ref="lipRef" class="loop-platter">
    <!-- One mini Loop Dial per layer, climbing the left edge as layers are added. -->
    <div v-if="loop.hasLoop" class="loop-platter__layers">
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
      <!-- Last in a reversed column: Stop All sits on top of the dials. -->
      <Button
        class="loop-platter__stop"
        size="sm"
        tone="ink"
        haptic
        accessible-name="Stop all loops"
        title="Stop all loops"
        @click="loop.stopAll()"
      >
        <Square />
      </Button>
    </div>

    <div v-if="loop.hasLoop" class="loop-platter__readout">
      <span>{{ readout }}</span>
      <template v-if="loop.hasLoop">
        <button type="button" :aria-label="loop.running ? 'Stop loop' : 'Start loop'" @click="loop.toggle()">
          {{ loop.running ? "■" : "▶" }}
        </button>
        <button type="button" aria-label="Earlier" @click="loop.nudgeMs += 10">−</button>
        <span class="loop-platter__nudge">{{ Math.round(loop.latencyMs()) }}ms</span>
        <button type="button" aria-label="Later" @click="loop.nudgeMs -= 10">+</button>
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

/* The fixed hand is brass, with a sheen. */
.loop-platter__layer :deep(.loop-dial__masthead) {
  stroke: var(--brass-hi);
  stroke-width: 2;
  filter: drop-shadow(0 0 1.5px var(--brass)) drop-shadow(0 0 4px var(--brass));
}

.loop-platter__stop {
  align-self: center;
  margin-bottom: 4px;
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
/* PROTOTYPE: the mic key leaves the top centre and sits on the Drawer's lip, right;
   the left edge belongs to the loop dials. */
html[data-looper-mic="lip"] .humming-capture-transport {
  inset: auto;
  transform: none;
  top: calc(var(--looper-lip-top, 60vh) - 74px);
  right: 14px;
}

html[data-looper-mic="lip"] .humming-capture-transport__cancel-slot {
  left: auto;
  right: calc(100% + 12px);
}

html[data-looper-mic="lip"] .humming-capture-transport__feedback {
  top: auto;
  bottom: calc(100% + 12px);
  left: auto;
  right: 0;
  transform: none;
  justify-items: end;
}
</style>
