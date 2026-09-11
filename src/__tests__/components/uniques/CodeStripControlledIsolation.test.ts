import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useColorSystem: vi.fn(),
  usePatternsStore: vi.fn(),
  useInstrumentStore: vi.fn(),
  useVisualConfigStore: vi.fn(),
  useCodeStripStrudel: vi.fn(),
  mirrorConstructor: vi.fn(),
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: mocks.useColorSystem,
}));
vi.mock("@/stores/patterns", () => ({ usePatternsStore: mocks.usePatternsStore }));
vi.mock("@/stores/instrument", () => ({ useInstrumentStore: mocks.useInstrumentStore }));
vi.mock("@/stores/visualConfig", () => ({ useVisualConfigStore: mocks.useVisualConfigStore }));
vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: mocks.useCodeStripStrudel,
}));
vi.mock("@strudel/codemirror", async () => {
  const { StateEffect } = await import("@codemirror/state");
  return {
    showMiniLocations: StateEffect.define(),
    setMiniLocations: StateEffect.define(),
    StrudelMirror: class {
      constructor() {
        mocks.mirrorConstructor();
      }
    },
  };
});
vi.mock("@strudel/core", () => ({ evalScope: vi.fn() }));
vi.mock("@strudel/mini", () => ({}));
vi.mock("@strudel/tonal", () => ({}));
vi.mock("@strudel/webaudio", () => ({}));
vi.mock("@strudel/transpiler", () => ({ transpiler: vi.fn() }));

import CodeStrip from "@/components/uniques/CodeStrip/index.vue";

describe("CodeStrip controlled color isolation", () => {
  it("renders real semantic descendants without production color or state wiring", async () => {
    mocks.useColorSystem.mockImplementation(() => {
      throw new Error("controlled CodeStrip must not construct useColorSystem");
    });

    const wrapper = mount(CodeStrip, {
      props: {
        usage: "controlled",
        tokens: [
          {
            type: "note",
            note: "do",
            text: "Do",
            rawPitch: "C4",
            scaleIndex: 0,
            pitchClassIndex: 0,
            duration: "@0.25",
          },
          {
            type: "chord",
            symbol: "C",
            display: "notes",
            duration: "@0.25",
            members: [
              { id: "c", syllable: "Do", rawPitch: "C4", scaleIndex: 0 },
              { id: "e", syllable: "Mi", rawPitch: "E4", scaleIndex: 2 },
            ],
          },
        ],
      },
    });
    await flushPromises();

    expect(wrapper.findAll(".cm-code-strip-event")).toHaveLength(2);
    expect(wrapper.findAll(".note").length).toBeGreaterThan(1);
    expect(mocks.useColorSystem).not.toHaveBeenCalled();
    expect(mocks.usePatternsStore).not.toHaveBeenCalled();
    expect(mocks.useInstrumentStore).not.toHaveBeenCalled();
    expect(mocks.useVisualConfigStore).not.toHaveBeenCalled();
    expect(mocks.useCodeStripStrudel).not.toHaveBeenCalled();
    expect(mocks.mirrorConstructor).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
