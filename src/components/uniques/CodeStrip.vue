<template>
  <div :class="stripClasses" :aria-label="ariaLabel" role="group">
    <span v-if="showChevron" class="code-strip__chevron" aria-hidden="true">&lt;</span>
    <div class="code-strip__sequence">
      <template v-for="(token, tokenIndex) in tokens" :key="tokenKey(token, tokenIndex)">
        <span
          v-if="token.type === 'note'"
          class="code-strip__event code-strip__event--note"
          :style="eventStyle(token)"
        >
          <span class="code-strip__event-line">
            <span class="code-strip__note" :style="progressStyle(token.progress)">
              <Note v-bind="noteProps(token)" />
            </span>
            <span v-if="token.accidental" class="code-strip__accidental">{{ token.accidental }}</span>
            <span v-if="durationMode === 'inline' && token.duration" class="code-strip__duration">
              {{ token.duration }}
            </span>
            <span v-if="durationMode === 'bar' && token.duration" class="code-strip__duration-bar"></span>
          </span>
          <span v-if="durationMode === 'stacked' && token.duration" class="code-strip__stack-duration">
            {{ token.duration }}
          </span>
        </span>

        <span
          v-else-if="token.type === 'chord'"
          class="code-strip__event code-strip__event--chord"
          :style="eventStyle(token)"
        >
          <span class="code-strip__event-line">
            <Chord
              :members="chordMembers(token)"
              :display="token.display ?? 'symbol'"
              :symbol="token.symbol"
              proportion="compact"
              :geometry="token.geometry ?? 'offcut'"
              :accessible-name="token.accessibleName"
            />
            <span v-if="durationMode === 'inline' && token.duration" class="code-strip__duration">
              {{ token.duration }}
            </span>
            <span v-if="durationMode === 'bar' && token.duration" class="code-strip__duration-bar"></span>
          </span>
          <span v-if="durationMode === 'stacked' && token.duration" class="code-strip__stack-duration">
            {{ token.duration }}
          </span>
        </span>

        <span
          v-else-if="token.type === 'rest'"
          class="code-strip__event code-strip__event--rest"
          :style="eventStyle(token)"
        >
          <span class="code-strip__rest" :style="progressStyle(token.progress)" role="img" aria-label="Rest">
            <span class="code-strip__rest-fill" aria-hidden="true"></span>
            <span class="code-strip__rest-mark" aria-hidden="true">~</span>
          </span>
        </span>

        <span v-else-if="token.type === 'bracket'" class="code-strip__bracket">{{ token.text }}</span>
        <span v-else class="code-strip__separator">{{ token.text ?? ',' }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Chord from "@/components/compounds/Chord.vue";
import type { ChordDisplay, ChordMember } from "@/components/compounds/Chord.vue";
import Note from "@/components/primatives/Note.vue";
import type { NoteGeometry, NoteLabel } from "@/components/primatives/Note.vue";

export type CodeStripNote = "do" | "re" | "mi" | "fa" | "sol" | "la" | "ti";
export type CodeStripGlyph = "syl" | "deg" | "raw";
export type CodeStripDensity = "dense" | "default" | "spaced";
export type CodeStripDurationMode = "inline" | "stacked" | "distance" | "bar" | "hidden";

export interface CodeStripNoteToken {
  type: "note";
  note: CodeStripNote;
  text: string;
  glyph?: CodeStripGlyph;
  lit?: boolean;
  accidental?: string;
  duration?: string;
  progress?: number;
  syllable?: string;
  degree?: string;
  rawPitch?: string;
  scaleIndex?: number;
  octave?: number;
}

export interface CodeStripChordToken {
  type: "chord";
  symbol: string;
  members: ChordMember[];
  display?: ChordDisplay;
  geometry?: NoteGeometry;
  duration?: string;
  progress?: number;
  accessibleName?: string;
}

export type CodeStripToken =
  | CodeStripNoteToken
  | CodeStripChordToken
  | { type: "rest"; duration?: string; progress?: number }
  | { type: "bracket"; text: "{" | "}" }
  | { type: "separator"; text?: "," | "/" };

const props = withDefaults(
  defineProps<{
    tokens: CodeStripToken[];
    density?: CodeStripDensity;
    durationMode?: CodeStripDurationMode;
    wrapped?: boolean;
    showChevron?: boolean;
    ariaLabel?: string;
  }>(),
  {
    density: "default",
    durationMode: "inline",
    wrapped: false,
    showChevron: true,
    ariaLabel: "Pattern notation",
  },
);

const stripClasses = computed(() => [
  "code-strip",
  `code-strip--${props.density}`,
  `code-strip--duration-${props.durationMode}`,
  { "code-strip--wrapped": props.wrapped },
]);

const clampProgress = (progress: number | undefined) => {
  if (typeof progress !== "number" || !Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
};

const durationAmount = (duration: string | undefined) => {
  const amount = Number.parseFloat((duration ?? "").replace(/^@/, ""));
  return Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0;
};

const progressStyle = (progress: number | undefined) => ({
  "--code-strip-progress": clampProgress(progress),
});

const eventStyle = (token: CodeStripNoteToken | CodeStripChordToken | Extract<CodeStripToken, { type: "rest" }>) => ({
  "--code-strip-duration": durationAmount(token.duration),
});

const chordMembers = (token: CodeStripChordToken) =>
  token.members.map((member) => ({
    ...member,
    progress: member.progress ?? token.progress ?? 0,
  }));

const tokenKey = (token: CodeStripToken, index: number) =>
  token.type === "chord" ? `chord-${token.symbol}-${index}` : `${token.type}-${index}`;

const noteOrder: CodeStripNote[] = ["do", "re", "mi", "fa", "sol", "la", "ti"];
const noteProps = (token: CodeStripNoteToken) => {
  const glyph = token.glyph ?? "syl";
  const primary: NoteLabel = glyph === "deg" ? "degree" : glyph === "raw" ? "raw" : "syllable";
  return {
    proportion: "glyph" as const,
    primary,
    visibleLabels: [primary],
    syllable: token.syllable ?? (primary === "syllable" ? token.text : titleCase(token.note)),
    degree: token.degree ?? (primary === "degree" ? token.text : String(noteOrder.indexOf(token.note) + 1)),
    rawPitch: token.rawPitch ?? (primary === "raw" ? token.text : ""),
    scaleIndex: token.scaleIndex ?? noteOrder.indexOf(token.note),
    octave: token.octave ?? 4,
    sounding: token.lit,
  };
};

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
</script>

<style scoped>
.code-strip {
  --note-host-block-size: clamp(27.2px, 8cqi, 33.6px);
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  overflow: hidden;
  border: 1px solid var(--hairline);
  background: var(--ink-2);
  padding: 7px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  container-type: inline-size;
}

.code-strip__chevron {
  flex: 0 0 auto;
  color: var(--ivory-4);
  font-size: 11px;
}

.code-strip__sequence {
  display: flex;
  align-items: center;
  flex: 1;
  flex-wrap: nowrap;
  gap: 5px;
  min-width: 0;
  overflow-x: hidden;
}

.code-strip__event {
  display: inline-flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.code-strip__event-line {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
}

.code-strip__note {
  position: relative;
  display: inline-flex;
}

.code-strip__note :deep(.note__surface::before) {
  content: "";
  position: absolute;
  z-index: 0;
  inset: 0;
  background: var(--ink);
  transform: scaleY(calc(1 - var(--code-strip-progress)));
  transform-origin: top center;
  transition: transform 72ms linear;
  will-change: transform;
}

.code-strip__rest {
  --code-strip-rest-inline-size: calc(var(--note-host-block-size) * .75);
  position: relative;
  display: inline-grid;
  width: var(--code-strip-rest-inline-size);
  height: var(--note-host-block-size);
  overflow: hidden;
  place-items: center;
  isolation: isolate;
  background: var(--ink);
  box-shadow: var(--shadow-key);
  clip-path: var(--clip-offcut);
}

.code-strip__rest::after {
  content: "";
  position: absolute;
  z-index: 3;
  inset: 0;
  background: var(--paper-surface-sheen-monochrome);
  mix-blend-mode: overlay;
  pointer-events: none;
}

.code-strip__rest-fill {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  background: var(--ivory);
  transform: scaleY(var(--code-strip-progress));
  transform-origin: bottom center;
  transition: transform 72ms linear;
  will-change: transform;
}

.code-strip__rest-mark {
  position: relative;
  z-index: 2;
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: calc(var(--note-host-block-size) * .54);
  font-weight: 700;
  line-height: 1;
  mix-blend-mode: difference;
}

.code-strip__duration,
.code-strip__accidental {
  color: var(--ivory-3);
  font-size: 9px;
  letter-spacing: .025em;
  line-height: 1;
}

.code-strip__duration-bar {
  width: calc(6px + (var(--code-strip-duration) * 34px));
  height: 3px;
  margin-bottom: 2px;
  background: var(--ivory-3);
  opacity: .7;
}

.code-strip__stack-duration {
  min-width: 20px;
  border-top: 1px solid var(--hairline);
  padding-top: 2px;
  color: var(--ivory-3);
  font-size: 9px;
  line-height: 1;
  text-align: center;
}

.code-strip--duration-distance .code-strip__event {
  margin-inline-end: calc(2px + (var(--code-strip-duration) * 34px));
}

.code-strip__bracket {
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.code-strip__separator {
  color: var(--ivory-4);
  font-size: 10px;
}

.code-strip--wrapped .code-strip__sequence {
  flex-wrap: wrap;
  row-gap: 5px;
}

.code-strip--dense {
  --note-host-block-size: clamp(24px, 7cqi, 29px);
  min-height: 42px;
  padding-block: 5px;
}

.code-strip--dense .code-strip__sequence {
  gap: 3px;
}

.code-strip--spaced {
  min-height: 54px;
  padding-block: 10px;
}

.code-strip--spaced .code-strip__sequence {
  gap: 10px;
}

@media (prefers-reduced-motion: reduce) {
  .code-strip__note :deep(.note__surface::before),
  .code-strip__rest-fill {
    transition: none;
  }
}
</style>
