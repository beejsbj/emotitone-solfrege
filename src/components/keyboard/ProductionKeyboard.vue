<template>
  <Keyboard
    :rows="rows"
    :main-octave="config.mainOctave"
    :primary-label="config.primaryLabel"
    :show-labels="config.showLabels"
    :surface-style="surfaceStyle"
    :gap="productionGap"
    :main-row-height="Math.max(88 * config.keySize, 44)"
    :outer-row-height="Math.max(56 * config.keySize, 44)"
    @press="handlePress"
    @release="handleRelease"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import type {
  KeyboardIntent,
  KeyboardRowView,
} from "@/components/compounds/Keyboard.vue";
import type { NoteSurfaceStyle } from "@/components/primatives/Note.vue";
import { useKeyboardControls } from "@/composables/useKeyboardControls";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { triggerNoteHaptic } from "@/utils/hapticFeedback";
import type { ChromaticNote } from "@/types/music";
import { CHROMATIC_NOTES } from "@/data";
import { getChromaticNoteForScaleIndex } from "@/services/musicColor";

const store = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const config = computed(() => store.keyboardConfig);
const currentMusicKey = computed(() => musicStore.currentKey as ChromaticNote);
const surfaceStyle = computed<NoteSurfaceStyle>(() =>
  config.value.surfaceStyle === "monochrome" ? "monochrome" : "colored",
);
const productionGap = computed(() => ({
  none: 0,
  small: 2,
  medium: 4,
})[config.value.keyGaps] ?? 2);
const { attackNoteWithOctave, releaseNoteByButtonKey } = useSolfegeInteraction();

useKeyboardControls(computed(() => config.value.mainOctave));

const romanDegrees = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
];
const degreeLabel = (number: number) => romanDegrees[number - 1] ?? String(number);
const noteKey = (scaleIndex: number, octave: number) => `${scaleIndex}_${octave}`;
const noteName = (scaleIndex: number, octave: number) =>
  musicStore.getNoteName(scaleIndex, octave);
const isAccidental = (scaleIndex: number, octave: number) =>
  /[#b♯♭]/.test(noteName(scaleIndex, octave));
const pitchClassIndex = (scaleIndex: number) => {
  const pitch = getChromaticNoteForScaleIndex(
    scaleIndex,
    musicStore.currentMode,
    currentMusicKey.value,
  );
  return pitch ? CHROMATIC_NOTES.indexOf(pitch) : undefined;
};

const soundingNoteKeys = computed(() =>
  new Set(
    musicStore
      .getActiveNotes()
      .map((note) => `${note.solfegeIndex}_${note.octave}`),
  ),
);

const rows = computed<KeyboardRowView[]>(() =>
  store.visibleOctaves.map((octave) => ({
    octave,
    keys: store.solfegeData.map((solfege, scaleIndex) => {
      const id = noteKey(scaleIndex, octave);
      return {
        id,
        syllable: solfege.name,
        degree: degreeLabel(solfege.number),
        rawPitch: noteName(scaleIndex, octave),
        scaleIndex,
        pitchClassIndex: pitchClassIndex(scaleIndex),
        mode: musicStore.currentMode,
        musicKey: currentMusicKey.value,
        accidental: isAccidental(scaleIndex, octave),
        keyBrightness: config.value.keyBrightness,
        keySaturation: config.value.keySaturation,
        sounding: store.isVisualNoteActive(id) || soundingNoteKeys.value.has(id),
        pressed: store.isKeyPressed(id),
      };
    }),
  })),
);

const inputPressId = (intent: KeyboardIntent) =>
  `${intent.inputId}:${intent.keyId}`;

async function handlePress(intent: KeyboardIntent) {
  const pressId = inputPressId(intent);
  store.addTouch(pressId, intent.keyId);
  if (intent.source === "pointer" && config.value.hapticFeedback) {
    triggerNoteHaptic();
  }
  await attackNoteWithOctave(intent.scaleIndex, intent.octave, intent.event);
}

function handleRelease(intent: KeyboardIntent) {
  store.removeTouch(inputPressId(intent));
  releaseNoteByButtonKey(intent.keyId, intent.event);
}

onBeforeUnmount(() => store.clearAllTouches());
</script>
