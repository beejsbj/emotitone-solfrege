<template>
  <section class="preview-port preview-port--system-ui-beat">
    <div class="card ui-beat-system">
      <div class="label">UIBeat · System Protocol</div>
      <p class="caption ui-beat-system__intro">
        One injected clock drives real UI control families: Beat Indicator
        Marks, both Knob editions, Button,
        Joystick, and the selected current-instrument Sticker. The same general
        scale binding reaches each actual control without replacing its gestures.
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
        <button
          v-for="tempo in tempos"
          :key="tempo"
          type="button"
          :aria-pressed="bpm === tempo"
          @click="bpm = tempo"
        >
          {{ tempo }} BPM
        </button>
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

      <dl class="ui-beat-system__contract">
        <div><dt>Production</dt><dd>Generated playback maps only verified 4/4</dd></div>
        <div><dt>Guide</dt><dd>3/4 and 6/8 are isolated meter fixtures</dd></div>
        <div><dt>Scale</dt><dd>Compact → 14% swell → long settle → late tuck</dd></div>
        <div><dt>Binding</dt><dd>Actual UI node; component transforms stay intact</dd></div>
        <div><dt>Stillness</dt><dd>Reduced Motion removes recurring scale change</dd></div>
      </dl>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Play, Square } from "lucide-vue-next";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import Button from "@/components/primatives/Button.vue";
import Knob from "@/components/primatives/Knob/index.vue";
import Sticker from "@/components/primatives/Sticker.vue";
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
let origin = 0;

function cancelFrame() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}

function tick(timestamp: number) {
  if (!running.value) return;
  const beatDuration = 60_000 / bpm.value;
  const barDuration = beatDuration * meter.value.beatsPerBar;
  const barPosition = Math.max(0, timestamp - origin) / barDuration;
  clock.publish(generation, { rawPosition: barPosition, barPosition });
  frame = requestAnimationFrame(tick);
}

function start() {
  cancelFrame();
  generation = clock.arm({
    mappingAvailable: true,
    bpm: bpm.value,
    meter: meter.value,
  });
  running.value = true;
  origin = performance.now();
  frame = requestAnimationFrame(tick);
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

watch([bpm, meter], () => {
  if (running.value) start();
});

onMounted(start);
onBeforeUnmount(() => {
  stop();
  clock.destroy();
});
</script>

<style scoped>
.preview-port--system-ui-beat {
  width: min(700px, 100vw);
  min-width: 0;
}

.ui-beat-system {
  width: 100%;
  min-width: 0;
}

.ui-beat-system__intro {
  max-width: 72ch;
  margin: 4px 0 18px;
}

.ui-beat-system__stage {
  display: grid;
  grid-template-columns: minmax(210px, 1fr) minmax(180px, .7fr);
  gap: 14px;
  align-items: center;
  padding: 20px;
  background: var(--ink);
  border: 1px solid var(--hairline);
}

.ui-beat-system__transport {
  display: grid;
  justify-items: center;
  gap: 10px;
  min-width: 0;
}

.ui-beat-system__transport strong {
  color: var(--ivory);
  font: var(--t-display-s);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.ui-beat-system__transport span {
  color: var(--ivory-4);
  font: var(--t-caption);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.ui-beat-system__consumers {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.ui-beat-system__knobs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.ui-beat-system__primitives {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-width: 0;
}

.ui-beat-system__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.ui-beat-system__controls button {
  min-height: 30px;
  padding: 5px 9px;
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
  color: var(--ivory-3);
  font: 700 9px/1 var(--font-mono);
  letter-spacing: .1em;
  text-transform: uppercase;
}

.ui-beat-system__controls button[aria-pressed="true"] {
  border-color: var(--brass-lo);
  background: var(--brass-fill);
  color: var(--ink);
}

.ui-beat-system__contract {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
  margin: 16px 0 0;
  font: var(--t-caption);
}

.ui-beat-system__contract div {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid var(--ink-5);
}

.ui-beat-system__contract dt {
  color: var(--ivory);
  font-weight: 700;
}

.ui-beat-system__contract dd {
  margin: 0;
  color: var(--ivory-4);
}

@media (max-width: 620px) {
  .ui-beat-system__stage,
  .ui-beat-system__contract {
    grid-template-columns: 1fr;
  }
}
</style>
