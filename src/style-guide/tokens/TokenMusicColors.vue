<template>
  <section class="music-recipe">
    <header class="music-recipe__header">
      <div>
        <div class="music-recipe__eyebrow">Music color recipe · runtime authority</div>
        <h3>Fixed pitch or movable degree</h3>
        <p>
          This specimen calls the same <code>musicColor.ts</code> resolver as Note and the live keyboard.
          Octave changes lightness; the global mode decides whether hue follows pitch class or scale degree.
        </p>
      </div>
      <div class="music-recipe__mode" role="group" aria-label="Music color mode">
        <button :class="{ active: config.musicColorMode === 'fixed' }" @click="config.musicColorMode = 'fixed'">Fixed</button>
        <button :class="{ active: config.musicColorMode === 'movable' }" @click="config.musicColorMode = 'movable'">Movable</button>
      </div>
    </header>

    <div class="music-recipe__controls">
      <label>
        Key
        <select v-model="musicKey">
          <option v-for="note in CHROMATIC_NOTES" :key="note" :value="note">{{ note }}</option>
        </select>
      </label>
      <label>
        Mode
        <select v-model="mode">
          <option v-for="option in MODE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label>
        Octave <output>{{ octave }}</output>
        <input v-model.number="octave" type="range" min="2" max="8" step="1" />
      </label>
      <label class="music-recipe__sweep">
        <input v-model="sweep" type="checkbox" />
        Preview hue motion
      </label>
    </div>

    <div class="music-recipe__swatches" :style="{ '--degree-count': scale.degreeCount }">
      <div
        v-for="(solfege, index) in scale.solfege"
        :key="`${mode}-${index}`"
        class="music-recipe__swatch"
        :style="{ '--swatch': colorFor(index) }"
      >
        <strong>{{ solfege.name }}</strong>
        <span>{{ pitchFor(index) }}{{ octave }}</span>
        <small>{{ index + 1 }} / {{ scale.degreeCount }}</small>
      </div>
    </div>

    <dl class="music-recipe__facts">
      <div><dt>Mode</dt><dd>{{ config.musicColorMode }}</dd></div>
      <div><dt>Hue slots</dt><dd>{{ config.musicColorMode === 'fixed' ? 12 : scale.degreeCount }}</dd></div>
      <div><dt>Color space</dt><dd>runtime HSLA relationships</dd></div>
      <div><dt>Default</dt><dd>movable</dd></div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { CHROMATIC_NOTES, MODE_OPTIONS, getScaleForMode } from "@/data";
import {
  getChromaticNoteForScaleIndex,
  resolveMusicColorsByScaleIndex,
} from "@/services/musicColor";
import type { ChromaticNote, DynamicColorConfig, MusicalMode } from "@/types";

const musicKey = ref<ChromaticNote>("C");
const mode = ref<MusicalMode>("major");
const octave = ref(4);
const sweep = ref(false);
const time = ref(0);
let animationFrame: number | null = null;

const config = ref<DynamicColorConfig>({
  isEnabled: true,
  musicColorMode: "movable",
  saturation: 0.8,
  baseLightness: 0.5,
  lightnessRange: 0.7,
  hueAnimationAmplitude: 15,
  animationSpeed: 1,
});

const scale = computed(() => getScaleForMode(mode.value));
const pitchFor = (index: number) =>
  getChromaticNoteForScaleIndex(index, mode.value, musicKey.value) ?? musicKey.value;
const colorFor = (index: number) =>
  resolveMusicColorsByScaleIndex(
    index,
    mode.value,
    musicKey.value,
    octave.value,
    config.value,
    sweep.value ? time.value : undefined,
  )?.primary ?? "transparent";

function animate() {
  time.value = Date.now();
  animationFrame = requestAnimationFrame(animate);
}

watch(sweep, (enabled) => {
  if (enabled && animationFrame === null) animate();
  if (!enabled && animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
});

onBeforeUnmount(() => {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
});
</script>

<style scoped>
.music-recipe {
  padding: 28px;
  border: 1px solid var(--hairline);
  background: var(--ink-2);
  color: var(--ivory);
}

.music-recipe__header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.music-recipe__eyebrow,
.music-recipe label,
.music-recipe small,
.music-recipe dt,
.music-recipe dd {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.music-recipe h3 { margin: 6px 0; font-family: var(--font-display); font-size: 28px; }
.music-recipe p { max-width: 700px; margin: 0; color: var(--ivory-3); font-size: 13px; }

.music-recipe__mode { display: flex; align-self: flex-start; border: 1px solid var(--hairline); }
.music-recipe__mode button {
  padding: 8px 12px;
  border: 0;
  background: transparent;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  text-transform: uppercase;
}
.music-recipe__mode button.active { background: var(--ivory); color: var(--ink); }

.music-recipe__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 18px;
  margin: 24px 0;
  padding-top: 18px;
  border-top: 1px solid var(--hairline);
}
.music-recipe__controls label { display: grid; gap: 6px; color: var(--ivory-3); }
.music-recipe select,
.music-recipe input[type="range"] { min-width: 140px; }
.music-recipe__sweep { display: flex !important; grid-template-columns: auto 1fr; align-items: center; }

.music-recipe__swatches {
  display: grid;
  grid-template-columns: repeat(var(--degree-count), minmax(64px, 1fr));
  gap: 3px;
}

.music-recipe__swatch {
  display: flex;
  min-height: 132px;
  flex-direction: column;
  justify-content: end;
  padding: 10px;
  overflow: hidden;
  background: var(--swatch);
  box-shadow: var(--shadow-key);
  clip-path: var(--clip-tile);
  color: rgba(0, 0, 0, .78);
}
.music-recipe__swatch strong { font-family: var(--font-display); font-size: 22px; }
.music-recipe__swatch span { font-family: var(--font-mono); font-size: 10px; }
.music-recipe__swatch small { margin-top: 18px; }

.music-recipe__facts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 18px 0 0;
}
.music-recipe__facts div { padding-top: 10px; border-top: 1px solid var(--hairline); }
.music-recipe__facts dt { color: var(--ivory-4); }
.music-recipe__facts dd { margin: 4px 0 0; color: var(--ivory); }

@media (max-width: 800px) {
  .music-recipe__header { flex-direction: column; }
  .music-recipe__swatches { grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); }
  .music-recipe__facts { grid-template-columns: repeat(2, 1fr); }
}
</style>
