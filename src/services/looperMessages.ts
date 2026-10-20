/**
 * What the Looper says when it cannot do what was asked: every cause mapped
 * to one plain, short line in one place. A message names the instrument as
 * the picker shows it ("Piano", never "gm_piano"), and fits one line of the
 * deck's notice strip at 390 px; when a name would not fit, the line drops
 * it for a generic one ("Sound didn't load").
 */
import { displayInstrumentName } from "@/data/instruments";

/**
 * The longest line the notice strip shows whole at 390 px: its text box
 * there is 238px of 12px mono, about 33 characters (measured in Chromium).
 */
export const LOOPER_MESSAGE_MAX = 32;

export type LooperFailureKind =
  | "bank-cap" // every live instrument slot is held by a playing pattern or key
  | "load" // the instrument's samples could not load
  | "unsupported" // the instrument cannot play on the worklet engine
  | "interrupted" // the transport stopped by itself (an engine failure)
  | "restarting" // a take could not join while the engine restored itself
  | "not-ready" // no pattern player yet
  | "unknown";

export interface LooperFailure {
  kind: LooperFailureKind;
  /** The instrument id involved, when there is one. */
  instrument?: string;
}

/** Thrown by the Looper when Play is asked for before there is a pattern player. */
export class LooperNotReady extends Error {
  constructor() {
    super("The pattern player is not ready");
    this.name = "LooperNotReady";
  }
}

/** The pattern player's load error, read structurally (no audio imports here). */
interface LoadErrorLike { name?: string; retryable?: boolean; budget?: boolean }

/** Classify a thrown error from the pattern player or the Looper store. */
export function looperFailureOf(error: unknown, instrument?: string): LooperFailure {
  if (error instanceof LooperNotReady) return { kind: "not-ready" };
  const load = error as LoadErrorLike | null;
  if (load && typeof load === "object" && load.name === "PatternLoadError") {
    if (load.budget) return { kind: "bank-cap", instrument };
    if (load.retryable) return { kind: "load", instrument };
    return { kind: "unsupported", instrument };
  }
  return { kind: "unknown", instrument };
}

/** "gm_acoustic_guitar_nylon" reads "Acoustic guitar nylon", as in the picker. */
export function instrumentName(instrument: string): string {
  const name = displayInstrumentName(instrument).replace(/_/g, " ").trim();
  return name ? name[0].toUpperCase() + name.slice(1) : "That sound";
}

/** The named line when it fits, else the generic one. */
function fit(named: (name: string) => string, generic: string, instrument?: string): string {
  if (!instrument) return generic;
  const line = named(instrumentName(instrument));
  return line.length <= LOOPER_MESSAGE_MAX ? line : generic;
}

export function looperMessage(failure: LooperFailure): string {
  switch (failure.kind) {
    case "bank-cap":
      return fit((name) => `Stop a loop to add ${name}.`, "Too many loops. Stop one first.", failure.instrument);
    case "load":
      return fit((name) => `${name} didn't load. Try again.`, "Sound didn't load. Try again.", failure.instrument);
    case "unsupported":
      return fit((name) => `${name} can't loop yet.`, "That sound can't loop yet.", failure.instrument);
    case "interrupted":
      return "Audio stopped. Tap Play again.";
    case "restarting":
      return "Audio restarted. Tap Play again.";
    case "not-ready":
      return "Audio not ready. Try again.";
    case "unknown":
      return "That didn't play. Try again.";
  }
}
