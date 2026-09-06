import { describe, expect, it, vi } from "vitest";
import { createHummingStageBridge } from "@/services/hummingStage";
import type { MelographLivePitchFrame } from "@/services/melographLivePitch";

function voiced(midi: number): MelographLivePitchFrame {
  return {
    timestampSeconds: 0,
    frequencyHz: 440 * 2 ** ((midi - 69) / 12),
    midi,
    clarity: 0.95,
    voiced: true,
  };
}

const unvoiced: MelographLivePitchFrame = {
  timestampSeconds: 0,
  frequencyHz: null,
  midi: null,
  clarity: 0.1,
  voiced: false,
};

describe("Melograph humming Stage bridge", () => {
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
      source: "melograph-live",
      record: false,
      mirrorMidi: false,
    }));

    bridge.push(unvoiced);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    bridge.push(unvoiced);

    const release = dispatchEvent.mock.calls[1][0] as CustomEvent;
    expect(release.type).toBe("note-released");
    expect(release.detail.noteId).toBe(attack.detail.noteId);
    expect(release.detail.note).toBe("La");
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
});
