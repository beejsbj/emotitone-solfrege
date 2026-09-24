import { describe, expect, it, vi } from "vitest";
import { createLiveAudioClock } from "@/services/liveAudioClock";

describe("live audio clock", () => {
  it("keeps MIDI deadlines monotonic when the system date changes", () => {
    let wall = 1_800_000_000_000;
    let monotonic = 1000;
    const context = { currentTime: 12, state: "running" as const };
    const clock = createLiveAudioClock(() => context, {
      epochNow: () => wall, performanceNow: () => monotonic,
    });
    expect(clock.toPerformanceTime(12_125)).toBe(1125);
    expect(clock.fromPerformanceTime(1125)).toBe(12_125);
    wall += 3_600_000;
    monotonic += 125;
    context.currentTime += 0.125;
    expect(clock.toPerformanceTime(12_250)).toBe(1250);
    expect(clock.fromPerformanceTime(1250)).toBe(12_250);
  });
  it("holds a shared epoch anchor across quantized audio reads and long-running hardware drift", () => {
    let wallTime = 1_800_000_000_000;
    const context = { currentTime: 12, state: "running" as const };
    const clock = createLiveAudioClock(() => context, { epochNow: () => wallTime });
    const epoch = clock.toEpochTime(12_000);
    for (const elapsedMs of [20, 40, 60, 3600_000]) {
      wallTime += elapsedMs;
      context.currentTime += Math.floor(elapsedMs / 8) * 0.008;
      expect(clock.toAudioTime(12_125)).toBe(12.125);
      expect(clock.toEpochTime(12_125)).toBe(epoch + 125);
      expect(clock.fromEpochTime(epoch + 125)).toBe(12_125);
      expect(clock.now()).toBe(context.currentTime * 1000);
    }
    clock.dispose();
  });

  it("captures the pause boundary before a delayed notification can reanchor it", () => {
    let wall = 10000;
    const context = Object.assign(new EventTarget(), { currentTime: 12, state: "running" });
    const suspended = vi.fn();
    const clock = createLiveAudioClock(() => context as unknown as AudioContext, {
      epochNow: () => wall, performanceNow: () => wall - 9000, onSuspend: suspended,
    });
    clock.now();
    context.currentTime = 12.1;
    context.state = "suspended";
    wall += 1000;
    context.dispatchEvent(new Event("statechange"));
    expect(suspended).toHaveBeenCalledWith({ audioTime: 12.1, epochTime: 10100, performanceTime: 1100 });
    clock.dispose();
  });

  it("rebases after suspension and notifies the owner to cancel queued output", () => {
    let wallTime = 1_800_000_000_000;
    const context = Object.assign(new EventTarget(), { currentTime: 12, state: "running" });
    const suspended = vi.fn();
    const clock = createLiveAudioClock(() => context as unknown as AudioContext, {
      epochNow: () => wallTime, onSuspend: suspended,
    });
    expect(clock.toEpochTime(12_050)).toBe(wallTime + 50);
    context.state = "suspended";
    context.dispatchEvent(new Event("statechange"));
    expect(suspended).toHaveBeenCalledOnce();
    wallTime += 1000;
    context.state = "running";
    context.dispatchEvent(new Event("statechange"));
    expect(clock.toEpochTime(12_050)).toBe(wallTime + 50);
    clock.dispose();
    context.state = "suspended";
    context.dispatchEvent(new Event("statechange"));
    expect(suspended).toHaveBeenCalledOnce();
  });
});
