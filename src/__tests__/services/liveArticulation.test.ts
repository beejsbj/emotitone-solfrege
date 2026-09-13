import { describe, expect, it } from "vitest";
import { getLiveArticulation } from "@/services/liveArticulation";

describe("live instrument articulation", () => {
  it("keeps percussive onsets crisp and uses a short oscillator ramp", () => {
    expect(getLiveArticulation("piano")).toEqual({ attack: 0.001, release: 0.2 });
    expect(getLiveArticulation("gm_marimba")).toEqual({ attack: 0.001, release: 0.2 });
    expect(getLiveArticulation("triangle")).toEqual({ attack: 0.003, release: 0.12 });
  });

  it("keeps sustained articulation and unknown instruments conservative", () => {
    expect(getLiveArticulation("gm_violin")).toEqual({ attack: 0.01, release: 0.4 });
    expect(getLiveArticulation("custom-bank")).toEqual({ attack: 0.01, release: 1.5 });
  });

  it.each(["gm_epiano1", "gm_epiano2"])("recognizes the registered electric piano %s", (instrument) => {
    expect(getLiveArticulation(instrument)).toEqual({ attack: 0.001, release: 0.2 });
  });

  it.each(["gm_drawbar_organ", "gm_percussive_organ", "gm_rock_organ", "gm_church_organ", "gm_reed_organ", "gm_recorder"])("recognizes the registered sustained instrument %s", (instrument) => {
    expect(getLiveArticulation(instrument)).toEqual({ attack: 0.01, release: 0.4 });
  });

  it.each([
    ["synth", "triangle"], ["amSynth", "sawtooth"], ["fmSynth", "square"],
    ["membraneSynth", "sine"], ["metalSynth", "square"],
    ["organ", "organ_full"], ["pipeorgan", "pipeorgan_quiet"], ["recorder", "recorder_tenor_sus"],
  ])("keeps legacy %s consistent with its resolved sound %s", (legacy, resolved) => {
    expect(getLiveArticulation(legacy)).toEqual(getLiveArticulation(resolved));
  });
});
