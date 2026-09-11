import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

const dynamicColorConfig = ref({
  recipeVersion: 1 as const,
  musicColorMode: "movable-ordinal" as const,
  hueMotionEnabled: false,
  animationSpeed: 1,
  chroma: 0.18,
  lightnessCenter: 0.575,
  lightnessSpan: 0.6,
});

vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: () => ({ dynamicColorConfig }),
}));

import Note from "@/components/primatives/Note.vue";
import PrimitiveNote from "@/style-guide/primatives/PrimitiveNote.vue";

const PITCH_CLASSES: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

describe("PrimitiveNote", () => {
  it("gives every exact-pitch specimen its chromatic identity", () => {
    const wrapper = mount(PrimitiveNote);
    const notes = wrapper.findAllComponents(Note);

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      const pitch = String(note.props("rawPitch")).replace(/-?\d+$/, "");
      expect(note.props("pitchClassIndex"), note.props("rawPitch"))
        .toBe(PITCH_CLASSES[pitch]);
    }
    wrapper.unmount();
  });
});
