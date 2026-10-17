/**
 * The playing set and saved Loops. Like phraseBook, operations mutate their
 * argument in place; queries are read-only. No recorder, UI or audio effects.
 */
import { categoriseInstrument } from "@/data/instrumentCatalog";
import { findPhrase, resolveBpm } from "@/domain/phraseBook";
import type {
  JoinPlacement, KeyMode, Loop, Looper, LooperRate, NewLoopId, PlayingPattern,
} from "@/types/looper";
import type { Phrase, PhraseBook } from "@/types/phrases";

const QUARTER_BAR_GRACE = 0.25;
const MAX_NAME_LENGTH = 80;

export function createLooper(): Looper {
  return { members: [], bpm: null, barOriginBars: null, soloId: null, latched: false };
}

/** Unknown sounds conservatively keep their captured tuning too. */
function alwaysPinned(phrase: Phrase): boolean {
  return categoriseInstrument(phrase.context.instrument) === null;
}

/** Preserve authored silence; only a ringing note can use the quarter-bar grace. */
export function phraseLengthBars(phrase: Phrase): number {
  const barMs = 240000 / resolveBpm(phrase.context.bpm);
  const releaseMs = phrase.notes.reduce((end, note) => Math.max(end, note.releaseTime), 0);
  const endMs = Math.max(phrase.duration, releaseMs);
  const bars = endMs / barMs;
  const boundary = Math.floor(bars);
  const overhang = bars - boundary;
  const ringing = releaseMs >= phrase.duration
    && phrase.notes.length > 0
    && phrase.notes.every((note) => note.pressTime < boundary * barMs);
  return Math.max(1, ringing && overhang <= QUARTER_BAR_GRACE ? boundary : Math.ceil(bars));
}

export function join(looper: Looper, phrase: Phrase, placement: JoinPlacement): PlayingPattern {
  const existing = looper.members.find((member) => member.phraseId === phrase.id);
  if (existing) return existing;
  const origin = placement.kind === "played" ? placement.phraseOriginBars : 0;
  if (!Number.isFinite(origin)) throw new RangeError("Phrase origin must be finite bars");
  if (!looper.members.length) {
    looper.bpm = resolveBpm(phrase.context.bpm);
    looper.barOriginBars = origin;
  }
  const member: PlayingPattern = {
    phraseId: phrase.id,
    offsetBars: placement.kind === "played" ? origin - looper.barOriginBars! : 0,
    lengthBars: phraseLengthBars(phrase),
    muted: false,
    pinned: alwaysPinned(phrase),
    rate: 1,
  };
  looper.members.push(member);
  return member;
}

export function leave(looper: Looper, phraseId: string): boolean {
  if (!isPlaying(looper, phraseId)) return false;
  looper.members = looper.members.filter((member) => member.phraseId !== phraseId);
  if (looper.soloId === phraseId) looper.soloId = null;
  if (!looper.members.length) {
    looper.bpm = null;
    looper.barOriginBars = null;
  }
  return true;
}

export function toggleMute(looper: Looper, phraseId: string): boolean {
  const member = looper.members.find((member) => member.phraseId === phraseId);
  if (!member) return false;
  member.muted = !member.muted;
  return true;
}

export function toggleSolo(looper: Looper, phraseId: string): boolean {
  if (!isPlaying(looper, phraseId)) return false;
  looper.soloId = looper.soloId === phraseId ? null : phraseId;
  return true;
}

export function setRate(looper: Looper, phraseId: string, rate: LooperRate): boolean {
  if (rate !== 0.5 && rate !== 1 && rate !== 2) return false;
  const member = looper.members.find((member) => member.phraseId === phraseId);
  if (!member) return false;
  member.rate = rate;
  return true;
}

/** Takes the source phrase so unpitched sounds cannot be unpinned. */
export function setPinned(looper: Looper, phrase: Phrase, pinned: boolean): boolean {
  const member = looper.members.find((member) => member.phraseId === phrase.id);
  if (!member) return false;
  member.pinned = alwaysPinned(phrase) || pinned;
  return true;
}

export function setOffset(looper: Looper, phraseId: string, offsetBars: number): boolean {
  if (!Number.isFinite(offsetBars)) return false;
  const member = looper.members.find((member) => member.phraseId === phraseId);
  if (!member) return false;
  member.offsetBars = offsetBars;
  return true;
}

/** Membership, including muted and non-solo members, owns phase and read-only status. */
export function isPlaying(looper: Looper, phraseId: string): boolean {
  return looper.members.some((member) => member.phraseId === phraseId);
}

/** Mute wins over solo. Solo never rewrites individual mute flags. */
export function audible(looper: Looper): PlayingPattern[] {
  return looper.members.filter((member) => !member.muted
    && (looper.soloId === null || member.phraseId === looper.soloId));
}

/** The longest stored length, not the LCM; rates only change individual playback cycles. */
export function periodBars(looper: Looper): number {
  return looper.members.reduce((longest, member) => Math.max(longest, member.lengthBars), 0);
}

/** Ask at note press, before the recorder writes anything into the desk phrase. */
export function mustOpenFreshTake(looper: Looper, deskPhraseId: string | null): boolean {
  return deskPhraseId !== null && isPlaying(looper, deskPhraseId);
}

export function effectiveKeyMode(member: PlayingPattern, phrase: Phrase, live: KeyMode): KeyMode {
  const context = member.pinned || alwaysPinned(phrase) ? phrase.context : live;
  return { key: context.key, mode: context.mode };
}

/** Stop All also releases the latch. Leaving the last member alone preserves it. */
export function clear(looper: Looper): void {
  Object.assign(looper, createLooper());
}

// ─── Saved Loops ─────────────────────────────────────────────────────────────

const createLoopId: NewLoopId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

export function saveLoop(
  book: PhraseBook,
  looper: Looper,
  nextName: string,
  now: number,
  newId: NewLoopId = createLoopId,
): string | null {
  const name = nextName.trim().slice(0, MAX_NAME_LENGTH);
  if (!name || !looper.members.length) return null;
  const loop: Loop = {
    id: newId("loop"), name,
    members: looper.members.map((member) => ({ ...member })),
    createdAt: now, updatedAt: now,
  };
  book.loops.push(loop);
  return loop.id;
}

/**
 * A new session at bar zero, using the first member's recorded BPM. Pass the
 * static library to resolve built-in pointers. Missing pointers refuse the
 * entire open (null), rather than silently restoring an incomplete Loop.
 */
export function openLoop(book: PhraseBook, id: string, library: readonly Phrase[] = []): Looper | null {
  const loop = book.loops.find((loop) => loop.id === id);
  if (!loop) return null;
  const phrases = loop.members.map((member) => findPhrase(book, member.phraseId, library));
  if (phrases.some((phrase) => !phrase)) return null;
  const looper = createLooper();
  looper.members = loop.members.map((member) => ({ ...member }));
  if (phrases.length) {
    looper.bpm = resolveBpm(phrases[0]!.context.bpm);
    looper.barOriginBars = 0;
  }
  return looper;
}

export function renameLoop(book: PhraseBook, id: string, nextName: string, now: number): boolean {
  const loop = book.loops.find((loop) => loop.id === id);
  const name = nextName.trim().slice(0, MAX_NAME_LENGTH);
  if (!loop || !name) return false;
  loop.name = name;
  loop.updatedAt = now;
  return true;
}

export function deleteLoop(book: PhraseBook, id: string): boolean {
  const index = book.loops.findIndex((loop) => loop.id === id);
  if (index < 0) return false;
  book.loops.splice(index, 1);
  return true;
}

export function protectedPhraseIds(book: PhraseBook, looper: Looper): Set<string> {
  return new Set([
    ...looper.members.map((member) => member.phraseId),
    ...book.loops.flatMap((loop) => loop.members.map((member) => member.phraseId)),
  ]);
}
