import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { HeardClock } from "@/services/heardClock";
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
  /** Milliseconds per notation unit at the playing tempo, when known. */
  unitMs?: () => number | undefined;
  /** Light from note events only while this is true. */
  listening: () => boolean;
  /** Reduced Motion: a sounding note reads full at once; nothing sweeps. */
  still?: () => boolean;
  /** Where note events are dispatched; the window by default. */
  target?: () => EventTarget | undefined;
  /** Called when an event starts sounding, at its audible onset. */
  onActivate?: (eventIndex: number) => void;
  /**
   * The presentation clock; `performance.now()` by default. Give the clock of
   * what is heard (it stands still while audio is suspended) to keep the
   * highlight with the sound.
   */
  clock?: Pick<HeardClock, "now" | "fromPerformance">;
}

/** What an event reads to show its own highlight state. */
export interface NotationHighlightSource {
  noteProgress: (id: string | undefined) => number;
  isActive: (ids: readonly string[]) => boolean;
  restProgress: (index: number) => number;
  /** How far the event at `index` is through its own time: a chord's whole block. */
  eventProgress: (index: number) => number;
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
  const now = () => options.clock?.now() ?? performance.now();
  // An event's `audibleAt` is on the wall clock; the schedule is kept on `now`'s.
  const onClock = (time: number) => options.clock?.fromPerformance(time) ?? time;
  // `version` moves when something starts, ends or a pass begins; `frame`
  // moves every painted frame. Only a value that sweeps with time reads
  // `frame`, so a long phrase re-renders just its sounding event per frame.
  const version = ref(0);
  const frame = ref(0);
  // The current pass through the loop, and the furthest event lit in it.
  let pass = 0;
  let passIndex = -1;
  const voices = new Map<string, Voice>();
  const sounding = new Map<string, Voice>();
  const played = new Map<string, Voice>();
  let frameRequest: number | null = null;
  let frameTime = 0;
  // Milliseconds per notation unit, learned from a lone note's scheduled
  // length: the clock a chord block's time is measured on when the playing
  // tempo is not supplied.
  let learnedUnitMs: number | undefined;
  const unitClock = () => {
    const given = options.unitMs?.();
    return given && given > 0 ? given : learnedUnitMs;
  };

  function indexOf(id: string) {
    const ids = options.eventNoteIds();
    for (let index = 0; index < ids.length; index++) if (ids[index].includes(id)) return index;
    return -1;
  }

  function reset() {
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = null;
    voices.clear();
    sounding.clear();
    played.clear();
    pass = 0;
    passIndex = -1;
    learnedUnitMs = undefined;
    version.value++;
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
    let changed = false;
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
      changed = true;
      options.onActivate?.(voice.index);
    }
    for (const [id, voice] of sounding) {
      const end = voice.end ?? voice.start + MAX_UNRELEASED_MS;
      if (end > time) continue;
      sounding.delete(id);
      if (voice.pass === pass) played.set(id, voice);
      changed = true;
    }
    // A started voice is kept only while it sounds, for its release to find.
    for (const [key, voice] of voices) {
      if (voice.pass !== 0 && sounding.get(voice.id) !== voice) voices.delete(key);
    }
    if (changed) version.value++;
    frame.value++;
  }

  /** Keep a frame running while a note sounds, waits to be heard, or a rest fills. */
  function needsFrames() {
    if (voices.size || sounding.size) return true;
    return passIndex >= 0 && restFilling(frameTime);
  }

  function schedule() {
    if (frameRequest !== null || typeof requestAnimationFrame === "undefined") return;
    frameRequest = requestAnimationFrame(() => {
      frameRequest = null;
      // A clock that stands still (audio suspended) changes nothing to repaint.
      const time = now();
      if (time !== frameTime) advance(time);
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
      ? Math.min(time + MAX_AUDIBLE_DELAY_MS, onClock(detail.audibleAt))
      : time;

    if (event.type === "note-released") {
      const voice = voices.get(key);
      if (!voice) return;
      voice.end = Math.max(voice.start, Math.min(voice.end ?? Infinity, heard));
    } else {
      const lengthMs = Number(detail.durationMs);
      const hasLength = Number.isFinite(lengthMs) && lengthMs > 0;
      const units = options.eventUnits?.()[index];
      if (hasLength && units && units > 0 && options.eventNoteIds()[index].length === 1) {
        learnedUnitMs = lengthMs / units;
      }
      voices.set(key, {
        key, id, index, start: heard, pass: 0,
        ...(hasLength ? { lengthMs, end: heard + lengthMs } : {}),
      });
    }
    // An event already due is shown now, not a frame later.
    advance(time);
    version.value++;
    schedule();
  }

  /**
   * When an event's block of time starts and ends this pass, from the voices
   * heard in it. A chord's members can differ in length; the block lasts
   * from its first onset to its last ending, and never less than its
   * notation length on the unit clock, so it keeps its whole length before
   * a later member is heard.
   */
  function blockWindow(index: number, voicesHere: readonly Voice[]) {
    const timed = voicesHere.filter((voice) => voice.lengthMs !== undefined || voice.end !== undefined);
    if (!timed.length) return undefined;
    const from = Math.min(...timed.map((voice) => voice.start));
    let to = Math.max(...timed.map((voice) => voice.start + (voice.lengthMs ?? voice.end! - voice.start)));
    const units = options.eventUnits?.()[index];
    const unit = unitClock();
    if (unit && units && units > 0) to = Math.max(to, from + unit * units);
    return to > from ? { from, to } : undefined;
  }

  /** Milliseconds per notation unit for a sounded event, from its own block. */
  function msPerUnit(index: number, voicesHere: readonly Voice[]) {
    const units = options.eventUnits?.()[index];
    const block = blockWindow(index, voicesHere);
    return units && units > 0 && block ? (block.to - block.from) / units : undefined;
  }

  /** The voices of an event heard so far this pass, sounding or played. */
  function heardVoices(ids: readonly string[]) {
    const heard: Voice[] = [];
    for (const id of ids) {
      const voice = sounding.get(id) ?? played.get(id);
      if (voice) heard.push(voice);
    }
    return heard;
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
  function restAt(index: number, time: number, sweeping?: () => void) {
    if (passIndex < 0) return 0;
    if (passIndex > index) return 1;
    const rest = restWindow(index);
    if (!rest) return 0;
    if (options.still?.() || rest.lengthMs <= 0) return 1;
    sweeping?.();
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
    void version.value;
    if (!id) return 0;
    if (played.has(id)) return 1;
    const voice = sounding.get(id);
    if (!voice) return 0;
    if (options.still?.() || voice.lengthMs === undefined) return 1;
    void frame.value;
    return clamp((frameTime - voice.start) / voice.lengthMs);
  }

  function isActive(ids: readonly string[]) {
    void version.value;
    return ids.some((id) => sounding.has(id));
  }

  /** A rest fills over its own length once the event before it has ended. */
  function restProgress(index: number) {
    void version.value;
    return restAt(index, frameTime, () => void frame.value);
  }

  /**
   * How far an event is through its own block of time, 0 to 1: what its
   * stems and hold show. For a lone note that is its fill; a chord's block
   * runs from its first onset to its last member's end, whatever its voicing.
   */
  function eventProgress(index: number) {
    void version.value;
    const ids = options.eventNoteIds()[index] ?? [];
    if (!ids.length) return restProgress(index);
    if (ids.length === 1) return noteProgress(ids[0]);
    const heard = heardVoices(ids);
    if (!heard.length) return 0;
    if (ids.every((id) => played.has(id))) return 1;
    if (options.still?.()) return 1;
    const block = blockWindow(index, heard);
    if (!block) return 1;
    void frame.value;
    return clamp((frameTime - block.from) / (block.to - block.from));
  }

  const source: NotationHighlightSource = { noteProgress, isActive, restProgress, eventProgress };
  return { ...source, source, reset };
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
