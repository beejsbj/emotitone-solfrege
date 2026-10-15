<template>
  <component :is="embedded ? 'span' : 'div'" :class="stripClasses" :aria-label="ariaLabel" role="group">
    <span v-if="showChevron" class="code-strip__chevron" aria-hidden="true">&lt;</span>
    <span class="code-strip__sequence">
      <template v-for="(token, tokenIndex) in tokens" :key="tokenKey(token, tokenIndex)">
        <span
          v-if="token.type === 'note'"
          class="code-strip__event code-strip__event--note"
          :data-code-strip-index="tokenIndex"
        >
          <span
            class="code-strip__event-line"
            :class="{ 'code-strip__event-line--bar': durationMode === 'bar' }"
          >
            <span class="code-strip__note" :style="progressStyle(token.progress)">
              <Note v-bind="noteProps(token)" />
            </span>
            <span v-if="token.accidental" class="code-strip__accidental">{{ token.accidental }}</span>
            <span
              v-if="durationMode === 'bar'"
              class="code-strip__duration-bar"
              :style="durationBarStyle(token.duration)"
              role="img"
              :aria-label="durationBarLabel(token.duration)"
            >
              <span
                v-for="markIndex in durationMarks(token.duration)"
                :key="markIndex"
                class="code-strip__duration-mark"
                :class="{
                  'code-strip__duration-mark--beat': isBeatBoundary(markIndex),
                  'code-strip__duration-mark--lit': isStemLit(token, markIndex),
                }"
                aria-hidden="true"
              ></span>
            </span>
            <span
              v-if="durationMode === 'bar' && holdBars(token.duration) > 0"
              class="code-strip__duration-hold"
              :class="{ 'code-strip__duration-hold--fades': holdBars(token.duration) > HOLD_MAX_BARS }"
              :style="holdStyle(token)"
              aria-hidden="true"
            >
              <span
                v-for="barIndex in holdBarlines(token.duration)"
                :key="barIndex"
                class="code-strip__duration-hold-bar"
                :class="{ 'code-strip__duration-hold-bar--lit': isHoldBarLit(token, barIndex) }"
                :style="{ '--code-strip-hold-at': barIndex }"
              ></span>
            </span>
          </span>
          <span v-if="durationMode === 'stacked' && token.duration" class="code-strip__stack-duration">
            {{ token.duration }}
          </span>
        </span>

        <span
          v-else-if="token.type === 'chord'"
          class="code-strip__event code-strip__event--chord"
          :data-code-strip-index="tokenIndex"
        >
          <span
            class="code-strip__event-line"
            :class="{ 'code-strip__event-line--bar': durationMode === 'bar' }"
          >
            <Chord
              :members="chordMembers(token)"
              :display="token.display ?? 'symbol'"
              :symbol="token.symbol"
              proportion="compact"
              :geometry="token.geometry ?? 'offcut'"
              :accessible-name="token.accessibleName"
            />
            <span
              v-if="durationMode === 'bar'"
              class="code-strip__duration-bar"
              :style="durationBarStyle(token.duration)"
              role="img"
              :aria-label="durationBarLabel(token.duration)"
            >
              <span
                v-for="markIndex in durationMarks(token.duration)"
                :key="markIndex"
                class="code-strip__duration-mark"
                :class="{
                  'code-strip__duration-mark--beat': isBeatBoundary(markIndex),
                  'code-strip__duration-mark--lit': isStemLit(token, markIndex),
                }"
                aria-hidden="true"
              ></span>
            </span>
            <span
              v-if="durationMode === 'bar' && holdBars(token.duration) > 0"
              class="code-strip__duration-hold"
              :class="{ 'code-strip__duration-hold--fades': holdBars(token.duration) > HOLD_MAX_BARS }"
              :style="holdStyle(token)"
              aria-hidden="true"
            >
              <span
                v-for="barIndex in holdBarlines(token.duration)"
                :key="barIndex"
                class="code-strip__duration-hold-bar"
                :class="{ 'code-strip__duration-hold-bar--lit': isHoldBarLit(token, barIndex) }"
                :style="{ '--code-strip-hold-at': barIndex }"
              ></span>
            </span>
          </span>
          <span v-if="durationMode === 'stacked' && token.duration" class="code-strip__stack-duration">
            {{ token.duration }}
          </span>
        </span>

        <span
          v-else-if="token.type === 'rest'"
          class="code-strip__event code-strip__event--rest"
          :data-code-strip-index="tokenIndex"
        >
          <span
            class="code-strip__event-line"
            :class="{ 'code-strip__event-line--bar': durationMode === 'bar' }"
          >
            <span class="code-strip__rest" :style="progressStyle(token.progress)" role="img" aria-label="Rest">
              <span class="code-strip__rest-fill" aria-hidden="true"></span>
              <span class="code-strip__rest-mark" aria-hidden="true">~</span>
            </span>
            <span
              v-if="durationMode === 'bar'"
              class="code-strip__duration-bar"
              :style="durationBarStyle(token.duration)"
              role="img"
              :aria-label="durationBarLabel(token.duration)"
            >
              <span
                v-for="markIndex in durationMarks(token.duration)"
                :key="markIndex"
                class="code-strip__duration-mark"
                :class="{
                  'code-strip__duration-mark--beat': isBeatBoundary(markIndex),
                  'code-strip__duration-mark--lit': isStemLit(token, markIndex),
                }"
                aria-hidden="true"
              ></span>
            </span>
            <span
              v-if="durationMode === 'bar' && holdBars(token.duration) > 0"
              class="code-strip__duration-hold"
              :class="{ 'code-strip__duration-hold--fades': holdBars(token.duration) > HOLD_MAX_BARS }"
              :style="holdStyle(token)"
              aria-hidden="true"
            >
              <span
                v-for="barIndex in holdBarlines(token.duration)"
                :key="barIndex"
                class="code-strip__duration-hold-bar"
                :class="{ 'code-strip__duration-hold-bar--lit': isHoldBarLit(token, barIndex) }"
                :style="{ '--code-strip-hold-at': barIndex }"
              ></span>
            </span>
          </span>
        </span>

        <span v-else-if="token.type === 'bracket'" class="code-strip__bracket">{{ token.text }}</span>
        <span v-else class="code-strip__separator">{{ token.text ?? ',' }}</span>
      </template>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, provide } from "vue";
import Chord from "@/components/compounds/Chord.vue";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import Note from "@/components/primatives/Note.vue";
import type { NoteLabel } from "@/components/primatives/Note.vue";
import {
  noteColorResolverKey,
  type NoteColorResolver,
} from "@/components/primatives/noteColorContext";
import type {
  CodeStripChordToken,
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripNote,
  CodeStripNoteToken,
  CodeStripToken,
} from "./types";

const props = withDefaults(
  defineProps<{
    tokens: CodeStripToken[];
    density?: CodeStripDensity;
    durationMode?: CodeStripDurationMode;
    timeSignature?: string;
    wrapped?: boolean;
    scrollable?: boolean;
    showChevron?: boolean;
    ariaLabel?: string;
    embedded?: boolean;
    colorResolver?: NoteColorResolver;
  }>(),
  {
    density: "default",
    durationMode: "bar",
    timeSignature: "4/4",
    wrapped: false,
    scrollable: false,
    showChevron: true,
    ariaLabel: "Pattern notation",
    embedded: false,
  },
);

if (props.colorResolver) {
  provide(noteColorResolverKey, props.colorResolver);
}

const stripClasses = computed(() => [
  "code-strip-sequence",
  `code-strip-sequence--${props.density}`,
  `code-strip-sequence--duration-${props.durationMode}`,
  { "code-strip-sequence--wrapped": props.wrapped },
  { "code-strip-sequence--scrollable": props.scrollable },
  { "code-strip-sequence--embedded": props.embedded },
]);

const clampProgress = (progress: number | undefined) => {
  if (typeof progress !== "number" || !Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
};

const durationAmount = (duration: string | undefined) => {
  if (duration == null || duration === "") return 1;
  const amount = Number.parseFloat(duration.replace(/^@/, ""));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

const progressStyle = (progress: number | undefined) => ({
  "--code-strip-progress": clampProgress(progress),
});

const durationBarStyle = (duration: string | undefined) => ({
  "--code-strip-duration-ratio": Math.min(1, durationAmount(duration)),
});

/** At most two decimals: a recorded length is a measurement, not a spec. */
const formatDurationAmount = (amount: number) => Number(amount.toFixed(2)).toString();

const durationBarLabel = (duration: string | undefined) => {
  const amount = durationAmount(duration);
  return `Duration proportion: ${formatDurationAmount(amount)}`;
};

/**
 * Past one bar, an event holds: a rail runs on after its stems, one short
 * step per further bar, with a barline at each whole bar. The steps are a
 * quarter of a bar's stems, so a long note reads long without crowding the
 * line, and the rail stops growing at HOLD_MAX_BARS; anything longer fades out
 * at its end instead of growing further.
 */
const HOLD_MAX_BARS = 4;

const holdBars = (duration: string | undefined) => Math.max(0, durationAmount(duration) - 1);

const holdBarlines = (duration: string | undefined) =>
  Math.min(HOLD_MAX_BARS, Math.floor(holdBars(duration) + 1e-6));

/** Bars of the hold already passed, from 0 to its full length. */
const holdPassed = (token: CodeStripToken) => {
  const hold = holdBars("duration" in token ? token.duration : undefined);
  if (hold <= 0) return 0;
  return Math.min(hold, Math.max(0, eventProgress(token) * (hold + 1) - 1));
};

const holdStyle = (token: CodeStripToken) => {
  const shown = Math.min(HOLD_MAX_BARS, holdBars("duration" in token ? token.duration : undefined));
  return {
    "--code-strip-hold-bars": shown,
    // The rail is real time: past its end, a longer hold waits there fully lit.
    "--code-strip-hold-progress": shown > 0 ? Math.min(1, holdPassed(token) / shown) : 0,
  };
};

/** A hold's barline lights as playback crosses its bar. */
const isHoldBarLit = (token: CodeStripToken, barIndex: number) =>
  holdPassed(token) >= barIndex - 1e-6;

const meter = computed(() => {
  const [rawNumerator, rawDenominator] = props.timeSignature.split("/").map(Number);
  const numerator = Number.isFinite(rawNumerator) && rawNumerator > 0 ? rawNumerator : 4;
  const denominator = Number.isFinite(rawDenominator) && rawDenominator > 0 ? rawDenominator : 4;
  const marksPerBeat = Math.max(1, Math.round(16 / denominator));

  return {
    marksPerBeat,
    marksPerBar: Math.max(1, numerator * marksPerBeat),
  };
});

const durationMarks = (duration: string | undefined) => {
  const amount = Math.min(1, durationAmount(duration));
  return amount > 0 ? Math.max(1, Math.round(amount * meter.value.marksPerBar)) : 0;
};

/** A chord's time passes with its members; notes and rests carry their own. */
const eventProgress = (token: CodeStripToken) => {
  if (token.type !== "chord") return clampProgress("progress" in token ? token.progress : undefined);
  const members = chordMembers(token);
  if (!members.length) return clampProgress(token.progress);
  return members.reduce((sum, member) => sum + clampProgress(member.progress), 0) / members.length;
};

/**
 * Each stem is one segment of the event's time. It lights the moment playback
 * enters that segment; the Note itself carries the continuous fill.
 */
const isStemLit = (token: CodeStripToken, markIndex: number) => {
  // An omitted duration is the implicit base 1, not "no stems".
  const duration = token.type === "note" || token.type === "chord" || token.type === "rest"
    ? token.duration
    : undefined;
  const segments = token.type === "note" || token.type === "chord" || token.type === "rest"
    ? durationMarks(duration)
    : 0;
  // Past one bar the stems are the first bar only; the hold carries the rest.
  const bars = Math.max(1, durationAmount(duration));
  return eventProgress(token) * bars * segments > markIndex - 1;
};

const isBeatBoundary = (markIndex: number) =>
  (markIndex - 1) % meter.value.marksPerBeat === 0;

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
    pitchClassIndex: token.pitchClassIndex,
    octave: token.octave ?? 4,
    mode: token.mode,
    musicKey: token.musicKey,
    surfaceStyle: token.surfaceStyle,
    accidental: token.isAccidental,
    keyBrightness: token.keyBrightness,
    keySaturation: token.keySaturation,
    sounding: token.lit,
  };
};

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
</script>

<style scoped>
.code-strip-sequence {
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
  align-items: center;
  gap: 2px;
}

.code-strip__event-line--bar {
  gap: 4px;
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
  /* Live playback sets progress every frame (fill duration 0ms); any other
     change is a press. */
  transition: transform var(--code-strip-fill-duration, var(--dur-press)) linear;
  will-change: transform;
}

.code-strip__event-line :deep(.chord__fused-progress) {
  transition-duration: var(--code-strip-fill-duration, var(--dur-press));
}

.code-strip__event-line :deep(.chord__cluster-member .note__surface::before) {
  transition-duration: var(--code-strip-fill-duration, var(--dur-press));
}

/* Stave: a rest is a slim empty slot in the staff, drawn in outline, that
   fills with Ivory as it passes. */
.code-strip__rest {
  --code-strip-rest-inline-size: calc(var(--note-host-block-size) * .28);
  position: relative;
  display: inline-grid;
  width: var(--code-strip-rest-inline-size);
  height: var(--note-host-block-size);
  overflow: hidden;
  place-items: center;
  isolation: isolate;
  background: var(--ink-2);
  box-shadow: inset 0 0 0 1px var(--ivory-4);
}

.code-strip__rest-fill {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  background: var(--ivory);
  transform: scaleY(var(--code-strip-progress));
  transform-origin: bottom center;
  transition: transform var(--code-strip-fill-duration, var(--dur-press)) linear;
  will-change: transform;
}

.code-strip__rest-mark {
  display: none;
  position: relative;
  z-index: 2;
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: calc(var(--note-host-block-size) * .54);
  font-weight: 700;
  line-height: 1;
  mix-blend-mode: difference;
}

.code-strip__accidental {
  color: var(--ivory-3);
  font-size: 9px;
  letter-spacing: .025em;
  line-height: 1;
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

.code-strip__duration-bar {
  --code-strip-bar-cycle-span: calc(var(--note-host-block-size) * 2.4);
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(1px, 1fr);
  align-items: center;
  column-gap: 3px;
  flex: 0 0 auto;
  width: max(5px, calc(var(--code-strip-duration-ratio) * var(--code-strip-bar-cycle-span)));
  min-height: 5px;
}

/* Stave stems: one per segment of the event's time, taller on the beat,
   lighting Ivory the moment playback enters their segment. */
.code-strip__duration-mark {
  justify-self: center;
  width: 2px;
  height: 9px;
  background: var(--ink-5);
}

.code-strip__duration-mark--lit {
  background: var(--ivory);
}

.code-strip__duration-mark--beat {
  height: 15px;
}

/* Hold: past one bar, a rail runs on from the stems, a quarter of a bar's
   stems per further bar, with a beat-height barline at each whole bar. It
   lights from the left as the held time passes. */
.code-strip__duration-hold {
  --code-strip-hold-step: calc(var(--note-host-block-size) * .6);
  position: relative;
  flex: 0 0 auto;
  width: max(4px, calc(var(--code-strip-hold-bars) * var(--code-strip-hold-step)));
  height: 15px;
  margin-inline-start: -1px;
  background:
    linear-gradient(var(--ivory), var(--ivory)) left center / calc(var(--code-strip-hold-progress) * 100%) 2px no-repeat,
    linear-gradient(var(--ink-5), var(--ink-5)) left center / 100% 2px no-repeat;
}

/* Longer than the rail can show: its end fades instead of growing. */
.code-strip__duration-hold--fades {
  mask-image: linear-gradient(to right, var(--ink) calc(100% - var(--code-strip-hold-step)), transparent);
}

.code-strip__duration-hold-bar {
  position: absolute;
  inset-block: 0;
  left: calc(var(--code-strip-hold-at) * var(--code-strip-hold-step) - 1px);
  width: 2px;
  background: var(--ink-5);
}

.code-strip__duration-hold-bar--lit {
  background: var(--ivory);
}

/* Stave: brackets survive as barlines; separators recede into the staff. */
.code-strip__bracket {
  display: inline-block;
  inline-size: 2px;
  block-size: var(--note-host-block-size);
  overflow: hidden;
  background: var(--ivory-2);
  color: transparent;
  font-size: 0;
}

.code-strip__separator {
  visibility: hidden;
  font-size: 10px;
}

.code-strip-sequence--wrapped .code-strip__sequence {
  flex-wrap: wrap;
  row-gap: 5px;
}

.code-strip-sequence--scrollable .code-strip__sequence {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.code-strip-sequence--scrollable .code-strip__sequence::-webkit-scrollbar {
  display: none;
}

.code-strip-sequence--dense {
  --note-host-block-size: clamp(24px, 7cqi, 29px);
  min-height: 42px;
  padding-block: 5px;
}

.code-strip-sequence--dense .code-strip__sequence {
  gap: 3px;
}

.code-strip-sequence--spaced {
  min-height: 54px;
  padding-block: 10px;
}

.code-strip-sequence--spaced .code-strip__sequence {
  gap: 10px;
}

.code-strip-sequence--embedded {
  display: inline-flex;
  flex: 0 0 auto;
  width: max-content;
  min-height: 0;
  overflow: visible;
  border: 0;
  background: transparent;
  padding: 0;
  container-type: normal;
}

.code-strip-sequence--embedded .code-strip__sequence {
  flex: 0 0 auto;
  width: max-content;
  overflow: visible;
}

@media (prefers-reduced-motion: reduce) {
  .code-strip__note :deep(.note__surface::before),
  .code-strip__event-line :deep(.chord__fused-progress),
  .code-strip__event-line :deep(.chord__cluster-member .note__surface::before),
  .code-strip__rest-fill {
    transition: none;
  }
}

@media (forced-colors: active) {
  .code-strip__duration-mark {
    background: GrayText;
    forced-color-adjust: none;
  }

  .code-strip__duration-mark--lit { background: CanvasText; }

  .code-strip__duration-hold {
    background: linear-gradient(GrayText, GrayText) left center / 100% 2px no-repeat;
    forced-color-adjust: none;
  }

  .code-strip__duration-hold-bar { background: GrayText; forced-color-adjust: none; }
  .code-strip__duration-hold-bar--lit { background: CanvasText; }

  .code-strip__bracket { background: CanvasText; }
  .code-strip__rest { border: 1px solid CanvasText; }
}
</style>
