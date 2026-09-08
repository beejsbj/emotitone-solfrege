import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useParticleSystem } from "@/composables/canvas/useParticleSystem";
import { MAJOR_SOLFEGE } from "@/data/solfege";
import { MARK_NAMES } from "@/components/primatives/marks";
import type { ParticleConfig } from "@/types/visual";

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({ getFleckColor: vi.fn(() => "#e0a93a") }),
}));

class MockPath2D {
  constructor(readonly d: string) {}
}

const config: ParticleConfig = {
  isEnabled: true,
  count: 3,
  sizeMin: 2,
  sizeMax: 6,
  lifetimeMin: 1000,
  lifetimeMax: 2000,
  speed: 2,
  gravity: 0,
  airResistance: 0.98,
};

const context = {
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  fill: vi.fn(),
  globalAlpha: 1,
  fillStyle: "",
} as unknown as CanvasRenderingContext2D;

describe("useParticleSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("Path2D", MockPath2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("chooses particle Marks from the whole family instead of note data", () => {
    const system = useParticleSystem();
    const note = MAJOR_SOLFEGE[1];
    const randomValues = [
      0.5, 0.5, 0.5, 0.5, 0, 0.5, 0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, 0.3, 0.5, 0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, 0.6, 0.5, 0.5, 0.5,
    ];
    vi.spyOn(Math, "random").mockImplementation(() => randomValues.shift() ?? 0);

    system.createParticles(note, config, 300, 200, "major", "C");

    expect(system.particles).toHaveLength(3);
    expect(system.particles.map((particle) => particle.mark)).toEqual([
      MARK_NAMES[0], MARK_NAMES[Math.floor(MARK_NAMES.length * 0.3)], MARK_NAMES[Math.floor(MARK_NAMES.length * 0.6)],
    ]);
    expect(system.particles.every((particle) => particle.color === "#e0a93a")).toBe(true);
  });

  it("renders particle paths from the shared Mark registry", () => {
    const system = useParticleSystem();
    system.createParticles(MAJOR_SOLFEGE[2], config, 300, 200, "major", "C", 1);

    system.renderParticles(context, 16, config);

    expect(context.scale).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(context.restore).toHaveBeenCalledTimes(2);
  });

  it("retires elapsed particles back into the pool", () => {
    const system = useParticleSystem();
    system.createParticles(MAJOR_SOLFEGE[0], config, 300, 200, "major", "C", 1);
    system.particles[0].life = system.particles[0].maxLife;

    system.renderParticles(context, 16, config);

    expect(system.getActiveParticleCount()).toBe(0);
  });

  it("preserves the disabled particle contract", () => {
    const system = useParticleSystem();
    system.createParticles(MAJOR_SOLFEGE[0], { ...config, isEnabled: false }, 300, 200, "major", "C");

    expect(system.getActiveParticleCount()).toBe(0);
  });
});
