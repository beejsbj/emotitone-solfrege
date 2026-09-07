import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PatternCard from "@/components/patterns/PatternCard.vue";
import type { Pattern } from "@/types/patterns";

vi.mock("@/services/StrudelNotation", () => ({
  DEFAULT_SOURCE_BPM: 120,
  logNotesToStrudel: vi.fn(() => ""),
}));

vi.mock("@/composables/useStrudel", () => ({
  toStrudelSound: (instrument: string) => instrument,
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => ({
    focusedPatternId: null,
    loadPatternAsBase: vi.fn(),
    keepPattern: vi.fn(),
  }),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    keyboardConfig: { mainOctave: 4 },
  }),
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getStaticPrimaryColorByScaleIndex: vi.fn(() => "hsl(0 0% 0%)"),
  }),
}));

vi.mock("@/components/primatives/Knob/index.vue", () => ({
  default: { template: "<button />" },
}));

function pattern(instrument: string): Pattern {
  return {
    id: "pattern-1",
    notes: [],
    key: "C",
    mode: "major",
    instrument,
    createdAt: 0,
    isDefault: true,
  };
}

describe("PatternCard", () => {
  it("renders instrument labels through the shared catalog identity", async () => {
    const wrapper = mount(PatternCard, {
      props: { pattern: pattern("gm_vibraphone") },
    });

    expect(wrapper.get(".track-instrument").text()).toBe("vibraphone");

    await wrapper.setProps({ pattern: pattern("custom_sample") });
    expect(wrapper.get(".track-instrument").text()).toBe("custom_sample");

    wrapper.unmount();
  });
});
