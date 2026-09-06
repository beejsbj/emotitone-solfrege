import { computed, onScopeDispose, readonly, ref, watch } from "vue";
import { Chord, Interval } from "@tonaljs/tonal";
import { useVisualConfig } from "@/composables/useVisualConfig";
import type {
  ActiveNote,
  HarmonicAnalysisSnapshot,
  HarmonicIntervalEdge,
} from "@/types";

function createEmptySnapshot(): HarmonicAnalysisSnapshot {
  return {
    isVisible: false,
    displayedNotes: [],
    intervalEdges: [],
    chordLabel: null,
    emotionalDescription: "",
  };
}

export function useHarmonicAnalysis() {
  const { floatingPopupConfig } = useVisualConfig();
  const snapshot = ref<HarmonicAnalysisSnapshot>(createEmptySnapshot());
  const accumulatedNotes = ref<Map<string, ActiveNote>>(new Map());
  const displayOrder = ref<string[]>([]);
  const activeNoteIds = new Set<string>();
  const isVisible = ref(false);
  let hideTimer: number | null = null;

  const clearHideTimer = () => {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const displayedNotes = computed<ActiveNote[]>(() =>
    displayOrder.value
      .map((noteId) => accumulatedNotes.value.get(noteId))
      .filter((note): note is ActiveNote => Boolean(note))
  );

  const intervalEdges = computed<HarmonicIntervalEdge[]>(() => {
    const notes = displayedNotes.value;
    if (notes.length < 2) {
      return [];
    }

    const result: HarmonicIntervalEdge[] = [];

    for (let index = 0; index < notes.length; index += 1) {
      for (
        let compareIndex = index + 1;
        compareIndex < notes.length;
        compareIndex += 1
      ) {
        result.push({
          fromNoteId: notes[index].noteId,
          toNoteId: notes[compareIndex].noteId,
          fromIndex: index,
          toIndex: compareIndex,
          interval: Interval.distance(
            notes[index].noteName,
            notes[compareIndex].noteName
          ),
        });
      }
    }

    return result;
  });

  const chordLabel = computed(() => {
    if (!floatingPopupConfig.value.showChord) {
      return null;
    }

    const notes = displayedNotes.value.map((note) => note.noteName);
    if (notes.length < 2) {
      return null;
    }

    const detectedChords = Chord.detect(notes);
    return detectedChords.length > 0 ? detectedChords[0] : null;
  });

  const emotionalDescription = computed(() => {
    if (!floatingPopupConfig.value.showEmotionalDescription) {
      return "";
    }

    const notes = displayedNotes.value;
    if (notes.length === 0) {
      return "";
    }

    const uniqueEmotions = [
      ...new Set(notes.map((note) => note.solfege.emotion)),
    ];

    if (uniqueEmotions.length === 1) {
      return uniqueEmotions[0];
    }

    if (uniqueEmotions.length === 2) {
      return `${uniqueEmotions[0]} & ${uniqueEmotions[1]}`;
    }

    return "Complex harmonic blend";
  });

  const publishSnapshot = () => {
    snapshot.value = {
      isVisible:
        floatingPopupConfig.value.isEnabled &&
        isVisible.value &&
        displayedNotes.value.length > 0,
      displayedNotes: [...displayedNotes.value],
      intervalEdges: [...intervalEdges.value],
      chordLabel: chordLabel.value,
      emotionalDescription: emotionalDescription.value,
    };
  };

  const trimDisplayedNotes = () => {
    while (displayOrder.value.length > floatingPopupConfig.value.maxNotes) {
      const oldestNoteId = displayOrder.value.shift();
      if (oldestNoteId) {
        accumulatedNotes.value.delete(oldestNoteId);
        activeNoteIds.delete(oldestNoteId);
      }
    }
  };

  const reset = () => {
    clearHideTimer();
    activeNoteIds.clear();
    accumulatedNotes.value.clear();
    displayOrder.value = [];
    isVisible.value = false;
    publishSnapshot();
  };

  const scheduleHide = () => {
    clearHideTimer();
    if (displayedNotes.value.length === 0) {
      isVisible.value = false;
      publishSnapshot();
      return;
    }

    hideTimer = window.setTimeout(() => {
      reset();
    }, floatingPopupConfig.value.accumulationWindow + floatingPopupConfig.value.hideDelay);
  };

  const notePlayed = (note: ActiveNote) => {
    if (!floatingPopupConfig.value.isEnabled) {
      reset();
      return;
    }

    const repeatsReleasedPitch =
      activeNoteIds.size === 0 &&
      displayedNotes.value.some(
        (displayedNote) => displayedNote.noteName === note.noteName
      );

    if (repeatsReleasedPitch) {
      reset();
    }

    activeNoteIds.add(note.noteId);
    accumulatedNotes.value.set(note.noteId, note);
    if (!displayOrder.value.includes(note.noteId)) {
      displayOrder.value.push(note.noteId);
    }

    trimDisplayedNotes();
    isVisible.value = true;
    clearHideTimer();
    publishSnapshot();
  };

  const noteReleased = (noteId: string) => {
    activeNoteIds.delete(noteId);

    if (!floatingPopupConfig.value.isEnabled) {
      reset();
      return;
    }

    if (activeNoteIds.size === 0) {
      scheduleHide();
    }

    publishSnapshot();
  };

  watch(
    () => floatingPopupConfig.value.isEnabled,
    (enabled) => {
      if (!enabled) {
        reset();
      } else {
        publishSnapshot();
      }
    },
    { immediate: true }
  );

  watch(
    () => [
      floatingPopupConfig.value.maxNotes,
      floatingPopupConfig.value.showChord,
      floatingPopupConfig.value.showEmotionalDescription,
    ],
    () => {
      trimDisplayedNotes();
      publishSnapshot();
    }
  );

  onScopeDispose(clearHideTimer);

  return {
    snapshot: readonly(snapshot),
    notePlayed,
    noteReleased,
    reset,
  };
}
