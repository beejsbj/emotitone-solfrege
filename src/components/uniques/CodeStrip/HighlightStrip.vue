<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { NoteColorResolver } from "@/components/primatives/noteColorContext";
import HighlightStripEvent from "./HighlightStripEvent.vue";
import { useNotationHighlight, useReducedMotion } from "./highlight";
import type { CodeStripViewport } from "./viewport";
import type {
  CodeStripChordToken,
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripNoteToken,
  CodeStripToken,
} from "./types";

type StripEvent = CodeStripNoteToken | CodeStripChordToken | Extract<CodeStripToken, { type: "rest" }>;

/**
 * The HighlightStrip: the app's own read-only view of the pattern code, read
 * as a Stave. Playing types the notation as you go; while the pattern plays,
 * each note lights from note events by its phrase note id and the strip
 * follows it. Nothing here edits or evaluates code.
 */
const props = withDefaults(
  defineProps<{
    tokens: CodeStripToken[];
    /** The pattern transport is playing: unplayed events read empty. */
    playing?: boolean;
    /** Light events from note events (production) instead of token progress. */
    listening?: boolean;
    density?: CodeStripDensity;
    durationMode?: CodeStripDurationMode;
    timeSignature?: string;
    showRests?: boolean;
    framed?: boolean;
    ariaLabel?: string;
    emptyLabel?: string;
    viewport?: CodeStripViewport;
    colorResolver?: NoteColorResolver;
    stillColorResolver?: NoteColorResolver;
    /** Changes when a note is typed: the strip follows the newest event. */
    followLatestKey?: unknown;
    /** Changes when a different phrase arrives: the strip returns to its start. */
    resetScrollKey?: unknown;
    /** Where note events arrive; the window by default. */
    noteEventTarget?: EventTarget;
  }>(),
  {
    playing: false,
    listening: false,
    density: "default",
    durationMode: "bar",
    timeSignature: "4/4",
    showRests: true,
    framed: true,
    ariaLabel: "Pattern code, read-only",
    emptyLabel: "// Record a pattern",
    viewport: undefined,
    colorResolver: undefined,
    stillColorResolver: undefined,
    followLatestKey: undefined,
    resetScrollKey: undefined,
    noteEventTarget: undefined,
  },
);

const FOLLOW_TIME_CONSTANT_MS = 150;
const PLAYBACK_FOLLOW_ANCHOR = 0.42;
const RECORDING_FOLLOW_ANCHOR = 0.75;

const scroller = ref<HTMLElement | null>(null);
const reducedMotion = useReducedMotion();

const events = computed(() => props.tokens.filter(isStripEvent));
const eventNoteIds = computed(() => events.value.map(noteIdsOf));
const isEmpty = computed(() => events.value.length === 0);

const highlight = useNotationHighlight({
  eventNoteIds: () => eventNoteIds.value,
  listening: () => props.listening && props.playing,
  target: () => props.noteEventTarget,
  onActivate: (index) => void nextTick(() => followEvent(index)),
});

// Controlled specimens light from their own token progress; without any, the
// whole phrase reads complete, as it does at rest.
const controlledProgress = computed(() =>
  !props.listening && events.value.some(hasTokenProgress));

const entries = computed(() => events.value.map((token, index) => {
  const ids = eventNoteIds.value[index];
  const hidden = token.type === "rest" && !props.showRests;
  const key = eventKey(token, index);
  if (props.listening) {
    if (!props.playing) return { token, key, hidden, progress: 1, memberProgress: allMembers(token, 1), active: false };
    const active = highlight.isActive(ids);
    if (token.type === "rest") {
      return { token, key, hidden, progress: highlight.restProgress(index), active: false };
    }
    if (token.type === "chord") {
      const members = token.members.map((member) => highlight.noteProgress(member.id));
      return {
        token, key, hidden, active,
        progress: members.reduce((sum, value) => sum + value, 0) / Math.max(1, members.length),
        memberProgress: members.join("|"),
        fillDurationMs: highlight.activeDurationMs(ids),
      };
    }
    return {
      token, key, hidden, active,
      progress: highlight.noteProgress(token.noteId),
      fillDurationMs: highlight.activeDurationMs(ids),
    };
  }

  if (!controlledProgress.value) return { token, key, hidden, progress: 1, memberProgress: allMembers(token, 1), active: false };
  if (token.type === "chord") {
    const members = token.members.map((member) => clamp(member.progress ?? token.progress ?? 0));
    return { token, key, hidden, active: false, progress: clamp(token.progress ?? 0), memberProgress: members.join("|") };
  }
  return { token, key, hidden, active: false, progress: clamp(token.progress ?? 0) };
}));

const hostClasses = computed(() => [
  "highlight-strip",
  `highlight-strip--${props.density}`,
  { "highlight-strip--unframed": !props.framed },
  { "highlight-strip--empty": isEmpty.value },
  { "highlight-strip--playing": props.playing },
]);

// ─── Follow ──────────────────────────────────────────────────────────────────
let followFrame: number | null = null;
let followTarget = 0;
let followLastFrameTime: number | null = null;

function allowsMotion() {
  return !reducedMotion.value && document.visibilityState !== "hidden";
}

function stopFollow() {
  if (followFrame !== null) cancelAnimationFrame(followFrame);
  followFrame = null;
  followLastFrameTime = null;
}

function scrollTo(target: number) {
  const element = scroller.value;
  if (!element) return;
  followTarget = Math.max(0, Math.min(element.scrollWidth - element.clientWidth, target));
  if (Math.abs(followTarget - element.scrollLeft) < 0.5) return;
  // Reduced Motion: arrive at once, without an animated scroll.
  if (!allowsMotion()) {
    stopFollow();
    element.scrollLeft = followTarget;
    return;
  }
  if (followFrame !== null) return;

  const step = (timestamp: number) => {
    followFrame = null;
    const current = scroller.value;
    if (!current) return;
    const delta = followTarget - current.scrollLeft;
    if (!allowsMotion() || Math.abs(delta) < 0.5) {
      current.scrollLeft = followTarget;
      followLastFrameTime = null;
      return;
    }
    const elapsed = followLastFrameTime === null
      ? 1000 / 60
      : Math.max(0, timestamp - followLastFrameTime);
    followLastFrameTime = timestamp;
    const previous = current.scrollLeft;
    current.scrollLeft += delta * (1 - Math.exp(-elapsed / FOLLOW_TIME_CONSTANT_MS));
    // A quantized or clamped scroll that cannot move finishes, so the follow
    // never keeps pulling a later manual scroll back to an old target.
    if (current.scrollLeft === previous) {
      current.scrollLeft = followTarget;
      followLastFrameTime = null;
      return;
    }
    followFrame = requestAnimationFrame(step);
  };

  followLastFrameTime = null;
  followFrame = requestAnimationFrame(step);
}

function eventElement(index: number) {
  return scroller.value?.querySelector<HTMLElement>(`[data-event-index="${index}"]`) ?? null;
}

function offsetWithin(element: HTMLElement) {
  const host = scroller.value!;
  const hostRect = host.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return { left: rect.left - hostRect.left + host.scrollLeft, width: rect.width };
}

function followEvent(index: number) {
  const element = eventElement(index);
  if (!element || !scroller.value) return;
  const { left, width } = offsetWithin(element);
  scrollTo(left + width / 2 - scroller.value.clientWidth * PLAYBACK_FOLLOW_ANCHOR);
}

function followLatest() {
  const element = eventElement(events.value.length - 1);
  if (!element || !scroller.value) return;
  const { left, width } = offsetWithin(element);
  scrollTo(left + width - scroller.value.clientWidth * RECORDING_FOLLOW_ANCHOR);
}

watch(() => props.followLatestKey, () => {
  if (props.playing) return;
  void nextTick(followLatest);
}, { flush: "post" });

watch(() => props.resetScrollKey, () => {
  stopFollow();
  void nextTick(() => {
    if (scroller.value) scroller.value.scrollLeft = 0;
  });
}, { flush: "post" });

watch(() => props.playing, (playing) => {
  if (!playing) stopFollow();
});

onBeforeUnmount(stopFollow);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isStripEvent(token: CodeStripToken): token is StripEvent {
  return token.type === "note" || token.type === "chord" || token.type === "rest";
}

function noteIdsOf(token: StripEvent): string[] {
  if (token.type === "note") return token.noteId ? [token.noteId] : [];
  if (token.type === "chord") return token.members.map((member) => member.id).filter(Boolean);
  return [];
}

function hasTokenProgress(token: StripEvent) {
  if (token.progress != null) return true;
  return token.type === "chord" && token.members.some((member) => member.progress != null);
}

function allMembers(token: StripEvent, progress: number) {
  return token.type === "chord" ? token.members.map(() => progress).join("|") : undefined;
}

function eventKey(token: StripEvent, index: number) {
  const ids = noteIdsOf(token);
  return ids.length ? `${token.type}:${ids.join(",")}` : `${token.type}:${index}`;
}

function clamp(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
</script>

<template>
  <div :class="hostClasses">
    <div
      ref="scroller"
      class="highlight-strip__scroller"
      role="group"
      :aria-label="ariaLabel"
      :tabindex="isEmpty ? undefined : 0"
    >
      <div class="highlight-strip__line">
        <span v-if="isEmpty" class="highlight-strip__empty">{{ emptyLabel }}</span>
        <HighlightStripEvent
          v-for="(entry, index) in entries"
          :key="entry.key"
          :token="entry.token"
          :index="index"
          :progress="entry.progress"
          :member-progress="entry.memberProgress"
          :active="entry.active"
          :fill-duration-ms="entry.fillDurationMs"
          :hidden="entry.hidden"
          :density="density"
          :duration-mode="durationMode"
          :time-signature="timeSignature"
          :viewport="viewport"
          :color-resolver="colorResolver"
          :still-color-resolver="stillColorResolver"
        />
      </div>
    </div>
    <slot name="actions" :empty="isEmpty" />
  </div>
</template>

<style scoped>
.highlight-strip {
  --strip-border: hsla(152, 100%, 50%, 0.16);
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--strip-border);
  background: var(--ink-2);
  color: var(--ivory);
  container-type: inline-size;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.highlight-strip--playing {
  border-color: hsla(152, 100%, 50%, 0.24);
  box-shadow: 0 0 14px hsla(152, 100%, 50%, 0.04);
}

.highlight-strip--unframed {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.highlight-strip__scroller {
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.15;
  scrollbar-width: none;
}

.highlight-strip__scroller::-webkit-scrollbar {
  display: none;
}

.highlight-strip__scroller:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: -2px;
}

.highlight-strip__line {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: max-content;
  min-width: 100%;
  padding: 7px 10px;
  white-space: pre;
}

.highlight-strip--dense .highlight-strip__line {
  padding: 0;
}

.highlight-strip--spaced .highlight-strip__line {
  padding-block: 10px;
}

.highlight-strip--unframed .highlight-strip__line {
  min-height: 40px;
}

/* Stave: one hairline staff runs through the line the events sit on. */
.highlight-strip:not(.highlight-strip--empty) .highlight-strip__line {
  background: linear-gradient(transparent calc(50% - 1px), var(--ivory-4) calc(50% - 1px) calc(50% + 1px), transparent 0);
}

.highlight-strip--dense :deep(.highlight-strip-event:not(.highlight-strip-event--hidden)) {
  margin-inline: 1.5px;
}

.highlight-strip--spaced :deep(.highlight-strip-event:not(.highlight-strip-event--hidden)) {
  margin-inline: 5px;
}

.highlight-strip__empty {
  flex: 1 1 auto;
  padding-inline: 6px;
  color: var(--ivory-2);
  font-size: 11px;
  letter-spacing: .02em;
  opacity: .68;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .highlight-strip {
    transition: none;
  }
}

@media (forced-colors: active) {
  .highlight-strip:not(.highlight-strip--empty) .highlight-strip__line {
    background: none;
  }
}
</style>
