<script setup lang="ts">
import { computed, watch, nextTick, ref } from "vue";
import { usePatternsStore } from "@/stores/patterns";
import { useInstrumentStore } from "@/stores/instrument";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useColorSystem } from "@/composables/useColorSystem";
import { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "@/data";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import { toStrudelSound } from "@/composables/useStrudel";
import type { PatternNote } from "@/types/patterns";
import StrudelCodeView from "@/components/patterns/StrudelCodeView.vue";

const patternsStore = usePatternsStore();
const instrumentStore = useInstrumentStore();
const visualConfigStore = useVisualConfigStore();
const { getStaticPrimaryColor } = useColorSystem();

const notationRef = ref<HTMLElement | null>(null);

// ── helpers ───────────────────────────────────────────────────────────────
const BAR_MS = (60000 / 120) * 4; // 2000ms at 120bpm

function solfegeName(scaleIndex: number, mode: string): string {
  const list = mode === "minor" ? MINOR_SOLFEGE : MAJOR_SOLFEGE;
  return list[scaleIndex]?.name ?? "Do";
}

type Token = { text: string; color: string | null; isRest: boolean };

// ── config ────────────────────────────────────────────────────────────────
const liveStripConfig = computed(() => visualConfigStore.config.liveStrip);

function getTokenText(note: PatternNote, mode: string): string {
  const notation = liveStripConfig.value?.notation ?? 'solfege';
  if (notation === 'note') return note.note;
  if (notation === 'degree') return String(note.scaleIndex + 1);
  // solfege (default)
  return solfegeName(note.scaleIndex, mode);
}

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
      tokens.push({ text: `~@${x}`, color: null, isRest: true });
    }

    const x = parseFloat((dur / BAR_MS).toFixed(4));
    const durStr = x === 1 ? "" : `@${x}`;
    const name = getTokenText(note, meta.mode);
    const color = getStaticPrimaryColor(solfegeName(note.scaleIndex, meta.mode), meta.mode, note.octave);
    tokens.push({ text: `${name}${durStr}`, color, isRest: false });

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
      tokens.push({ text: `~@${x}`, color: null, isRest: true });
    }

    const x = parseFloat((dur / BAR_MS).toFixed(4));
    const durStr = x === 1 ? "" : `@${x}`;
    const tokenText = getTokenText(note as unknown as PatternNote, note.mode);
    tokens.push({
      text: `${tokenText}${durStr}`,
      color: getStaticPrimaryColor(note.solfege.name, note.mode, note.octave),
      isRest: false,
    });

    cursor = start + dur;
  }

  return tokens;
});

// ── combined display — filtered by showRests ──────────────────────────────
const displayTokens = computed((): Token[] => {
  if (patternsStore.isStripCleared) return [];
  const all = [...baseTokens.value, ...liveTokens.value];
  if (!liveStripConfig.value?.showRests) {
    return all.filter((t) => !t.isRest);
  }
  return all;
});

// ── Strudel code line ─────────────────────────────────────────────────────
const strudelLine = computed((): string => {
  if (!liveStripConfig.value?.showStrudelLine) return '';
  const notes = patternsStore.currentWorkingNotes;
  if (!notes.length) return '';
  const sound = toStrudelSound(instrumentStore.currentInstrument ?? 'sine');
  return logNotesToStrudel(notes as any, { sound });
});

// ── display code — single-line version for CodeMirror ─────────────────────
const displayCode = computed((): string =>
  strudelLine.value.replace(/\n/g, ' ')
);

// ── scroll behaviour ──────────────────────────────────────────────────────
watch(
  () => liveTokens.value.length,
  async () => {
    await nextTick();
    if (notationRef.value) {
      notationRef.value.scrollLeft = notationRef.value.scrollWidth;
    }
  }
);

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
  <div
    class="live-strip"
    :style="liveStripConfig?.opacity !== undefined ? { opacity: liveStripConfig.opacity } : {}"
  >
    <!-- Tokens -->
    <div v-if="displayTokens.length" ref="notationRef" class="notation-bar">
      <div class="notation-tokens">
        <span
          v-for="(token, i) in displayTokens"
          :key="i"
          class="token"
          :class="[
            token.color ? 'token--note' : 'token--rest',
            i === displayTokens.length - 1 && !token.isRest ? 'token--last' : '',
          ]"
          :style="token.color ? { backgroundColor: token.color } : {}"
        >{{ token.text }}</span>
      </div>
    </div>
    <div v-else class="empty-hint">play something…</div>

    <!-- Strudel code line -->
    <div
      v-if="liveStripConfig?.showStrudelLine && strudelLine"
      class="strudel-line"
    >
      <StrudelCodeView :code="displayCode" />
    </div>
  </div>
</template>

<style scoped>
.live-strip {
  display: flex;
  flex-direction: column;
  background-color: hsla(0, 0%, 0%, 0.6);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.08);
  width: 100%;
  min-width: 0;
  overflow: hidden;
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

/* Subtle pulse on the most-recent note token */
@keyframes token-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}

.token--last {
  animation: token-pulse 1.2s ease-in-out infinite;
}

.empty-hint {
  flex: 1;
  padding: 0.35rem 0.6rem;
  font-size: 0.65rem;
  color: hsla(0, 0%, 100%, 0.25);
  font-style: italic;
  min-height: 2rem;
  display: flex;
  align-items: center;
}

/* ─── Strudel code line ─── */
/* display: block + overflow: hidden clips the strip to its parent width.
   Horizontal scrolling happens inside CodeMirror's own .cm-scroller. */
.strudel-line {
  display: block;
  overflow: hidden;
  max-height: 2.2rem;
  min-height: 1.5rem;
  border-top: 1px solid hsla(0, 0%, 100%, 0.05);
  padding: 0.2rem 0.5rem;
  box-sizing: border-box;
  width: 100%;
}

</style>
