import { deeperFade, type MemberFade } from "@/audio/live/fade";
import type { LooperFading } from "@/stores/looper";
import { resolveLooperFadeLight } from "./stageRuntime";

/**
 * The Looper's light on the Stage through Stop All's fade (BJS-648).
 *
 * The Stage lights a Looper note from the pattern player's own note events,
 * which carry the pattern (`phraseId`). Stop All plays the patterns on through
 * a bar while their sound falls on one (1 − t)² ramp, so their notes keep
 * arriving at full strength; this gives each of them the ramp's light instead.
 * The fade is the looper store's own (its `ending` entries, read as
 * `fading`): no timer of the Stage's.
 *
 * A note takes up the fade of its pattern while that pattern is ending, and
 * keeps it, as its sound does: a pattern played again during its fade comes
 * back at full light from its next note, while the notes already fading ramp
 * on. When the store lets a fade go without the pattern playing again (the
 * fade reached silence, Stop All's second tap cut it, or the run was lost),
 * the note goes dark at once and stays dark while its body leaves. The Loop
 * Dial's flick fades nothing: its pattern's notes keep their full light and
 * end as their sound does.
 */
export interface LooperLightSource {
  /** Patterns fading out under Stop All, timed (the looper store's `fading`). */
  fading(): readonly LooperFading[];
  /** The pattern is a member of the loop again. */
  isPlaying(phraseId: string): boolean;
}

/** The looper store, as the Stage reads it. */
export function looperStoreLight(looper: {
  readonly fading: readonly LooperFading[];
  memberFor(phraseId: string): unknown;
}): LooperLightSource {
  return {
    fading: () => looper.fading,
    isPlaying: (phraseId) => looper.memberFor(phraseId) !== undefined,
  };
}

interface LooperNote {
  phraseId: string;
  /** The ramp it is on, once its pattern has started ending. */
  fade?: MemberFade;
  /** Its pattern was ending when the Stage last looked. */
  ending: boolean;
  /** Its fade was let go without the pattern playing again: dark. */
  dark: boolean;
}

export interface LooperStageLight {
  /**
   * Once a frame, before anything draws: take up fades that began and notice
   * fades that were let go. Notes the Stage no longer `shows` are forgotten.
   */
  update(shows: (noteId: string) => boolean): void;
  /** A note's light this frame, 0 to 1: 1 for every note not on a fade. */
  lightOf(noteId: string, now: number, reducedMotion: boolean): number;
  dispose(): void;
}

export function createLooperStageLight(source: LooperLightSource, events: EventTarget): LooperStageLight {
  const notes = new Map<string, LooperNote>();

  const onPlayed = (event: Event) => {
    const { noteId, phraseId } = (event as CustomEvent).detail ?? {};
    if (typeof noteId !== "string" || typeof phraseId !== "string") return;
    notes.set(noteId, { phraseId, ending: false, dark: false });
  };
  events.addEventListener("note-played", onPlayed);

  return {
    update(shows) {
      if (!notes.size) return;
      const fades = new Map<string, MemberFade>();
      for (const { phraseId, endingMs, endsAt } of source.fading()) {
        fades.set(phraseId, { start: endsAt - endingMs, end: endsAt });
      }
      for (const [noteId, note] of notes) {
        if (!shows(noteId)) {
          notes.delete(noteId);
          continue;
        }
        const fade = fades.get(note.phraseId);
        if (fade) {
          // A second fade reaching a note never lifts it: it keeps the lower ramp, as its voice does.
          note.fade = deeperFade(note.fade, fade);
          note.ending = true;
          continue;
        }
        if (!note.ending) continue;
        note.ending = false;
        if (!source.isPlaying(note.phraseId)) note.dark = true;
      }
    },
    lightOf(noteId, now, reducedMotion) {
      const note = notes.get(noteId);
      if (!note?.fade) return 1;
      return note.dark ? 0 : resolveLooperFadeLight(note.fade, now, reducedMotion);
    },
    dispose() {
      events.removeEventListener("note-played", onPlayed);
      notes.clear();
    },
  };
}
