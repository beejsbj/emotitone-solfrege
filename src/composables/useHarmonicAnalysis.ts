import { computed, onScopeDispose, reactive, readonly, ref, watch } from "vue";
import { Chord, Interval, Note } from "@tonaljs/tonal";
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

function detectChordLabel(notes: readonly string[]): string | null {
  const notesByPitch = [...notes].sort(
    (first, second) => Note.get(first).height - Note.get(second).height
  );
  const detectedChords = Chord.detect(notesByPitch);
  return (
    detectedChords.find((candidate) => {
      // Chord.get does not parse slash notation, so inspect the plain chord.
      // Prefer ordinary triads over Tonal's augmented respelling for inversions;
      // preserve Tonal's ranking for every other chord type or ambiguity.
      const plainChord = candidate.split("/")[0];
      const type = Chord.get(plainChord).type;
      return type === "major" || type === "minor";
    }) ?? detectedChords[0] ?? null
  );
}

export function useHarmonicAnalysis(
  getActiveNotes: () => readonly ActiveNote[] = () => []
) {
  const { blobConfig } = useVisualConfig();
  const snapshot = ref<HarmonicAnalysisSnapshot>(createEmptySnapshot());
  const accumulatedNotes = ref<Map<string, ActiveNote>>(new Map());
  const displayOrder = ref<string[]>([]);
  const activeNoteIds = reactive(new Set<string>());
  const isVisible = ref(false);
  const relationshipsEnabled = computed(
    () =>
      blobConfig.value.isEnabled &&
      blobConfig.value.connectionMode !== "off"
  );
  let hideTimer: number | null = null;

  const clearHideTimer = () => {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const displayedNoteIds = computed(() => {
    const maximum = Math.max(1, blobConfig.value.analysisNoteLimit);
    const activeIds = displayOrder.value.filter(
      (noteId) =>
        activeNoteIds.has(noteId) && accumulatedNotes.value.has(noteId)
    );
    const selectedActiveIds = activeIds.slice(-maximum);
    const remainingSlots = maximum - selectedActiveIds.length;
    const selectedReleasedIds = remainingSlots > 0
      ? displayOrder.value
          .filter(
            (noteId) =>
              !activeNoteIds.has(noteId) && accumulatedNotes.value.has(noteId)
          )
          .slice(-remainingSlots)
      : [];
    const selectedIds = new Set([
      ...selectedActiveIds,
      ...selectedReleasedIds,
    ]);

    return displayOrder.value.filter((noteId) => selectedIds.has(noteId));
  });

  const displayedNotes = computed<ActiveNote[]>(() =>
    displayedNoteIds.value
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
    if (!blobConfig.value.showChordLabel) {
      return null;
    }

    const notes = displayedNotes.value.map((note) => note.noteName);
    if (notes.length < 2) {
      return null;
    }

    return detectChordLabel(notes);
  });

  const emotionalDescription = computed(() => {
    if (!blobConfig.value.showEmotionLabel) {
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
        relationshipsEnabled.value &&
        isVisible.value &&
        displayedNotes.value.length > 0,
      displayedNotes: [...displayedNotes.value],
      intervalEdges: [...intervalEdges.value],
      chordLabel: chordLabel.value,
      emotionalDescription: emotionalDescription.value,
    };
  };

  const trimDisplayedNotes = () => {
    const releasedIds = displayOrder.value.filter(
      (noteId) => !activeNoteIds.has(noteId)
    );
    const excessReleasedIds = releasedIds.slice(
      0,
      Math.max(0, releasedIds.length - blobConfig.value.analysisNoteLimit)
    );

    if (excessReleasedIds.length === 0) return;

    const excessReleasedIdSet = new Set(excessReleasedIds);
    excessReleasedIds.forEach((noteId) => accumulatedNotes.value.delete(noteId));
    displayOrder.value = displayOrder.value.filter(
      (noteId) => !excessReleasedIdSet.has(noteId)
    );
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
    }, blobConfig.value.analysisHoldTime);
  };

  const notePlayed = (note: ActiveNote) => {
    if (!relationshipsEnabled.value) {
      reset();
      return;
    }

    const releasedMatchingNoteIds = displayOrder.value.filter((noteId) => {
      const displayedNote = accumulatedNotes.value.get(noteId);
      return (
        displayedNote?.noteName === note.noteName && !activeNoteIds.has(noteId)
      );
    });

    if (releasedMatchingNoteIds.length > 0) {
      const releasedMatchingNoteIdSet = new Set(releasedMatchingNoteIds);
      releasedMatchingNoteIds.forEach((noteId) => {
        accumulatedNotes.value.delete(noteId);
      });
      displayOrder.value = displayOrder.value.filter(
        (noteId) => !releasedMatchingNoteIdSet.has(noteId)
      );
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

    if (!relationshipsEnabled.value) {
      reset();
      return;
    }

    trimDisplayedNotes();

    if (activeNoteIds.size === 0) {
      scheduleHide();
    }

    publishSnapshot();
  };

  const noteExpired = (noteId: string) => {
    if (activeNoteIds.has(noteId)) {
      return;
    }

    accumulatedNotes.value.delete(noteId);
    displayOrder.value = displayOrder.value.filter(
      (displayedNoteId) => displayedNoteId !== noteId
    );

    if (displayedNotes.value.length === 0) {
      isVisible.value = false;
    }

    publishSnapshot();
  };

  const hydrateActiveNotes = () => {
    getActiveNotes().forEach((note) => notePlayed(note));
  };

  watch(
    relationshipsEnabled,
    (enabled) => {
      if (!enabled) {
        reset();
      } else {
        hydrateActiveNotes();
        publishSnapshot();
      }
    },
    { immediate: true }
  );

  watch(
    () => [
      blobConfig.value.analysisNoteLimit,
      blobConfig.value.showChordLabel,
      blobConfig.value.showEmotionLabel,
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
    noteExpired,
    reset,
  };
}
