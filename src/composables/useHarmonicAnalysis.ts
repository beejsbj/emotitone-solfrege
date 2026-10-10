import { computed, onScopeDispose, reactive, readonly, ref, watch } from "vue";
import { Note } from "@tonaljs/tonal";
import { useVisualConfig } from "@/composables/useVisualConfig";
import {
  identifyChord,
  intervalBetween,
  spellPitch,
} from "@/domain/musicalIdentity";
import { describeHarmonicEmotion } from "@/services/harmonicEmotion";
import { EMOTION_LABEL_DEFAULT, emotionLabelShows } from "@/data/emotionLabel";
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
    noteSpellings: {},
    chordSymbol: null,
    chordSpoken: null,
    chordLabel: null,
    emotionalDescription: "",
  };
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
    () => blobConfig.value.isEnabled
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

  // Identity is derived at read time: stored sharps-only names are spelled
  // in the newest note's key, and a detected chord spells its own members.
  const identifiedChord = computed(() => {
    const notes = displayedNotes.value;
    const latest = notes[notes.length - 1];
    if (!latest || notes.length < 2) return null;
    return identifyChord(
      notes.map((note) => note.noteName),
      { tonic: latest.key, mode: latest.mode },
    );
  });

  const noteSpellings = computed<Record<string, string>>(() => {
    const chord = identifiedChord.value;
    return Object.fromEntries(displayedNotes.value.map((note, index) => [
      note.noteId,
      chord?.pitchSpellings[index]
        ?? spellPitch(note.noteName, { tonic: note.key, mode: note.mode })
        ?? note.noteName,
    ]));
  });

  const intervalEdges = computed<HarmonicIntervalEdge[]>(() => {
    const notes = displayedNotes.value;
    if (notes.length < 2) {
      return [];
    }
    const spellings = noteSpellings.value;

    const result: HarmonicIntervalEdge[] = [];

    for (let index = 0; index < notes.length; index += 1) {
      for (
        let compareIndex = index + 1;
        compareIndex < notes.length;
        compareIndex += 1
      ) {
        const first = Note.get(spellings[notes[index].noteId]);
        const second = Note.get(spellings[notes[compareIndex].noteId]);
        const letterRank = (note: typeof first) => (note.oct ?? 0) * 7 + note.step;
        const [fromIndex, toIndex] = (first.height - second.height
          || letterRank(first) - letterRank(second)) <= 0
          ? [index, compareIndex] : [compareIndex, index];
        const interval = intervalBetween(
          spellings[notes[fromIndex].noteId],
          spellings[notes[toIndex].noteId],
        );
        result.push({
          fromNoteId: notes[fromIndex].noteId,
          toNoteId: notes[toIndex].noteId,
          fromIndex,
          toIndex,
          interval: interval?.label ?? "",
          spokenInterval: interval?.spoken ?? "",
        });
      }
    }

    return result;
  });

  const detectedChord = computed(() => identifiedChord.value?.symbol ?? null);

  const chordLabel = computed(() =>
    blobConfig.value.showChordLabel ? detectedChord.value : null
  );

  const emotionalDescription = computed(() => {
    const notes = displayedNotes.value;
    const pitches = new Set(notes.map((note) => Note.chroma(note.noteName)));
    if (!emotionLabelShows(EMOTION_LABEL_DEFAULT, blobConfig.value.showEmotionLabel, pitches.size)) {
      return "";
    }
    if (pitches.size >= 3) {
      return describeHarmonicEmotion(
        notes.map((note) => note.noteName),
        identifiedChord.value?.tonalName ?? null
      );
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

    return describeHarmonicEmotion(notes.map((note) => note.noteName), null);
  });

  const publishSnapshot = () => {
    snapshot.value = {
      isVisible:
        relationshipsEnabled.value &&
        isVisible.value &&
        displayedNotes.value.length > 0,
      displayedNotes: [...displayedNotes.value],
      intervalEdges: [...intervalEdges.value],
      noteSpellings: { ...noteSpellings.value },
      chordSymbol: detectedChord.value,
      chordSpoken: identifiedChord.value?.spoken ?? null,
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
