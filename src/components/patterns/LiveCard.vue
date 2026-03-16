<script setup lang="ts">
import { computed, ref } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { useInstrumentStore } from "@/stores/instrument";
import { useStrudel, toStrudelSound } from "@/composables/useStrudel";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import { CHROMATIC_NOTES } from "@/data/musicData";
import { Knob } from "@/components/knobs";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import LiveStrip from "@/components/patterns/LiveStrip.vue";
import type { LogNote } from "@/types/patterns";

const store = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const patternsStore = usePatternsStore();
const instrumentStore = useInstrumentStore();
const { play, stop, isPlaying } = useStrudel();

const bodyOpen = ref(true);

const focusedNotation = computed(() => {
  const p = patternsStore.focusedPattern;
  if (!p) return null;
  return logNotesToStrudel(p.notes as unknown as LogNote[], {
    sound: toStrudelSound(p.instrument ?? "sine"),
  });
});

const currentSketchNotation = computed(() => {
  const notes = patternsStore.currentSketchNotes;
  if (!notes.length) return null;
  const sound = toStrudelSound(
    patternsStore.currentSketchMeta.instrument ?? instrumentStore.currentInstrument ?? "sine"
  );
  return logNotesToStrudel(notes as unknown as LogNote[], { sound });
});

function toggleFocusedPattern() {
  if (isPlaying.value) {
    stop();
  } else {
    const code = currentSketchNotation.value ?? focusedNotation.value;
    if (code) play(code);
  }
}
</script>

<template>
  <div class="live-card" :class="{ 'live-card--playing': isPlaying }">
    <!-- Header row — always visible -->
    <div class="live-card__header">
      <!-- Instrument chip -->
      <div class="control-group control-group--instrument">
        <InstrumentSelector :compact="true" />
      </div>

      <!-- Key knob -->
      <div class="control-group">
        <Knob
          :model-value="musicStore.currentKey"
          type="options"
          :options="CHROMATIC_NOTES"
          label="Key"
          @update:modelValue="(value) => musicStore.setKey(String(value))"
        />
      </div>

      <!-- Mode knob -->
      <div class="control-group">
        <Knob
          :model-value="musicStore.currentMode"
          type="options"
          :options="[
            { label: 'Major', value: 'major', color: 'hsl(0, 40%, 75%)' },
            { label: 'Minor', value: 'minor', color: 'hsl(240, 40%, 75%)' },
          ]"
          label="Mode"
          @update:modelValue="(value) => musicStore.setMode(value as any)"
        />
      </div>

      <!-- Octave knob -->
      <div class="control-group">
        <Knob
          :model-value="store.keyboardConfig.mainOctave"
          type="range"
          label="Oct"
          :min="1"
          :max="8"
          :step="1"
          @update:modelValue="(value) => store.setMainOctave(Number(value))"
        />
      </div>

      <!-- Play button -->
      <div class="control-group">
        <Knob
          type="button"
          :button-text="isPlaying ? '■' : '▶'"
          :is-active="isPlaying"
          :ready-color="'hsla(145, 100%, 50%, 1)'"
          :active-color="'hsla(0, 84%, 60%, 1)'"
          label="Play"
          @click="toggleFocusedPattern"
        />
      </div>

      <!-- Send button -->
      <div class="control-group">
        <Knob
          type="button"
          button-text="⏎"
          label="Send"
          @click="patternsStore.sendCurrentPattern()"
        />
      </div>

      <!-- Collapse chevron -->
      <button
        class="live-card__chevron"
        :class="{ 'live-card__chevron--open': bodyOpen }"
        @click="bodyOpen = !bodyOpen"
        :aria-label="bodyOpen ? 'Collapse strip' : 'Expand strip'"
      >
        ›
      </button>
    </div>

    <!-- Collapsible body -->
    <Transition name="body">
      <div v-if="bodyOpen" class="live-card__body">
        <div class="live-card__body-scroll">
          <LiveStrip />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.live-card {
  background-color: hsla(0, 0%, 0%, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.1);
  user-select: none;
  contain: layout style;
  transition: border-bottom-color 0.3s ease, box-shadow 0.3s ease;
  overflow-x: hidden;
  min-width: 0;
}

.live-card--playing {
  border-bottom-color: hsla(145, 100%, 50%, 0.25);
  box-shadow: 0 0 16px hsla(145, 100%, 40%, 0.08);
}

/* ─── Header ─── */
.live-card__header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.75rem 0.35rem 0.5rem;
  min-height: 3rem;
}

.control-group {
  flex: 1 1 0%;
  min-width: 0;
  max-width: 5rem;
}

.control-group--instrument {
  flex: 0 0 auto;
  max-width: none;
}

/* ─── Chevron ─── */
.live-card__chevron {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  background: none;
  border: none;
  color: hsla(0, 0%, 100%, 0.3);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transform: rotate(90deg);
  transition: transform 0.2s ease, color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.live-card__chevron--open {
  transform: rotate(-90deg);
}

.live-card__chevron:active {
  color: hsla(0, 0%, 100%, 0.7);
}

/* ─── Body ─── */
.live-card__body {
  border-top: 1px solid hsla(0, 0%, 100%, 0.06);
  overflow: hidden;
}

.live-card__body-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.08rem 0.12rem 0.12rem;
  scrollbar-width: thin;
}

/* ─── Body transition ─── */
.body-enter-from,
.body-leave-to {
  opacity: 0;
  max-height: 0;
}

.body-enter-active,
.body-leave-active {
  transition: opacity 0.18s ease, max-height 0.2s ease;
  overflow: hidden;
}

.body-enter-to,
.body-leave-from {
  opacity: 1;
  max-height: 8rem;
}

/* ─── Mobile ─── */
@media (max-width: 480px) {
  .live-card__header {
    padding: 0.25rem 0.5rem 0.25rem 0.25rem;
    gap: 0.15rem;
    min-height: 2.5rem;
  }

  .control-group {
    max-width: 4rem;
  }

  .live-card__body-scroll {
    padding: 0.05rem 0.08rem 0.08rem;
  }
}
</style>
