import {
  computed,
  effectScope,
  onScopeDispose,
  readonly,
  ref,
  watch,
  type EffectScope,
} from "vue";
import { Chord, Interval } from "@tonaljs/tonal";
import { useMusicStore } from "@/stores/music";
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

const harmonicAnalysisSnapshot = ref<HarmonicAnalysisSnapshot>(
  createEmptySnapshot()
);

let harmonicAnalysisScope: EffectScope | null = null;

function initializeHarmonicAnalysis() {
  if (harmonicAnalysisScope) {
    return;
  }

  harmonicAnalysisScope = effectScope(true);
  harmonicAnalysisScope.run(() => {
    const musicStore = useMusicStore();
    const { floatingPopupConfig } = useVisualConfig();

    const accumulatedNotes = ref<Map<string, ActiveNote>>(new Map());
    const displayOrder = ref<string[]>([]);
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
      if (!floatingPopupConfig.value.showIntervals || notes.length < 2) {
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

      const uniqueEmotions = [...new Set(notes.map((note) => note.solfege.emotion))];

      if (uniqueEmotions.length === 1) {
        return uniqueEmotions[0];
      }

      if (uniqueEmotions.length === 2) {
        return `${uniqueEmotions[0]} & ${uniqueEmotions[1]}`;
      }

      return "Complex harmonic blend";
    });

    const publishSnapshot = () => {
      harmonicAnalysisSnapshot.value = {
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
        }
      }
    };

    const resetAnalysis = () => {
      clearHideTimer();
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
        resetAnalysis();
      }, floatingPopupConfig.value.accumulationWindow + floatingPopupConfig.value.hideDelay);
    };

    const syncDisplayedNotes = (notes: ActiveNote[]) => {
      notes.forEach((note) => {
        accumulatedNotes.value.set(note.noteId, note);
        if (!displayOrder.value.includes(note.noteId)) {
          displayOrder.value.push(note.noteId);
        }
      });

      trimDisplayedNotes();
    };

    watch(
      () => [...musicStore.getActiveNotes()],
      (notes) => {
        if (!floatingPopupConfig.value.isEnabled) {
          resetAnalysis();
          return;
        }

        syncDisplayedNotes(notes);

        if (notes.length > 0) {
          isVisible.value = true;
          clearHideTimer();
        } else if (displayedNotes.value.length > 0) {
          isVisible.value = true;
          scheduleHide();
        } else {
          isVisible.value = false;
        }

        publishSnapshot();
      },
      { deep: true, immediate: true }
    );

    watch(
      () => floatingPopupConfig.value.isEnabled,
      (enabled) => {
        if (!enabled) {
          resetAnalysis();
          return;
        }

        syncDisplayedNotes(musicStore.getActiveNotes());
        if (displayedNotes.value.length > 0) {
          isVisible.value = true;
        }
        publishSnapshot();
      },
      { immediate: true }
    );

    watch(
      () => [
        floatingPopupConfig.value.maxNotes,
        floatingPopupConfig.value.showChord,
        floatingPopupConfig.value.showIntervals,
        floatingPopupConfig.value.showEmotionalDescription,
      ],
      () => {
        trimDisplayedNotes();
        publishSnapshot();
      }
    );

    onScopeDispose(() => {
      clearHideTimer();
    });
  });
}

export function resetHarmonicAnalysisState() {
  if (harmonicAnalysisScope) {
    harmonicAnalysisScope.stop();
    harmonicAnalysisScope = null;
  }

  harmonicAnalysisSnapshot.value = createEmptySnapshot();
}

export function useHarmonicAnalysis() {
  initializeHarmonicAnalysis();

  return {
    snapshot: readonly(harmonicAnalysisSnapshot),
  };
}
