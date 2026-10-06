import { describe, expect, it, vi } from "vitest";

vi.mock("@strudel/codemirror", async () => {
  const { StateEffect } = await import("@codemirror/state");
  return { showMiniLocations: StateEffect.define(), setMiniLocations: StateEffect.define() };
});
import { Text } from "@codemirror/state";
import { mapLooperHighlight } from "@/components/uniques/CodeStrip/looperHighlight";
import { looperDialProps } from "@/components/patterns/looperDial";
import type { LooperMemberView } from "@/stores/looper";

// Two bars of source: do (half bar), rest (half bar), mi (one bar).
const doc = Text.of(['`<0@0.5 ~@0.5 2@1>`.as("n").scale("C4:major").sound("piano").cpm(120 / 4)']);
const follow = { phraseId: "desk", offsetBars: 3.25, rate: 1, lengthBars: 2 };
const hap = (phraseId: string, begin: number, end: number) => ({ whole: { begin, end }, context: { phraseId } });

describe("Code Strip follows the desk member of the Looper's stack", () => {
  it("keeps only the desk member's haps and maps them to its source events", () => {
    // Shared bar 6.25 is the member's second lap, bar 1: mi is sounding.
    const result = mapLooperHighlight(doc, [
      hap("desk", 6.25, 7.25),
      hap("other", 6.0, 6.5),
    ], 6.5, follow);

    expect(result.haps).toHaveLength(1);
    const [mapped] = result.haps;
    const source = doc.toString();
    expect(source.slice(mapped.context.locations[0].start, mapped.context.locations[0].end)).toBe("2@1");
    // Lap 1 of a two-bar source, a quarter bar into mi.
    expect(result.atTime).toBeCloseTo(2 + 1.25);
    expect(Number(mapped.whole.begin)).toBeCloseTo(3);
    expect(Number(mapped.whole.duration)).toBeCloseTo(1);
    // The stock highlight compares onsets with `lt`.
    expect(mapped.whole.begin.lt(4)).toBe(true);
  });

  it("follows half and double time through the member's local time", () => {
    const result = mapLooperHighlight(doc, [hap("desk", 3.25, 3.5)], 3.3, { ...follow, rate: 2 });
    const source = doc.toString();
    const [mapped] = result.haps;
    expect(source.slice(mapped.context.locations[0].start, mapped.context.locations[0].end)).toBe("0@0.5");
    expect(result.atTime).toBeCloseTo(0.1);
  });
});

describe("a playing pattern's dials", () => {
  it("place notes in phrase time over the member's whole-bar length and turn from its offset", () => {
    const view = {
      phraseId: "p", label: "Take 1", key: "C", mode: "major",
      notes: [
        { note: "E4", pressTime: 1000, duration: 500, scaleIndex: 2, octave: 4, pitchClassIndex: 4 },
        { note: "C4", pressTime: 0, duration: 500, scaleIndex: 0, octave: 4 },
      ],
      lengthBars: 2, offsetBars: -1.5, rate: 1, phraseBarMs: 2000,
      muted: false, audible: true, soloed: false, open: false,
    } as unknown as LooperMemberView;
    const props = looperDialProps(view, {
      byPitchClass: (pc) => `pc-${pc}`,
      byScaleIndex: (index) => `deg-${index}`,
    });
    expect(props).toMatchObject({ lengthMs: 4000, barMs: 2000, originBars: -1.5, rate: 1 });
    expect(props.segments.map((segment) => [segment.startMs, segment.color])).toEqual([[0, "deg-0"], [1000, "pc-4"]]);
  });
});
