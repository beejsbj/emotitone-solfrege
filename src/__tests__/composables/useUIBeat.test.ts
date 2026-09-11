import { describe, expect, it, vi } from "vitest";
import {
  generatedStrudelBarPosition,
  UIBeatClock,
} from "@/composables/useUIBeat";

const mappedRun = {
  mappingAvailable: true,
  bpm: 120,
  meter: { beatsPerBar: 4, beatUnit: 4 },
} as const;

const createClock = (reducedMotion = () => false) =>
  new UIBeatClock({
    reducedMotion,
    documentVisible: () => true,
    observeEnvironment: false,
  });

describe("UIBeatClock", () => {
  it("maps generated Strudel scheduler cycles without calling a raw cycle a bar", () => {
    expect(generatedStrudelBarPosition(0.5, 120, 4, 0.5)).toBe(0.5);
    expect(generatedStrudelBarPosition(0.5, 90, 4, 0.5)).toBe(0.375);
    expect(generatedStrudelBarPosition(1, 120, 4, 0)).toBeNull();
  });

  it("publishes zero-based bar, beat, and normalized phase coordinates", () => {
    const clock = createClock();
    const generation = clock.arm(mappedRun);

    expect(clock.snapshot.status).toBe("arming");
    clock.publish(generation, { rawPosition: 0.375, barPosition: 0.375 });

    expect(clock.snapshot).toMatchObject({
      generation,
      status: "running",
      mappingAvailable: true,
      barPosition: 0.375,
      barIndex: 0,
      beatIndex: 1,
      beatPhase: 0.5,
      bpm: 120,
      meter: { beatsPerBar: 4, beatUnit: 4 },
      presenting: true,
    });
  });

  it("invalidates stale frames across evaluation and stop generations", () => {
    const clock = createClock();
    const first = clock.arm(mappedRun);
    const second = clock.arm(mappedRun);

    expect(clock.publish(first, { rawPosition: 0.25, barPosition: 0.25 })).toBe(false);
    expect(clock.publish(second, { rawPosition: 0.25, barPosition: 0.25 })).toBe(true);
    expect(clock.stop(second)).toBe(true);
    expect(clock.snapshot.status).toBe("idle");
    expect(clock.publish(second, { rawPosition: 0.5, barPosition: 0.5 })).toBe(false);
  });

  it("reports edited-code timing as unavailable instead of fabricating meter", () => {
    const clock = createClock();
    const generation = clock.arm({ mappingAvailable: false });

    clock.publish(generation, { rawPosition: 3.25 });

    expect(clock.snapshot).toMatchObject({
      status: "unavailable",
      mappingAvailable: false,
      rawPosition: 3.25,
      barPosition: null,
      beatIndex: null,
      presenting: false,
    });
  });

  it("keeps logical phase while Reduced Motion makes presentation fully still", () => {
    let reduce = false;
    const clock = createClock(() => reduce);
    const listener = vi.fn();
    const dispose = clock.subscribe(listener);
    const generation = clock.arm(mappedRun);
    clock.publish(generation, { rawPosition: 0.1, barPosition: 0.1 });

    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ presenting: true }));
    reduce = true;
    clock.refreshPresentation();
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "running",
      presenting: false,
    }));
    expect(listener.mock.calls.at(-1)?.[0].beatPhase).toBeCloseTo(0.4);

    dispose();
    clock.publish(generation, { rawPosition: 0.2, barPosition: 0.2 });
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("rests on suspension and resumes only from a fresh authoritative frame", () => {
    const clock = createClock();
    const listener = vi.fn();
    clock.subscribe(listener);
    const generation = clock.arm(mappedRun);
    clock.publish(generation, { rawPosition: 0.4, barPosition: 0.4 });

    expect(clock.suspend(generation)).toBe(true);
    expect(clock.snapshot).toMatchObject({
      generation,
      status: "arming",
      rawPosition: null,
      beatIndex: null,
      presenting: false,
    });
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "arming",
      presenting: false,
    }));

    clock.publish(generation, { rawPosition: 0.75, barPosition: 0.75 });
    expect(clock.snapshot).toMatchObject({
      status: "running",
      beatIndex: 3,
      presenting: true,
    });
  });

  it("drops hidden frames and rejoins at the next current phase", () => {
    let visible = true;
    const clock = new UIBeatClock({
      reducedMotion: () => false,
      documentVisible: () => visible,
      observeEnvironment: false,
    });
    const listener = vi.fn();
    clock.subscribe(listener);
    const generation = clock.arm(mappedRun);
    clock.publish(generation, { rawPosition: 0.1, barPosition: 0.1 });

    visible = false;
    clock.refreshPresentation();
    clock.publish(generation, { rawPosition: 0.3, barPosition: 0.3 });
    clock.publish(generation, { rawPosition: 0.55, barPosition: 0.55 });
    expect(listener).toHaveBeenCalledTimes(4);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      presenting: false,
    }));

    visible = true;
    clock.publish(generation, { rawPosition: 0.8, barPosition: 0.8 });
    expect(listener).toHaveBeenCalledTimes(5);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      beatIndex: 3,
      presenting: true,
    }));
    expect(listener.mock.calls.at(-1)?.[0].beatPhase).toBeCloseTo(0.2);
  });
});
