<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ExternalLink } from "lucide-vue-next";
import Button from "@/components/primatives/Button.vue";
import type { HeardClock } from "@/services/heardClock";
import { strudelUrl } from "@/services/strudelLink";
import type { NoteColorResolver } from "@/components/primatives/noteColorContext";
import HighlightStripEvent from "./HighlightStripEvent.vue";
import { useNotationHighlight, useReducedMotion } from "./highlight";
import { useEventWindow, WINDOW_MIN_EVENTS } from "./eventWindow";
import { eventName } from "./eventName";
import type { CodeStripViewport } from "./viewport";
import type {
  CodeStripChordToken,
  CodeStripDensity,
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
    /** The code the strip shows, handed to strudel.cc by Open in Strudel. */
    code?: string;
    /** The pattern transport is playing: unplayed events read empty. */
    playing?: boolean;
    /** Light events from note events (production) instead of token progress. */
    listening?: boolean;
    density?: CodeStripDensity;
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
    /** Milliseconds per notation unit (`@1`) at the playing tempo. */
    unitMs?: number;
    /** The clock of what is heard: the highlight stands still while it does. */
    clock?: HeardClock;
    /** Light only this transport member's notes (the Looper's desk pattern). */
    memberId?: string;
  }>(),
  {
    code: undefined,
    playing: false,
    listening: false,
    density: "default",
    timeSignature: "4/4",
    showRests: true,
    framed: true,
    ariaLabel: "Pattern code, read-only",
    emptyLabel: "// Record a pattern",
    viewport: undefined,
    colorResolver: undefined,
    stillColorResolver: undefined,
    noteEventTarget: undefined,
    unitMs: undefined,
    clock: undefined,
    memberId: undefined,
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
const openHref = computed(() =>
  !isEmpty.value && props.code?.trim() ? strudelUrl(props.code) : undefined);

/** Hand the code to strudel.cc in a new tab that cannot reach back to this one. */
function openInStrudel() {
  if (openHref.value) window.open(openHref.value, "_blank", "noopener,noreferrer");
}

const eventUnits = computed(() => events.value.map((token) => durationUnits(token.duration)));

const highlight = useNotationHighlight({
  eventNoteIds: () => eventNoteIds.value,
  eventUnits: () => eventUnits.value,
  unitMs: () => props.unitMs,
  listening: () => props.listening && props.playing,
  memberId: () => props.memberId,
  still: () => reducedMotion.value,
  target: () => props.noteEventTarget,
  // Fixed at mount: the owner gives one clock for the strip's whole life.
  clock: props.clock,
  onActivate: (index) => {
    eventWindow.pin(index);
    void nextTick(() => followEvent(index));
  },
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
    if (!props.playing) {
      const { progress, memberProgress } = atRest(token);
      return { token, key, hidden, progress, memberProgress, active: false };
    }
    // Each event reads its own state from the highlight, so a frame of
    // playback re-renders only what is sounding, not the whole line.
    return { token, key, hidden, ids, progress: 0, active: false, source: highlight.source };
  }

  if (!controlledProgress.value) {
    const { progress, memberProgress } = atRest(token);
    return { token, key, hidden, progress, memberProgress, active: false };
  }
  if (token.type === "chord") {
    const members = token.members.map((member) => clamp(member.progress ?? token.progress ?? 0));
    return { token, key, hidden, active: false, progress: clamp(token.progress ?? 0), memberProgress: members.join("|") };
  }
  return { token, key, hidden, active: false, progress: clamp(token.progress ?? 0) };
}));

// ─── Window ──────────────────────────────────────────────────────────────────
// A long take mounts only the events in and near view (and the one sounding or
// just typed); gaps of their widths stand in for the rest.
const windowed = computed(() => events.value.length > WINDOW_MIN_EVENTS);
const eventShapes = computed(() => events.value.map(shapeOf));
const eventKeys = computed(() => entries.value.map((entry, index) => `${entry.key}|${eventShapes.value[index]}`));
const eventHidden = computed(() => entries.value.map((entry) => entry.hidden));
// A windowed line mounts only part of the phrase, so the whole phrase is
// read to assistive technology from a plain list instead.
const phraseNames = computed(() => windowed.value
  ? entries.value.filter((entry) => !entry.hidden).map((entry) => eventName(entry.token))
  : []);
const eventWindow = useEventWindow({
  scroller,
  keys: () => eventKeys.value,
  shapes: () => eventShapes.value,
  hidden: () => eventHidden.value,
  enabled: () => windowed.value,
  layoutKey: () => `${props.density}|${props.timeSignature}`,
  onShift: (delta) => { followTarget += delta; },
});

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

watch(() => props.followLatestKey, (key) => {
  // A cleared key is a phrase switch, not a typed note.
  if (key == null || props.playing) return;
  eventWindow.pin(events.value.length - 1);
  void nextTick(followLatest);
}, { flush: "post" });

watch(() => props.resetScrollKey, () => {
  stopFollow();
  eventWindow.pin(null);
  void nextTick(() => {
    // A follow queued in the same flush must not carry the new phrase away.
    stopFollow();
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
  if (token.type === "chord") {
    return token.members.map((member) => member.id).filter((id): id is string => Boolean(id));
  }
  return [];
}

function hasTokenProgress(token: StripEvent) {
  if (token.progress != null) return true;
  return token.type === "chord" && token.members.some((member) => member.progress != null);
}

/**
 * Stopped, the line reads complete: every note full and lit. A rest stays an
 * empty slot, so silence never reads as a note; it fills only as it passes.
 */
function atRest(token: StripEvent) {
  const progress = token.type === "rest" ? 0 : 1;
  return { progress, memberProgress: allMembers(token, progress) };
}

function allMembers(token: StripEvent, progress: number) {
  return token.type === "chord" ? token.members.map(() => progress).join("|") : undefined;
}

/** Everything about an event that sets its width. */
function shapeOf(token: StripEvent) {
  const members = token.type === "chord" ? token.members.length : 0;
  const accidental = token.type === "note" ? token.accidental ?? "" : "";
  const text = token.type === "note" ? token.text : token.type === "chord" ? token.symbol : "";
  return `${token.type}|${token.duration ?? ""}|${members}|${accidental}|${text}`;
}

function eventKey(token: StripEvent, index: number) {
  const ids = noteIdsOf(token);
  return ids.length ? `${token.type}:${ids.join(",")}` : `${token.type}:${index}`;
}

/** An event's length in notation units: `@0.25` is 0.25; none is the base 1. */
function durationUnits(duration: string | undefined) {
  if (duration == null || duration === "") return 1;
  const amount = Number.parseFloat(duration.replace(/^@/, ""));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
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
      @scroll.passive="eventWindow.onScroll"
    >
      <ol v-if="windowed" class="highlight-strip__phrase">
        <li v-for="(name, index) in phraseNames" :key="index">{{ name }}</li>
      </ol>
      <div class="highlight-strip__line" :aria-hidden="windowed || undefined">
        <span v-if="isEmpty" class="highlight-strip__empty">{{ emptyLabel }}</span>
        <template v-for="item in eventWindow.items.value" :key="item.kind === 'gap' ? item.key : entries[item.index].key">
          <span
            v-if="item.kind === 'gap'"
            class="highlight-strip__gap"
            :style="{ width: `${item.width}px` }"
            aria-hidden="true"
          ></span>
          <HighlightStripEvent
            v-else
            :token="entries[item.index].token"
            :index="item.index"
            :progress="entries[item.index].progress"
            :member-progress="entries[item.index].memberProgress"
            :active="entries[item.index].active"
            :source="entries[item.index].source"
            :note-ids="entries[item.index].ids"
            :hidden="entries[item.index].hidden"
            :density="density"
            :time-signature="timeSignature"
            :viewport="viewport"
            :color-resolver="colorResolver"
            :still-color-resolver="stillColorResolver"
          />
        </template>
      </div>
    </div>
    <Button
      v-if="openHref"
      class="highlight-strip__open"
      size="sm"
      tone="ink"
      accessible-name="Open in Strudel"
      title="Open in Strudel"
      @click="openInStrudel"
    >
      <ExternalLink />
    </Button>
  </div>
</template>

<style scoped>
.highlight-strip {
  --strip-border: var(--hairline);
  display: flex;
  align-items: stretch;
  position: relative;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--strip-border);
  background: var(--ink-2);
  color: var(--ivory);
  container-type: inline-size;
  transition: border-color 160ms ease;
}

.highlight-strip--playing {
  border-color: var(--ivory-4);
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

/* The whole phrase for assistive technology when the line is windowed. */
.highlight-strip__phrase {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Stands in for unmounted history at its measured width. */
.highlight-strip__gap {
  flex: none;
  align-self: stretch;
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

/* Open in Strudel: a small Ink key at the end of the line. Its 44px touch
   floor stays inside the strip, never reaching toward its neighbours. */
.highlight-strip__open {
  align-self: center;
  margin-inline: var(--s-2) calc(var(--hit-gap-sm) / 2);
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

  .highlight-strip__open {
    color: LinkText;
  }
}
</style>
