<script setup lang="ts">
import { computed, watch, nextTick, ref } from "vue";
import { usePatternsStore } from "@/stores/patterns";
import { useColorSystem } from "@/composables/useColorSystem";

const patternsStore = usePatternsStore();
const { getStaticPrimaryColor } = useColorSystem();

const notationRef = ref<HTMLElement | null>(null);

// Only show notes belonging to the current in-progress pattern —
// everything from the last isStartingNewPattern boundary to the end.
const currentNotes = computed(() => {
  const notes = patternsStore.loggedNotes;
  let lastBreak = 0;
  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i].isStartingNewPattern) {
      lastBreak = i;
      break;
    }
  }
  return notes.slice(lastBreak);
});

// Build colored token list from currentNotes — avoids parsing the string.
const BAR_MS = (60000 / 120) * 4; // 2000ms at 120bpm

const coloredTokens = computed(() => {
  const notes = currentNotes.value;
  if (!notes.length) return [];

  const origin = notes[0].pressTime;
  const tokens: Array<{ text: string; color: string | null }> = [];
  let cursor = 0;

  for (const note of notes) {
    const start = note.pressTime - origin;
    const dur = Math.max(1, note.duration);
    const gap = start - cursor;

    // Rest for gaps > 50ms
    if (gap > 50) {
      const x = parseFloat((gap / BAR_MS).toFixed(4));
      tokens.push({ text: `~@${x}`, color: null });
    }

    const x = parseFloat((dur / BAR_MS).toFixed(4));
    const durStr = x === 1 ? "" : `@${x}`;
    tokens.push({
      text: `${note.note}${durStr}`,
      color: getStaticPrimaryColor(note.solfege.name, note.mode, note.octave),
    });

    cursor = start + dur;
  }

  return tokens;
});

// Auto-scroll to the right whenever a new note lands.
watch(
  () => currentNotes.value.length,
  async () => {
    await nextTick();
    if (notationRef.value) {
      notationRef.value.scrollLeft = notationRef.value.scrollWidth;
    }
  }
);
</script>

<template>
  <div class="live-strip">
    <div v-if="coloredTokens.length" ref="notationRef" class="notation-bar">
      <div class="notation-tokens">
        <span
          v-for="(token, i) in coloredTokens"
          :key="i"
          class="token"
          :class="token.color ? 'token--note' : 'token--rest'"
          :style="token.color ? { backgroundColor: token.color } : {}"
        >{{ token.text }}</span>
      </div>
    </div>
    <div v-else class="empty-hint">play something…</div>
  </div>
</template>

<style scoped>
.live-strip {
  display: flex;
  background-color: hsla(0, 0%, 0%, 0.6);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.08);
  width: 100%;
  min-width: 0;
  overflow: hidden;
  align-items: center;
  min-height: 2.5rem;
}

.notation-bar {
  overflow-x: auto;
  width: 100%;
  min-width: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.notation-bar::-webkit-scrollbar {
  display: none;
}

.notation-tokens {
  display: flex;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem;
  width: max-content;
  align-items: center;
}

.token {
  display: inline-flex;
  align-items: center;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  padding: 0.2rem 0.35rem;
  border-radius: 3px;
}

.token--note {
  color: hsla(0, 0%, 100%, 0.9);
  /* backgroundColor set via :style binding */
}

.token--rest {
  color: hsla(0, 0%, 100%, 0.2);
  background-color: hsla(0, 0%, 100%, 0.05);
  font-weight: 400;
}

.empty-hint {
  padding: 0.35rem 0.6rem;
  font-size: 0.65rem;
  color: hsla(0, 0%, 100%, 0.25);
  font-style: italic;
}
</style>
