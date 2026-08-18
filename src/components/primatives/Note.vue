<template>
  <span
    class="note"
    :class="noteClasses"
    :style="noteStyles"
    :aria-label="ariaLabel"
    :data-pitch-class-index="pitchClassIndex"
    :data-octave="octave"
  >
    <span
      v-for="label in orderedLabels"
      :key="label.kind"
      class="note__label"
      :class="`note__label--${label.kind}`"
    >
      {{ label.value }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useColorSystem } from "@/composables/useColorSystem";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type NoteLabel = "syllable" | "degree" | "raw";
export type NoteShape =
  | "strip"
  | "tile"
  | "offcut"
  | "tab"
  | "pill"
  | "tall"
  | "squary"
  | "wide"
  | "hero"
  | "glyph";
export type NoteSurfaceStyle = "colored" | "monochrome" | "glassmorphism";

const props = withDefaults(
  defineProps<{
    syllable?: string;
    degree?: string;
    rawPitch?: string;
    primary?: NoteLabel;
    visibleLabels?: NoteLabel[];
    shape?: NoteShape;
    scaleIndex?: number;
    pitchClassIndex?: number;
    octave?: number;
    mode?: MusicalMode;
    musicKey?: ChromaticNote;
    surfaceStyle?: NoteSurfaceStyle;
    accidental?: boolean;
    keyBrightness?: number;
    keySaturation?: number;
    glassmorphOpacity?: number;
    sounding?: boolean;
    sustained?: boolean;
    playedRecently?: boolean;
    selected?: boolean;
    ghosted?: boolean;
  }>(),
  {
    syllable: "Do",
    degree: "I",
    rawPitch: "C4",
    primary: "syllable",
    visibleLabels: () => ["syllable", "degree", "raw"],
    shape: "strip",
    scaleIndex: 0,
    pitchClassIndex: 0,
    octave: 4,
    mode: "major",
    musicKey: "C",
    surfaceStyle: "colored",
    accidental: false,
    keyBrightness: 1,
    keySaturation: 1,
    glassmorphOpacity: 0.4,
    sounding: false,
    sustained: false,
    playedRecently: false,
    selected: false,
    ghosted: false,
  },
);

const { getKeyBackground } = useColorSystem();

const color = computed(() =>
  getKeyBackground(
    props.scaleIndex,
    props.mode,
    props.musicKey,
    props.octave,
    props.surfaceStyle,
    props.accidental,
    {
      keyBrightness: props.keyBrightness,
      keySaturation: props.keySaturation,
      glassmorphOpacity: props.glassmorphOpacity,
    },
  ),
);

const labelValues = computed<Record<NoteLabel, string>>(() => ({
  syllable: props.syllable,
  degree: props.degree,
  raw: props.rawPitch,
}));

const orderedLabels = computed(() => {
  const visible = new Set(props.visibleLabels);
  const order: NoteLabel[] = [
    props.primary,
    ...(["syllable", "degree", "raw"] as NoteLabel[]).filter(
      (label) => label !== props.primary,
    ),
  ];

  return order
    .filter((kind) => visible.has(kind) && labelValues.value[kind])
    .map((kind) => ({ kind, value: labelValues.value[kind] }));
});

const noteClasses = computed(() => [
  `note--shape-${props.shape}`,
  `note--primary-${props.primary}`,
  `note--surface-${props.surfaceStyle}`,
  {
    "note--sounding": props.sounding,
    "note--sustained": props.sustained,
    "note--played-recently": props.playedRecently,
    "note--selected": props.selected,
    "note--ghosted": props.ghosted,
  },
]);

const noteStyles = computed(() => ({
  "--note-surface": color.value.background,
  "--note-primary-color": color.value.primaryColor,
}));

const ariaLabel = computed(() =>
  [props.syllable, props.degree, props.rawPitch].filter(Boolean).join(", "),
);
</script>

<style scoped>
.note {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  gap: 3px;
  overflow: hidden;
  border-radius: var(--r-sm);
  background: var(--note-surface);
  box-shadow: var(--shadow-key);
  clip-path: var(--clip-tile);
  color: rgba(0, 0, 0, .86);
  user-select: none;
  transition:
    box-shadow var(--dur-tap) var(--ease-stab),
    filter var(--dur-tap) var(--ease-stab),
    opacity var(--dur-tap) var(--ease-stab);
}

.note::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(110% 60% at 50% 0%, rgba(255, 255, 255, .18), transparent 55%),
    linear-gradient(180deg, transparent 65%, rgba(0, 0, 0, .22) 100%);
  mix-blend-mode: overlay;
}

.note__label {
  position: relative;
  z-index: 1;
  max-width: 100%;
  overflow: hidden;
  color: rgba(0, 0, 0, .58);
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note__label--raw {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.note--primary-syllable .note__label--syllable,
.note--primary-degree .note__label--degree,
.note--primary-raw .note__label--raw {
  order: -1;
  color: rgba(0, 0, 0, .88);
  font-family: var(--font-display);
  font-size: 24px;
  letter-spacing: .01em;
  line-height: .88;
  text-transform: none;
}

.note--surface-monochrome {
  color: var(--ivory);
}

.note--surface-monochrome .note__label {
  color: currentColor;
}

.note--sounding {
  box-shadow:
    var(--shadow-key),
    0 0 18px color-mix(in srgb, var(--note-primary-color) 70%, transparent);
  filter: brightness(1.12) saturate(1.08);
}

.note--sustained::before {
  content: "";
  position: absolute;
  z-index: 1;
  inset: 4px;
  border: 1px solid rgba(255, 255, 255, .62);
  border-radius: inherit;
  pointer-events: none;
}

.note--played-recently {
  box-shadow:
    var(--shadow-key),
    0 0 10px color-mix(in srgb, var(--note-primary-color) 38%, transparent);
}

.note--selected {
  outline: 2px solid var(--ivory);
  outline-offset: -3px;
}

.note--ghosted {
  filter: saturate(.2);
  opacity: .38;
}

.note--shape-hero {
  width: 80px;
  height: 130px;
  padding: 10px 8px;
  transform: rotate(-.2deg);
}

.note--shape-strip {
  width: 56px;
  height: 88px;
  padding: 9px 8px 10px;
}

.note--shape-tile,
.note--shape-offcut,
.note--shape-tab {
  width: 88px;
  height: 88px;
  border-radius: 0;
  padding: 9px 8px;
}

.note--shape-offcut { clip-path: var(--clip-offcut); }
.note--shape-tab { clip-path: var(--clip-tab); }

.note--shape-pill {
  width: 56px;
  height: 88px;
  border-radius: 44px;
  clip-path: none;
}

.note--shape-tall {
  width: 56px;
  height: 110px;
}

.note--shape-squary {
  width: 72px;
  height: 72px;
}

.note--shape-wide {
  width: 120px;
  height: 56px;
  flex-direction: row;
  padding: 6px 12px 8px;
}

.note--shape-glyph {
  display: inline-flex;
  width: auto;
  height: auto;
  min-width: 0;
  overflow: visible;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  clip-path: none;
  color: var(--note-primary-color);
}

.note--shape-glyph::after { display: none; }
.note--shape-glyph .note__label {
  color: currentColor;
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: .02em;
  line-height: 1;
}

.note--shape-glyph.note--sounding {
  filter: none;
  text-shadow: 0 0 14px currentColor;
}

.note--shape-glyph.note--sounding::after {
  position: static;
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-left: 3px;
  background: currentColor;
  content: "";
  mix-blend-mode: normal;
}

@media (prefers-reduced-motion: reduce) {
  .note { transition: none; }
}
</style>
