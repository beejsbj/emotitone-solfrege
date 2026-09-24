import { describe, expect, it } from "vitest";
import { categoriseInstrument, isSelectableInstrument } from "@/data/instrumentCatalog";

describe("instrument catalog", () => {
  it("offers the pitched orchestra sounds and hides unpitched ones", () => {
    expect(categoriseInstrument("balafon")).toBe("mallets");
    expect(categoriseInstrument("wineglass")).toBe("mallets");
    expect(categoriseInstrument("handbells")).toBe("mallets");
    expect(categoriseInstrument("psaltery_pluck")).toBe("strings");
    expect(categoriseInstrument("dantranh")).toBe("strings");
    expect(categoriseInstrument("strumstick")).toBe("strings");
    expect(categoriseInstrument("piano1")).toBe("keyboards");
    expect(categoriseInstrument("didgeridoo")).toBe("winds");

    for (const unpitched of ["snare_modern", "cajon", "siren", "woodblock", "bd", "gm_gunshot"]) {
      expect(isSelectableInstrument(unpitched)).toBe(false);
    }
  });
});
