import type { ActiveNote } from "@/types/music";

interface NoteTiming {
  note?: ActiveNote;
  startAt: number;
  endAt?: number;
  attackTimer?: ReturnType<typeof setTimeout>;
  releaseTimer?: ReturnType<typeof setTimeout>;
  expressionTimers: Map<ReturnType<typeof setTimeout>, number>;
  lastExpressionAt?: number;
}

/** A presentation-only projection. Original events, MIDI and recording retain
 * their musical clock; this private target follows the estimated audio output.
 */
export function createAudibleStageTimeline(
  source: EventTarget,
  readNotes: () => readonly ActiveNote[],
  now: () => number = () => performance.now(),
) {
  const eventTarget = new EventTarget();
  const notes = new Map<string, NoteTiming>();
  const knownNotes = new Map<string, ActiveNote>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let disposed = false;

  const cancel = (timer: ReturnType<typeof setTimeout> | undefined) => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timers.delete(timer);
  };
  const at = (timestamp: unknown) => typeof timestamp === "number" && Number.isFinite(timestamp)
    ? timestamp : now();
  const schedule = (timestamp: number, run: () => void) => {
    const delay = timestamp - now();
    if (delay <= 0) {
      run();
      return undefined;
    }
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!disposed) run();
    }, delay);
    timers.add(timer);
    return timer;
  };
  const relay = (event: CustomEvent) => {
    eventTarget.dispatchEvent(new CustomEvent(event.type, { detail: event.detail }));
  };
  const cancelExpressionsAfter = (state: NoteTiming, timestamp: number) => {
    for (const [timer, scheduledAt] of state.expressionTimers) {
      if (scheduledAt >= timestamp) {
        cancel(timer);
        state.expressionTimers.delete(timer);
      }
    }
  };
  const onPlayed = (raw: Event) => {
    const event = raw as CustomEvent;
    const { noteId, audibleAt } = event.detail ?? {};
    const startAt = at(audibleAt);
    if (!noteId) {
      schedule(startAt, () => relay(event));
      return;
    }
    const previous = notes.get(noteId);
    cancel(previous?.attackTimer);
    cancel(previous?.releaseTimer);
    if (previous) cancelExpressionsAfter(previous, -Infinity);
    const note = readNotes().find(candidate => candidate.noteId === noteId);
    const state: NoteTiming = {
      note: note ? { ...note } : undefined,
      startAt,
      expressionTimers: new Map(),
    };
    notes.set(noteId, state);
    state.attackTimer = schedule(startAt, () => {
      state.attackTimer = undefined;
      // A whole short note can pass during a stalled UI frame. Do not flash
      // its attack after the corresponding audible release has already passed.
      if (state.endAt === undefined || state.endAt > now()) relay(event);
    });
  };
  const onReleased = (raw: Event) => {
    const event = raw as CustomEvent;
    const { noteId, audibleAt } = event.detail ?? {};
    const endAt = at(audibleAt);
    if (!noteId) {
      schedule(endAt, () => relay(event));
      return;
    }
    const note = readNotes().find(candidate => candidate.noteId === noteId);
    const state: NoteTiming = notes.get(noteId) ?? {
      note: note ? { ...note } : undefined,
      startAt: note?.audibleAt ?? -Infinity,
      expressionTimers: new Map(),
    };
    if (state.endAt !== undefined && state.endAt <= endAt) return;
    notes.set(noteId, state);
    state.endAt = endAt;
    cancelExpressionsAfter(state, endAt);
    cancel(state.releaseTimer);
    if (endAt <= state.startAt) {
      cancel(state.attackTimer);
      state.attackTimer = undefined;
    }
    state.releaseTimer = schedule(endAt, () => {
      state.releaseTimer = undefined;
      relay(event);
      // Producers may remove their registry entry just after dispatching the
      // release. Retire our snapshot even when the canvas is not animating.
      queueMicrotask(() => {
        if (notes.get(noteId) === state && !readNotes().some(note => note.noteId === noteId)) {
          notes.delete(noteId);
          knownNotes.delete(noteId);
        }
      });
    });
  };
  const onExpression = (raw: Event) => {
    const event = raw as CustomEvent;
    const { noteId, cents, audibleAt } = event.detail ?? {};
    if (!noteId || typeof cents !== "number" || !Number.isFinite(cents) || Math.abs(cents) > 50) return;
    const expressionAt = at(audibleAt);
    const registryNote = readNotes().find(candidate => candidate.noteId === noteId);
    const knownNote = knownNotes.get(noteId);
    const state: NoteTiming | undefined = notes.get(noteId) ?? (registryNote ? {
      note: { ...(knownNote ?? registryNote) },
      startAt: (knownNote ?? registryNote).audibleAt ?? -Infinity,
      expressionTimers: new Map(),
    } satisfies NoteTiming : undefined);
    if (!state || (state.lastExpressionAt !== undefined && expressionAt < state.lastExpressionAt)
      || (state.endAt !== undefined && expressionAt >= state.endAt)) return;
    notes.set(noteId, state);
    state.lastExpressionAt = expressionAt;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      if (timer !== undefined) state.expressionTimers.delete(timer);
      if (notes.get(noteId) !== state || expressionAt < state.startAt
        || (state.endAt !== undefined && expressionAt >= state.endAt)) return;
      if (state.note) state.note = { ...state.note, pitchBendCents: cents };
      relay(event);
    };
    timer = schedule(expressionAt, apply);
    if (timer !== undefined) state.expressionTimers.set(timer, expressionAt);
  };
  source.addEventListener("note-played", onPlayed);
  source.addEventListener("note-released", onReleased);
  source.addEventListener("note-expression", onExpression);

  return {
    eventTarget,
    getActiveNotes(): readonly ActiveNote[] {
      if (disposed) return [];
      const timestamp = now();
      const rawNotes = new Map(readNotes().map(note => [note.noteId, note]));
      for (const noteId of knownNotes.keys()) {
        if (!rawNotes.has(noteId)) knownNotes.delete(noteId);
      }
      const visible = new Map<string, ActiveNote>();
      for (const note of rawNotes.values()) {
        if (!notes.has(note.noteId) && (!Number.isFinite(note.audibleAt) || note.audibleAt! <= timestamp)) {
          visible.set(note.noteId, note);
          knownNotes.set(note.noteId, { ...note });
        }
      }
      for (const [noteId, state] of notes) {
        state.note ??= rawNotes.get(noteId);
        if (state.note && state.startAt <= timestamp && (state.endAt === undefined || state.endAt > timestamp)) {
          visible.set(noteId, state.note);
        }
        if (state.endAt !== undefined && state.endAt <= timestamp && !rawNotes.has(noteId)
          && state.attackTimer === undefined && state.releaseTimer === undefined) notes.delete(noteId);
      }
      return [...visible.values()];
    },
    dispose() {
      disposed = true;
      source.removeEventListener("note-played", onPlayed);
      source.removeEventListener("note-released", onReleased);
      source.removeEventListener("note-expression", onExpression);
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
      notes.clear();
      knownNotes.clear();
    },
  };
}
