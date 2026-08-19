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
  >
    <span class="note__surface">
      <span
        v-if="primaryLabel"
        class="note__label note__label--rank-primary"
        :class="`note__label--${primaryLabel.kind}`"
        :data-slot="primaryLabel.slot"
      >
        {{ primaryLabel.value }}
      </span>

      <span
        v-for="label in auxiliaryLabels"
        :key="label.kind"
        class="note__label note__label--rank-aux"
        :class="[`note__label--${label.kind}`, `note__label--slot-${label.slot}`]"
        :data-slot="label.slot"
      >
        {{ label.value }}
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useColorSystem } from "@/composables/useColorSystem";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type NoteLabel = "syllable" | "degree" | "raw";
export type NoteGeometry = "standard" | "tile" | "offcut" | "tab" | "pill";
export type NoteProportion = "tall" | "medium" | "stocky" | "wide";
export type NoteSurfaceStyle = "colored" | "monochrome";

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
    sounding?: boolean;
  }>(),
  {
    syllable: "Do",
    degree: "I",
    rawPitch: "C4",
    primary: "syllable",
    visibleLabels: () => ["syllable", "degree", "raw"],
    geometry: "standard",
    proportion: "medium",
    scaleIndex: 0,
    pitchClassIndex: undefined,
    octave: 4,
    mode: "major",
    musicKey: "C",
    surfaceStyle: "colored",
    accidental: null,
    keyBrightness: 1,
    keySaturation: 1,
    sounding: false,
  },
);

const { getKeyBackground } = useColorSystem();

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
    "--note-shadow": "var(--shadow-key)",
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
  --note-primary-size: 32px;
  --note-primary-tracking: .04em;
  --note-aux-size: 9px;
  --note-aux-tracking: .14em;
  --note-primary-safe-inline: 9px;
  position: relative;
  display: block;
  box-sizing: border-box;
  width: var(--note-width);
  height: var(--note-height);
  overflow: visible;
  background: transparent;
  user-select: none;
}

.note__surface {
  position: absolute;
  inset: 0;
  display: block;
  box-sizing: border-box;
  padding:
    var(--note-padding-top)
    var(--note-padding-inline)
    var(--note-padding-bottom);
  overflow: hidden;
  contain: paint;
  isolation: isolate;
  border-radius: var(--note-radius);
  background: var(--note-surface);
  box-shadow:
    var(--note-shadow),
    inset 0 0 0 1px var(--note-inner-border);
  clip-path: var(--note-clip);
}

.note__surface::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  clip-path: inherit;
  pointer-events: none;
  background:
    radial-gradient(110% 60% at 50% 0%, rgba(255, 255, 255, .18), transparent 55%),
    linear-gradient(180deg, transparent 65%, rgba(0, 0, 0, .22) 100%);
  mix-blend-mode: overlay;
}

.note::before,
.note::after {
  content: "";
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-radius: var(--note-radius);
  clip-path: var(--note-clip);
  pointer-events: none;
}

.note::before {
  z-index: 0;
  border: 2px solid var(--note-primary-color);
  opacity: 0;
}

.note::after {
  z-index: 3;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .72);
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--note-primary-color) 42%, transparent));
  opacity: 0;
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.note--sounding::before {
  animation: flash-ring var(--dur-ui) var(--ease-stab) both;
}

.note--sounding::after {
  opacity: 1;
}

.note__label {
  position: absolute;
  z-index: 1;
  line-height: 1;
  white-space: nowrap;
}

.note__label--rank-primary {
  top: 50%;
  left: 50%;
  max-width: calc(100% - (var(--note-primary-safe-inline) * 2));
  transform: translate(-50%, -50%);
  color: var(--note-label-main);
  text-align: center;
}

.note__label--rank-aux {
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

.note__label--syllable,
.note__label--degree,
.note__label--raw {
  font-family: var(--font-display);
  font-weight: 700;
}

.note__label--syllable,
.note__label--raw {
  text-transform: uppercase;
}

.note__label--rank-primary {
  font-size: var(--note-primary-size);
  letter-spacing: var(--note-primary-tracking);
}

.note__label--rank-aux {
  font-size: var(--note-aux-size);
  letter-spacing: var(--note-aux-tracking);
}

.note__label--rank-aux.note__label--raw {
  color: var(--note-label-muted);
}

.note--geometry-standard {
  --note-radius: var(--r-sm);
  --note-clip: var(--clip-tile);
  --note-shadow: var(--shadow-key);
}

.note--geometry-tile {
  --note-radius: 0px;
  --note-clip: var(--clip-tile);
}

.note--geometry-offcut {
  --note-radius: 0px;
  --note-clip: var(--clip-offcut);
}

.note--geometry-tab {
  --note-radius: 0px;
  --note-clip: var(--clip-tab);
}

.note--geometry-pill {
  --note-clip: none;
  --note-radius: 999px;
  --note-corner-top: clamp(8px, 12%, 12px);
  --note-corner-left: clamp(8px, 16%, 18px);
  --note-corner-right: clamp(8px, 16%, 18px);
  --note-corner-bottom: clamp(8px, 12%, 12px);
  --note-primary-safe-inline: clamp(12px, 20%, 22px);
}

.note--proportion-tall {
  --note-width: 40px;
  --note-height: 116px;
  --note-padding-top: 8px;
  --note-padding-inline: 5px;
  --note-padding-bottom: 9px;
  --note-primary-size: 20px;
  --note-aux-size: 7px;
}

.note--proportion-medium {
  --note-width: 56px;
  --note-height: 88px;
}

.note--proportion-stocky {
  --note-width: 72px;
  --note-height: 72px;
  --note-primary-size: 28px;
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
  --note-primary-size: 24px;
  --note-aux-size: 8px;
}

.note--surface-monochrome .note__surface::after {
  background:
    radial-gradient(110% 60% at 50% 0%, rgba(255, 255, 255, .12), transparent 55%),
    linear-gradient(180deg, transparent 65%, rgba(0, 0, 0, .1) 100%);
}

@media (prefers-reduced-motion: reduce) {
  .note::before {
    animation: none;
    opacity: 0;
  }

  .note::after {
    transition: none;
  }
}
</style>
