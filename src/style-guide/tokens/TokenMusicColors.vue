<template>
  <section class="music-recipe">
    <header class="music-recipe__header">
      <div class="music-recipe__intro">
        <span class="music-recipe__eyebrow">Numeric OKLCH authority</span>
        <h3>One identity, three mappings.</h3>
        <p>
          Twelve physical pitch positions. Mapping changes color identity, never pitch
          geometry. Every rendered value comes through the production resolver.
        </p>
      </div>
      <div class="music-recipe__mode" role="group" aria-label="Music Color mapping">
        <button
          v-for="option in mappingOptions"
          :key="option.value"
          :class="{ active: config.musicColorMode === option.value }"
          @click="config.musicColorMode = option.value"
        >{{ option.label }}</button>
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
        Scale
        <select v-model="mode">
          <option v-for="option in MODE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label>
        <span>Scientific octave <output>{{ octave }}</output></span>
        <input v-model.number="octave" type="range" min="1" max="9" step="1" />
      </label>
      <label>
        Borrowed pitch
        <select v-model="selectedPitch">
          <option v-for="note in CHROMATIC_NOTES" :key="note" :value="note">{{ note }}</option>
        </select>
      </label>
      <label class="music-recipe__sweep">
        <input v-model="config.hueMotionEnabled" type="checkbox" />
        Full-cell hue motion
      </label>
    </div>

    <div class="music-recipe__workbench">
      <figure class="music-recipe__wheel-frame">
        <svg class="music-recipe__wheel" viewBox="-126 -126 252 252" role="img" :aria-label="wheelLabel">
          <g>
            <path
              v-for="cell in wheelCells"
              :key="cell.pitch"
              class="music-recipe__segment"
              :class="{
                'music-recipe__segment--tonic': cell.pitch === musicKey,
                'music-recipe__segment--empty': !cell.color,
              }"
              :d="cell.path"
              :style="{ fill: cell.color ?? 'var(--ink-4)' }"
              :data-pitch="cell.pitch"
              :data-degree="cell.degreeIndex ?? undefined"
            />
          </g>
          <g class="music-recipe__labels">
            <text
              v-for="cell in wheelCells"
              :key="`label-${cell.pitch}`"
              :x="cell.labelX"
              :y="cell.labelY"
              text-anchor="middle"
              dominant-baseline="central"
            >{{ cell.pitch }}</text>
          </g>
          <g class="music-recipe__hub">
            <text y="-18" text-anchor="middle" dominant-baseline="central">{{ mappingLabel }}</text>
            <text y="0" text-anchor="middle" dominant-baseline="central">{{ musicKey }} · {{ scale.degreeCount }} notes</text>
            <text y="14" text-anchor="middle" dominant-baseline="central">oct {{ octave }}</text>
            <text y="28" text-anchor="middle" dominant-baseline="central">{{ phaseLabel }}</text>
          </g>
        </svg>
        <figcaption>
          C stays at twelve o’clock; the ivory-ringed tonic follows Key. Ink cells are valid
          off-scale omissions, not calculation failures.
        </figcaption>
      </figure>

      <div class="music-recipe__evidence">
        <article class="music-recipe__policy">
          <span>Exact-pitch policy</span>
          <strong>{{ selectedPitch }}{{ octave }}</strong>
          <p v-if="selectedDegreeIndex !== null">This pitch belongs to the selected scale.</p>
          <p v-else>General movable output is OFF. Exact visuals use fixed chromatic fallback.</p>
          <div
            class="music-recipe__borrowed-chip"
            :style="{ '--borrowed-color': selectedExactColor }"
          >{{ selectedExact?.resolution.mapping ?? "invalid" }}</div>
        </article>

        <article class="music-recipe__real-sources">
          <div>
            <span>Real Note · exact pitch</span>
            <Note
              :syllable="selectedSolfege"
              :degree="selectedDegree"
              :raw-pitch="`${selectedPitch}${octave}`"
              primary="raw"
              :visible-labels="['raw']"
              geometry="offcut"
              proportion="medium"
              :scale-index="selectedDegreeIndex ?? 0"
              :pitch-class-index="CHROMATIC_NOTES.indexOf(selectedPitch)"
              :octave="octave"
              :mode="mode"
              :music-key="musicKey"
              :accidental="selectedPitch.includes('#')"
            />
          </div>
          <div>
            <span>Real fused Chord · shared phase</span>
            <Chord
              :members="chordMembers"
              display="symbol"
              symbol="△"
              proportion="balanced"
              geometry="offcut"
              accessible-name="Music Color chord specimen"
            />
          </div>
        </article>
      </div>
    </div>

    <dl class="music-recipe__facts">
      <div><dt>Mapping</dt><dd>{{ mappingLabel }}</dd></div>
      <div><dt>Hue cells</dt><dd>{{ config.musicColorMode === 'movable-ordinal' ? scale.degreeCount : 12 }}</dd></div>
      <div><dt>Recipe</dt><dd>OKLCH v{{ config.recipeVersion }} · C {{ config.chroma }}</dd></div>
      <div><dt>Octaves</dt><dd>1–9 · L 27.5–87.5%</dd></div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Note from "@/components/primatives/Note.vue";
import Chord, { type ChordMember } from "@/components/compounds/Chord.vue";
import { CHROMATIC_NOTES, MODE_OPTIONS, getScaleForMode } from "@/data";
import { provideMusicColorConfig } from "@/composables/useMusicColorConfig";
import { useMusicColorClock } from "@/composables/useMusicColorClock";
import {
  getScaleDegreeIndexForPitchClass,
  musicColorValueToCss,
  resolveMusicColorSampleByPitchClass,
} from "@/services/musicColor";
import type {
  ChromaticNote,
  DynamicColorConfig,
  MusicColorMode,
  MusicalMode,
} from "@/types";

const mappingOptions: Array<{ value: MusicColorMode; label: string }> = [
  { value: "fixed", label: "Fixed" },
  { value: "movable-ordinal", label: "Ordinal" },
  { value: "movable-relative", label: "Relative" },
];

const musicKey = ref<ChromaticNote>("C");
const mode = ref<MusicalMode>("major");
const octave = ref(5);
const selectedPitch = ref<ChromaticNote>("C#");
const config = ref<DynamicColorConfig>({
  recipeVersion: 1,
  musicColorMode: "movable-relative",
  hueMotionEnabled: true,
  animationSpeed: 1,
  chroma: 0.18,
  lightnessCenter: 0.575,
  lightnessSpan: 0.6,
});

provideMusicColorConfig(config);
const clock = useMusicColorClock(
  () => config.value.hueMotionEnabled,
  () => config.value.animationSpeed,
  config,
);

const scale = computed(() => getScaleForMode(mode.value));
const phase = computed(() =>
  config.value.hueMotionEnabled && !clock.reducedMotion.value
    ? clock.phaseCycles.value
    : null,
);

function point(radius: number, angleDegrees: number) {
  const angle = angleDegrees * Math.PI / 180;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function arcPath(index: number) {
  const center = -90 + index * 30;
  const start = point(104, center - 14.2);
  const end = point(104, center + 14.2);
  const innerEnd = point(48, center + 14.2);
  const innerStart = point(48, center - 14.2);
  return [
    `M ${start.x} ${start.y}`,
    `A 104 104 0 0 1 ${end.x} ${end.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A 48 48 0 0 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

const wheelCells = computed(() => CHROMATIC_NOTES.map((pitch, index) => {
  const degreeIndex = getScaleDegreeIndexForPitchClass(
    pitch,
    musicKey.value,
    mode.value,
  );
  const resolved = resolveMusicColorSampleByPitchClass(
    pitch,
    mode.value,
    musicKey.value,
    octave.value,
    config.value,
    "omit",
    phase.value,
  );
  const label = point(116, -90 + index * 30);
  return {
    pitch,
    degreeIndex,
    path: arcPath(index),
    labelX: label.x,
    labelY: label.y,
    color: resolved ? musicColorValueToCss(resolved.sample.primary) : null,
  };
}));

const selectedDegreeIndex = computed(() => getScaleDegreeIndexForPitchClass(
  selectedPitch.value,
  musicKey.value,
  mode.value,
));
const selectedExact = computed(() => resolveMusicColorSampleByPitchClass(
  selectedPitch.value,
  mode.value,
  musicKey.value,
  octave.value,
  config.value,
  "fixed-chromatic",
  phase.value,
));
const selectedExactColor = computed(() => selectedExact.value
  ? musicColorValueToCss(selectedExact.value.sample.primary)
  : "transparent");
const selectedSolfege = computed(() => selectedDegreeIndex.value === null
  ? "Borrowed"
  : scale.value.solfege[selectedDegreeIndex.value]?.name ?? "Degree");
const selectedDegree = computed(() => selectedDegreeIndex.value === null
  ? "—"
  : `${selectedDegreeIndex.value + 1}`);

const chordMembers = computed<ChordMember[]>(() => {
  const tonic = CHROMATIC_NOTES.indexOf(musicKey.value);
  const degreeIndices = [0, 2, 4].filter((index) => index < scale.value.degreeCount);
  return degreeIndices.map((degreeIndex, voicingOrder) => {
    const interval = scale.value.intervals[degreeIndex];
    const absolutePitch = tonic + interval;
    const pitchClassIndex = ((absolutePitch % 12) + 12) % 12;
    const memberOctave = octave.value + Math.floor(absolutePitch / 12);
    return {
      id: `music-color-${degreeIndex}`,
      syllable: scale.value.solfege[degreeIndex]?.name ?? `${degreeIndex + 1}`,
      degree: `${degreeIndex + 1}`,
      rawPitch: `${CHROMATIC_NOTES[pitchClassIndex]}${memberOctave}`,
      primary: "raw",
      visibleLabels: ["raw"],
      scaleIndex: degreeIndex,
      pitchClassIndex,
      octave: memberOctave,
      mode: mode.value,
      musicKey: musicKey.value,
      surfaceStyle: "colored",
      accidental: CHROMATIC_NOTES[pitchClassIndex].includes("#"),
      progress: 1,
      voicingOrder,
    };
  });
});

const mappingLabel = computed(() => ({
  fixed: "fixed pitch",
  "movable-ordinal": "ordinal movable",
  "movable-relative": "relative movable",
})[config.value.musicColorMode]);
const phaseLabel = computed(() => phase.value === null ? "center" : "sweeping");
const wheelLabel = computed(() =>
  `${mappingLabel.value} Music Color wheel for ${musicKey.value} ${mode.value}, octave ${octave.value}`,
);
</script>

<style scoped>
/* The layer sheet already supplies Ink 2; the specimen groups on filled Ink
   wells, cut-paper tabs, and spacing — no frames, no hairlines. */
.music-recipe {
  display: flex;
  flex-direction: column;
  gap: var(--s-7);
  min-width: 0;
  color: var(--ivory);
}

/* ── Header: role line + mapping switch ─────────────────────────────── */
.music-recipe__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-6) var(--s-9);
}

.music-recipe__intro {
  display: flex;
  flex: 1 1 320px;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-4);
  min-width: 0;
}

.music-recipe__eyebrow {
  padding: 5px 10px 3px;
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  font: 700 14px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-tab);
  transform: rotate(var(--rot-sticker));
}

.music-recipe h3 {
  margin: 0;
  padding-bottom: 0.2em;
  font: 700 clamp(30px, 7vw, 48px)/0.95 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.music-recipe p {
  max-width: 62ch;
  margin: 0;
  font: var(--t-body-s-mono);
  color: var(--ivory-3);
}

.music-recipe__mode {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: var(--s-3);
}

.music-recipe__mode button {
  min-height: 40px;
  padding: 8px 16px 6px;
  border: 0;
  background: var(--ink);
  color: var(--ivory-3);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-tile);
  cursor: pointer;
  transition:
    background-color var(--dur-ui) var(--ease-stab),
    color var(--dur-ui) var(--ease-stab),
    transform var(--dur-ui) var(--ease-stab);
}

.music-recipe__mode button:hover { color: var(--ivory); }

.music-recipe__mode button.active {
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  clip-path: var(--clip-offcut);
  transform: rotate(var(--rot-mark));
}

.music-recipe__mode button:focus-visible {
  outline: 2px solid var(--guide-paper);
  outline-offset: 3px;
}

/* ── Controls well ─────────────────────────────────────────────────── */
.music-recipe__controls {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
  align-items: end;
  gap: var(--s-6) var(--s-6);
  padding: var(--s-7) var(--s-6);
  background: var(--ink);
}

.music-recipe__controls label {
  display: grid;
  gap: var(--s-3);
  min-width: 0;
  font: 700 15px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory-2);
}

.music-recipe__controls output {
  margin-left: var(--s-3);
  font: var(--t-mono);
  color: var(--guide-paper);
}

.music-recipe select,
.music-recipe input[type="range"] {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.music-recipe select { background-color: var(--ink-2); }

.music-recipe__controls .music-recipe__sweep {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--s-4);
  min-height: 34px;
}

.music-recipe__sweep input { width: 18px; height: 18px; margin: 0; }

/* ── Workbench: wheel + evidence ───────────────────────────────────── */
.music-recipe__workbench {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: var(--s-7);
  align-items: stretch;
}

.music-recipe__wheel-frame {
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  margin: 0;
  padding: var(--s-7) var(--s-5);
  background: var(--ink);
}

.music-recipe__wheel {
  display: block;
  width: min(100%, 480px);
  margin: auto;
  overflow: visible;
}

.music-recipe__segment {
  stroke: var(--ink);
  stroke-width: 1.6;
}

.music-recipe__segment--empty {
  opacity: .62;
}

.music-recipe__segment--tonic {
  stroke: var(--ivory);
  stroke-width: 3;
}

.music-recipe__labels text {
  fill: var(--ivory-2);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

.music-recipe__hub text {
  fill: var(--ivory-2);
  font-family: var(--font-mono);
  font-size: 10.5px;
}

.music-recipe__hub text:first-child {
  fill: var(--ivory);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.music-recipe figcaption {
  max-width: 48ch;
  margin: 0 auto;
  font: var(--t-caption);
  color: var(--ivory-3);
  text-align: center;
}

.music-recipe__evidence {
  display: grid;
  gap: var(--s-7);
  align-content: start;
}

.music-recipe__policy,
.music-recipe__real-sources {
  padding: var(--s-7) var(--s-6);
  background: var(--ink);
}

.music-recipe article > span,
.music-recipe__real-sources > div > span {
  font: 700 17px/1.15 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.music-recipe__policy > span {
  display: inline-block;
  padding: 5px 10px 3px;
  background: var(--tomato);
  color: var(--ivory);
  clip-path: var(--clip-tab);
  transform: rotate(var(--rot-tile-2));
}

.music-recipe__policy strong {
  display: block;
  margin: var(--s-6) 0 var(--s-5);
  padding-bottom: 0.2em;
  font: 700 clamp(56px, 14vw, 88px)/0.9 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.music-recipe__borrowed-chip {
  width: fit-content;
  max-width: 100%;
  margin-top: var(--s-6);
  padding: 10px 14px 8px;
  background: var(--borrowed-color);
  color: var(--ink);
  font: 600 12px/1.2 var(--font-mono);
  overflow-wrap: anywhere;
  clip-path: var(--clip-offcut);
  transform: rotate(var(--rot-tile-5));
}

.music-recipe__real-sources {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr));
  gap: var(--s-7);
  align-items: start;
}

.music-recipe__real-sources > div {
  display: grid;
  gap: var(--s-5);
  min-width: 0;
}

/* ── Stats row: cut tiles, not ruled columns ───────────────────────── */
.music-recipe__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
  gap: var(--s-5);
  margin: 0;
}

.music-recipe__facts div {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-5) var(--s-6);
  background: var(--ink);
  clip-path: var(--clip-tile);
}

.music-recipe__facts div:nth-child(odd) { transform: rotate(var(--rot-tile-1)); }
.music-recipe__facts div:nth-child(even) { transform: rotate(var(--rot-tile-2)); }

.music-recipe__facts dt {
  font: 700 15px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--guide-paper);
}

.music-recipe__facts dd {
  margin: 0;
  font: var(--t-body-s-mono);
  color: var(--ivory);
}

@media (prefers-reduced-motion: reduce) {
  .music-recipe__mode button { transition: none; }
}
</style>
