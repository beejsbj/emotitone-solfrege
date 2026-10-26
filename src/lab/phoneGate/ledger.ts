/**
 * Attack accounting for the phone gate (BJS-494): the onsets the oracle says
 * a window must sound, against what the worklet's own transport records say
 * it rendered. The records are the engine's receipts: an Attack is announced
 * a lookahead before it sounds; a Cancel withdraws it (a change, or an onset
 * the render thread refused at its frame); a Release earlier than the gate is
 * a forced fade (a voice stolen). With no change made in the window, every
 * Cancel is a refused onset, so attack minus cancel is what was rendered. A
 * voice stolen within its first few milliseconds was never heard as a note:
 * it counts as lost, not rendered.
 */
import { TransportEventKind, type DecodedTransportEvent } from "@/audio/live/transportEvents";
import { expectedOnsets, onsetKey, type ExpectedOnset, type GateMemberTable } from "./oracle";

export interface AttackLedgerResult {
  expected: number;
  /** Expected onsets with a surviving (rendered) attack. */
  rendered: number;
  /** Expected onsets with none. */
  lost: number;
  /** Surviving attacks beyond the first for one expected onset. */
  doubled: number;
  /** Surviving attacks in the window that the oracle did not expect. */
  extra: number;
  /** Attacks withdrawn (refused at render, when no change was made). */
  cancelled: number;
  /** Notes released before their gate ended: a voice was stolen. */
  cutShort: number;
  /** Of those, stolen within STOLEN_AT_ONSET_MS of the onset: counted as lost. */
  stolenAtOnset: number;
  /** Times the event pool overflowed (a stalled main thread); the count is then unreliable. */
  overflows: number;
}

export interface AttackLedger {
  record(event: DecodedTransportEvent): void;
  result(): AttackLedgerResult;
}

export interface LightLedgerResult {
  /** Loop notes rendered in the window (attack minus cancel). */
  sounded: number;
  /** Of those, the ones the Stage was told about (`note-played`). */
  lit: number;
  /**
   * Unlit because their end was already past when the main thread decoded
   * them, by less than the stale threshold: the main thread was behind.
   */
  late: number;
  /**
   * Unlit because the output clock placed them a whole pause early: a stale
   * `getOutputTimestamp()` after a resume (the #198 carried check).
   */
  stale: number;
  /** Unlit with no lateness to explain it. */
  missing: number;
  /** Smallest `audibleAt` lead over its dispatch among lit notes (ms). */
  earliestLeadMs: number | null;
}

/**
 * Which rendered loop notes reached the Stage. The pattern player drops a
 * note whose end has passed by the time its record is decoded ("history, not
 * news"); that happens when the main thread is behind, or when a stale output
 * clock puts the note a whole pause in the past. Each attack is recorded with
 * its end's lead over the decode time, read with the same clock the player
 * reads, so the two causes can be told apart.
 */
export function createLightLedger(options: {
  memberOf(generation: number): string | undefined;
  fromBar: number;
  toBar: number;
  /** An end this far in the past (ms) reads as a stale clock, not a busy thread. */
  staleMs: number;
}) {
  const attacks = new Map<number, number>();
  const cancelled = new Set<number>();
  const lit = new Map<number, number>();
  return {
    /** A transport record; `endLeadMs` is its note's end minus the decode time, on the output clock. */
    record(event: DecodedTransportEvent, endLeadMs: number) {
      if (event.kind === TransportEventKind.Cancel) { cancelled.add(event.serial); return; }
      if (event.kind !== TransportEventKind.Attack && event.kind !== TransportEventKind.Active) return;
      if (event.bar < options.fromBar - 1e-9 || event.bar >= options.toBar - 1e-9) return;
      if (options.memberOf(event.generation) === undefined || attacks.has(event.serial)) return;
      attacks.set(event.serial, endLeadMs);
    },
    /** A `note-played` reached the Stage for this serial, `leadMs` ahead of when it will be heard. */
    lit(serial: number, leadMs: number) {
      if (!lit.has(serial)) lit.set(serial, leadMs);
    },
    result(): LightLedgerResult {
      let sounded = 0, litCount = 0, late = 0, stale = 0, missing = 0;
      let earliestLeadMs: number | null = null;
      for (const [serial, endLead] of attacks) {
        if (cancelled.has(serial)) continue;
        sounded++;
        const lead = lit.get(serial);
        if (lead !== undefined) {
          litCount++;
          if (Number.isFinite(lead)) earliestLeadMs = earliestLeadMs === null ? lead : Math.min(earliestLeadMs, lead);
        } else if (endLead <= -options.staleMs) stale++;
        else if (endLead <= 0) late++;
        else missing++;
      }
      return { sounded, lit: litCount, late, stale, missing, earliestLeadMs };
    },
  };
}

/** A voice released this soon after its onset was never heard as a note (ms). */
export const STOLEN_AT_ONSET_MS = 5;

export function createAttackLedger(options: {
  expected: readonly ExpectedOnset[];
  /** The member a table generation belongs to; undefined for tables outside the gate. */
  memberOf(generation: number): string | undefined;
  fromBar: number;
  toBar: number;
  /** The render rate, to tell a voice stolen at its onset from one cut short later. */
  sampleRate: number;
}): AttackLedger {
  const attacks = new Map<number, { key: string; frame: number; gate: number }>();
  const cancelled = new Set<number>();
  const cut = new Set<number>();
  const stolen = new Set<number>();
  const onsetFrames = options.sampleRate * STOLEN_AT_ONSET_MS / 1000;
  let overflows = 0;

  function attack(event: DecodedTransportEvent) {
    if (attacks.has(event.serial)) return;
    if (event.bar < options.fromBar - 1e-9 || event.bar >= options.toBar - 1e-9) return;
    const memberId = options.memberOf(event.generation);
    if (memberId === undefined) return;
    attacks.set(event.serial, { key: onsetKey(memberId, event.noteIndex, event.bar), frame: event.frame, gate: event.length });
  }

  return {
    record(event) {
      switch (event.kind) {
        case TransportEventKind.Attack:
        case TransportEventKind.Active:
          attack(event);
          return;
        case TransportEventKind.Cancel:
          if (attacks.has(event.serial)) cancelled.add(event.serial);
          return;
        case TransportEventKind.Release: {
          const onset = attacks.get(event.serial);
          // One frame of slack: a gate end is rounded to a whole frame.
          if (!onset || event.frame >= onset.frame + onset.gate - 1) return;
          cut.add(event.serial);
          if (event.frame - onset.frame < onsetFrames) stolen.add(event.serial);
          return;
        }
        case TransportEventKind.SnapshotBegin:
          overflows++;
          return;
      }
    },
    result() {
      const counts = new Map<string, number>();
      for (const [serial, onset] of attacks) {
        if (cancelled.has(serial) || stolen.has(serial)) continue;
        counts.set(onset.key, (counts.get(onset.key) ?? 0) + 1);
      }
      const expectedKeys = new Set(options.expected.map(onset => onsetKey(onset.memberId, onset.noteIndex, onset.bar)));
      let rendered = 0;
      let doubled = 0;
      let extra = 0;
      for (const key of expectedKeys) {
        const count = counts.get(key) ?? 0;
        if (count) rendered++;
        if (count > 1) doubled += count - 1;
      }
      for (const [key, count] of counts) if (!expectedKeys.has(key)) extra += count;
      return { expected: expectedKeys.size, rendered, lost: expectedKeys.size - rendered, doubled, extra,
        cancelled: cancelled.size, cutShort: cut.size, stolenAtOnset: stolen.size, overflows };
    },
  };
}

/**
 * The soak's attack accounting, kept as records and judged over any prefix of
 * its window: a run stopped mid-soak still counts the bars it reached.
 */
export function createSoakAccount(options: {
  tables: readonly GateMemberTable[];
  memberOf(generation: number): string | undefined;
  fromBar: number;
  sampleRate: number;
}) {
  const records: DecodedTransportEvent[] = [];
  return {
    record(event: DecodedTransportEvent) { records.push({ ...event }); },
    /** The ledger over bars [fromBar, toBar). */
    result(toBar: number): AttackLedgerResult & { bars: number } {
      const ledger = createAttackLedger({ expected: expectedOnsets(options.tables, options.fromBar, toBar),
        memberOf: options.memberOf, fromBar: options.fromBar, toBar, sampleRate: options.sampleRate });
      records.forEach(ledger.record);
      return { ...ledger.result(), bars: toBar - options.fromBar };
    },
  };
}
