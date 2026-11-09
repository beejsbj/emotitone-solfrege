import { describe, expect, it } from "vitest";
import { createLooperStageLight } from "@/composables/canvas/looperStageLight";
import type { LooperFading } from "@/stores/looper";

/**
 * How long the Stage follows a Looper note (BJS-648, review of #296). The
 * Stage draws only while its frames run: a hidden tab, or the Stage layer
 * off, draws none while a loop plays on. What it follows must not grow then.
 * The light itself is covered in the Stage's pixels (src/__tests__/stores/looper.test.ts).
 */
describe("the notes the Looper's Stage light follows (BJS-648)", () => {
  const played = (events: EventTarget, noteId: string, audibleAt: number) =>
    events.dispatchEvent(new CustomEvent("note-played", { detail: { noteId, phraseId: "loop", audibleAt } }));
  const released = (events: EventTarget, noteId: string) =>
    events.dispatchEvent(new CustomEvent("note-released", { detail: { noteId } }));

  it("lets go of each note on no fade when its release is heard, though no frame is drawn", () => {
    const announced = new EventTarget();
    const heard = new EventTarget();
    const light = createLooperStageLight({ fading: () => [], isPlaying: () => true }, announced, heard, () => 0);
    // An hour of a loop at eight notes a second would be about 29,000 of these.
    for (let serial = 0; serial < 2000; serial++) {
      played(announced, `pattern-1-${serial}`, 0);
      released(heard, `pattern-1-${serial}`);
    }
    expect(light.size).toBe(0);
    light.dispose();
  });

  it("keeps a note on a fade until it has been heard and the Stage no longer shows it", () => {
    const events = new EventTarget();
    const fading: LooperFading[] = [{ phraseId: "loop", endingMs: 2000, endsAt: 3000 }];
    const light = createLooperStageLight({ fading: () => fading, isPlaying: () => false }, events, events, () => 1000);
    // Announced at 1000 while its pattern fades, heard at 1100.
    played(events, "pattern-1-1", 1100);
    released(events, "pattern-1-1");
    // Its release was heard but it is on a fade: its body still leaves dimmed, so it stays.
    expect(light.size).toBe(1);
    // Not heard yet, so not shown yet: still followed.
    light.update(1050, () => false);
    expect(light.size).toBe(1);
    expect(light.lightOf("pattern-1-1", 1500, false)).toBeCloseTo((1 - 500 / 2000) ** 2, 9);
    // Heard and shown: followed.
    light.update(1200, () => true);
    expect(light.size).toBe(1);
    // Heard and gone from the Stage: forgotten.
    light.update(1300, () => false);
    expect(light.size).toBe(0);
    light.dispose();
  });
});
