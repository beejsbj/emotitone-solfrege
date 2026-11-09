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
 * A note is followed from the moment the transport announces it, before it is
 * rendered: the store's state then is the one it sounds under. The Stage draws
 * it later, at its heard time (output latency later), by which time the store
 * may have let its fade go; the note keeps what it learnt. It is followed
 * until it has been heard and the Stage no longer shows it.
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
  /** When it is heard, on `performance.now()`'s clock: it is followed at least until then. */
  heardAt: number;
  /** The ramp it is on, once its pattern has started ending. */
  fade?: MemberFade;
  /** Its pattern was ending when last looked at. */
  ending: boolean;
  /** Its fade was let go without the pattern playing again: dark. */
  dark: boolean;
}

export interface LooperStageLight {
  /**
   * Once a frame, before anything draws: take up fades that began and notice
   * fades that were let go. A note heard by `now` that the Stage no longer
   * `shows` is forgotten.
   */
  update(now: number, shows: (noteId: string) => boolean): void;
  /** A note's light this frame, 0 to 1: 1 for every note not on a fade. */
  lightOf(noteId: string, now: number, reducedMotion: boolean): number;
  /** Notes followed now (for resource-lifetime tests). */
  readonly size: number;
  dispose(): void;
}

/**
 * `announced`: where the transport's note events arrive as it announces them
 * (the window in production). `heard`: where the Stage receives them at heard
 * time (the audible timeline's target), or the same target.
 */
export function createLooperStageLight(
  source: LooperLightSource,
  announced: EventTarget,
  heard: EventTarget = announced,
  now: () => number = () => performance.now(),
): LooperStageLight {
  const notes = new Map<string, LooperNote>();

  const currentFades = () => {
    const fades = new Map<string, MemberFade>();
    for (const { phraseId, endingMs, endsAt } of source.fading()) {
      fades.set(phraseId, { start: endsAt - endingMs, end: endsAt });
    }
    return fades;
  };

  /** Take up its pattern's fade while it is ending; a fade let go without the pattern playing again goes dark. */
  const follow = (note: LooperNote, fades: ReadonlyMap<string, MemberFade>) => {
    const fade = fades.get(note.phraseId);
    if (fade) {
      // A second fade reaching a note never lifts it: it keeps the lower ramp, as its voice does.
      note.fade = deeperFade(note.fade, fade);
      note.ending = true;
      return;
    }
    if (!note.ending) return;
    note.ending = false;
    if (!source.isPlaying(note.phraseId)) note.dark = true;
  };

  const onAnnounced = (event: Event) => {
    const { noteId, phraseId, audibleAt } = (event as CustomEvent).detail ?? {};
    if (typeof noteId !== "string" || typeof phraseId !== "string") return;
    const note: LooperNote = {
      phraseId,
      heardAt: typeof audibleAt === "number" && Number.isFinite(audibleAt) ? audibleAt : now(),
      ending: false,
      dark: false,
    };
    follow(note, currentFades());
    notes.set(noteId, note);
  };
  // Heard and let go on no fade: its light is full whatever happens next, so nothing is kept.
  const onHeardRelease = (event: Event) => {
    const noteId = (event as CustomEvent).detail?.noteId;
    if (typeof noteId === "string" && !notes.get(noteId)?.fade) notes.delete(noteId);
  };
  announced.addEventListener("note-played", onAnnounced);
  heard.addEventListener("note-released", onHeardRelease);

  return {
    update(at, shows) {
      if (!notes.size) return;
      const fades = currentFades();
      for (const [noteId, note] of notes) {
        if (at >= note.heardAt && !shows(noteId)) {
          notes.delete(noteId);
          continue;
        }
        follow(note, fades);
      }
    },
    lightOf(noteId, at, reducedMotion) {
      const note = notes.get(noteId);
      if (!note?.fade) return 1;
      return note.dark ? 0 : resolveLooperFadeLight(note.fade, at, reducedMotion);
    },
    get size() {
      return notes.size;
    },
    dispose() {
      announced.removeEventListener("note-played", onAnnounced);
      heard.removeEventListener("note-released", onHeardRelease);
      notes.clear();
    },
  };
}
