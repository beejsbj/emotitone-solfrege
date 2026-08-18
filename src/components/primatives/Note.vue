<template>
  <span
    class="note"
    :class="noteClasses"
    :style="noteStyles"
    :aria-label="ariaLabel"
    :data-pitch-class-index="pitchClassIndex ?? undefined"
    :data-octave="octave"
    :data-primary="primary"
    :data-geometry="geometry"
    :data-proportion="proportion"
    :data-sounding="sounding || undefined"
    :data-sustained="sustained || undefined"
    :data-played-recently="playedRecently || undefined"
    :data-selected="selected || undefined"
    :data-ghosted="ghosted || undefined"
  >
    <span
      v-if="primaryLabel"
      class="note__label note__label--primary"
      :class="`note__label--${primaryLabel.kind}`"
      :data-slot="primaryLabel.slot"
    >
      {{ primaryLabel.value }}
    </span>

    <span
      v-for="label in auxiliaryLabels"
      :key="label.kind"
      class="note__label note__label--aux"
      :class="[`note__label--${label.kind}`, `note__label--slot-${label.slot}`]"
      :data-slot="label.slot"
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
export type NoteGeometry = "strip" | "tile" | "offcut" | "tab" | "pill";
export type NoteProportion = "standard" | "tall" | "squary" | "wide" | "hero";
export type NoteSurfaceStyle = "colored" | "monochrome" | "glassmorphism";

interface NoteDisplayLabel {
  kind: NoteLabel;
  value: string;
  slot: "center" | "top-left" | "bottom-right";
}

const props = withDefaults(
  defineProps<{
    syllable?: string;
    degree?: string;
    rawPitch?: string;
    primary?: NoteLabel;
    visibleLabels?: NoteLabel[];
    geometry?: NoteGeometry;
    proportion?: NoteProportion;
    scaleIndex?: number;
    pitchClassIndex?: number;
    octave?: number;
    mode?: MusicalMode;
    musicKey?: ChromaticNote;
    surfaceStyle?: NoteSurfaceStyle;
    accidental?: boolean | null;
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
    geometry: "strip",
    proportion: "standard",
    scaleIndex: 0,
    pitchClassIndex: undefined,
    octave: 4,
    mode: "major",
    musicKey: "C",
    surfaceStyle: "colored",
    accidental: null,
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

const { createGlassmorphShadow, getKeyBackground } = useColorSystem();

const inferredAccidental = computed(() => {
  if (typeof props.accidental === "boolean") {
    return props.accidental;
  }

  return /[#b♯♭]/.test(props.rawPitch);
});

const color = computed(() =>
  getKeyBackground(
    props.scaleIndex,
    props.mode,
    props.musicKey,
    props.octave,
    props.surfaceStyle,
    inferredAccidental.value,
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

const labelOrder: NoteLabel[] = ["syllable", "degree", "raw"];

const visibleLabelKinds = computed(() =>
  labelOrder.filter(
    (kind) => props.visibleLabels.includes(kind) && Boolean(labelValues.value[kind]),
  ),
);

const primaryLabel = computed<NoteDisplayLabel | null>(() => {
  if (!visibleLabelKinds.value.includes(props.primary)) {
    return null;
  }

  return {
    kind: props.primary,
    value: labelValues.value[props.primary],
    slot: "center",
  };
});

const auxiliaryLabels = computed<NoteDisplayLabel[]>(() => {
  const visibleAuxiliaryKinds = visibleLabelKinds.value.filter(
    (kind) => kind !== props.primary,
  );
  const slots: Array<"top-left" | "bottom-right"> = ["top-left", "bottom-right"];

  return visibleAuxiliaryKinds.map((kind, index) => ({
    kind,
    value: labelValues.value[kind],
    slot: slots[index] ?? "bottom-right",
  }));
});

const noteClasses = computed(() => [
  `note--primary-${props.primary}`,
  `note--geometry-${props.geometry}`,
  `note--proportion-${props.proportion}`,
  `note--surface-${props.surfaceStyle}`,
  {
    "note--sounding": props.sounding,
    "note--sustained": props.sustained,
    "note--played-recently": props.playedRecently,
    "note--selected": props.selected,
    "note--ghosted": props.ghosted,
    "note--accidental": inferredAccidental.value,
    "note--natural": !inferredAccidental.value,
  },
]);

const noteStyles = computed(() => {
  const isAccidental = inferredAccidental.value;
  const labelMain = isAccidental ? "rgba(0, 0, 0, .88)" : "rgba(255, 255, 255, .94)";
  const labelSoft = isAccidental ? "rgba(0, 0, 0, .62)" : "rgba(255, 255, 255, .74)";
  const labelMuted = isAccidental ? "rgba(0, 0, 0, .5)" : "rgba(255, 255, 255, .58)";
  const innerBorder =
    props.surfaceStyle === "monochrome"
      ? isAccidental
        ? "rgba(0, 0, 0, .14)"
        : "rgba(255, 255, 255, .2)"
      : "rgba(255, 255, 255, .08)";

  return {
    "--note-surface": color.value.background,
    "--note-primary-color": color.value.primaryColor,
    "--note-label-main": labelMain,
    "--note-label-soft": labelSoft,
    "--note-label-muted": labelMuted,
    "--note-inner-border": innerBorder,
    "--note-shadow":
      props.surfaceStyle === "glassmorphism"
        ? createGlassmorphShadow(color.value.primaryColor)
        : "var(--shadow-key)",
    "--note-backdrop":
      props.surfaceStyle === "glassmorphism" ? "blur(18px) saturate(135%)" : "none",
  };
});

const ariaLabel = computed(() => {
  const ordered = [
    labelValues.value.syllable,
    labelValues.value.degree,
    labelValues.value.raw,
  ].filter(Boolean);

  return ordered.join(", ");
});
</script>

<style scoped>
.note {
  --note-width: 56px;
  --note-height: 88px;
  --note-padding-top: 9px;
  --note-padding-inline: 8px;
  --note-padding-bottom: 10px;
  --note-radius: var(--r-sm);
  --note-clip: var(--clip-tile);
  --note-corner-top: 9px;
  --note-corner-left: 8px;
  --note-corner-right: 8px;
  --note-corner-bottom: 10px;
  --note-primary-display-size: 32px;
  --note-primary-raw-size: 18px;
  --note-primary-display-tracking: .04em;
  --note-aux-display-size: 9px;
  --note-aux-degree-size: 11px;
  --note-aux-raw-size: 7px;
  --note-aux-tracking: .14em;
  position: relative;
  display: block;
  box-sizing: border-box;
  width: var(--note-width);
  height: var(--note-height);
  padding:
    var(--note-padding-top)
    var(--note-padding-inline)
    var(--note-padding-bottom);
  overflow: hidden;
  border-radius: var(--note-radius);
  background: var(--note-surface);
  box-shadow:
    var(--note-shadow),
    inset 0 0 0 1px var(--note-inner-border);
  clip-path: var(--note-clip);
  user-select: none;
  backdrop-filter: var(--note-backdrop);
  -webkit-backdrop-filter: var(--note-backdrop);
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
  position: absolute;
  z-index: 1;
  line-height: 1;
  white-space: nowrap;
}

.note__label--primary {
  top: 50%;
  left: 50%;
  max-width: calc(100% - 18px);
  transform: translate(-50%, -50%);
  color: var(--note-label-main);
  text-align: center;
}

.note__label--aux {
  color: var(--note-label-soft);
}

.note__label--slot-top-left {
  top: var(--note-corner-top);
  left: var(--note-corner-left);
  max-width: calc(100% - 16px);
  text-align: left;
}

.note__label--slot-bottom-right {
  right: var(--note-corner-right);
  bottom: var(--note-corner-bottom);
  max-width: calc(100% - 16px);
  text-align: right;
}

.note__label--syllable {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
}

.note__label--degree {
  font-family: var(--font-display);
  font-weight: 700;
}

.note__label--raw {
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.note__label--primary.note__label--syllable,
.note__label--primary.note__label--degree {
  font-size: var(--note-primary-display-size);
  letter-spacing: var(--note-primary-display-tracking);
}

.note__label--primary.note__label--raw {
  font-size: var(--note-primary-raw-size);
  letter-spacing: .04em;
}

.note__label--aux.note__label--syllable {
  font-size: var(--note-aux-display-size);
  letter-spacing: var(--note-aux-tracking);
}

.note__label--aux.note__label--degree {
  font-size: var(--note-aux-degree-size);
  letter-spacing: .04em;
}

.note__label--aux.note__label--raw {
  font-size: var(--note-aux-raw-size);
  letter-spacing: var(--note-aux-tracking);
  color: var(--note-label-muted);
}

.note--geometry-strip {
  --note-width: 56px;
  --note-height: 88px;
  --note-clip: var(--clip-tile);
}

.note--geometry-tile {
  --note-width: 88px;
  --note-height: 88px;
  --note-radius: 0px;
  --note-clip: var(--clip-tile);
  --note-primary-display-size: 44px;
}

.note--geometry-offcut {
  --note-width: 88px;
  --note-height: 88px;
  --note-radius: 0px;
  --note-clip: var(--clip-offcut);
  --note-primary-display-size: 40px;
}

.note--geometry-tab {
  --note-width: 88px;
  --note-height: 88px;
  --note-radius: 0px;
  --note-clip: var(--clip-tab);
  --note-primary-display-size: 40px;
}

.note--geometry-pill {
  --note-clip: none;
  --note-radius: 999px;
}

.note--proportion-standard {
  --note-width: 56px;
  --note-height: 88px;
}

.note--proportion-tall {
  --note-width: 40px;
  --note-height: 116px;
  --note-padding-top: 8px;
  --note-padding-inline: 5px;
  --note-padding-bottom: 9px;
  --note-primary-display-size: 20px;
  --note-primary-raw-size: 13px;
  --note-aux-display-size: 7px;
  --note-aux-degree-size: 9px;
  --note-aux-raw-size: 6px;
}

.note--proportion-squary {
  --note-width: 72px;
  --note-height: 72px;
  --note-primary-display-size: 28px;
  --note-primary-raw-size: 16px;
}

.note--proportion-wide {
  --note-width: 120px;
  --note-height: 56px;
  --note-padding-top: 6px;
  --note-padding-inline: 12px;
  --note-padding-bottom: 8px;
  --note-corner-top: 6px;
  --note-corner-left: 12px;
  --note-corner-right: 12px;
  --note-corner-bottom: 8px;
  --note-primary-display-size: 24px;
  --note-primary-raw-size: 15px;
}

.note--proportion-hero {
  --note-width: 80px;
  --note-height: 130px;
  --note-primary-display-size: 44px;
  --note-primary-raw-size: 26px;
  --note-aux-display-size: 11px;
  --note-aux-degree-size: 13px;
  --note-aux-raw-size: 9px;
}

.note--surface-monochrome::after {
  background:
    radial-gradient(110% 60% at 50% 0%, rgba(255, 255, 255, .12), transparent 55%),
    linear-gradient(180deg, transparent 65%, rgba(0, 0, 0, .1) 100%);
}

@media (prefers-reduced-motion: reduce) {
  .note {
    transition: none;
  }
}
</style>
