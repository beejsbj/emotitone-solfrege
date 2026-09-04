import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DrawerKeyboard from "@/components/DrawerKeyboard.vue";

const mocks = vi.hoisted(() => ({
  removeLastFromCurrentSketch: vi.fn(),
  sendCurrentPattern: vi.fn(),
  toggle: vi.fn(),
  isPlaying: { value: false, __v_isRef: true },
  hasPlayableCode: { value: true, __v_isRef: true },
  animateDrawer: vi.fn(),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    drawer: { isOpen: false },
    keyboardConfig: { keySize: 1 },
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    toggleDrawer: vi.fn(),
  }),
}));

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => ({
    removeLastFromCurrentSketch: mocks.removeLastFromCurrentSketch,
    sendCurrentPattern: mocks.sendCurrentPattern,
  }),
}));

vi.mock("@/composables/useKeyboardDrawer", () => ({
  useKeyboardDrawer: () => ({ animateDrawer: mocks.animateDrawer }),
}));

vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: () => ({
    toggle: mocks.toggle,
    isPlaying: mocks.isPlaying,
    hasPlayableCode: mocks.hasPlayableCode,
  }),
}));

vi.mock("@/components/compounds/CodeStripActions.vue", () => ({
  default: {
    name: "CodeStripActions",
    emits: ["togglePlayback", "backspace", "return"],
    template: '<div data-testid="code-strip-actions" />',
  },
}));

vi.mock("@/components/compounds/Keyboard.vue", () => ({
  default: { name: "Keyboard", template: '<div data-testid="keyboard" />' },
}));

vi.mock("@/components/patterns/PatternList.vue", () => ({
  default: { name: "PatternList", template: '<div data-testid="pattern-list" />' },
}));

vi.mock("@/components/keyboard/LegacyKeyboardControls.vue", () => ({
  default: {
    name: "LegacyKeyboardControls",
    template: '<div data-testid="legacy-keyboard-controls" />',
  },
}));

describe("DrawerKeyboard CodeStrip actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPlaying.value = false;
    mocks.hasPlayableCode.value = true;
  });

  it("preserves playback, remove-last, and commit-and-clear behavior", async () => {
    const wrapper = mount(DrawerKeyboard, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripActions: true,
        },
      },
    });
    const actions = wrapper.getComponent({ name: "CodeStripActions" });

    actions.vm.$emit("togglePlayback");
    actions.vm.$emit("backspace");
    actions.vm.$emit("return");
    await wrapper.vm.$nextTick();

    expect(mocks.toggle).toHaveBeenCalledTimes(1);
    expect(mocks.removeLastFromCurrentSketch).toHaveBeenCalledTimes(1);
    expect(mocks.sendCurrentPattern).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("does not start playback when CodeStrip has no playable document", async () => {
    mocks.hasPlayableCode.value = false;
    const wrapper = mount(DrawerKeyboard, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripActions: true,
        },
      },
    });

    wrapper.getComponent({ name: "CodeStripActions" }).vm.$emit("togglePlayback");
    await wrapper.vm.$nextTick();

    expect(mocks.toggle).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
