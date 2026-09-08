import { beforeEach, describe, expect, it, vi } from "vitest";
import { useParticleSystem } from "@/composables/canvas/useParticleSystem";
import type { ParticleConfig } from "@/types/visual";

const colors = vi.hoisted(() => ({
  byName: vi.fn(() => "scale-fleck"),
  byPitchClass: vi.fn(() => "exact-fleck"),
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getFleckColor: colors.byName,
    getFleckColorByPitchClass: colors.byPitchClass,
  }),
}));

describe("useParticleSystem exact pitch identity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("colors borrowed-note particles by exact pitch class", () => {
    const system = useParticleSystem();
    const config = {
      isEnabled: true,
      count: 1,
      speed: 1,
      sizeMin: 1,
      sizeMax: 2,
      lifetimeMin: 100,
      lifetimeMax: 200,
      gravity: 0,
      airResistance: 1,
    } as ParticleConfig;

    system.createParticles(
      { name: "D#", number: 0, emotion: "Borrowed harmony tone" },
      config,
      100,
      100,
      "major",
      "C",
      1,
      { pitchClassIndex: 3, octave: 4 },
    );

    expect(colors.byPitchClass).toHaveBeenCalledWith(3, "major", "C", 4);
    expect(colors.byName).not.toHaveBeenCalled();
    expect(system.particles[0].color).toBe("exact-fleck");
  });
});
