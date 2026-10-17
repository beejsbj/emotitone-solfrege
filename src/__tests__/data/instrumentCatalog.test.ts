import { describe, expect, it } from "vitest";
import { prepareNativeInstrument } from "@/services/preparedNativeInstrument";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { defaultPatterns } from "@/data/patterns";
import loaderReceipt from "../../../audio-lab/results/loader-bjs-488.json";
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

  // Burooj, 2026-10-17: remove from the list what cannot work. Patterns play
  // only on the worklet, which renders four oscillator shapes and sample banks.
  describe("synths the worklet cannot render", () => {
    const removed = ["supersaw", "pulse", "tri", "sin", "z_sine", "z_square", "z_sawtooth", "z_triangle"];
    const oscillators = ["triangle", "sine", "square", "sawtooth", "sqr", "saw"];

    it("are not offered, and a saved choice of one is not selectable", () => {
      for (const name of removed) {
        expect(categoriseInstrument(name), name).toBeNull();
        expect(isSelectableInstrument(name), name).toBe(false);
      }
    });

    it("keeps the oscillators and the aliases that resolve to them", () => {
      for (const name of oscillators) expect(categoriseInstrument(name), name).toBe("synths");
    });

    it("leaves every offered oscillator one the worklet can prepare", async () => {
      const context = {} as AudioContext;
      for (const name of [...oscillators, ...removed]) {
        const prepared = await prepareNativeInstrument(context, resolveLiveSoundName(name));
        // Offered if and only if the worklet renders it.
        expect(prepared.kind !== "unsupported", name).toBe(isSelectableInstrument(name));
      }
    });
  });

  // The BJS-488 loader receipt swept every picker name (188) through the app
  // loader on the worklet core. Anything it could not load must not be offered.
  describe("against the BJS-488 loader receipt", () => {
    const swept = loaderReceipt.sweep as Array<{ name: string; kind: string; reason?: string }>;
    const picker = loaderReceipt.catalog.selectableNow as string[];

    it("offers no sound the worklet refused to load", () => {
      const refused = swept.filter(({ kind }) => kind === "unsupported").map(({ name }) => name);
      // Banks over the 192 MiB worklet budget cannot be held at all.
      expect(refused).toEqual(expect.arrayContaining(["kawai", "steinway"]));
      for (const name of refused) {
        const alias = resolveLiveSoundName(name) !== name; // sqr, saw: the app resolves them to an oscillator
        expect(isSelectableInstrument(name), name).toBe(alias);
      }
    });

    it("keeps 182 of the 188 picker names", () => {
      expect(picker).toHaveLength(188);
      const offered = picker.filter(isSelectableInstrument);
      expect(offered).toHaveLength(182);
      expect(picker.filter(name => !isSelectableInstrument(name)).sort())
        .toEqual(["kawai", "pulse", "sin", "steinway", "supersaw", "tri"]);
    });
  });

  it("gives every default library pattern a sound that is still offered", () => {
    for (const pattern of defaultPatterns) {
      expect(isSelectableInstrument(pattern.instrument), `${pattern.id}: ${pattern.instrument}`).toBe(true);
    }
  });
});
