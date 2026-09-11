import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import Keyboard from "@/components/compounds/Keyboard.vue";

const mocks = vi.hoisted(() => ({ useColorSystem: vi.fn() }));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: mocks.useColorSystem,
}));

describe("Keyboard controlled color boundary", () => {
  it("uses the injected static resolver instead of the persisted color composable", () => {
    mocks.useColorSystem.mockImplementation(() => {
      throw new Error("controlled Keyboard must not construct useColorSystem");
    });

    const wrapper = mount(Keyboard, {
      props: {
        usage: "controlled",
        rows: [{
          octave: 4,
          keys: [{
            id: "do-4",
            syllable: "Do",
            degree: "I",
            rawPitch: "C4",
            scaleIndex: 0,
            pitchClassIndex: 0,
          }],
        }],
      },
    });

    expect(mocks.useColorSystem).not.toHaveBeenCalled();
    expect(wrapper.findAll(".keyboard__key")).toHaveLength(1);
    expect(wrapper.findAll(".keyboard__chord-key")).toHaveLength(7);
    wrapper.unmount();
  });
});
