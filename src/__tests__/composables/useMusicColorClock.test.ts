import { effectScope, nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useMusicColorClock", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("shares monotonic phase, preserves it across speed changes, and disposes", async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 1;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    });
    const cancelFrame = vi.fn((id: number) => frames.delete(id));
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));

    const { useMusicColorClock } = await import("@/composables/useMusicColorClock");
    const enabled = ref(true);
    const speed = ref(1);
    const scope = effectScope();
    const clock = scope.run(() => useMusicColorClock(
      () => enabled.value,
      () => speed.value,
    ))!;

    expect(requestFrame).toHaveBeenCalledTimes(1);
    const first = frames.get(1)!;
    frames.delete(1);
    first(100);
    const second = frames.get(2)!;
    frames.delete(2);
    second(200);
    const phaseAtNormalSpeed = clock.phaseCycles.value;
    expect(phaseAtNormalSpeed).toBeCloseTo(0.1 / (Math.PI * 2));

    speed.value = 2;
    const third = frames.get(3)!;
    frames.delete(3);
    third(300);
    expect(clock.phaseCycles.value - phaseAtNormalSpeed)
      .toBeCloseTo(0.2 / (Math.PI * 2));

    enabled.value = false;
    await nextTick();
    expect(frames.size).toBe(0);
    expect(cancelFrame).toHaveBeenCalled();

    scope.stop();
    expect(frames.size).toBe(0);
  });

  it("schedules no color frames under Reduced Motion", async () => {
    const requestFrame = vi.fn(() => 1);
    const cancelFrame = vi.fn();
    let motionListener: ((event: { matches: boolean }) => void) | undefined;
    const media = {
      matches: true,
      addEventListener: vi.fn((_type: string, listener: typeof motionListener) => {
        motionListener = listener;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    vi.stubGlobal("matchMedia", vi.fn(() => media));

    const { useMusicColorClock } = await import("@/composables/useMusicColorClock");
    const scope = effectScope();
    const clock = scope.run(() => useMusicColorClock(() => true, () => 1))!;

    expect(clock.reducedMotion.value).toBe(true);
    expect(requestFrame).not.toHaveBeenCalled();

    media.matches = false;
    motionListener?.({ matches: false });
    expect(requestFrame).toHaveBeenCalledTimes(1);

    media.matches = true;
    motionListener?.({ matches: true });
    expect(cancelFrame).toHaveBeenCalled();
    scope.stop();
  });
});
