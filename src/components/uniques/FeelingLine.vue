<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from "vue";
import Note from "@/components/primatives/Note.vue";
import {
  useIntervalFeelings,
  type FeelingNote,
} from "@/composables/useIntervalFeelings";
import type { ChromaticNote, MusicalMode } from "@/types/music";

/**
 * The Feeling line: the feeling-first cue on the Stage. It names each held
 * degree (syllable in its Music Color, interval from the tonic) and its
 * written feeling, at the foot of the Stage above the deck.
 */
const props = withDefaults(defineProps<{
  /** Source of the Stage's note-played / note-released events. */
  eventTarget: EventTarget;
  /** Height of the Stage area the deck leaves uncovered, in CSS pixels. */
  usableHeight: number;
  /** Stage chord/interval labels share this line's settled announcement. */
  harmonicAccessibleText?: string;
  reducedMotion?: boolean;
  laBasedMinor?: boolean;
  /** How long the last readout stays after release, in milliseconds. */
  holdTime?: number;
  /** Context for events that carry none. */
  fallbackKey?: ChromaticNote;
  fallbackMode?: MusicalMode;
}>(), {
  harmonicAccessibleText: "",
  reducedMotion: false,
  laBasedMinor: false,
  holdTime: 2500,
  fallbackKey: undefined,
  fallbackMode: undefined,
});

const { rows, visible, announcement, notePlayed, noteReleased, reset } =
  useIntervalFeelings({
    laBasedMinor: () => props.laBasedMinor,
    holdTime: () => props.holdTime,
    harmonicAccessibleText: () => props.harmonicAccessibleText,
  });

interface NoteEventDetail {
  noteId?: string;
  noteName?: string;
  note?: string | { name?: string };
  octave?: number;
  key?: ChromaticNote;
  mode?: MusicalMode;
  durationMs?: number;
}

const oneShotTimers = new Set<number>();
let oneShotSequence = 0;

// Same identity rules as the Stage: one-shots release themselves after their
// duration, events without an id are keyed by note name.
function onNotePlayed(event: Event) {
  const detail = (event as CustomEvent<NoteEventDetail>).detail ?? {};
  const key = detail.key ?? props.fallbackKey;
  const mode = detail.mode ?? props.fallbackMode;
  if (!detail.noteName || !key || !mode) return;
  const oneShot = !detail.noteId && detail.durationMs !== undefined;
  const id = detail.noteId
    ?? (oneShot ? `one-shot:${detail.noteName}:${++oneShotSequence}` : `legacy:${detail.noteName}`);
  const note: FeelingNote = {
    id,
    noteName: detail.noteName,
    octave: detail.octave ?? 4,
    key,
    mode,
  };
  notePlayed(note);
  if (oneShot) {
    const timer = window.setTimeout(() => {
      oneShotTimers.delete(timer);
      noteReleased(id);
    }, Math.max(0, detail.durationMs ?? 0));
    oneShotTimers.add(timer);
  }
}

function onNoteReleased(event: Event) {
  const detail = (event as CustomEvent<NoteEventDetail>).detail ?? {};
  const name = detail.noteName ?? (typeof detail.note === "string" ? detail.note : undefined);
  const id = detail.noteId ?? (name ? `legacy:${name}` : undefined);
  if (id) noteReleased(id);
}

function listen(target: EventTarget) {
  target.addEventListener("note-played", onNotePlayed);
  target.addEventListener("note-released", onNoteReleased);
}

function unlisten(target: EventTarget) {
  target.removeEventListener("note-played", onNotePlayed);
  target.removeEventListener("note-released", onNoteReleased);
}

onMounted(() => listen(props.eventTarget));
watch(() => props.eventTarget, (next, previous) => {
  unlisten(previous);
  reset();
  listen(next);
});
onBeforeUnmount(() => {
  unlisten(props.eventTarget);
  oneShotTimers.forEach((timer) => window.clearTimeout(timer));
  oneShotTimers.clear();
});
</script>

<template>
  <div
    class="feeling-line"
    data-testid="feeling-line"
    :style="{ top: `${usableHeight}px` }"
  >
    <Transition name="feeling-line" :css="!reducedMotion">
      <ol
        v-if="visible && rows.length > 0"
        class="feeling-line__rows"
        :class="{ 'feeling-line__rows--chord': rows.length > 1 }"
        aria-hidden="true"
      >
        <li
          v-for="row in rows"
          :key="row.pitchClass"
          class="feeling-line__row"
          data-testid="feeling-line-row"
        >
          <Note
            class="feeling-line__syllable"
            proportion="glyph"
            primary="syllable"
            :visible-labels="['syllable']"
            :syllable="row.syllable"
            :pitch-class-index="row.pitchClass"
            :octave="row.octave"
            :mode="row.mode"
            :music-key="row.key"
          />
          <span class="feeling-line__interval">{{ row.interval.label }}</span>
          <span class="feeling-line__text">{{ row.text }}</span>
        </li>
      </ol>
    </Transition>
    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.feeling-line {
  position: absolute;
  z-index: 2;
  inset-inline: 0;
  transform: translateY(-100%);
  padding: 0 16px 14px;
  pointer-events: none;
}

.feeling-line__rows {
  display: flex;
  /* Rows are low to high in reading order and stack high on top, like the keyboard. */
  flex-direction: column-reverse;
  gap: 6px;
  max-width: 24rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.feeling-line__row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
}

.feeling-line__syllable {
  --note-host-block-size: 30px;
}

.feeling-line__rows--chord .feeling-line__syllable {
  --note-host-block-size: 24px;
}

.feeling-line__interval {
  min-width: 2.4em;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: .06em;
  color: var(--ivory-2);
  text-shadow: 1px 1px 0 var(--ink);
}

.feeling-line__text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-family: var(--font-display);
  font-size: 17px;
  line-height: 1.1;
  color: var(--ivory);
  text-shadow: 2px 2px 0 var(--ink);
}

.feeling-line__rows--chord .feeling-line__text {
  -webkit-line-clamp: 1;
  font-size: 15px;
}

.feeling-line-enter-active {
  transition: opacity var(--dur-ui) var(--ease-brush), translate var(--dur-ui) var(--ease-stab);
}

.feeling-line-leave-active {
  transition: opacity var(--dur-scene) var(--ease-brush);
}

.feeling-line-enter-from {
  opacity: 0;
  translate: 0 6px;
}

.feeling-line-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .feeling-line-enter-active,
  .feeling-line-leave-active {
    transition: none;
  }
}
</style>
