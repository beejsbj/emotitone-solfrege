import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PatternCard from "@/components/patterns/PatternCard.vue";
import type { Pattern } from "@/types/patterns";

const colors = vi.hoisted(() => ({
  byScaleIndex: vi.fn(() => "scale-color"),
  byPitchClass: vi.fn(() => "exact-color"),
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getStaticPrimaryColorByScaleIndex: colors.byScaleIndex,
    getStaticPrimaryColorByPitchClass: colors.byPitchClass,
  }),
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => ({
    patterns: [],
    focusedPatternId: null,
    loadPatternAsBase: vi.fn(),
    deletePattern: vi.fn(),
  }),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({ keyboardConfig: { mainOctave: 4 } }),
}));

vi.mock("@/composables/useStrudel", () => ({
  toStrudelSound: (instrument: string) => instrument,
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => ({
    config: {
      codeStrip: { notation: "solfege" },
      keyboard: {
        surfaceStyle: "colored",
        keyBrightness: 1,
        keySaturation: 1,
      },
    },
  }),
}));

vi.mock("@/components/compounds/PatternCard.vue", () => ({
  default: defineComponent({
    name: "PatternCard",
    props: ["barTape", "codeTokens"],
    template: "<div />",
  }),
}));

describe("PatternCard", () => {
  it("colors recorded exact pitches by pitch class", () => {
    const pattern: Pattern = {
      id: "borrowed-pattern",
      notes: [{
        id: "borrowed-d-sharp",
        note: "D#4",
        scaleDegree: 0,
        scaleIndex: -1,
        pitchClassIndex: 3,
        isBorrowed: true,
        octave: 4,
        pressTime: 0,
        releaseTime: 100,
        duration: 100,
      }],
      key: "C",
      mode: "major",
      instrument: "piano",
      createdAt: Date.now(),
      isDefault: true,
    };

    mount(PatternCard, {
      props: { pattern },
    });

    expect(colors.byPitchClass).toHaveBeenCalledWith(3, "major", "C", 4);
    expect(colors.byScaleIndex).not.toHaveBeenCalled();
  });
});
