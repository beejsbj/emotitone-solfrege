import { computed, onScopeDispose, ref, shallowRef, watch } from "vue";
import { intervalFeeling, type IntervalFeeling } from "@/domain/intervalFeeling";
import { pitchHeightOf } from "@/domain/musicalIdentity";
import type { ChromaticNote, MusicalMode } from "@/types/music";

/** A sounding Stage note, as the note events describe it. */
export interface FeelingNote {
  id: string;
  noteName: string;
  octave: number;
  key: ChromaticNote;
  mode: MusicalMode;
}

export interface FeelingRow extends IntervalFeeling {
  octave: number;
  key: ChromaticNote;
  mode: MusicalMode;
  /** The words shown: the description alone, the shortest field in a chord. */
  text: string;
}

/** More held degrees than this keep the most recent ones. */
export const MAX_FEELING_ROWS = 4;
/** A readout must hold this long before a screen reader hears it. */
export const FEELING_ANNOUNCE_SETTLE_MS = 1000;

interface IntervalFeelingsOptions {
  laBasedMinor: () => boolean;
  /** How long the last held set stays after every note is released. */
  holdTime: () => number;
}

/**
 * Lifecycle of the Feeling line: the set of notes held together, kept for
 * the hold time after the last release, and a polite announcement that only
 * speaks once a readout has settled, so quick playing never floods it.
 */
export function useIntervalFeelings(options: IntervalFeelingsOptions) {
  const held = new Map<string, FeelingNote>();
  const shown = shallowRef<FeelingNote[]>([]);
  const visible = ref(false);
  const announcement = ref("");
  let hideTimer: number | null = null;
  let settleTimer: number | null = null;

  const clearTimer = (timer: number | null) => {
    if (timer !== null) window.clearTimeout(timer);
    return null;
  };

  const rows = computed<FeelingRow[]>(() => {
    const byPitchClass = new Map<number, FeelingRow>();
    const heights = new Map<number, number>();
    for (const note of shown.value) {
      const feeling = intervalFeeling(
        note.noteName,
        { tonic: note.key, mode: note.mode },
        options.laBasedMinor(),
      );
      if (!feeling) continue;
      // An octave doubling is the same degree: the newest one stands.
      byPitchClass.delete(feeling.pitchClass);
      byPitchClass.set(feeling.pitchClass, {
        ...feeling,
        octave: note.octave,
        key: note.key,
        mode: note.mode,
        text: feeling.description,
      });
      heights.set(
        feeling.pitchClass,
        pitchHeightOf(note.noteName) ?? note.octave * 12 + feeling.pitchClass,
      );
    }
    const recent = [...byPitchClass.values()].slice(-MAX_FEELING_ROWS);
    const chord = recent.length > 1;
    return recent
      .sort((low, high) => heights.get(low.pitchClass)! - heights.get(high.pitchClass)!)
      .map((row) => (chord ? { ...row, text: row.emotion } : row));
  });

  const spokenText = computed(() => rows.value
    .map((row) => `${row.syllable}, ${row.interval.spoken}: ${row.text}`)
    .join(". "));

  const publish = () => {
    shown.value = [...held.values()];
  };

  const notePlayed = (note: FeelingNote) => {
    hideTimer = clearTimer(hideTimer);
    // A note struck after everything was released starts a new readout.
    if (held.size === 0) shown.value = [];
    held.delete(note.id);
    held.set(note.id, note);
    visible.value = true;
    publish();
  };

  const reset = () => {
    hideTimer = clearTimer(hideTimer);
    settleTimer = clearTimer(settleTimer);
    held.clear();
    shown.value = [];
    visible.value = false;
    announcement.value = "";
  };

  const noteReleased = (id: string) => {
    if (!held.delete(id)) return;
    if (held.size > 0) {
      publish();
      return;
    }
    // The last held set stays readable for the hold time.
    hideTimer = clearTimer(hideTimer);
    hideTimer = window.setTimeout(reset, Math.max(0, options.holdTime()));
  };

  watch(spokenText, (text) => {
    settleTimer = clearTimer(settleTimer);
    if (!text) return;
    settleTimer = window.setTimeout(() => {
      settleTimer = null;
      announcement.value = text;
    }, FEELING_ANNOUNCE_SETTLE_MS);
  });

  onScopeDispose(() => {
    hideTimer = clearTimer(hideTimer);
    settleTimer = clearTimer(settleTimer);
  });

  return { rows, visible, announcement, notePlayed, noteReleased, reset };
}
