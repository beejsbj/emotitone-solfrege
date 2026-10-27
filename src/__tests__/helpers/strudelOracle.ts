/**
 * What strudel.cc makes of the app's exported text, recorded (BJS-495).
 *
 * The notation suites used to evaluate the generated code with the installed
 * Strudel packages, to prove the text plays what was recorded. Strudel left
 * the app, so each evaluation those suites made was recorded once with
 * Strudel 1.2.6 (core, mini, transpiler, tonal) into
 * `fixtures/strudel-oracle.json`, keyed by the exact code text and query
 * window. The suites now read Strudel's answer from there.
 *
 * A text the app no longer writes has no recorded answer, so the lookup
 * fails: a change to the exported text cannot pass silently. If it is meant,
 * record the new text's evaluation with Strudel (strudel.cc, or the packages
 * in a scratch checkout) and add it to the fixture with the reason.
 */
import recorded from "../fixtures/strudel-oracle.json";

export interface OracleHap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  whole: { begin: number; end: number; duration: number };
  context: { locations?: { start: number; end: number }[] };
  hasOnset(): boolean;
}

interface RecordedHap {
  value: unknown;
  /** begin, end and duration in cycles, as Strudel computed them. */
  whole: [number, number, number];
  onset: boolean;
  locations?: { start: number; end: number }[];
}

const table = recorded as unknown as Record<string, RecordedHap[]>;

function lookup(parts: unknown[]): OracleHap[] {
  const key = JSON.stringify(parts);
  const haps = table[key];
  if (!haps) {
    throw new Error(`No recorded Strudel evaluation for this exact text and window; the exported text changed:\n${key}`);
  }
  return haps.map((hap) => ({
    value: structuredClone(hap.value),
    whole: { begin: hap.whole[0], end: hap.whole[1], duration: hap.whole[2] },
    context: hap.locations ? { locations: hap.locations } : {},
    hasOnset: () => hap.onset,
  }));
}

/**
 * Strudel's onsets for a complete generated text, as the REPL evaluates it,
 * over [from, to) cycles. Only onsets were recorded.
 */
export function evaluateStrudel(code: string, from: number, to: number): OracleHap[] {
  return lookup(["code", code, from, to]);
}

/** Strudel's haps for a mini-notation body read through `.as(keys)`, over [from, to) cycles. */
export function evaluateMini(keys: string[], source: string, from: number, to: number): OracleHap[] {
  return lookup(["mini", keys, source, from, to]);
}
