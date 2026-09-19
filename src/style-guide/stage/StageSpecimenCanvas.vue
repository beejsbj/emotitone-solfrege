<template>
  <div ref="mountPoint" class="stage-specimen-canvas" data-testid="stage-specimen-canvas" />
</template>

<script setup lang="ts">
import {
  createApp,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type App,
} from "vue";
import { createPinia, disposePinia, type Pinia } from "pinia";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { ActiveNote, ChromaticNote, SolfegeData } from "@/types/music";
import {
  createStageSpecimenAudio,
  type StageSpecimenSignal,
} from "./stageSpecimenAudio";

const props = defineProps<{
  signal: StageSpecimenSignal;
  relationship: "off" | "merge" | "web";
  stageEnabled: boolean;
  showLabels?: boolean;
}>();

const mountPoint = ref<HTMLElement | null>(null);
let specimenApp: App<Element> | null = null;
let specimenPinia: Pinia | null = null;
const audio = createStageSpecimenAudio(() => props.signal);
const noteEvents = new EventTarget();
let attackSequence = 0;

const frequencyForMidi = (midi: number) => 440 * (2 ** ((midi - 69) / 12));

function specimenNote(
  noteId: string,
  pitch: ChromaticNote,
  midi: number,
  solfegeIndex: number,
  solfege: SolfegeData,
): ActiveNote {
  return {
    noteId: `${noteId}-${++attackSequence}`,
    noteName: `${pitch}${Math.floor(midi / 12) - 1}`,
    pitchClassIndex: CHROMATIC_NOTES.indexOf(pitch),
    solfegeIndex,
    solfege,
    frequency: frequencyForMidi(midi),
    octave: Math.floor(midi / 12) - 1,
    keyboardOctave: 4,
    mode: "major",
    key: "C",
  };
}

function notesForSignal(signal: StageSpecimenSignal): ActiveNote[] {
  const major = getScaleForMode("major").solfege;
  if (signal === "silence") return [];
  if (signal === "borrowed") {
    return [specimenNote(
      "stage-specimen-c-sharp",
      "C#",
      61,
      -1,
      { ...major[0], name: "Di", number: 1 },
    )];
  }
  return [
    specimenNote("stage-specimen-c", "C", 60, 0, major[0]),
    specimenNote("stage-specimen-e", "E", 64, 2, major[2]),
    specimenNote("stage-specimen-g", "G", 67, 4, major[4]),
  ];
}

function dispatchRelease(note: ActiveNote) {
  noteEvents.dispatchEvent(new CustomEvent("note-released", {
    detail: {
      ...note,
      note: note.solfege.name,
    },
  }));
}

function dispatchAttack(note: ActiveNote) {
  noteEvents.dispatchEvent(new CustomEvent("note-played", {
    detail: {
      ...note,
      note: note.solfege,
      source: "stage-specimen",
      record: false,
      mirrorMidi: false,
    },
  }));
}

onMounted(() => {
  if (!mountPoint.value) return;
  specimenPinia = createPinia();

  specimenApp = createApp(defineComponent({
    name: "IsolatedStageSpecimen",
    setup() {
      const visualConfig = useVisualConfigStore();
      const activeNotes = ref<ActiveNote[]>([]);
      let noteEventsMounted = false;
      visualConfig.useEphemeralDefaults();
      watch(() => props.showLabels, (show) => {
        visualConfig.config.blobs.showChordLabel = Boolean(show);
        visualConfig.config.blobs.showEmotionLabel = Boolean(show);
        visualConfig.config.blobs.showIntervalLabels = Boolean(show);
      }, { immediate: true });

      watch(
        () => props.relationship,
        (relationship) => {
          visualConfig.config.blobs.connectionMode = relationship;
        },
        { immediate: true },
      );
      watch(
        () => props.stageEnabled,
        (isEnabled) => {
          visualConfig.config.stage.isEnabled = isEnabled;
        },
        { immediate: true },
      );
      watch(
        () => props.signal,
        (signal) => {
          if (noteEventsMounted) activeNotes.value.forEach(dispatchRelease);
          activeNotes.value = notesForSignal(signal);
          if (noteEventsMounted) activeNotes.value.forEach(dispatchAttack);
        },
        { immediate: true },
      );

      onMounted(() => {
        noteEventsMounted = true;
        activeNotes.value.forEach(dispatchAttack);
      });

      onBeforeUnmount(() => {
        noteEventsMounted = false;
        activeNotes.value.forEach(dispatchRelease);
        activeNotes.value = [];
      });

      return () => h(UnifiedVisualEffects, {
        audioFeatures: audio.features,
        activeNotes: activeNotes.value,
        eventTarget: noteEvents,
      });
    },
  }));
  specimenApp.use(specimenPinia);
  specimenApp.mount(mountPoint.value);
});

onBeforeUnmount(() => {
  specimenApp?.unmount();
  specimenApp = null;
  if (specimenPinia) disposePinia(specimenPinia);
  specimenPinia = null;
});

defineExpose({
  wakeAudio: () => audio.resume(),
});
</script>

<style scoped>
.stage-specimen-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
