<template>
  <AnatomyDisplay
    title="Keyboard · Formalization Candidate"
    :features="features"
    caption="Production values are the starting baseline, not automatic design authority. This inert specimen never reads or writes app stores and never produces audio. Inspect and adjust it before Keyboard is accepted."
  >
    <template #hero>
      <div class="keyboard-specimen__hero">
        <div class="keyboard-specimen__edition-mark">
          <span>Daily edition</span>
          <strong>{{ family }}</strong>
          <code>{{ dateKey }} / load {{ editionNumber }}</code>
        </div>
        <div class="keyboard-specimen__mini" :style="{ width: `${Math.min(width, 390)}px` }">
          <Keyboard
            usage="controlled"
            :rows="rows"
            :main-octave="mainOctave"
            :primary-label="primaryLabel"
            :show-labels="showLabels"
            :surface-style="surfaceStyle"
            :geometry-family="family"
            :edition-seed="editionSeed"
            :gap="gap"
            :main-row-height="mainRowHeight"
            :outer-row-height="outerRowHeight"
            :outer-inset="outerInset"
            :variation-amplitude="variationAmplitude"
            :motion="motion"
            :contrast="contrast"
            @press="handlePress"
            @release="handleRelease"
          />
        </div>
      </div>
    </template>

    <section class="keyboard-specimen__workbench" aria-label="Keyboard specimen controls">
      <div class="keyboard-specimen__controls">
        <fieldset class="keyboard-specimen__field keyboard-specimen__field--wide">
          <legend>Geometry family</legend>
          <div class="keyboard-specimen__segments">
            <button
              v-for="option in families"
              :key="option"
              type="button"
              :class="{ 'is-active': family === option }"
              @click="family = option"
            >{{ option }}</button>
          </div>
        </fieldset>

        <label class="keyboard-specimen__field">
          <span>Content width</span>
          <select v-model.number="width">
            <option v-for="option in widths" :key="option" :value="option">{{ option }}px</option>
          </select>
        </label>

        <label class="keyboard-specimen__field">
          <span>Requested rows</span>
          <select v-model.number="rowCount">
            <option v-for="option in rowCounts" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>

        <label class="keyboard-specimen__field">
          <span>Main octave</span>
          <select v-model.number="mainOctave">
            <option v-for="option in octaves" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>

        <label class="keyboard-specimen__field">
          <span>Primary label</span>
          <select v-model="primaryLabel">
            <option value="syllable">Syllable</option>
            <option value="degree">Degree</option>
            <option value="raw">Raw pitch</option>
          </select>
        </label>

        <label class="keyboard-specimen__field">
          <span>Surface</span>
          <select v-model="surfaceStyle">
            <option value="colored">Colored</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </label>

        <label class="keyboard-specimen__field">
          <span>State on Mi</span>
          <select v-model="state">
            <option value="resting">Resting</option>
            <option value="focused">Focused</option>
            <option value="pressed">Pressed</option>
            <option value="sounding">Sounding</option>
            <option value="combined">Pressed + sounding</option>
          </select>
        </label>

        <label class="keyboard-specimen__field">
          <span>Motion</span>
          <select v-model="motion">
            <option value="system">System preference</option>
            <option value="reduced">Reduced preview</option>
          </select>
        </label>

        <label class="keyboard-specimen__field">
          <span>Contrast</span>
          <select v-model="contrast">
            <option value="system">System colors</option>
            <option value="forced">Forced-color preview</option>
          </select>
        </label>

        <label class="keyboard-specimen__check">
          <input v-model="showLabels" type="checkbox">
          <span>Show labels</span>
        </label>

        <button class="keyboard-specimen__reload" type="button" @click="editionNumber += 1">
          New load variation
        </button>
      </div>

      <details class="keyboard-specimen__tuning">
        <summary>Production-baseline tuning</summary>
        <div class="keyboard-specimen__tuning-grid">
          <label>
            <span>Gap · {{ gap }}px</span>
            <input v-model.number="gap" type="range" min="0" max="6" step="1">
          </label>
          <label>
            <span>Main height · {{ mainRowHeight }}px</span>
            <input v-model.number="mainRowHeight" type="range" min="44" max="120" step="2">
          </label>
          <label>
            <span>Outer height · {{ outerRowHeight }}px</span>
            <input v-model.number="outerRowHeight" type="range" min="44" max="88" step="2">
          </label>
          <label>
            <span>Outer inset · {{ outerInset }}px</span>
            <input v-model.number="outerInset" type="range" min="0" max="24" step="1">
          </label>
          <label>
            <span>Variation · {{ variationAmplitude.toFixed(2) }}</span>
            <input v-model.number="variationAmplitude" type="range" min="0" max="1.5" step="0.05">
          </label>
        </div>
      </details>

      <div class="keyboard-specimen__readout" aria-live="polite">
        <span><b>{{ width }}px</b> content</span>
        <span><b>{{ rows.length }}</b> rendered / {{ rowCount }} requested rows</span>
        <span><b>{{ approximateKeyWidth }}px</b> approximate Key width</span>
        <span><b>{{ lastIntent }}</b></span>
      </div>

      <div class="keyboard-specimen__viewport">
        <div class="keyboard-specimen__stage" :style="{ width: `${width}px` }">
          <Keyboard
            usage="controlled"
            :rows="rows"
            :main-octave="mainOctave"
            :primary-label="primaryLabel"
            :show-labels="showLabels"
            :surface-style="surfaceStyle"
            :geometry-family="family"
            :edition-seed="editionSeed"
            :gap="gap"
            :main-row-height="mainRowHeight"
            :outer-row-height="outerRowHeight"
            :outer-inset="outerInset"
            :variation-amplitude="variationAmplitude"
            :motion="motion"
            :contrast="contrast"
            @press="handlePress"
            @release="handleRelease"
          />
        </div>
      </div>

      <p class="keyboard-specimen__note">
        The stage may scroll only so the guide can preserve exact 768/960px specimens on a smaller browser. The Keyboard itself never scrolls or drops pitches.
      </p>
    </section>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import type {
  KeyboardIntent,
  KeyboardRowView,
} from "@/components/compounds/Keyboard.vue";
import {
  KEYBOARD_GEOMETRY_FAMILIES,
  keyboardFamilyForDate,
  localDateKey,
  visibleKeyboardOctaves,
  type KeyboardGeometryFamily,
} from "@/components/compounds/keyboardEdition";
import type { NoteLabel, NoteSurfaceStyle } from "@/components/primatives/Note.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";

type SpecimenState = "resting" | "focused" | "pressed" | "sounding" | "combined";

const widths = [320, 390, 768, 960] as const;
const rowCounts = [1, 3, 5, 7] as const;
const octaves = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const families = KEYBOARD_GEOMETRY_FAMILIES;
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const syllables = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Fi", "Sol", "Le", "La", "Te", "Ti"];
const degrees = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const width = ref<(typeof widths)[number]>(960);
const rowCount = ref<(typeof rowCounts)[number]>(3);
const mainOctave = ref(4);
const family = ref<KeyboardGeometryFamily>(keyboardFamilyForDate(new Date()));
const primaryLabel = ref<NoteLabel>("syllable");
const surfaceStyle = ref<NoteSurfaceStyle>("colored");
const state = ref<SpecimenState>("resting");
const showLabels = ref(true);
const motion = ref<"system" | "reduced">("system");
const contrast = ref<"system" | "forced">("system");
const gap = ref(2);
const mainRowHeight = ref(88);
const outerRowHeight = ref(56);
const outerInset = ref(0);
const variationAmplitude = ref(1);
const editionNumber = ref(1);
const lastIntent = ref("inert · no input yet");
const dateKey = localDateKey(new Date());
const editionSeed = computed(() => `style-guide:${dateKey}:${editionNumber.value}`);

const rows = computed<KeyboardRowView[]>(() =>
  visibleKeyboardOctaves(mainOctave.value, rowCount.value).map((octave) => ({
    octave,
    keys: noteNames.map((name, scaleIndex) => {
      const isTarget = octave === mainOctave.value && scaleIndex === 4;
      return {
        id: `${scaleIndex}_${octave}`,
        syllable: syllables[scaleIndex],
        degree: degrees[scaleIndex],
        rawPitch: `${name}${octave}`,
        scaleIndex,
        pitchClassIndex: scaleIndex,
        accidental: name.includes("#"),
        pressed: isTarget && ["pressed", "combined"].includes(state.value),
        sounding: isTarget && ["sounding", "combined"].includes(state.value),
        focusVisible: isTarget && state.value === "focused",
      };
    }),
  })),
);

const approximateKeyWidth = computed(() => {
  const innerWidth = Math.max(0, width.value - outerInset.value * 2 - gap.value * 11);
  return (innerWidth / 12).toFixed(1);
});

function handlePress(intent: KeyboardIntent) {
  lastIntent.value = `press · ${intent.keyId} · ${intent.source}`;
}

function handleRelease(intent: KeyboardIntent) {
  lastIntent.value = `release · ${intent.keyId} · ${intent.source}`;
}

const features = [
  { label: "Children", value: "twelve accepted Keys per complete octave row" },
  { label: "Layout", value: "stable all-fit grid; 88px main / 56px outer production baseline" },
  { label: "Edition", value: "one local-date family; authored per-load cut, tilt, shadow, and layer variants" },
  { label: "State", value: "physical pressed and musical sounding remain independent" },
  { label: "Focus", value: "one roving entry; arrows move spatially; Space/Enter emit held intents" },
  { label: "Boundary", value: "no store, persistence, audio, haptic, MIDI, Drawer, or CodeStrip ownership" },
  { label: "Status", value: "formalized candidate awaiting Burooj's visual specimen acceptance" },
];
</script>

<style scoped>
.keyboard-specimen__hero {
  display: grid;
  width: 100%;
  justify-items: center;
  gap: 14px;
  padding: 18px 12px;
  overflow: hidden;
}

.keyboard-specimen__edition-mark {
  display: flex;
  align-items: baseline;
  gap: 9px;
  color: var(--ivory-3);
  font: var(--t-micro);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.keyboard-specimen__edition-mark strong {
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 17px;
  letter-spacing: .08em;
}

.keyboard-specimen__edition-mark code {
  color: var(--ivory-4);
  font-family: var(--font-mono);
  font-size: 8px;
}

.keyboard-specimen__mini {
  max-width: 100%;
}

.keyboard-specimen__workbench {
  margin-top: 24px;
  padding: 14px;
  border: 1px solid var(--hairline);
  background: var(--ink-2);
}

.keyboard-specimen__controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 10px;
}

.keyboard-specimen__field,
.keyboard-specimen__check {
  display: grid;
  min-width: 0;
  gap: 5px;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.keyboard-specimen__field--wide {
  grid-column: 1 / -1;
  padding: 0;
  border: 0;
}

.keyboard-specimen__field legend {
  margin-bottom: 5px;
}

.keyboard-specimen__field select,
.keyboard-specimen__reload {
  min-height: 32px;
  border: 1px solid var(--ink-5);
  border-radius: 0;
  background: var(--ink);
  color: var(--ivory);
  font-family: var(--font-mono);
  font-size: 9px;
}

.keyboard-specimen__segments {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
}

.keyboard-specimen__segments button {
  min-height: 32px;
  border: 1px solid var(--ink-5);
  background: var(--ink);
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.keyboard-specimen__segments button.is-active {
  border-color: var(--ivory-2);
  background: var(--ink-4);
  color: var(--ivory);
}

.keyboard-specimen__check {
  grid-template-columns: auto 1fr;
  align-items: center;
  align-content: center;
}

.keyboard-specimen__check input {
  accent-color: var(--brass);
}

.keyboard-specimen__reload {
  align-self: end;
  padding-inline: 10px;
  cursor: pointer;
}

.keyboard-specimen__tuning {
  margin-top: 12px;
  border-top: 1px solid var(--hairline);
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
}

.keyboard-specimen__tuning summary {
  padding: 10px 0;
  cursor: pointer;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.keyboard-specimen__tuning-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding-bottom: 10px;
}

.keyboard-specimen__tuning-grid label {
  display: grid;
  gap: 5px;
}

.keyboard-specimen__readout {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 12px 0 8px;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.keyboard-specimen__readout b {
  color: var(--ivory);
}

.keyboard-specimen__viewport {
  max-width: 100%;
  padding: 12px;
  overflow-x: auto;
  border: 1px solid var(--hairline);
  background: var(--ink);
}

.keyboard-specimen__stage {
  box-sizing: border-box;
}

.keyboard-specimen__note {
  margin: 8px 0 0;
  color: var(--ivory-4);
  font-family: var(--font-mono);
  font-size: 8px;
  line-height: 1.5;
}

@media (max-width: 760px) {
  :deep(.anatomy-display__card) {
    width: calc(100vw - 32px);
    padding: 18px 14px;
  }

  :deep(.anatomy-display__wrap) {
    grid-template-columns: 1fr;
  }

  .keyboard-specimen__controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .keyboard-specimen__segments {
    grid-template-columns: repeat(3, 1fr);
  }

  .keyboard-specimen__tuning-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
