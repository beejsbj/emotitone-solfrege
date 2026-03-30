import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/services/music");
vi.unmock("@/data");

import { MODE_DEFINITIONS, MODE_ORDER, getScaleForMode } from "@/data";
import { MusicTheoryService } from "@/services/music";
import type { MusicalMode } from "@/types/music";

describe("MusicTheoryService", () => {
  let musicService: MusicTheoryService;

  beforeEach(() => {
    musicService = new MusicTheoryService();
  });

  it("supports the full curated 14-mode catalog", () => {
    expect(MODE_ORDER).toHaveLength(14);

    for (const mode of MODE_ORDER) {
      musicService.setCurrentMode(mode);
      const scale = musicService.getCurrentScale();
      const definition = MODE_DEFINITIONS[mode];

      expect(scale.mode).toBe(mode);
      expect(scale.name).toBe(definition.label);
      expect(scale.degreeCount).toBe(definition.degreeCount);
      expect(scale.intervalNames).toHaveLength(definition.degreeCount);
      expect(scale.solfege).toHaveLength(definition.degreeCount);
    }
  });

  it("generates movable-do labels from intervals for representative modes", () => {
    expect(getScaleForMode("major").solfege.map((note) => note.name)).toEqual([
      "Do",
      "Re",
      "Mi",
      "Fa",
      "Sol",
      "La",
      "Ti",
    ]);

    expect(getScaleForMode("minor").solfege.map((note) => note.name)).toEqual([
      "Do",
      "Re",
      "Me",
      "Fa",
      "Sol",
      "Le",
      "Te",
    ]);

    expect(getScaleForMode("lydian").solfege.map((note) => note.name)).toEqual([
      "Do",
      "Re",
      "Mi",
      "Fi",
      "Sol",
      "La",
      "Ti",
    ]);

    expect(
      getScaleForMode("minor blues").solfege.map((note) => note.name)
    ).toEqual(["Do", "Me", "Fa", "Se", "Sol", "Te"]);

    expect(
      getScaleForMode("chromatic").solfege.map((note) => note.name)
    ).toEqual([
      "Do",
      "Ra",
      "Re",
      "Me",
      "Mi",
      "Fa",
      "Se",
      "Sol",
      "Le",
      "La",
      "Te",
      "Ti",
    ]);
  });

  it("normalizes current scale notes without forcing seven degrees", () => {
    musicService.setCurrentKey("C");

    musicService.setCurrentMode("minor");
    expect(musicService.getCurrentScaleNotes()).toEqual([
      "C",
      "D",
      "D#",
      "F",
      "G",
      "G#",
      "A#",
    ]);

    musicService.setCurrentMode("major pentatonic");
    expect(musicService.getCurrentScaleNotes()).toEqual([
      "C",
      "D",
      "E",
      "G",
      "A",
    ]);

    musicService.setCurrentMode("chromatic");
    expect(musicService.getCurrentScaleNotes()).toEqual([
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ]);
  });

  it("maps chromatic notes to exact or deterministic fallback scale degrees", () => {
    musicService.setCurrentKey("C");
    musicService.setCurrentMode("major");
    expect(musicService.getScaleIndexForChromaticNote("C#")).toBe(0);
    expect(musicService.getScaleIndexForChromaticNote("B")).toBe(6);

    musicService.setCurrentMode("major pentatonic");
    expect(musicService.getScaleIndexForChromaticNote("F")).toBe(2);
    expect(musicService.getScaleIndexForChromaticNote("A#")).toBe(4);

    musicService.setCurrentMode("chromatic");
    expect(musicService.getScaleIndexForChromaticNote("F#")).toBe(6);
  });

  it("handles octave rollover using the actual degree count", () => {
    const assertions: Array<[MusicalMode, number]> = [
      ["major", 7],
      ["major pentatonic", 5],
      ["minor blues", 6],
      ["chromatic", 12],
    ];

    for (const [mode, degreeCount] of assertions) {
      musicService.setCurrentMode(mode);
      expect(musicService.getNoteName(degreeCount, 4)).toBe("C5");
      expect(musicService.getNoteFrequency(degreeCount, 4)).toBeGreaterThan(
        musicService.getNoteFrequency(0, 4)
      );
    }
  });
});
