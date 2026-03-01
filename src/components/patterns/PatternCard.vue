<script setup lang="ts">
import { computed, ref } from "vue";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import { useStrudel, toStrudelSound } from "@/composables/useStrudel";
import type { Pattern } from "@/types/patterns";
import type { LogNote } from "@/types/patterns";

const { toggle, isPlaying, currentCode } = useStrudel();

const props = defineProps<{
  pattern: Pattern;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  "toggle-expand": [];
}>();

const copied = ref(false);

const notation = computed(() =>
  logNotesToStrudel(props.pattern.notes as unknown as LogNote[], {
    sound: toStrudelSound(props.pattern.instrument ?? "sine"),
  })
);

const keyModeLabel = computed(() => {
  const key = props.pattern.key ?? "C";
  const mode = props.pattern.mode ?? "major";
  return `${key} ${mode}`;
});

const noteCount = computed(
  () => props.pattern.noteCount ?? props.pattern.notes.length
);

const isThisPlaying = computed(
  () => isPlaying.value && currentCode.value === notation.value
);

async function copyNotation() {
  if (!notation.value) return;
  try {
    await navigator.clipboard.writeText(notation.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // clipboard not available — silently ignore
  }
}
</script>

<template>
  <article
    class="track"
    :class="{
      'track--default': pattern.isDefault,
      'track--expanded': isExpanded,
      'track--playing': isThisPlaying,
    }"
  >
    <!-- Single always-visible row -->
    <div class="track-row" @click="emit('toggle-expand')">
      <!-- Play / stop -->
      <button
        class="play-btn"
        :class="{ 'play-btn--active': isThisPlaying }"
        @click.stop="toggle(notation)"
        :aria-label="isThisPlaying ? 'Stop' : 'Play'"
      >
        <span class="play-icon">{{ isThisPlaying ? "■" : "▶" }}</span>
      </button>

      <!-- Label + badge -->
      <div class="track-meta">
        <span class="track-label">{{ keyModeLabel }}</span>
        <span class="track-badge">{{ noteCount }}</span>
        <span v-if="pattern.isDefault" class="default-pip" />
      </div>

      <!-- Copy + chevron — stop propagation so tapping these doesn't toggle expand -->
      <div class="track-actions" @click.stop>
        <button
          class="copy-btn"
          :class="{ 'copy-btn--done': copied }"
          @click="copyNotation"
          :aria-label="copied ? 'Copied' : 'Copy notation'"
        >
          {{ copied ? "✓" : "⎘" }}
        </button>
      </div>

      <span
        class="track-chevron"
        :class="{ 'track-chevron--open': isExpanded }"
        >›</span
      >
    </div>

    <!-- Expandable notation body -->
    <div class="track-body">
      <div class="notation-scroll">
        <pre class="notation-code">{{ notation }}</pre>
      </div>
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
}

.track--default {
  background: hsla(280, 18%, 10%, 1);
  border-left-color: hsla(280, 70%, 60%, 0.55);
}

.track--playing {
  border-left-color: hsla(150, 65%, 48%, 0.85);
}

/* ─── Row ─── */
.track-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 2.75rem; /* 44 px touch target */
  padding: 0 0.5rem 0 0.375rem;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s ease;
}

.track-row:active {
  background: hsla(0, 0%, 100%, 0.03);
}

/* ─── Play button ─── */
.play-btn {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: none;
  background: hsla(150, 65%, 44%, 1);
  color: hsla(0, 0%, 4%, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition:
    background 0.14s ease,
    transform 0.1s ease,
    box-shadow 0.14s ease;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 0 0 0 hsla(150, 65%, 48%, 0);
}

.play-btn:active {
  transform: scale(0.9);
}

.play-btn--active {
  background: hsla(0, 65%, 52%, 1);
  box-shadow: 0 0 8px 1px hsla(0, 65%, 52%, 0.35);
}

.play-icon {
  font-size: 0.52rem;
  line-height: 1;
  display: block;
  transform: translateX(1px); /* optical nudge for ▶ */
}

.play-btn--active .play-icon {
  transform: none;
  font-size: 0.58rem;
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

.track-label {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: hsla(0, 0%, 100%, 0.55);
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
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
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

.copy-btn:active {
  background: hsla(0, 0%, 100%, 0.14);
}

.copy-btn--done {
  background: hsla(150, 55%, 25%, 0.45);
  color: hsla(150, 65%, 62%, 1);
  border-color: hsla(150, 55%, 38%, 0.35);
}

/* ─── Expand chevron ─── */
.track-chevron {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: hsla(0, 0%, 100%, 0.18);
  display: block;
  line-height: 1;
  transition:
    transform 0.22s ease,
    color 0.18s ease;
}

.track-chevron--open {
  transform: rotate(90deg);
  color: hsla(0, 0%, 100%, 0.42);
}

/* ─── Expandable body ─── */
.track-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}

.track--expanded .track-body {
  max-height: 7rem;
}

.notation-scroll {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 7rem;
  padding: 0.375rem 0.625rem 0.5rem;
  background: hsla(0, 0%, 5%, 1);
  border-top: 1px solid hsla(0, 0%, 100%, 0.05);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.notation-scroll::-webkit-scrollbar {
  display: none;
}

.notation-code {
  font-family:
    "SF Mono",
    "Fira Code",
    "Courier New",
    monospace;
  font-size: 0.58rem;
  line-height: 1.65;
  color: hsla(175, 55%, 65%, 1);
  margin: 0;
  white-space: pre;
}
</style>
