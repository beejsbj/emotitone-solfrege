<script setup lang="ts">
import { computed, watch, nextTick, ref } from "vue";
import { usePatternsStore } from "@/stores/patterns";
import { useColorSystem } from "@/composables/useColorSystem";
import { logNotesToStrudel } from "@/services/StrudelNotation";

const patternsStore = usePatternsStore();
const { getStaticPrimaryColor } = useColorSystem();

const listRef = ref<HTMLElement | null>(null);

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

const strudelNotation = computed(() =>
  currentNotes.value.length ? logNotesToStrudel(currentNotes.value) : ""
);

// Auto-scroll the note strip to the right whenever a new note lands.
watch(
  () => currentNotes.value.length,
  async () => {
    await nextTick();
    if (listRef.value) {
      listRef.value.scrollLeft = listRef.value.scrollWidth;
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

    <!-- Strudel notation preview -->
    <div v-if="strudelNotation" class="notation-bar">
      <code class="notation-text">{{ strudelNotation }}</code>
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
  padding: 0.15rem 0.5rem;
  border-top: 1px solid hsla(0, 0%, 100%, 0.05);
}

.notation-text {
  display: block;
  font-family: monospace;
  font-size: 0.65rem;
  color: hsla(0, 0%, 100%, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
