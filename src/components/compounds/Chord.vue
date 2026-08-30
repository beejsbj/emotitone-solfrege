<template>
  <span
    class="chord"
    :class="chordClasses"
    role="group"
    :aria-label="resolvedAccessibleName"
    :data-structure="structure"
    :data-identity="identity"
    :data-proportion="proportion"
  >
    <span v-if="structure === 'fused'" class="chord__fused" aria-hidden="true">
      <span
        v-for="(member, index) in resolvedMembers"
        :key="memberKey(member, index)"
        class="chord__fused-member"
        :style="member.style"
      >
        <span class="chord__fused-progress"></span>
        <span v-if="identity === 'members'" class="chord__member-label">
          {{ member.label }}
        </span>
      </span>
      <span v-if="identity === 'symbol'" class="chord__symbol">{{ symbol }}</span>
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
      <span v-if="identity === 'symbol'" class="chord__symbol chord__symbol--clustered">
        {{ symbol }}
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Note from "@/components/primatives/Note.vue";
import type {
  NoteLabel,
  NoteSurfaceStyle,
} from "@/components/primatives/Note.vue";
import { useColorSystem } from "@/composables/useColorSystem";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export type ChordStructure = "fused" | "clustered";
export type ChordIdentity = "symbol" | "members";
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
    members: ChordMember[];
    structure?: ChordStructure;
    identity?: ChordIdentity;
    symbol?: string;
    proportion?: ChordProportion;
    accessibleName?: string;
  }>(),
  {
    structure: "fused",
    identity: "members",
    symbol: "Chord",
    proportion: "balanced",
    accessibleName: undefined,
  },
);

const { getKeyBackground } = useColorSystem();

const chordClasses = computed(() => [
  `chord--${props.structure}`,
  `chord--identity-${props.identity}`,
  `chord--proportion-${props.proportion}`,
]);

const clampProgress = (progress: number | undefined) => {
  if (typeof progress !== "number" || !Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
};

const isAccidental = (member: ChordMember) =>
  typeof member.accidental === "boolean"
    ? member.accidental
    : /[#b♯♭]/.test(member.rawPitch ?? "");

const displayLabel = (member: ChordMember) => {
  const primary = member.primary ?? "syllable";
  if (primary === "degree") return member.degree ?? "";
  if (primary === "raw") return member.rawPitch ?? "";
  return member.syllable ?? "";
};

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
      label: displayLabel(source),
      style: {
        "--chord-member-surface": colors.background,
        "--chord-member-primary": colors.primaryColor,
        "--chord-member-progress": `${clampProgress(source.progress) * 100}%`,
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
    visibleLabels:
      props.identity === "members"
        ? (member.visibleLabels ?? [primary])
        : [],
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
  border-radius: var(--r-xs);
  box-shadow: var(--shadow-key), inset 0 0 0 1px var(--hairline);
}

.chord__fused-member {
  position: relative;
  display: grid;
  flex: 0 0 var(--chord-member-inline-size);
  place-items: center;
  width: var(--chord-member-inline-size);
  min-width: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--chord-member-surface) 42%, var(--ink));
}

.chord__fused-progress {
  position: absolute;
  z-index: 0;
  right: 0;
  bottom: 0;
  left: 0;
  height: var(--chord-member-progress);
  background: var(--chord-member-surface);
  transition: height 72ms linear;
}

.chord__member-label,
.chord__symbol {
  position: relative;
  z-index: 2;
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: calc(var(--chord-block-size) * .36);
  font-weight: 700;
  line-height: 1;
  letter-spacing: .02em;
  text-align: center;
  text-shadow: 0 1px 1px var(--ink);
  white-space: nowrap;
}

.chord__symbol {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding-inline: calc(var(--chord-block-size) * .18);
}

.chord__cluster-member {
  position: relative;
  display: inline-flex;
  --note-host-block-size: var(--chord-block-size);
}

.chord__cluster-member :deep(.note__surface) {
  background-image:
    linear-gradient(
      to top,
      color-mix(in srgb, var(--chord-member-primary) 72%, var(--ivory)),
      color-mix(in srgb, var(--chord-member-primary) 72%, var(--ivory))
    ),
    linear-gradient(var(--note-surface), var(--note-surface));
  background-position: bottom, center;
  background-repeat: no-repeat;
  background-size: 100% var(--chord-member-progress), 100% 100%;
  transition: background-size 72ms linear;
}

.chord__symbol--clustered {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .chord__fused-progress,
  .chord__cluster-member :deep(.note__surface) {
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

  .chord__member-label,
  .chord__symbol {
    color: CanvasText;
    text-shadow: none;
  }
}
</style>
