<script setup lang="ts">
import { computed, ref } from "vue";
import { DEFAULT_SOURCE_BPM, logNotesToStrudel } from "@/services/StrudelNotation";
import { toStrudelSound } from "@/composables/useStrudel";
import { usePatternsStore } from "@/stores/patterns";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useColorSystem } from "@/composables/useColorSystem";
import { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "@/data";
import { Knob } from "@/components/knobs";
import type { Pattern, PatternNote, LogNote } from "@/types/patterns";
import type { MusicalMode } from "@/types/music";

const patternsStore = usePatternsStore();
const keyboardStore = useKeyboardDrawerStore();
const { getStaticPrimaryColor } = useColorSystem();

const props = defineProps<{
  pattern: Pattern;
}>();

const copied = ref(false);

const keyModeLabel = computed(() => {
  const key = props.pattern.key ?? "C";
  const mode = props.pattern.mode ?? "major";
  return `${key} ${mode}`;
});

const noteCount = computed(
  () => props.pattern.noteCount ?? props.pattern.notes.length
);

const isFocused = computed(
  () => patternsStore.focusedPatternId === props.pattern.id
);

const sourceBpm = computed(() => {
  const bpm = props.pattern.bpm;
  return typeof bpm === "number" && bpm > 0 ? bpm : DEFAULT_SOURCE_BPM;
});

// ── notation for copy ──────────────────────────────────────────────────────
const notation = computed(() =>
  logNotesToStrudel(props.pattern.notes as unknown as LogNote[], {
    sourceBpm: sourceBpm.value,
    notationType: "relative",
    scaleKey: props.pattern.key,
    scaleMode: props.pattern.mode,
    scaleOctave: keyboardStore.keyboardConfig.mainOctave,
    sound: toStrudelSound(props.pattern.instrument ?? "sine"),
  })
);

const isPurgeEligible = computed(
  () => !props.pattern.isDefault && !props.pattern.isKept
);

const retentionLabel = computed(() => {
  if (!isPurgeEligible.value) {
    return null;
  }

  const msRemaining =
    props.pattern.createdAt + 7 * 24 * 60 * 60 * 1000 - Date.now();

  if (msRemaining <= 0) {
    return "expiring";
  }

  const daysRemaining = Math.max(
    1,
    Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
  );
  return `${daysRemaining}d left`;
});

async function copyNotation() {
  if (!notation.value) return;
  try {
    await navigator.clipboard.writeText(notation.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // clipboard not available
  }
}

// ── color strip helpers ───────────────────────────────────────────────────
function solfegeName(scaleIndex: number, mode: string): string {
  const list = mode === "minor" ? MINOR_SOLFEGE : MAJOR_SOLFEGE;
  return list[scaleIndex]?.name ?? "Do";
}

function colorFor(note: PatternNote, pattern: Pattern): string {
  const name = solfegeName(note.scaleIndex, pattern.mode);
  return getStaticPrimaryColor(name, pattern.mode as MusicalMode, note.octave);
}

function displayInstrumentName(instrument: string): string {
  return instrument.startsWith("gm_") ? instrument.slice(3) : instrument;
}

function handleCardClick() {
  patternsStore.loadPatternAsBase(props.pattern.id);
}

function keepPattern() {
  patternsStore.keepPattern(props.pattern.id);
}
</script>

<template>
  <article
    class="track"
    :class="{
      'track--default': pattern.isDefault,
      'track--focused': isFocused,
    }"
    @click="handleCardClick"
  >
    <!-- Single always-visible row -->
    <div class="track-row">
      <!-- Label + badges -->
      <div class="track-meta">
        <span class="track-instrument">{{ displayInstrumentName(pattern.instrument ?? "sine") }}</span>
        <span class="track-label">{{ keyModeLabel }}</span>
        <span class="track-badge">{{ noteCount }}</span>
        <span v-if="pattern.isDefault" class="default-pip" />
        <span v-if="retentionLabel" class="track-status">{{ retentionLabel }}</span>
        <span
          v-else-if="pattern.isKept && !pattern.isDefault"
          class="track-status track-status--kept"
        >
          kept
        </span>
      </div>

      <!-- Copy button — stop propagation so tapping doesn't re-focus -->
      <div class="track-actions" @click.stop>
        <Knob
          v-if="isPurgeEligible"
          class="keep-knob"
          :model-value="Boolean(pattern.isKept)"
          type="boolean"
          label=" "
          :theme-color="'hsla(38, 100%, 70%, 1)'"
          @update:modelValue="keepPattern"
        />
        <button
          class="copy-btn"
          :class="{ 'copy-btn--done': copied }"
          @click="copyNotation"
          :aria-label="copied ? 'Copied' : 'Copy notation'"
        >
          {{ copied ? "✓" : "⎘" }}
        </button>
      </div>
    </div>

    <!-- Color strip — always visible, proportional to note duration -->
    <div class="note-color-strip">
      <span
        v-for="note in (pattern.notes as PatternNote[])"
        :key="note.id"
        class="note-color-segment"
        :style="{
          backgroundColor: colorFor(note, pattern),
          flex: Math.max(note.duration, 50),
        }"
      />
    </div>
  </article>
</template>

<style scoped>
/* ─── Track shell ─── */
.track {
  position: relative;
  background: hsla(0, 0%, 9%, 1);
  border: 1px solid hsla(0, 0%, 100%, 0.06);
  border-left: 2px solid hsla(0, 0%, 100%, 0.08);
  border-radius: 3px;
  overflow: hidden;
  transition: border-left-color 0.18s ease;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.track--default {
  background: hsla(280, 18%, 10%, 1);
  border-left-color: hsla(280, 70%, 60%, 0.55);
}

.track--focused {
  border-left-color: hsla(280, 70%, 62%, 0.9);
  background: hsla(280, 15%, 11%, 0.7);
}

.track:active {
  background: hsla(0, 0%, 12%, 1);
}

/* ─── Row ─── */
.track-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 2.5rem;
  padding: 0 0.5rem 0 0.5rem;
}

/* ─── Track meta ─── */
.track-meta {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  overflow: hidden;
}

.track-instrument {
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsla(0, 0%, 100%, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 4.5rem;
}

.track-label {
  font-size: 0.52rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: hsla(0, 0%, 100%, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.2rem;
  border-radius: 2px;
  background: hsla(0, 0%, 100%, 0.07);
  color: hsla(0, 0%, 100%, 0.3);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.track-status {
  flex-shrink: 0;
  color: hsla(38, 100%, 75%, 0.7);
  font-size: 0.45rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.track-status--kept {
  color: hsla(145, 100%, 65%, 0.75);
}

.default-pip {
  flex-shrink: 0;
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 50%;
  background: hsla(280, 70%, 65%, 0.65);
}

/* ─── Action buttons ─── */
.track-actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.copy-btn {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 3px;
  border: 1px solid hsla(0, 0%, 100%, 0.09);
  background: hsla(0, 0%, 100%, 0.06);
  color: hsla(0, 0%, 100%, 0.35);
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition:
    background 0.13s ease,
    color 0.13s ease,
    border-color 0.13s ease;
  -webkit-tap-highlight-color: transparent;
}

.keep-knob {
  width: 1.35rem;
  min-width: 1.35rem;
}

.keep-knob:deep(.knob-wrapper) {
  max-width: 1.35rem;
  margin: 0;
}

.keep-knob:deep(label) {
  display: none;
}

.copy-btn:active {
  background: hsla(0, 0%, 100%, 0.14);
}

.copy-btn--done {
  background: hsla(150, 55%, 25%, 0.45);
  color: hsla(150, 65%, 62%, 1);
  border-color: hsla(150, 55%, 38%, 0.35);
}

/* ─── Note color strip ─── */
.note-color-strip {
  display: flex;
  height: 4px;
  overflow: hidden;
}

.note-color-segment {
  height: 100%;
  flex-shrink: 0;
  min-width: 2px;
}
</style>
