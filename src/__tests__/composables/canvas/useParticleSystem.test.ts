import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useParticleSystem } from "@/composables/canvas/useParticleSystem";
import { MAJOR_SOLFEGE } from "@/data/solfege";
import { MARK_NAMES, MARK_DEFINITIONS } from "@/components/primatives/marks";
import type { ParticleConfig } from "@/types/visual";

vi.mock("@/composables/useMusicColor", () => ({
  useMusicColor: () => ({ getFleckColor: vi.fn(() => "#e0a93a") }),
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

    const particle = system.particles[0];
    const markName = particle.mark;
    const markDef = MARK_DEFINITIONS[markName];
    const expectedPath = markDef.paths[0].d;

    system.renderParticles(context, 16, config);

    // Verify the actual Mark registry path was passed to fill()
    expect(context.fill).toHaveBeenCalled();
    const fillCalls = (context.fill as any).mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);

    // Check that at least one fill call used the correct Mark path
    const filledPath = fillCalls[0]?.[0];
    expect(filledPath).toBeDefined();
    expect(filledPath.d).toBe(expectedPath);

    expect(context.scale).toHaveBeenCalled();
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(context.restore).toHaveBeenCalledTimes(2);
  });

  it("retires elapsed particles back into the pool and reuses them", () => {
    const system = useParticleSystem();
    system.createParticles(MAJOR_SOLFEGE[0], config, 300, 200, "major", "C", 1);

    const expiredParticle = system.particles[0];
    const expiredRef = expiredParticle; // Keep a reference to the expired particle
    const expiredId = expiredRef; // Track object identity

    expiredParticle.life = expiredParticle.maxLife;

    system.renderParticles(context, 16, config);

    expect(system.getActiveParticleCount()).toBe(0);

    // Create a new particle - it should reuse the expired one
    system.createParticles(MAJOR_SOLFEGE[1], config, 300, 200, "major", "C", 1);

    const reuseParticle = system.particles[0];

    // Verify object reuse: the new particle is the same object as the expired one
    expect(reuseParticle).toBe(expiredRef);

    // Verify the particle was reset with new values
    expect(reuseParticle.life).toBe(0);
    expect(reuseParticle.x).toBeLessThan(300);
    expect(reuseParticle.y).toBeLessThan(200);
  });

  it("preserves the disabled particle contract", () => {
    const system = useParticleSystem();
    system.createParticles(MAJOR_SOLFEGE[0], { ...config, isEnabled: false }, 300, 200, "major", "C");

    expect(system.getActiveParticleCount()).toBe(0);
  });
});
