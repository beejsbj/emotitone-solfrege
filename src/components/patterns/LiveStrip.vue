<script setup lang="ts">
import { computed, watch, nextTick, ref } from "vue";
import { usePatternsStore } from "@/stores/patterns";
import { useColorSystem } from "@/composables/useColorSystem";

const patternsStore = usePatternsStore();
const { getStaticPrimaryColor } = useColorSystem();

const listRef = ref<HTMLElement | null>(null);
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

// Auto-scroll both strips to the right whenever a new note lands.
watch(
  () => currentNotes.value.length,
  async () => {
    await nextTick();
    if (listRef.value) {
      listRef.value.scrollLeft = listRef.value.scrollWidth;
    }
    if (notationRef.value) {
      notationRef.value.scrollLeft = notationRef.value.scrollWidth;
    }
  }
);
</script>

<template>
  <div class="live-strip">
    <!-- Note boxes -->
    <ul ref="listRef" class="note-list">
      <li
        v-for="note in currentNotes"
        :key="note.id"
        class="note-box"
        :style="{
          backgroundColor: getStaticPrimaryColor(
            note.solfege.name,
            note.mode,
            note.octave
          ),
        }"
      >
        <span class="note-label">{{ note.note }}</span>
      </li>

      <!-- Empty state -->
      <li v-if="currentNotes.length === 0" class="empty-hint">
        play something…
      </li>
    </ul>

    <!-- Strudel notation preview — colored tokens, horizontally scrollable -->
    <div v-if="coloredTokens.length" ref="notationRef" class="notation-bar">
      <code class="notation-text">
        <span class="token-prefix">`&lt; </span>
        <span
          v-for="(token, i) in coloredTokens"
          :key="i"
          class="token"
          :class="token.color ? 'token--note' : 'token--rest'"
          :style="token.color ? { color: token.color } : {}"
        >{{ token.text }} </span>
        <span class="token-suffix">&gt;`.as("note")</span>
      </code>
    </div>
  </div>
</template>

<style scoped>
.live-strip {
  display: flex;
  flex-direction: column;
  background-color: hsla(0, 0%, 0%, 0.6);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.08);
}

/* ── Note strip ─────────────────────────────────────── */
.note-list {
  display: flex;
  overflow-x: auto;
  scroll-behavior: smooth;
  max-width: 100vw;
  /* hide scrollbar visually but keep it functional */
  scrollbar-width: none;
}
.note-list::-webkit-scrollbar {
  display: none;
}

.note-box {
  flex: 0 0 auto;
  min-width: 2rem;
  padding: 0.3rem 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.note-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: hsla(0, 0%, 100%, 0.9);
  white-space: nowrap;
  position: relative;
  z-index: 1;
}

.empty-hint {
  flex: 1;
  padding: 0.3rem 0.6rem;
  font-size: 0.65rem;
  color: hsla(0, 0%, 100%, 0.25);
  font-style: italic;
  display: flex;
  align-items: center;
}

/* ── Strudel notation ───────────────────────────────── */
.notation-bar {
  overflow-x: auto;
  border-top: 1px solid hsla(0, 0%, 100%, 0.05);
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.notation-bar::-webkit-scrollbar {
  display: none;
}

.notation-text {
  display: block;
  font-family: monospace;
  font-size: 0.65rem;
  white-space: nowrap;
  padding: 0.15rem 0.5rem;
  width: max-content;
}

.token-prefix,
.token-suffix {
  color: hsla(0, 0%, 100%, 0.2);
}

.token {
  display: inline;
}

.token--note {
  font-weight: 600;
  /* color set via :style binding */
}

.token--rest {
  color: hsla(0, 0%, 100%, 0.2);
  font-weight: 400;
}
</style>
