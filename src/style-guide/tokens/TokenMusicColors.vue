<template>
  <section class="music-recipe">
    <header class="music-recipe__header">
      <div>
        <div class="music-recipe__eyebrow">Music Color · numeric OKLCH authority</div>
        <h3>One identity, three mappings</h3>
        <p>
          The wheel keeps twelve physical pitch positions. Mapping changes color identity,
          never pitch geometry. Every rendered value comes through the production resolver.
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
        Scientific octave <output>{{ octave }}</output>
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
            <text y="-7" text-anchor="middle">{{ mappingLabel }}</text>
            <text y="8" text-anchor="middle">{{ musicKey }} · {{ scale.degreeCount }} notes</text>
            <text y="23" text-anchor="middle">oct {{ octave }} · {{ phaseLabel }}</text>
          </g>
        </svg>
        <figcaption>
          C stays centered at twelve o’clock. The tonic marker follows Key. Ink cells are
          valid off-scale omissions, not calculation failures.
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
  config.value,
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
.music-recipe {
  padding: clamp(18px, 3vw, 30px);
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
.music-recipe figcaption,
.music-recipe article > span,
.music-recipe dt,
.music-recipe dd {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.music-recipe h3 {
  margin: 6px 0;
  font-family: var(--font-display);
  font-size: clamp(25px, 4vw, 34px);
}

.music-recipe p {
  max-width: 700px;
  margin: 0;
  color: var(--ivory-3);
  font-size: 13px;
}

.music-recipe__mode {
  display: flex;
  align-self: flex-start;
  border: 1px solid var(--hairline);
}

.music-recipe__mode button {
  min-height: 34px;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
}

.music-recipe__mode button.active {
  background: var(--ivory);
  color: var(--ink);
}

.music-recipe__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 18px;
  margin: 24px 0;
  padding-top: 18px;
  border-top: 1px solid var(--hairline);
}

.music-recipe__controls label {
  display: grid;
  gap: 6px;
  color: var(--ivory-3);
}

.music-recipe select,
.music-recipe input[type="range"] {
  min-width: 132px;
}

.music-recipe__sweep {
  display: flex !important;
  align-items: center;
}

.music-recipe__workbench {
  display: grid;
  grid-template-columns: minmax(260px, .9fr) minmax(280px, 1.1fr);
  gap: clamp(20px, 4vw, 44px);
  align-items: center;
}

.music-recipe__wheel-frame {
  margin: 0;
}

.music-recipe__wheel {
  display: block;
  width: min(100%, 430px);
  margin: auto;
  overflow: visible;
}

.music-recipe__segment {
  stroke: var(--ink);
  stroke-width: 1.2;
}

.music-recipe__segment--empty {
  opacity: .62;
}

.music-recipe__segment--tonic {
  stroke: var(--ivory);
  stroke-width: 3;
}

.music-recipe__labels text,
.music-recipe__hub text {
  fill: var(--ivory);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .04em;
}

.music-recipe__hub text:first-child {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}

.music-recipe figcaption {
  max-width: 420px;
  margin: 14px auto 0;
  color: var(--ivory-4);
  line-height: 1.6;
}

.music-recipe__evidence {
  display: grid;
  gap: 16px;
}

.music-recipe__policy,
.music-recipe__real-sources {
  padding: 16px;
  border: 1px solid var(--hairline);
  background: var(--ink-3);
}

.music-recipe__policy strong {
  display: block;
  margin: 8px 0;
  font-family: var(--font-display);
  font-size: 27px;
}

.music-recipe__borrowed-chip {
  width: fit-content;
  margin-top: 14px;
  padding: 8px 10px;
  background: var(--borrowed-color);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
}

.music-recipe__real-sources {
  display: grid;
  grid-template-columns: minmax(90px, .65fr) minmax(150px, 1.35fr);
  gap: 18px;
  align-items: end;
}

.music-recipe__real-sources > div {
  display: grid;
  gap: 10px;
}

.music-recipe__facts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 24px 0 0;
}

.music-recipe__facts div {
  padding-top: 10px;
  border-top: 1px solid var(--hairline);
}

.music-recipe__facts dt { color: var(--ivory-4); }
.music-recipe__facts dd { margin: 4px 0 0; color: var(--ivory); }

@media (max-width: 780px) {
  .music-recipe__header { flex-direction: column; }
  .music-recipe__mode { width: 100%; }
  .music-recipe__mode button { flex: 1; }
  .music-recipe__workbench { grid-template-columns: 1fr; }
  .music-recipe__facts { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 430px) {
  .music-recipe__mode { flex-direction: column; }
  .music-recipe__real-sources { grid-template-columns: 1fr; }
}
</style>
