import { expect, it, vi } from "vitest";
vi.unmock("@strudel/core");
import { m } from "@strudel/mini";
import { transpiler } from "@strudel/transpiler";
import { serializeCodeStripTokens } from "@/components/uniques/CodeStrip/serialize";

// Play the code a controlled strip opens in Strudel through the installed
// transpiler and mini-notation.
function onsets(code: string, cycles: number) {
  const { output } = transpiler(code);
  const pattern = new Function("m", output)(m);
  return pattern.queryArc(0, cycles)
    .filter((hap: { hasOnset(): boolean }) => hap.hasOnset())
    .map((hap: { value: unknown; whole: { begin: { valueOf(): number }; end: { valueOf(): number } } }) =>
      [String(hap.value), hap.whole.begin.valueOf(), hap.whole.end.valueOf()]);
}

it("opens controlled tokens in Strudel with the cycle lengths the strip shows", () => {
  const code = serializeCodeStripTokens([
    { type: "note", note: "do", text: "Do", rawPitch: "C4", duration: "@0.25" },
    { type: "rest", duration: "@0.5" },
  ]);

  // A quarter-cycle note and a half-cycle rest loop every 0.75 cycles.
  expect(onsets(code, 1.5)).toEqual([["C4", 0, 0.25], ["C4", 0.75, 1]]);
});
