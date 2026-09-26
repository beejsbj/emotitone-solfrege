<template>
  <section class="ui-beat-system">
    <p class="ui-beat-system__role">One clock · every control on the beat</p>
    <p class="ui-beat-system__intro">
      Beat Indicator Marks, both Knob editions, Button, Joystick, and the
      current-instrument Sticker all read the same scale binding. It reaches
      each actual control without replacing its gestures.
    </p>

    <div class="ui-beat-system__stage">
      <div class="ui-beat-system__transport">
        <BeatIndicator
          :beats="meter.beatsPerBar"
          size="lg"
          aria-label="Controlled UIBeat indicator"
        />
        <strong>{{ meter.label }} · {{ bpm }} BPM</strong>
        <span>{{ running ? "Sounding-phase fixture" : "Idle rest state" }}</span>
      </div>

      <div class="ui-beat-system__consumers">
        <div class="ui-beat-system__knobs" aria-label="BPM control editions">
          <Knob
            :model-value="bpm"
            type="range"
            label="BPM · Ring"
            :min="40"
            :max="220"
            is-display
            visual="ring"
          />
          <Knob
            :model-value="bpm"
            type="range"
            label="BPM · Arc"
            :min="40"
            :max="220"
            is-display
            visual="arc"
          />
        </div>

        <div class="ui-beat-system__primitives" aria-label="Primitive consumers">
          <Button
            size="sm"
            :tone="running ? 'ink' : 'ivory'"
            :accessible-name="running ? 'Pause UIBeat fixture' : 'Play UIBeat fixture'"
            :title="running ? 'Pause UIBeat fixture' : 'Play UIBeat fixture'"
            @click="toggle"
          >
            <Square v-if="running" />
            <Play v-else />
          </Button>
          <Sticker variant="fill" color="ivory" mark="eighth" ui-beat>
            Current Piano
          </Sticker>
          <Joystick v-model="harmony" label="Harmony" visual="analog" />
        </div>
      </div>
    </div>

    <div class="ui-beat-system__controls">
      <div class="ui-beat-system__group">
        <h3 class="label">Tempo</h3>
        <div class="ui-beat-system__chips">
          <button
            v-for="tempo in tempos"
            :key="tempo"
            type="button"
            :aria-pressed="bpm === tempo"
            @click="bpm = tempo"
          >
            {{ tempo }} BPM
          </button>
        </div>
      </div>
      <div class="ui-beat-system__group">
        <h3 class="label">Meter</h3>
        <div class="ui-beat-system__chips">
          <button
            v-for="choice in meters"
            :key="choice.label"
            type="button"
            :aria-pressed="meter.label === choice.label"
            @click="meter = choice"
          >
            {{ choice.label }}
          </button>
        </div>
      </div>
    </div>

    <dl class="ui-beat-system__contract">
      <div><dt>Production</dt><dd>Generated playback maps only verified 4/4</dd></div>
      <div><dt>Guide</dt><dd>3/4 and 6/8 are isolated meter fixtures</dd></div>
      <div><dt>Scale</dt><dd>Compact → 14% swell → long settle → late tuck</dd></div>
      <div><dt>Binding</dt><dd>Actual UI node; component transforms stay intact</dd></div>
      <div><dt>Stillness</dt><dd>Reduced Motion removes recurring scale change</dd></div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Play, Square } from "lucide-vue-next";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import Button from "@/components/primatives/Button.vue";
import Knob from "@/components/primatives/Knob/index.vue";
import Sticker from "@/components/primatives/Sticker";
import Joystick from "@/components/uniques/Joystick/index.vue";
import type { HarmonyAlteration } from "@/domain/harmony";
import {
  provideUIBeat,
  UIBeatClock,
  type UIBeatMeter,
} from "@/composables/useUIBeat";

interface MeterFixture extends UIBeatMeter {
  label: string;
}

const tempos = [90, 120, 140] as const;
const meters: MeterFixture[] = [
  { label: "4/4", beatsPerBar: 4, beatUnit: 4 },
  { label: "3/4", beatsPerBar: 3, beatUnit: 4 },
  { label: "6/8", beatsPerBar: 6, beatUnit: 8 },
];
const bpm = ref<number>(120);
const meter = ref<MeterFixture>(meters[0]);
const harmony = ref<HarmonyAlteration>("auto");
const running = ref(true);
const clock = new UIBeatClock();
provideUIBeat({ clock, presentationEnabled: () => true });

let generation = 0;
let frame: number | null = null;
let barPosition = 0;
let previousTimestamp: number | null = null;

function cancelFrame() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}

function tick(timestamp: number) {
  if (!running.value) return;
  const beatDuration = 60_000 / bpm.value;
  const barDuration = beatDuration * meter.value.beatsPerBar;
  const elapsed = previousTimestamp === null
    ? 0
    : Math.max(0, timestamp - previousTimestamp);
  previousTimestamp = timestamp;
  barPosition += elapsed / barDuration;
  clock.publish(generation, { rawPosition: barPosition, barPosition });
  frame = requestAnimationFrame(tick);
}

function start() {
  cancelFrame();
  barPosition = 0;
  previousTimestamp = null;
  generation = clock.arm({
    mappingAvailable: true,
    bpm: bpm.value,
    meter: meter.value,
  });
  running.value = true;
  frame = requestAnimationFrame(tick);
}

function preserveTempoPhase() {
  if (!running.value) return;
  generation = clock.arm({
    mappingAvailable: true,
    bpm: bpm.value,
    meter: meter.value,
  });
  clock.publish(generation, { rawPosition: barPosition, barPosition });
  previousTimestamp = performance.now();
}

function stop() {
  cancelFrame();
  running.value = false;
  clock.stop(generation);
}

function toggle() {
  if (running.value) stop();
  else start();
}

watch(bpm, preserveTempoPhase);
watch(meter, () => {
  if (running.value) start();
});

onMounted(start);
onBeforeUnmount(() => {
  stop();
  clock.destroy();
});
</script>

<style scoped>
.ui-beat-system {
  display: grid;
  gap: var(--s-6);
  min-width: 0;
}

.ui-beat-system__role {
  margin: 0;
  font: 700 clamp(20px, 3vw, 26px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--guide-paper-text, var(--ivory-2));
}

.ui-beat-system__intro {
  max-width: 64ch;
  margin: 0;
  font: var(--t-body-mono);
  color: var(--ivory-2);
}

/* One Ink well; the clock and its consumers share it. */
.ui-beat-system__stage {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: var(--s-8);
  align-items: center;
  padding: clamp(20px, 4vw, 40px) clamp(12px, 3vw, 40px);
  background: var(--ink);
}

.ui-beat-system__transport {
  display: grid;
  justify-items: center;
  gap: var(--s-4);
  min-width: 0;
  text-align: center;
}

.ui-beat-system__transport strong {
  color: var(--ivory);
  font: 700 clamp(28px, 5vw, 44px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.ui-beat-system__transport span {
  color: var(--ivory-3);
  font: var(--t-caption);
}

.ui-beat-system__consumers {
  display: grid;
  gap: var(--s-7);
  min-width: 0;
}

.ui-beat-system__knobs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-5);
  min-width: 0;
}

.ui-beat-system__primitives {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--s-6);
  min-width: 0;
}

.ui-beat-system__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-6) var(--s-9);
}

.ui-beat-system__group {
  display: grid;
  gap: var(--s-4);
}

.ui-beat-system__group .label {
  margin: 0;
}

.ui-beat-system__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
}

/* Fixture switches: cut-paper tabs, the layer's paper when chosen. */
.ui-beat-system__chips button {
  min-height: 40px;
  padding: 8px 14px 6px;
  border: 0;
  background: var(--ink-4);
  color: var(--ivory-2);
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-tab);
  cursor: pointer;
  transition:
    background-color var(--dur-ui) var(--ease-brush),
    color var(--dur-ui) var(--ease-brush);
}

.ui-beat-system__chips button[aria-pressed="true"] {
  background: var(--guide-paper, var(--ivory));
  color: var(--guide-paper-ink, var(--ink));
  transform: rotate(var(--rot-tile-2));
}

.ui-beat-system__chips button:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 2px;
}

.ui-beat-system__contract {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: var(--s-6) var(--s-7);
  margin: 0;
}

.ui-beat-system__contract div {
  display: grid;
  gap: var(--s-1);
}

.ui-beat-system__contract dt {
  color: var(--ivory);
  font: 700 15px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.ui-beat-system__contract dd {
  margin: 0;
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
}

@media (prefers-reduced-motion: reduce) {
  .ui-beat-system__chips button { transition: none; }
}
</style>
