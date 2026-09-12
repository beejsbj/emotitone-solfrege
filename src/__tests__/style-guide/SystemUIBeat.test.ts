import { describe, expect, it } from "vitest";
import systemUIBeatSource from "@/style-guide/systems/SystemUIBeat.vue?raw";

describe("SystemUIBeat guide fixture", () => {
  it("preserves musical position when tempo changes during playback", () => {
    expect(systemUIBeatSource).toContain("barPosition += elapsed / barDuration");
    expect(systemUIBeatSource).toContain("function preserveTempoPhase()");
    expect(systemUIBeatSource).toContain("watch(bpm, preserveTempoPhase)");
    expect(systemUIBeatSource).toContain(
      "clock.publish(generation, { rawPosition: barPosition, barPosition })",
    );
    expect(systemUIBeatSource).not.toContain("watch([bpm, meter]");
  });

  it("keeps the dense keyboard family outside the accepted guide distribution", () => {
    expect(systemUIBeatSource).not.toContain("<Key");
    expect(systemUIBeatSource).not.toContain("<ChordKey");
    expect(systemUIBeatSource).toContain("<Button");
    expect(systemUIBeatSource).toContain("<Joystick");
  });
});
