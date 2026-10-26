import { expect, it } from "vitest";
import { evaluateStrudel } from "../../helpers/strudelOracle";
import { serializeCodeStripTokens } from "@/components/uniques/CodeStrip/serialize";

// Play the code a controlled strip opens in Strudel through the installed
// transpiler and mini-notation.
function onsets(code: string, cycles: number) {
  return evaluateStrudel(code, 0, cycles)
    .filter((hap) => hap.hasOnset())
    .map((hap) => [String(hap.value), hap.whole.begin, hap.whole.end]);
}

it("opens controlled tokens in Strudel with the cycle lengths the strip shows", () => {
  const code = serializeCodeStripTokens([
    { type: "note", note: "do", text: "Do", rawPitch: "C4", duration: "@0.25" },
    { type: "rest", duration: "@0.5" },
  ]);

  // A quarter-cycle note and a half-cycle rest loop every 0.75 cycles.
  expect(onsets(code, 1.5)).toEqual([["C4", 0, 0.25], ["C4", 0.75, 1]]);
});
