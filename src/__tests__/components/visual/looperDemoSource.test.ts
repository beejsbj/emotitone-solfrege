import { describe, expect, it } from "vitest";
import { looperTurnMs } from "@/composables/canvas/looperStageSource";
import { createLooperDemoSource, type LooperDemoControls } from "@/style-guide/stage/looperDemoSource";

describe("Looper specimen demo source", () => {
  const setup = () => {
    const controls: LooperDemoControls = { running: true, tuneMuted: false, liveTake: false };
    let now = 0;
    const source = createLooperDemoSource(() => controls, () => now);
    return { controls, source, at: (ms: number) => { now = ms; } };
  };

  it("keeps one members array until a mute changes it, and the tune sets the turn", () => {
    const { controls, source } = setup();
    const first = source.members;
    expect(source.members).toBe(first);
    expect(looperTurnMs(source)).toBe(10_000);
    controls.tuneMuted = true;
    expect(source.members).not.toBe(first);
    expect(source.members.find((member) => member.id === "tune")?.audible).toBe(false);
  });

  it("freezes position while stopped and resumes from it", () => {
    const { controls, source, at } = setup();
    source.positionMs();
    at(1000);
    expect(source.positionMs()).toBe(1000);
    controls.running = false;
    source.positionMs(); // the Stage reads every frame, so it sees the stop as it happens
    at(5000);
    expect(source.positionMs()).toBe(1000);
    controls.running = true;
    source.positionMs();
    at(5500);
    expect(source.positionMs()).toBe(1500);
  });

  it("holds a live note as it grows, then leaves it pending with a stable array", () => {
    const { controls, source, at } = setup();
    controls.liveTake = true;
    source.positionMs();
    at(6250 + 300);
    expect(source.heldNotes()).toEqual([{ note: "B4", pressTime: 6250, duration: 300 }]);
    at(7200);
    expect(source.heldNotes()).toHaveLength(0);
    const pending = source.pendingNotes();
    expect(pending.map((note) => note.note)).toEqual(["B4"]);
    expect(source.pendingNotes()).toBe(pending);
  });
});
