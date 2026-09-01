<template>
  <span
    class="chord"
    :class="chordClasses"
    role="group"
    :aria-label="resolvedAccessibleName"
    :data-display="display"
    :data-proportion="proportion"
    :data-geometry="geometry"
  >
    <span v-if="display === 'symbol'" class="chord__fused" aria-hidden="true">
      <span
        v-for="(member, index) in resolvedMembers"
        :key="memberKey(member, index)"
        class="chord__fused-member"
        :style="member.style"
      >
        <span class="chord__fused-progress"></span>
      </span>
      <span class="chord__symbol">{{ symbol }}</span>
    </span>

    <span v-else class="chord__cluster" aria-hidden="true">
      <span
        v-for="(member, index) in resolvedMembers"
        :key="memberKey(member, index)"
        class="chord__cluster-member"
        :style="member.style"
      >
        <Note v-bind="noteProps(member.source)" />
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Note from "@/components/primatives/Note.vue";
import type {
  NoteGeometry,
  NoteLabel,
  NoteSurfaceStyle,
} from "@/components/primatives/Note.vue";
import { useColorSystem } from "@/composables/useColorSystem";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type ChordDisplay = "symbol" | "notes";
export type ChordProportion = "compact" | "balanced" | "wide";

export interface ChordMember {
  id?: string;
  syllable?: string;
  degree?: string;
  rawPitch?: string;
  primary?: NoteLabel;
  visibleLabels?: NoteLabel[];
  scaleIndex?: number;
  pitchClassIndex?: number;
  octave?: number;
  mode?: MusicalMode;
  musicKey?: ChromaticNote;
  surfaceStyle?: NoteSurfaceStyle;
  accidental?: boolean | null;
  keyBrightness?: number;
  keySaturation?: number;
  progress?: number;
}

const props = withDefaults(
  defineProps<{
    /** Preserved as supplied for band and clustered-Note order; onset timing lives independently in each member's progress. */
    members: ChordMember[];
    display?: ChordDisplay;
    symbol?: string;
    proportion?: ChordProportion;
    geometry?: NoteGeometry;
    accessibleName?: string;
  }>(),
  {
    display: "symbol",
    symbol: "Chord",
    proportion: "balanced",
    geometry: "offcut",
    accessibleName: undefined,
  },
);

const { getKeyBackground } = useColorSystem();

const chordClasses = computed(() => [
  `chord--display-${props.display}`,
  `chord--proportion-${props.proportion}`,
  `chord--geometry-${props.geometry}`,
]);

const clampProgress = (progress: number | undefined) => {
  if (typeof progress !== "number" || !Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
};

const isAccidental = (member: ChordMember) =>
  typeof member.accidental === "boolean"
    ? member.accidental
    : /[#b♯♭]/.test(member.rawPitch ?? "");

const resolvedMembers = computed(() =>
  props.members.map((source) => {
    const colors = getKeyBackground(
      source.scaleIndex ?? 0,
      source.mode ?? "major",
      source.musicKey ?? "C",
      source.octave ?? 4,
      source.surfaceStyle ?? "colored",
      isAccidental(source),
      {
        keyBrightness: source.keyBrightness ?? 1,
        keySaturation: source.keySaturation ?? 1,
      },
    );

    return {
      source,
      style: {
        "--chord-member-surface": colors.background,
        "--chord-member-progress": clampProgress(source.progress),
      },
    };
  }),
);

const noteProps = (member: ChordMember) => {
  const primary = member.primary ?? "syllable";
  return {
    syllable: member.syllable,
    degree: member.degree,
    rawPitch: member.rawPitch,
    primary,
    visibleLabels: member.visibleLabels ?? [primary],
    geometry: props.geometry,
    proportion: "glyph" as const,
    scaleIndex: member.scaleIndex,
    pitchClassIndex: member.pitchClassIndex,
    octave: member.octave,
    mode: member.mode,
    musicKey: member.musicKey,
    surfaceStyle: member.surfaceStyle,
    accidental: member.accidental,
    keyBrightness: member.keyBrightness,
    keySaturation: member.keySaturation,
  };
};

const memberKey = (member: (typeof resolvedMembers.value)[number], index: number) =>
  member.source.id ?? `${member.source.rawPitch ?? member.source.syllable ?? "member"}-${index}`;

const resolvedAccessibleName = computed(() => {
  if (props.accessibleName) return props.accessibleName;

  const memberNames = props.members
    .map((member) => member.rawPitch || member.syllable || member.degree)
    .filter(Boolean)
    .join(", ");

  return memberNames ? `${props.symbol}: ${memberNames}` : props.symbol;
});
</script>

<style scoped>
.chord {
  --chord-block-size: clamp(36px, 10cqi, 44px);
  --chord-member-inline-size: calc(var(--chord-block-size) * .75);
  --chord-clip: var(--clip-offcut);
  --chord-radius: 0;
  position: relative;
  display: inline-flex;
  box-sizing: border-box;
  max-width: 100%;
  user-select: none;
}

.chord--proportion-compact {
  --chord-block-size: clamp(27.2px, 8cqi, 33.6px);
}

.chord--proportion-balanced {
  --chord-block-size: clamp(36px, 10cqi, 44px);
}

.chord--proportion-wide {
  --chord-block-size: clamp(44px, 12cqi, 54px);
}

.chord--geometry-standard {
  --chord-clip: var(--clip-tile);
  --chord-radius: var(--r-sm);
}

.chord--geometry-tile {
  --chord-clip: var(--clip-tile);
  --chord-radius: 0;
}

.chord--geometry-offcut {
  --chord-clip: var(--clip-offcut);
  --chord-radius: 0;
}

.chord--geometry-tab {
  --chord-clip: var(--clip-tab);
  --chord-radius: 0;
}

.chord--geometry-pill {
  --chord-clip: none;
  --chord-radius: var(--r-pill);
}

.chord__fused,
.chord__cluster {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  gap: 0;
}

.chord__fused {
  min-height: var(--chord-block-size);
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--chord-radius);
  background: var(--ink);
  box-shadow: var(--shadow-key);
  clip-path: var(--chord-clip);
}

.chord__fused::after {
  content: "";
  position: absolute;
  z-index: 1;
  inset: 0;
  border-radius: inherit;
  background: var(--paper-surface-sheen);
  mix-blend-mode: overlay;
  pointer-events: none;
}

.chord__fused-member {
  position: relative;
  display: grid;
  flex: 0 0 var(--chord-member-inline-size);
  place-items: center;
  width: var(--chord-member-inline-size);
  min-width: 0;
  overflow: hidden;
  background: var(--ink);
}

.chord__fused-progress {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: var(--chord-member-surface);
  transform: scaleY(var(--chord-member-progress));
  transform-origin: bottom center;
  transition: transform 72ms linear;
  will-change: transform;
}

.chord__symbol {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: grid;
  place-items: center;
  padding-inline: calc(var(--chord-block-size) * .16);
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: clamp(17px, calc(var(--chord-block-size) * .56), 30px);
  font-weight: 700;
  line-height: .92;
  letter-spacing: .01em;
  text-align: center;
  text-shadow: 0 1px 1px var(--ink);
  white-space: nowrap;
}

.chord__cluster-member {
  position: relative;
  display: inline-flex;
  --note-host-block-size: var(--chord-block-size);
}

.chord__cluster-member :deep(.note__surface::before) {
  content: "";
  position: absolute;
  z-index: 0;
  inset: 0;
  background: var(--ink);
  transform: scaleY(calc(1 - var(--chord-member-progress)));
  transform-origin: top center;
  transition: transform 72ms linear;
  will-change: transform;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .chord__fused-progress,
  .chord__cluster-member :deep(.note__surface::before) {
    transition: none;
  }
}

@media (forced-colors: active) {
  .chord__fused {
    border: 1px solid CanvasText;
    box-shadow: none;
  }

  .chord__fused-member {
    background: Canvas;
  }

  .chord__fused-progress {
    background: Highlight;
  }

  .chord__symbol {
    color: CanvasText;
    text-shadow: none;
  }
}
</style>
