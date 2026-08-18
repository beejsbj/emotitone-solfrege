<template>
  <div class="keyboard" :class="{ 'keyboard--padded': config.keyboardPadding }">
    <div
      v-for="octave in store.visibleOctaves"
      :key="`octave-${octave}`"
      class="keyboard__row"
      :class="`keyboard__row--gap-${config.keyGaps}`"
    >
      <Key
        v-for="(solfege, index) in store.solfegeData"
        :key="`${solfege.intervalName ?? solfege.name}-${index}-${octave}`"
        class="keyboard__key"
        :style="keyStyle(octave)"
        :syllable="solfege.name"
        :degree="degreeLabel(solfege.number)"
        :raw-pitch="noteName(index, octave)"
        :primary="primaryLabel"
        :visible-labels="visibleLabels(octave)"
        shape="tile"
        :scale-index="index"
        :pitch-class-index="pitchClassIndex(index)"
        :octave="octave"
        :mode="musicStore.currentMode"
        :music-key="currentMusicKey"
        :surface-style="config.surfaceStyle"
        :accidental="noteName(index, octave).includes('#')"
        :key-brightness="config.keyBrightness"
        :key-saturation="config.keySaturation"
        :glassmorph-opacity="config.glassmorphOpacity"
        :sounding="store.isKeyVisuallyActive(noteKey(index, octave))"
        :pressed="store.isKeyPressed(noteKey(index, octave))"
        :aria-label="keyAriaLabel(solfege.name, index, octave)"
        @press="handlePress($event, index, octave)"
        @release="handleRelease($event, index, octave)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import Key from "@/components/compounds/Key.vue";
import type { KeyInputEvent } from "@/components/compounds/Key.vue";
import type { NoteLabel } from "@/components/primatives/Note.vue";
import { useKeyboardControls } from "@/composables/useKeyboardControls";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { triggerNoteHaptic } from "@/utils/hapticFeedback";
import type { ChromaticNote } from "@/types/music";
import { CHROMATIC_NOTES } from "@/data";
import { getChromaticNoteForScaleIndex } from "@/services/musicColor";

const props = withDefaults(defineProps<{ primaryLabel?: NoteLabel }>(), {
  primaryLabel: "syllable",
});

const store = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const config = computed(() => store.keyboardConfig);
const currentMusicKey = computed(() => musicStore.currentKey as ChromaticNote);
const { attackNoteWithOctave, releaseNoteByButtonKey } = useSolfegeInteraction();

useKeyboardControls(computed(() => config.value.mainOctave));

const romanDegrees = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const degreeLabel = (number: number) => romanDegrees[number - 1] ?? String(number);
const noteKey = (scaleIndex: number, octave: number) => `${scaleIndex}_${octave}`;
const noteName = (scaleIndex: number, octave: number) =>
  musicStore.getNoteName(scaleIndex, octave);
const pitchClassIndex = (scaleIndex: number) => {
  const pitch = getChromaticNoteForScaleIndex(
    scaleIndex,
    musicStore.currentMode,
    currentMusicKey.value,
  );
  return pitch ? CHROMATIC_NOTES.indexOf(pitch) : undefined;
};

const visibleLabels = (octave: number): NoteLabel[] => {
  if (!config.value.showLabels) return [];
  return octave === config.value.mainOctave
    ? ["syllable", "degree", "raw"]
    : ["raw"];
};

const keyStyle = (octave: number) => {
  const baseHeight = octave === config.value.mainOctave ? 3.5 : 2.75;
  return {
    height: `${Math.max(baseHeight * config.value.keySize, 2.75)}rem`,
    borderRadius: `${config.value.keyShape}px`,
    clipPath: config.value.angledStyle ? angledClip(octave) : undefined,
  };
};

const angledClip = (octave: number) => {
  const skew = ((octave * 7) % 9) + 1;
  return `polygon(${skew}% 1%, ${100 - skew}% 1%, ${98 - skew / 2}% 99%, ${skew / 2}% 99%)`;
};

const inputPressId = (inputId: string, scaleIndex: number, octave: number) =>
  `${inputId}:${scaleIndex}_${octave}`;

async function handlePress(
  payload: KeyInputEvent,
  scaleIndex: number,
  octave: number,
) {
  const pressId = inputPressId(payload.inputId, scaleIndex, octave);
  store.addTouch(pressId, noteKey(scaleIndex, octave));
  if (config.value.hapticFeedback) triggerNoteHaptic();
  await attackNoteWithOctave(scaleIndex, octave, payload.event);
}

function handleRelease(
  payload: KeyInputEvent,
  scaleIndex: number,
  octave: number,
) {
  store.removeTouch(inputPressId(payload.inputId, scaleIndex, octave));
  releaseNoteByButtonKey(noteKey(scaleIndex, octave), payload.event);
}

const keyAriaLabel = (syllable: string, scaleIndex: number, octave: number) => {
  const rawPitch = noteName(scaleIndex, octave);
  return octave === config.value.mainOctave
    ? `${syllable} (${rawPitch}), main octave`
    : rawPitch;
};

onBeforeUnmount(() => store.clearAllTouches());
</script>

<style scoped>
.keyboard {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden auto;
  scroll-behavior: smooth;
}

.keyboard--padded { padding: .25rem; }

.keyboard__row {
  display: flex;
  flex-shrink: 0;
  align-items: stretch;
  justify-content: center;
}

.keyboard__row--gap-none { gap: 0; }
.keyboard__row--gap-small { gap: .125rem; }
.keyboard__row--gap-medium { gap: .25rem; }

.keyboard__key {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.keyboard__key :deep(.note) {
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .keyboard { scroll-behavior: auto; }
}
</style>
