<script setup lang="ts">
import { computed, watch, nextTick, ref } from "vue";
import { usePatternsStore } from "@/stores/patterns";
import { useColorSystem } from "@/composables/useColorSystem";
import { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "@/data";
import type { PatternNote } from "@/types/patterns";

const patternsStore = usePatternsStore();
const { getStaticPrimaryColor } = useColorSystem();

const notationRef = ref<HTMLElement | null>(null);

// ── helpers ───────────────────────────────────────────────────────────────
const BAR_MS = (60000 / 120) * 4; // 2000ms at 120bpm

function solfegeName(scaleIndex: number, mode: string): string {
  const list = mode === "minor" ? MINOR_SOLFEGE : MAJOR_SOLFEGE;
  return list[scaleIndex]?.name ?? "Do";
}

type Token = { text: string; color: string | null };

// ── base tokens (from loaded pattern, if any) ─────────────────────────────
const baseTokens = computed((): Token[] => {
  const base = patternsStore.loadedBaseNotes as PatternNote[];
  const meta = patternsStore.loadedBaseMeta;
  if (!base.length || !meta) return [];

  const origin = base[0].pressTime;
  const tokens: Token[] = [];
  let cursor = 0;

  for (const note of base) {
    const start = note.pressTime - origin;
    const dur = Math.max(1, note.duration);
    const gap = start - cursor;

    if (gap > 50) {
      const x = parseFloat((gap / BAR_MS).toFixed(4));
      tokens.push({ text: `~@${x}`, color: null });
    }

    const x = parseFloat((dur / BAR_MS).toFixed(4));
    const durStr = x === 1 ? "" : `@${x}`;
    const name = solfegeName(note.scaleIndex, meta.mode);
    const color = getStaticPrimaryColor(name, meta.mode, note.octave);
    tokens.push({ text: `${note.note}${durStr}`, color });

    cursor = start + dur;
  }

  return tokens;
});

// ── live tokens (in-progress since last boundary) ─────────────────────────
const liveTokens = computed((): Token[] => {
  const notes = patternsStore.currentWorkingNotes;
  if (!notes.length) return [];

  const origin = notes[0].pressTime;
  const tokens: Token[] = [];
  let cursor = 0;

  for (const note of notes) {
    const start = note.pressTime - origin;
    const dur = Math.max(1, note.duration);
    const gap = start - cursor;

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

// ── combined display — no mode switch, just concat ────────────────────────
const displayTokens = computed((): Token[] => {
  if (patternsStore.isStripCleared) return [];
  return [...baseTokens.value, ...liveTokens.value];
});

// ── scroll behaviour ──────────────────────────────────────────────────────
// Auto-scroll right when live tokens grow
watch(
  () => liveTokens.value.length,
  async () => {
    await nextTick();
    if (notationRef.value) {
      notationRef.value.scrollLeft = notationRef.value.scrollWidth;
    }
  }
);

// When base loads, scroll to start
watch(
  () => patternsStore.loadedBaseNotes.length,
  async () => {
    await nextTick();
    if (notationRef.value) {
      notationRef.value.scrollLeft = 0;
    }
  }
);
</script>

<template>
  <div class="live-strip">
    <!-- Tokens -->
    <div v-if="displayTokens.length" ref="notationRef" class="notation-bar">
      <div class="notation-tokens">
        <span
          v-for="(token, i) in displayTokens"
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

/* ─── Notation area ─── */
.notation-bar {
  overflow-x: auto;
  flex: 1;
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
}

.token--rest {
  color: hsla(0, 0%, 100%, 0.2);
  background-color: hsla(0, 0%, 100%, 0.05);
  font-weight: 400;
}

.empty-hint {
  flex: 1;
  padding: 0.35rem 0.6rem;
  font-size: 0.65rem;
  color: hsla(0, 0%, 100%, 0.25);
  font-style: italic;
}
</style>
