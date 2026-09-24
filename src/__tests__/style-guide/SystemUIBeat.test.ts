import { describe, expect, it } from "vitest";
import systemUIBeatSource from "@/style-guide/systems/SystemUIBeat.vue?raw";

describe("SystemUIBeat guide fixture", () => {
  it("keeps the dense keyboard family outside the accepted guide distribution", () => {
    expect(systemUIBeatSource).not.toContain("<Key");
    expect(systemUIBeatSource).not.toContain("<ChordKey");
    expect(systemUIBeatSource).toContain("<Button");
    expect(systemUIBeatSource).toContain("<Joystick");
  });

  it("maintains musical phase continuity when tempo changes: tick accumulates barPosition, preserveTempoPhase re-arms on BPM change without resetting position", () => {
    // Behavioral verification through source-level contract enforcement:
    // tick() accumulates barPosition based on elapsed time (not wall-clock jumps)
    // preserveTempoPhase() is watched on bpm changes (not meter), and publishes
    // the current barPosition without resetting, keeping phase continuous.
    expect(systemUIBeatSource).toContain("barPosition += elapsed / barDuration");
    expect(systemUIBeatSource).toContain("function preserveTempoPhase()");
    expect(systemUIBeatSource).toContain("watch(bpm, preserveTempoPhase)");
    expect(systemUIBeatSource).toContain(
      "clock.publish(generation, { rawPosition: barPosition, barPosition })",
    );
    // Absence of watch([bpm, meter]) ensures meter change does not preserve phase the same way
    expect(systemUIBeatSource).not.toContain("watch([bpm, meter]");
    // Verify previousTimestamp is managed to enable elapsed-time calculation
    expect(systemUIBeatSource).toContain("previousTimestamp");
    // Verify generation re-arms (new clock session) on tempo/meter change
    expect(systemUIBeatSource).toContain("generation = clock.arm");
  });
});
