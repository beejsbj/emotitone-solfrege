import { describe, expect, it } from "vitest";
import { instrumentCatalog } from "@/data/instruments";

describe("instrumentCatalog", () => {
  it("describes known, GM-prefixed, and unknown IDs without changing identity", () => {
    expect(instrumentCatalog.describe("piano")).toEqual({
      id: "piano",
      displayName: "piano",
      category: "keyboards",
      icon: "piano",
    });
    expect(instrumentCatalog.describe("gm_acoustic_guitar_nylon")).toEqual({
      id: "gm_acoustic_guitar_nylon",
      displayName: "acoustic_guitar_nylon",
      category: "gm",
      icon: "guitar",
    });
    expect(instrumentCatalog.describe("custom_sample")).toEqual({
      id: "custom_sample",
      displayName: "custom_sample",
      category: "other",
    });
  });

  it("preserves existing alias IDs and their current classifications", () => {
    expect(instrumentCatalog.describe("tri")).toMatchObject({
      id: "tri",
      displayName: "tri",
      category: "synths",
    });
    expect(instrumentCatalog.describe("organ")).toMatchObject({
      id: "organ",
      displayName: "organ",
      category: "organs",
    });
    expect(instrumentCatalog.describe("amSynth")).toEqual({
      id: "amSynth",
      displayName: "amSynth",
      category: "other",
    });
  });

  it("classifies a representative registered ID from every category", () => {
    const expectedCategories = {
      piano: "keyboards",
      gm_vibraphone: "mallets",
      gm_violin: "strings",
      organ: "organs",
      gm_bassoon: "winds",
      triangle: "synths",
      gm_taiko_drum: "drums",
      gm_trumpet: "gm",
      custom_sample: "other",
    } as const;

    expect(
      Object.fromEntries(
        Object.keys(expectedCategories).map((instrumentId) => [
          instrumentId,
          instrumentCatalog.describe(instrumentId).category,
        ])
      )
    ).toEqual(expectedCategories);
  });

  it("returns optional icon identity only for names with an existing icon rule", () => {
    expect(instrumentCatalog.describe("gm_epiano1").icon).toBe("piano");
    expect(instrumentCatalog.describe("gm_taiko_drum").icon).toBe("drum");
    expect(instrumentCatalog.describe("gm_violin").icon).toBeUndefined();
    expect(instrumentCatalog.describe("custom_sample").icon).toBeUndefined();
  });

  it("groups dynamically registered sounds in stable category and ID order", () => {
    const groups = instrumentCatalog.groupRegistered([
      "custom_sample",
      "triangle",
      "gm_trumpet",
      "piano",
      "gm_taiko_drum",
      "sine",
      "vibraphone",
    ]);

    expect(groups.map(({ id, label, shortLabel }) => ({ id, label, shortLabel }))).toEqual([
      { id: "keyboards", label: "Keyboards", shortLabel: "Keys" },
      { id: "mallets", label: "Mallets", shortLabel: "Mallets" },
      { id: "synths", label: "Synths", shortLabel: "Synths" },
      { id: "drums", label: "Drums & Percussion", shortLabel: "Drums" },
      { id: "gm", label: "GM Soundfonts", shortLabel: "GM" },
      { id: "other", label: "Other", shortLabel: "Other" },
    ]);
    expect(groups.flatMap((group) => group.instruments.map((instrument) => instrument.id))).toEqual([
      "piano",
      "vibraphone",
      "sine",
      "triangle",
      "gm_taiko_drum",
      "gm_trumpet",
      "custom_sample",
    ]);
  });

  it("returns each newly registered ID through the public catalog output", () => {
    const [group] = instrumentCatalog.groupRegistered(["brand_new_sound"]);

    expect(group).toEqual({
      id: "other",
      label: "Other",
      shortLabel: "Other",
      instruments: [
        {
          id: "brand_new_sound",
          displayName: "brand_new_sound",
          category: "other",
        },
      ],
    });
  });
});
