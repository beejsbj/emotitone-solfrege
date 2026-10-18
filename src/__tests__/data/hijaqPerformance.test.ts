import { describe, expect, it } from "vitest";
import { m } from "@strudel/mini";
import { transpiler } from "@strudel/transpiler";
import "@strudel/tonal";
import { defaultPatterns } from "@/data/patterns";
import { logNotesToStrudel } from "@/services/StrudelNotation";
import type { LogNote } from "@/types/patterns";

describe("hijaq performance playback", () => {
  it("plays the complete library arrangement with independent overlapping gates and dynamics", () => {
    const pattern = defaultPatterns.find(p => p.id === "pattern-hijaq-just-turn-it-on-1")!;
    const notes: LogNote[] = pattern.notes.map(note => ({
      ...note,
      key: pattern.key,
      mode: pattern.mode,
      instrument: pattern.instrument,
      sessionId: "authored-performance",
      solfege: { name: "Do", number: 1, emotion: "neutral", description: "", texture: "" },
    }));
    const code = logNotesToStrudel(notes, {
      bpm: pattern.bpm, sourceBpm: pattern.bpm,
      sound: pattern.instrument, shape: pattern.shape,
      patternDurationMs: pattern.duration,
    });
    const { output } = transpiler(code);
    const playback = new Function("m", output)(m);
    const events = playback.queryArc(0, pattern.duration! / 1000)
      .filter((event: any) => event.hasOnset());

    // A long overlap block must not repeat its shorter lanes or drop notes.
    expect(events).toHaveLength(notes.length);
    const remaining = [...events];
    for (const note of notes) {
      const index = remaining.findIndex(event => event.value.note === note.note &&
        Math.abs(Number(event.whole.begin) * 1000 - note.pressTime) < 2);
      expect(index, `missing ${note.note} at ${note.pressTime}ms`).toBeGreaterThanOrEqual(0);
      const [event] = remaining.splice(index, 1);
      expect(event.value.s).toBe("sawtooth");
      expect(event.value.gain).toBeCloseTo(note.velocity!, 6);
      const gateMs = Number(event.whole.duration) * event.value.clip * 1000;
      expect(Math.abs(gateMs - note.duration)).toBeLessThan(2);
    }
    expect(remaining).toHaveLength(0);

    const lastAttack = Math.max(...events.map((event: any) => Number(event.whole.begin)));
    expect(lastAttack).toBeGreaterThan(108);
    expect(events.find((event: any) => Number(event.whole.begin) === lastAttack).value.gain)
      .toBeLessThan(0.03);
  });
});
