<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Not for main.
 * The Platter: the loop as one floating object above the reel.
 * See src/stores/loopPrototype.ts for the question it answers.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useMusicColor } from "@/composables/useMusicColor";
import { useLoopPrototypeStore } from "@/stores/loopPrototype";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";

const loop = useLoopPrototypeStore();
const phrasesStore = usePhrasesStore();
const musicStore = useMusicStore();
const { getStaticPrimaryColorByPitchClass } = useMusicColor();

const SIZE = 132;
const CENTER = SIZE / 2;
const INNER = 17;
const OUTER = 63;

const handRef = ref<SVGGElement | null>(null);
// Re-reads where the open take would land; the loop position is not reactive.
const pulse = ref(0);
let frame = 0;
let frameCount = 0;

function turn() {
  frame = requestAnimationFrame(turn);
  if (handRef.value) {
    handRef.value.style.transform = `rotate(${(loop.phase() * 360).toFixed(2)}deg)`;
  }
  if (++frameCount % 12 === 0) pulse.value += 1;
}
onMounted(turn);
onBeforeUnmount(() => cancelAnimationFrame(frame));

const key = computed(() => musicStore.currentKey as ChromaticNote);
const mode = computed(() => musicStore.currentMode as MusicalMode);

function colorOf(note: PatternNote) {
  const { chroma, octave } = loop.describe(note);
  return getStaticPrimaryColorByPitchClass(chroma, mode.value, key.value, octave);
}

/** One band per layer, innermost first, plus the groove the open take lands in. */
const bandWidth = computed(() => (OUTER - INNER) / Math.max(3, loop.layers.length + 1));

function arcs(notes: PatternNote[], band: number) {
  if (!loop.lengthMs || !notes.length) return [];
  const midis = notes.map((note) => loop.describe(note).midi);
  const low = Math.min(...midis);
  const span = Math.max(1, Math.max(...midis) - low);
  const base = INNER + band * bandWidth.value;
  return notes.map((note, index) => {
    // Pitch reads outward inside the band, as on the Loop Dial.
    const radius = base + bandWidth.value * (0.25 + 0.5 * ((midis[index] - low) / span));
    const from = ((note.pressTime % loop.lengthMs) / loop.lengthMs) * Math.PI * 2;
    const sweep = Math.min(Math.PI * 1.98, Math.max(0.09, (note.duration / loop.lengthMs) * Math.PI * 2));
    const point = (angle: number) =>
      `${(CENTER + radius * Math.sin(angle)).toFixed(2)} ${(CENTER - radius * Math.cos(angle)).toFixed(2)}`;
    return {
      path: `M ${point(from)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${sweep > Math.PI ? 1 : 0} 1 ${point(from + sweep)}`,
      color: colorOf(note),
    };
  });
}

const bands = computed(() =>
  loop.layers.map((layer, index) => {
    const notes = loop.soundingNotes(layer);
    return {
      layer,
      radius: INNER + (index + 0.5) * bandWidth.value,
      arcs: arcs(notes, index),
      color: notes.length ? colorOf(notes[0]) : "var(--ivory-3)",
    };
  }),
);

const grooveRadius = computed(() => INNER + (loop.layers.length + 0.5) * bandWidth.value);
const pending = computed(() => {
  void pulse.value;
  void phrasesStore.takeNotes.length;
  return arcs(loop.pendingNotes(), loop.layers.length);
});

const readout = computed(() => {
  if (loop.hasLoop) return `${loop.bars} bar${loop.bars === 1 ? "" : "s"} · ${loop.layers.length}`;
  if (loop.armed) return "play · return";
  return "loop";
});

const spindleLabel = computed(() => {
  if (!loop.hasLoop) return loop.armed ? "Cancel loop" : "Start a loop from the desk";
  return loop.running ? "Stop loop" : "Start loop";
});

function pressSpindle() {
  if (loop.hasLoop) loop.toggle();
  else loop.lift();
}

// Tap a chad to mute; hold it to take the layer off.
let holdTimer: ReturnType<typeof setTimeout> | undefined;
let held = false;
function chadDown(id: string) {
  held = false;
  holdTimer = setTimeout(() => {
    held = true;
    loop.removeLayer(id);
  }, 550);
}
function chadCancel() {
  clearTimeout(holdTimer);
  held = true;
}
function chadUp(id: string) {
  clearTimeout(holdTimer);
  if (!held) loop.toggleMute(id);
}
</script>

<template>
  <div class="loop-platter" :class="{ 'loop-platter--armed': loop.armed, 'loop-platter--running': loop.running }">
    <div class="loop-platter__float" data-stage-occluder>
      <div v-if="loop.hasLoop" class="loop-platter__chads">
        <button
          v-for="band in bands"
          :key="band.layer.id"
          type="button"
          class="loop-platter__chad"
          :class="{ 'loop-platter__chad--muted': band.layer.muted }"
          :aria-pressed="!band.layer.muted"
          :aria-label="`${band.layer.label}: tap to mute, hold to remove`"
          @pointerdown="chadDown(band.layer.id)"
          @pointerup="chadUp(band.layer.id)"
          @pointerleave="chadCancel"
        >
          <span class="loop-platter__chad-face" :style="{ '--chad': band.color }" />
        </button>
      </div>

      <div class="loop-platter__deck">
        <svg class="loop-platter__disc" :viewBox="`0 0 ${SIZE} ${SIZE}`" aria-hidden="true">
          <circle class="loop-platter__well" :cx="CENTER" :cy="CENTER" :r="CENTER" />
          <g v-for="band in bands" :key="band.layer.id" :class="{ 'loop-platter__band--muted': band.layer.muted }">
            <circle class="loop-platter__track" :cx="CENTER" :cy="CENTER" :r="band.radius" />
            <path
              v-for="(arc, index) in band.arcs"
              :key="index"
              class="loop-platter__arc"
              :d="arc.path"
              :style="{ stroke: arc.color }"
            />
          </g>
          <!-- The groove: where what you are playing now will land. -->
          <circle class="loop-platter__groove" :cx="CENTER" :cy="CENTER" :r="grooveRadius" />
          <path
            v-for="(arc, index) in pending"
            :key="`pending-${index}`"
            class="loop-platter__arc loop-platter__arc--pending"
            :d="arc.path"
            :style="{ stroke: arc.color }"
          />
          <g ref="handRef" class="loop-platter__hand">
            <line :x1="CENTER" :y1="1" :x2="CENTER" :y2="CENTER - INNER + 4" />
            <circle
              v-if="loop.hasLoop"
              class="loop-platter__stylus"
              :class="{ 'loop-platter__stylus--down': phrasesStore.isTakeSounding }"
              :cx="CENTER"
              :cy="CENTER - grooveRadius"
              r="2.6"
            />
          </g>
        </svg>
        <button type="button" class="loop-platter__spindle" :aria-label="spindleLabel" @click="pressSpindle">
          <span class="loop-platter__cap" />
        </button>
      </div>

      <div class="loop-platter__readout">
        <span>{{ readout }}</span>
        <template v-if="loop.hasLoop">
          <button type="button" aria-label="Earlier" @click="loop.nudgeMs += 10">−</button>
          <span class="loop-platter__nudge">{{ Math.round(loop.latencyMs()) }}ms</span>
          <button type="button" aria-label="Later" @click="loop.nudgeMs -= 10">+</button>
          <button type="button" aria-label="Clear loop" @click="loop.clear()">×</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Zero-height anchor: the Platter floats over the Stage and takes no Drawer height. */
.loop-platter {
  position: relative;
  height: 0;
  z-index: 3;
}

.loop-platter__float {
  position: absolute;
  right: 10px;
  bottom: 8px;
  display: grid;
  grid-template-columns: auto auto;
  align-items: end;
  gap: 4px 6px;
  pointer-events: auto;
  touch-action: manipulation;
  user-select: none;
}

.loop-platter__deck {
  position: relative;
  grid-column: 2;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--ink-5), 0 10px 24px rgb(0 0 0 / 0.55);
}

.loop-platter__disc {
  display: block;
  width: 100%;
  height: 100%;
}

.loop-platter__well {
  fill: var(--ink);
}

.loop-platter__track {
  fill: none;
  stroke: var(--ink-3);
  stroke-width: 1;
}

.loop-platter__arc {
  fill: none;
  stroke-width: 3;
  stroke-linecap: butt;
}

.loop-platter__band--muted .loop-platter__arc {
  stroke: var(--ivory-4) !important;
  stroke-width: 1;
}

.loop-platter__groove {
  fill: none;
  stroke: var(--ivory-4);
  stroke-width: 1;
  stroke-dasharray: 2 3;
}

.loop-platter--armed .loop-platter__groove {
  stroke: var(--ivory);
}

.loop-platter__arc--pending {
  opacity: 0.75;
  stroke-width: 2;
}

.loop-platter__hand {
  transform-box: view-box;
  transform-origin: 50% 50%;
}

.loop-platter__hand line {
  stroke: var(--ivory-3);
  stroke-width: 1.5;
}

.loop-platter--running .loop-platter__hand line {
  stroke: var(--ivory);
}

.loop-platter__stylus {
  fill: var(--ink);
  stroke: var(--ivory-3);
  stroke-width: 1;
}

.loop-platter__stylus--down {
  fill: var(--ivory);
  stroke: var(--ivory);
}

.loop-platter__spindle {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.loop-platter__cap {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--brass-hi), var(--brass) 45%, var(--brass-lo));
  box-shadow: 0 0 0 1px var(--brass-edge);
}

.loop-platter:not(.loop-platter--running) .loop-platter__cap {
  filter: saturate(0.35) brightness(0.7);
}

.loop-platter--armed .loop-platter__cap {
  filter: none;
}

.loop-platter__chads {
  grid-column: 1;
  display: flex;
  flex-flow: column-reverse wrap-reverse;
  max-height: 132px;
}

.loop-platter__chad {
  width: 40px;
  height: 32px;
  display: grid;
  place-items: center;
}

.loop-platter__chad-face {
  width: 22px;
  height: 12px;
  background: var(--chad);
  transform: skewX(-14deg);
  box-shadow: 0 0 0 1px var(--ink);
}

.loop-platter__chad--muted .loop-platter__chad-face {
  background: var(--ink-3);
  box-shadow: inset 0 0 0 1px var(--ivory-4);
}

.loop-platter__readout {
  grid-column: 1 / -1;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  background: var(--ink);
  color: var(--ivory-2);
  font: var(--t-caption);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
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
  .loop-platter__hand {
    transform: none !important;
  }
}
</style>
