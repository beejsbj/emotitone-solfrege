import { describe, expect, it } from "vitest";
import { PatternLoadError } from "@/services/patternTransport";
import {
  LOOPER_MESSAGE_MAX,
  LooperNotReady,
  looperFailureOf,
  looperMessage,
  type LooperFailureKind,
} from "@/services/looperMessages";

/**
 * Every Looper message is plain and short, fits one line of the deck's notice
 * strip at 390 px, and names an instrument as the player knows it, never by id.
 */
const KINDS: LooperFailureKind[] = ["bank-cap", "load", "unsupported", "interrupted", "restarting", "not-ready", "unknown"];
const INSTRUMENTS = [
  undefined,
  "gm_piano",
  "gm_acoustic_guitar_nylon",
  "gm_electric_guitar_muted",
  "gm_string_ensemble_1",
  "gm_lead_8_bass_lead",
  "gm_pad_3_polysynth",
  "sawtooth",
  "triangle",
  "supersaw",
];

describe("Looper messages", () => {
  it("never shows an instrument id, and every line fits the strip's budget", () => {
    for (const kind of KINDS) {
      for (const instrument of INSTRUMENTS) {
        const message = looperMessage({ kind, instrument });
        expect(message.length, message).toBeLessThanOrEqual(LOOPER_MESSAGE_MAX);
        expect(message, message).not.toMatch(/gm_|_/);
        if (instrument) expect(message).not.toContain(instrument);
        // One plain sentence or two, no codes or internals.
        expect(message).toMatch(/^[A-Z][A-Za-z0-9 ,.']+$/);
      }
    }
  });

  it("names the instrument as it reads in the picker, when the line has room", () => {
    expect(looperMessage({ kind: "bank-cap", instrument: "gm_piano" })).toBe("Stop a loop to add Piano.");
    expect(looperMessage({ kind: "load", instrument: "gm_piano" })).toBe("Piano didn't load. Try again.");
    expect(looperMessage({ kind: "unsupported", instrument: "sawtooth" })).toBe("Sawtooth can't loop yet.");
    // A long name falls back to the generic line instead of spilling.
    expect(looperMessage({ kind: "load", instrument: "gm_acoustic_guitar_nylon" })).toBe("Sound didn't load. Try again.");
  });

  it("maps each cause to its message in one place", () => {
    const piano = "gm_piano";
    expect(looperFailureOf(new PatternLoadError("bank cap", false, true), piano)).toEqual({ kind: "bank-cap", instrument: piano });
    expect(looperFailureOf(new PatternLoadError("fetch failed", true), piano)).toEqual({ kind: "load", instrument: piano });
    expect(looperFailureOf(new PatternLoadError("no bank", false), piano)).toEqual({ kind: "unsupported", instrument: piano });
    expect(looperFailureOf(new LooperNotReady())).toEqual({ kind: "not-ready" });
    expect(looperFailureOf(new Error("gm_piano exploded"), piano)).toEqual({ kind: "unknown", instrument: piano });
    // A raw error's text never reaches the player.
    expect(looperMessage(looperFailureOf(new Error("gm_piano exploded"), piano))).toBe("That didn't play. Try again.");
    expect(looperMessage({ kind: "interrupted" })).toBe("Audio stopped. Tap Play again.");
    expect(looperMessage({ kind: "restarting" })).toBe("Audio restarted. Tap Play again.");
  });
});
