import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type {
  NotationNoteEventDetail,
  NotationNoteEventName,
} from "@/types/notation";

/** The longest look-ahead honoured between a note event and its audible onset. */
const MAX_AUDIBLE_DELAY_MS = 4000;

interface ActiveNote {
  voice: string;
  durationMs: number;
}

export interface NotationHighlightOptions {
  /** Phrase note ids per rendered event, in playing order (a rest has none). */
  eventNoteIds: () => readonly (readonly string[])[];
  /** Light from note events only while this is true. */
  listening: () => boolean;
  /** Where note events are dispatched; the window by default. */
  target?: () => EventTarget | undefined;
  /** Called when an event starts sounding, after its audible delay. */
  onActivate?: (eventIndex: number) => void;
}

/**
 * Lights a phrase's events from typed note events keyed by `sourceNoteId`.
 *
 * Within one pass through the loop, a note is active from its audible onset
 * until its release and played afterwards. A note sounding again, or one
 * earlier in the phrase, starts a new pass. The engine is irrelevant: any
 * source of `note-played` / `note-released` events with phrase note ids works.
 */
export function useNotationHighlight(options: NotationHighlightOptions) {
  const active = shallowRef<ReadonlyMap<string, ActiveNote>>(new Map());
  const played = shallowRef<ReadonlySet<string>>(new Set());
  const passIndex = ref(-1);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let deferredFrame: number | null = null;
  let deferred: Array<{ key: string; run: () => void }> = [];

  const indexById = computed(() => {
    const indexes = new Map<string, number>();
    options.eventNoteIds().forEach((ids, index) => {
      for (const id of ids) indexes.set(id, index);
    });
    return indexes;
  });

  function reset() {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    if (deferredFrame !== null) cancelAnimationFrame(deferredFrame);
    deferredFrame = null;
    deferred = [];
    if (active.value.size) active.value = new Map();
    if (played.value.size) played.value = new Set();
    passIndex.value = -1;
  }

  function commit(id: string, note: ActiveNote, index: number) {
    const next = new Map(active.value);
    next.set(id, note);
    active.value = next;
    passIndex.value = Math.max(passIndex.value, index);
    options.onActivate?.(index);
  }

  // A new pass first paints its events empty, then lights them on a later
  // frame, so each fill starts from nothing instead of staying full.
  function defer(key: string, run: () => void) {
    deferred.push({ key, run });
    if (deferredFrame !== null) return;
    deferredFrame = requestAnimationFrame(() => {
      deferredFrame = requestAnimationFrame(() => {
        deferredFrame = null;
        const tasks = deferred;
        deferred = [];
        for (const task of tasks) task.run();
      });
    });
  }

  function activate(id: string, note: ActiveNote) {
    const index = indexById.value.get(id);
    if (index === undefined) return;
    const startsPass = index < passIndex.value || played.value.has(id) || active.value.has(id);
    if (startsPass) {
      // A note still ringing from the last pass belongs to that pass; its
      // late release must not mark it played in this one.
      played.value = new Set();
      active.value = new Map();
      passIndex.value = index;
    }
    if (startsPass || deferredFrame !== null) {
      defer(voiceKey(id, note.voice), () => commit(id, note, index));
    }
    else commit(id, note, index);
  }

  function release(id: string, voice: string) {
    const key = voiceKey(id, voice);
    const pending = timers.get(key);
    if (pending !== undefined) {
      clearTimeout(pending);
      timers.delete(key);
    }
    const deferredCount = deferred.length;
    deferred = deferred.filter((task) => task.key !== key);
    // A note released before it lit (very short, or within a repaint) has
    // still sounded in this pass.
    const wasPending = pending !== undefined || deferred.length !== deferredCount;
    const current = active.value.get(id);
    if (current && current.voice !== voice) return;
    if (!current && !wasPending) return;
    if (current) {
      const next = new Map(active.value);
      next.delete(id);
      active.value = next;
    }
    if (played.value.has(id)) return;
    const next = new Set(played.value);
    next.add(id);
    played.value = next;
  }

  function onNoteEvent(event: Event) {
    if (!options.listening()) return;
    const detail = (event as CustomEvent<NotationNoteEventDetail>).detail;
    const id = detail?.sourceNoteId;
    if (!id || !indexById.value.has(id)) return;
    const voice = String(detail.noteId ?? id);

    if (event.type === "note-released") {
      release(id, voice);
      return;
    }

    const note = { voice, durationMs: Math.max(0, Number(detail.durationMs) || 0) };
    const delay = typeof detail.audibleAt === "number" && Number.isFinite(detail.audibleAt)
      ? Math.min(MAX_AUDIBLE_DELAY_MS, Math.max(0, detail.audibleAt - performance.now()))
      : 0;
    if (delay < 1) {
      activate(id, note);
      return;
    }
    const key = voiceKey(id, voice);
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      activate(id, note);
    }, delay));
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

  /** Fill state of one phrase note: 1 once it has sounded in this pass. */
  function noteProgress(id: string | undefined): number {
    if (!id) return 0;
    return active.value.has(id) || played.value.has(id) ? 1 : 0;
  }

  function isActive(ids: readonly string[]) {
    return ids.some((id) => active.value.has(id));
  }

  /** The newest active note's sounding length, which paces its event's fill. */
  function activeDurationMs(ids: readonly string[]) {
    let duration: number | undefined;
    for (const id of ids) {
      const note = active.value.get(id);
      if (note) duration = note.durationMs;
    }
    return duration;
  }

  /** A rest is passed once a later event sounds or the event before it ends. */
  function restProgress(index: number) {
    if (passIndex.value < 0) return 0;
    if (passIndex.value > index) return 1;
    const before = options.eventNoteIds()[index - 1];
    return before?.length && before.every((id) => played.value.has(id) && !active.value.has(id))
      ? 1
      : 0;
  }

  return { noteProgress, isActive, activeDurationMs, restProgress, reset };
}

function voiceKey(id: string, voice: string) {
  return `${id}\u0000${voice}`;
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
