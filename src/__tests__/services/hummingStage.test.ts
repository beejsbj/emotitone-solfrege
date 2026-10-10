import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHummingStageBridge,
  StablePitchGate,
  getActiveLivePitchStageNotes,
} from "@/services/hummingStage";
import type { LivePitchFrame } from "@/services/livePitch";

let nextTimestamp = 0;
beforeEach(() => { nextTimestamp = 0; });

function voiced(midi: number, timestampSeconds = nextTimestamp): LivePitchFrame {
  nextTimestamp = timestampSeconds + 0.05;
  return {
    timestampSeconds,
    frequencyHz: 440 * 2 ** ((midi - 69) / 12),
    midi,
    clarity: 0.95,
    rms: 0.04,
    voiced: true,
  };
}

const unvoiced: LivePitchFrame = {
  timestampSeconds: 0,
  frequencyHz: null,
  midi: null,
  clarity: 0.1,
  rms: 0,
  voiced: false,
};

describe("LivePitch humming Stage bridge", () => {
  it("debounces attacks and releases a stable note after silence", () => {
    const dispatchEvent = vi.fn().mockReturnValue(true);
    const bridge = createHummingStageBridge(
      { key: "C", mode: "major", instrument: "piano" },
      { dispatchEvent },
    );

    bridge.push(voiced(69));
    expect(dispatchEvent).not.toHaveBeenCalled();
    bridge.push(voiced(69.1));

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const attack = dispatchEvent.mock.calls[0][0] as CustomEvent;
    expect(attack.type).toBe("note-played");
    expect(attack.detail).toEqual(expect.objectContaining({
      noteName: "A4",
      pitchClassIndex: 9,
      source: "live-pitch",
      record: false,
      mirrorMidi: false,
    }));
    expect(getActiveLivePitchStageNotes()).toEqual([
      expect.objectContaining({
        noteId: attack.detail.noteId,
        noteName: "A4",
        pitchClassIndex: 9,
      }),
    ]);

    bridge.push({ ...unvoiced, timestampSeconds: 0.1 });
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    bridge.push({ ...unvoiced, timestampSeconds: 0.15 });

    const release = dispatchEvent.mock.calls[1][0] as CustomEvent;
    expect(release.type).toBe("note-released");
    expect(release.detail.noteId).toBe(attack.detail.noteId);
    expect(release.detail.note).toBe("La");
    expect(getActiveLivePitchStageNotes()).toEqual([]);
  });

  it("releases the previous note before a stable pitch change", () => {
    const events: Event[] = [];
    const bridge = createHummingStageBridge(
      { key: "C", mode: "major", instrument: "piano" },
      { dispatchEvent: (event) => events.push(event) > 0 },
    );

    bridge.push(voiced(60));
    bridge.push(voiced(60));
    bridge.push(voiced(62));
    bridge.push(voiced(62));

    expect(events.map((event) => event.type)).toEqual([
      "note-played",
      "note-released",
      "note-played",
    ]);
    expect((events[2] as CustomEvent).detail.noteName).toBe("D4");

    bridge.stop();
    expect(events.at(-1)?.type).toBe("note-released");
  });

  it("does not present an off-scale pitch as the wrong solfege degree", () => {
    const dispatchEvent = vi.fn().mockReturnValue(true);
    const bridge = createHummingStageBridge(
      { key: "C", mode: "major", instrument: "piano" },
      { dispatchEvent },
    );

    bridge.push(voiced(61));
    bridge.push(voiced(61));

    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("releases the old identity before applying a changed musical context", () => {
    const events: CustomEvent[] = [];
    const bridge = createHummingStageBridge(
      { key: "C", mode: "major", instrument: "piano" },
      { dispatchEvent: (event) => events.push(event as CustomEvent) > 0 },
    );

    bridge.push(voiced(62));
    bridge.push(voiced(62));
    bridge.updateContext({ key: "D", mode: "major", instrument: "organ" });

    expect(events).toHaveLength(2);
    expect(events[0]?.detail).toEqual(expect.objectContaining({
      noteName: "D4",
      note: expect.objectContaining({ name: "Re" }),
      key: "C",
      instrument: "piano",
    }));
    expect(events[1]?.detail).toEqual(expect.objectContaining({
      noteName: "D4",
      note: "Re",
      key: "C",
      instrument: "piano",
    }));

    bridge.push(voiced(62));
    bridge.push(voiced(62));

    expect(events).toHaveLength(3);
    expect(events[2]?.detail).toEqual(expect.objectContaining({
      noteName: "D4",
      note: expect.objectContaining({ name: "Do" }),
      key: "D",
      instrument: "organ",
    }));
    expect(events[2]?.detail.noteId).not.toBe(events[0]?.detail.noteId);
    bridge.stop();
  });

  it.each([
    ["G", "major", 72, 4],
    ["D", "major", 73, 4],
    ["A", "minor", 72, 4],
    ["C", "major", 72, 5],
  ] as const)(
    "maps live pitch in %s %s from MIDI %i to keyboard row %i",
    (key, mode, midi, keyboardOctave) => {
      const dispatchEvent = vi.fn().mockReturnValue(true);
      const bridge = createHummingStageBridge(
        { key, mode, instrument: "piano" },
        { dispatchEvent },
      );

      bridge.push(voiced(midi));
      bridge.push(voiced(midi));

      const attack = dispatchEvent.mock.calls[0][0] as CustomEvent;
      const active = getActiveLivePitchStageNotes()[0];
      expect(attack.detail).toEqual(expect.objectContaining({
        octave: 5,
        keyboardOctave,
      }));
      expect(active).toEqual(expect.objectContaining({
        octave: 5,
        keyboardOctave,
      }));

      bridge.stop();
      expect(getActiveLivePitchStageNotes()).toEqual([]);
    },
  );

  it("names note ownership uniquely across listening sessions", () => {
    const firstDispatch = vi.fn().mockReturnValue(true);
    const secondDispatch = vi.fn().mockReturnValue(true);
    const first = createHummingStageBridge(
      { key: "C", mode: "major", instrument: "piano" },
      { dispatchEvent: firstDispatch },
    );
    const second = createHummingStageBridge(
      { key: "C", mode: "major", instrument: "piano" },
      { dispatchEvent: secondDispatch },
    );
    first.push(voiced(60));
    first.push(voiced(60));
    second.push(voiced(60));
    second.push(voiced(60));

    expect((firstDispatch.mock.calls[0][0] as CustomEvent).detail.noteId).not.toBe(
      (secondDispatch.mock.calls[0][0] as CustomEvent).detail.noteId,
    );
    first.stop();
    second.stop();
    expect(getActiveLivePitchStageNotes()).toEqual([]);
  });
});

describe("StablePitchGate", () => {
  function observe() {
    const events: { type: string; midi?: number; time?: number }[] = [];
    const gate = new StablePitchGate({
      attack: (midi, frame) => events.push({ type: "attack", midi, time: frame.timestampSeconds }),
      release: () => events.push({ type: "release" }),
    });
    return { gate, events };
  }

  it.each([60, 120, 144])("confirms the same notes after 50 ms at %i Hz", (rate) => {
    const { gate, events } = observe();
    for (let i = 0; i <= rate; i++) {
      const time = i / rate;
      if (time >= 0.8) gate.push({ ...unvoiced, timestampSeconds: time });
      else gate.push(voiced(time < 0.4 ? 60 : 62, time));
    }
    expect(events.map(({ type, midi }) => [type, midi])).toEqual([
      ["attack", 60], ["release", undefined], ["attack", 62], ["release", undefined],
    ]);
    expect(events[0].time).toBeGreaterThanOrEqual(0.05);
    expect(events[0].time).toBeLessThan(0.05 + 1 / rate);
    expect(events[2].time).toBeGreaterThanOrEqual(0.45);
    expect(events[2].time).toBeLessThan(0.45 + 2 / rate);
  });

  it.each([[60, -1], [60, 1], [69, -1], [69, 1]])("holds MIDI %i boundary jitter and switches only at 60 cents (%i)", (centre, direction) => {
    const { gate, events } = observe();
    gate.push(voiced(centre, 0));
    gate.push(voiced(centre, 0.05));
    for (let i = 1; i <= 10; i++) {
      gate.push(voiced(centre + direction * (i % 2 ? 0.59999 : 0.49), 0.05 + i * 0.01));
    }
    gate.push(voiced(centre + direction * 0.59999, 0.16));
    gate.push(voiced(centre + direction * 0.59999, 0.22));
    expect(events).toHaveLength(1);
    gate.push(voiced(centre + direction * 0.6, 0.3));
    gate.push(voiced(centre + direction * 0.61, 0.349));
    expect(events).toHaveLength(1);
    gate.push(voiced(centre + direction * 0.6, 0.35));
    expect(events.at(-1)).toEqual({ type: "attack", midi: centre + direction, time: 0.35 });
    // 45 cents back toward the old centre is still inside the new held note.
    gate.push(voiced(centre + direction * 0.55, 0.4));
    gate.push(voiced(centre + direction * 0.55, 0.5));
    expect(events).toHaveLength(3);
  });

  it.each([-12, 12])("suppresses a single-frame octave jump (%i), but accepts a sustained octave", (jump) => {
    const { gate, events } = observe();
    gate.push(voiced(60, 0));
    gate.push(voiced(60, 0.05));
    gate.push(voiced(60 + jump, 0.1));
    gate.push(voiced(60, 0.2));
    expect(events).toHaveLength(1);
    gate.push(voiced(60 + jump, 0.3));
    gate.push(voiced(60 + jump, 0.35));
    expect(events.at(-1)?.midi).toBe(60 + jump);
  });

  it("resets interrupted candidates and tolerates brief silence", () => {
    const { gate, events } = observe();
    gate.push(voiced(60, 0));
    gate.push({ ...unvoiced, timestampSeconds: 0.04 });
    gate.push(voiced(60, 0.05));
    gate.push(voiced(60, 0.099));
    expect(events).toHaveLength(0);
    gate.push(voiced(60, 0.1));
    gate.push({ ...unvoiced, timestampSeconds: 0.2 });
    gate.push(voiced(60, 0.24));
    expect(events).toHaveLength(1);
    gate.push({ ...unvoiced, timestampSeconds: 0.3 });
    gate.push({ ...unvoiced, timestampSeconds: 0.349 });
    expect(events).toHaveLength(1);
    gate.push({ ...unvoiced, timestampSeconds: 0.35 });
    expect(events.at(-1)?.type).toBe("release");
    gate.flush();
    expect(events).toHaveLength(2);
  });
});
