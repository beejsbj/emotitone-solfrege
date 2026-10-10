import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  NotationNoteEventDetail,
  NotationNoteEventName,
} from "@/types/notation";

/** The longest look-ahead honoured between a note event and its audible onset. */
const MAX_AUDIBLE_DELAY_MS = 4000;
/** How long a voice with no known end, and no release, may stay lit. */
const MAX_UNRELEASED_MS = 30_000;

interface Voice {
  key: string;
  id: string;
  index: number;
  /** `performance.now()` ms at which the note is heard. */
  start: number;
  /** When it stops sounding, once known (from its length or its release). */
  end?: number;
  /** The scheduled length, which paces the fill and measures the event's time. */
  lengthMs?: number;
  /** The pass it sounded in; 0 until it has started. */
  pass: number;
}

export interface NotationHighlightOptions {
  /** Phrase note ids per rendered event, in playing order (a rest has none). */
  eventNoteIds: () => readonly (readonly string[])[];
  /** Each event's length in the notation's own units (`@0.25` is 0.25). */
  eventUnits?: () => readonly number[];
  /** Light from note events only while this is true. */
  listening: () => boolean;
  /** Reduced Motion: a sounding note reads full at once; nothing sweeps. */
  still?: () => boolean;
  /** Where note events are dispatched; the window by default. */
  target?: () => EventTarget | undefined;
  /** Called when an event starts sounding, at its audible onset. */
  onActivate?: (eventIndex: number) => void;
  /** The presentation clock; `performance.now()` by default. */
  now?: () => number;
}

/**
 * Lights a phrase's events from typed note events keyed by `sourceNoteId`.
 *
 * A note event only schedules: it says which phrase note will be heard, when
 * (`audibleAt`, the hap's audio onset on the presentation clock) and for how
 * long. A frame clock then reads that schedule, so a note lights on the frame
 * it is heard, its fill and stems sweep with its own sounding time, and a rest
 * fills over its own length once the note before it ends.
 *
 * Within one pass through the loop a note is lit while it sounds and played
 * afterwards. A note heard again, or one earlier in the phrase, starts a new
 * pass, which empties everything before lighting it. The engine is irrelevant:
 * any source of `note-played` / `note-released` events with phrase note ids works.
 */
export function useNotationHighlight(options: NotationHighlightOptions) {
  const now = options.now ?? (() => performance.now());
  // One reactive tick per painted frame while anything is moving; everything
  // the template reads is derived from the schedule at that tick.
  const tick = ref(0);
  // The current pass through the loop, and the furthest event lit in it.
  let pass = 0;
  let passIndex = -1;
  const voices = new Map<string, Voice>();
  const sounding = new Map<string, Voice>();
  const played = new Map<string, Voice>();
  let frame: number | null = null;
  let frameTime = 0;

  function indexOf(id: string) {
    const ids = options.eventNoteIds();
    for (let index = 0; index < ids.length; index++) if (ids[index].includes(id)) return index;
    return -1;
  }

  function reset() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    voices.clear();
    sounding.clear();
    played.clear();
    pass = 0;
    passIndex = -1;
    tick.value++;
  }

  function startPass(index: number) {
    sounding.clear();
    played.clear();
    pass++;
    passIndex = index;
  }

  /** Move the schedule to `time`: onsets in heard order, then endings. */
  function advance(time: number) {
    frameTime = time;
    const due = [...voices.values()]
      .filter((voice) => voice.pass === 0 && voice.start <= time)
      .sort((a, b) => a.start - b.start);
    for (const voice of due) {
      const startsPass = passIndex < 0 || voice.index < passIndex
        || played.has(voice.id) || sounding.has(voice.id);
      if (startsPass) startPass(voice.index);
      else passIndex = Math.max(passIndex, voice.index);
      voice.pass = pass;
      sounding.set(voice.id, voice);
      options.onActivate?.(voice.index);
    }
    for (const [id, voice] of sounding) {
      const end = voice.end ?? voice.start + MAX_UNRELEASED_MS;
      if (end > time) continue;
      sounding.delete(id);
      if (voice.pass === pass) played.set(id, voice);
    }
    // A started voice is kept only while it sounds, for its release to find.
    for (const [key, voice] of voices) {
      if (voice.pass !== 0 && sounding.get(voice.id) !== voice) voices.delete(key);
    }
  }

  /** Keep a frame running while a note sounds, waits to be heard, or a rest fills. */
  function needsFrames() {
    if (voices.size || sounding.size) return true;
    return passIndex >= 0 && restFilling(frameTime);
  }

  function schedule() {
    if (frame !== null || typeof requestAnimationFrame === "undefined") return;
    frame = requestAnimationFrame(() => {
      frame = null;
      advance(now());
      tick.value++;
      if (needsFrames()) schedule();
    });
  }

  function onNoteEvent(event: Event) {
    if (!options.listening()) return;
    const detail = (event as CustomEvent<NotationNoteEventDetail>).detail;
    const id = detail?.sourceNoteId;
    if (!id) return;
    const index = indexOf(id);
    if (index < 0) return;
    const key = `${id}\u0000${String(detail.noteId ?? id)}`;
    const time = now();
    const heard = typeof detail.audibleAt === "number" && Number.isFinite(detail.audibleAt)
      ? Math.min(time + MAX_AUDIBLE_DELAY_MS, detail.audibleAt)
      : time;

    if (event.type === "note-released") {
      const voice = voices.get(key);
      if (!voice) return;
      voice.end = Math.max(voice.start, Math.min(voice.end ?? Infinity, heard));
    } else {
      const lengthMs = Number(detail.durationMs);
      const hasLength = Number.isFinite(lengthMs) && lengthMs > 0;
      voices.set(key, {
        key, id, index, start: heard, pass: 0,
        ...(hasLength ? { lengthMs, end: heard + lengthMs } : {}),
      });
    }
    // An event already due is shown now, not a frame later.
    advance(time);
    tick.value++;
    schedule();
  }

  /** Bar-unit length of a sounded event, from its notes' scheduled lengths. */
  function msPerUnit(index: number, voicesHere: readonly Voice[]) {
    const units = options.eventUnits?.()[index];
    const length = voicesHere.find((voice) => voice.lengthMs !== undefined)?.lengthMs;
    return units && units > 0 && length ? length / units : undefined;
  }

  /**
   * When the rest at `index` starts and how long it lasts, once the event
   * before it has ended this pass. Its length is in the same units as that
   * event, whose scheduled length gives the units their milliseconds.
   */
  function restWindow(index: number) {
    const before = options.eventNoteIds()[index - 1];
    if (!before?.length) return undefined;
    const ended = before.map((id) => played.get(id));
    if (ended.some((voice) => !voice)) return undefined;
    const done = ended as Voice[];
    const from = Math.max(...done.map((voice) => voice.end ?? voice.start));
    const unit = msPerUnit(index - 1, done);
    const units = options.eventUnits?.()[index];
    return { from, lengthMs: unit && units ? unit * units : 0 };
  }

  /** The progress of the rest at `index`, 0 to 1, at `time`. */
  function restAt(index: number, time: number) {
    if (passIndex < 0) return 0;
    if (passIndex > index) return 1;
    const rest = restWindow(index);
    if (!rest) return 0;
    if (options.still?.() || rest.lengthMs <= 0) return 1;
    return clamp((time - rest.from) / rest.lengthMs);
  }

  function restFilling(time: number) {
    const ids = options.eventNoteIds();
    for (let index = passIndex + 1; index < ids.length && !ids[index].length; index++) {
      const rest = restWindow(index);
      if (rest && !options.still?.() && time < rest.from + rest.lengthMs) return true;
    }
    return false;
  }

  const eventNames: NotationNoteEventName[] = ["note-played", "note-released"];
  let boundTarget: EventTarget | undefined;

  function bind() {
    boundTarget = options.target?.() ?? (typeof window === "undefined" ? undefined : window);
    for (const name of eventNames) boundTarget?.addEventListener(name, onNoteEvent);
  }

  function unbind() {
    for (const name of eventNames) boundTarget?.removeEventListener(name, onNoteEvent);
    boundTarget = undefined;
  }

  watch(options.listening, (listening) => {
    if (!listening) reset();
  });

  onMounted(bind);
  onBeforeUnmount(() => {
    unbind();
    reset();
  });

  /** Fill of one phrase note: sweeps 0 to 1 while it sounds, 1 once played this pass. */
  function noteProgress(id: string | undefined): number {
    void tick.value;
    if (!id) return 0;
    if (played.has(id)) return 1;
    const voice = sounding.get(id);
    if (!voice) return 0;
    if (options.still?.() || voice.lengthMs === undefined) return 1;
    return clamp((frameTime - voice.start) / voice.lengthMs);
  }

  function isActive(ids: readonly string[]) {
    void tick.value;
    return ids.some((id) => sounding.has(id));
  }

  /** A rest fills over its own length once the event before it has ended. */
  function restProgress(index: number) {
    void tick.value;
    return restAt(index, frameTime);
  }

  return { noteProgress, isActive, restProgress, reset };
}

function clamp(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** A live `prefers-reduced-motion` flag. */
export function useReducedMotion() {
  const query = typeof window === "undefined"
    ? undefined
    : window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const reduced = ref(query?.matches ?? false);
  const onChange = (event: MediaQueryListEvent) => {
    reduced.value = event.matches;
  };
  onMounted(() => query?.addEventListener?.("change", onChange));
  onBeforeUnmount(() => query?.removeEventListener?.("change", onChange));
  return reduced;
}
