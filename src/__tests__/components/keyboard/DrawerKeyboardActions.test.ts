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
  setKey: vi.fn(),
  setMode: vi.fn(),
  updateConfig: vi.fn(),
  setMainOctave: vi.fn(),
  setRowCount: vi.fn(),
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
  toggleDrawer: vi.fn(),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    drawer: { isOpen: false },
    keyboardConfig: { keySize: 1, mainOctave: 4, rowCount: 3 },
    setMainOctave: mocks.setMainOctave,
    setRowCount: mocks.setRowCount,
    openDrawer: mocks.openDrawer,
    closeDrawer: mocks.closeDrawer,
    toggleDrawer: mocks.toggleDrawer,
  }),
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({
    currentKey: "C",
    currentMode: "major",
    setKey: mocks.setKey,
    setMode: mocks.setMode,
  }),
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => ({
    config: { codeStrip: { bpm: 120 } },
    updateConfig: mocks.updateConfig,
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

vi.mock("@/components/compounds/CodeStripBar.vue", () => ({
  default: {
    name: "CodeStripBar",
    emits: ["togglePlayback", "backspace", "return"],
    template: '<div data-testid="code-strip-bar" />',
  },
}));

vi.mock("@/components/compounds/Keyboard.vue", () => ({
  default: { name: "Keyboard", template: '<div data-testid="keyboard" />' },
}));

vi.mock("@/components/patterns/PatternList.vue", () => ({
  default: { name: "PatternList", template: '<div data-testid="pattern-list" />' },
}));

vi.mock("@/components/compounds/ControlBar.vue", () => ({
  default: {
    name: "ControlBar",
    emits: [
      "update:keyValue",
      "update:modeValue",
      "update:bpm",
      "update:octave",
      "update:rows",
      "update:drawerOpen",
    ],
    template: '<div data-testid="control-bar" />',
  },
}));

describe("DrawerKeyboard CodeStrip Bar", () => {
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
          CodeStripBar: true,
        },
      },
    });
    const actions = wrapper.getComponent({ name: "CodeStripBar" });

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
          CodeStripBar: true,
        },
      },
    });

    wrapper.getComponent({ name: "CodeStripBar" }).vm.$emit("togglePlayback");
    await wrapper.vm.$nextTick();

    expect(mocks.toggle).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("preserves all six Control Bar mutations in the production composition", async () => {
    const wrapper = mount(DrawerKeyboard, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripBar: true,
        },
      },
    });
    const controls = wrapper.getComponent({ name: "ControlBar" });

    controls.vm.$emit("update:keyValue", "D");
    controls.vm.$emit("update:modeValue", "dorian");
    controls.vm.$emit("update:bpm", 96);
    controls.vm.$emit("update:octave", 5);
    controls.vm.$emit("update:rows", 7);
    controls.vm.$emit("update:drawerOpen", true);
    controls.vm.$emit("update:drawerOpen", false);
    await wrapper.vm.$nextTick();

    expect(mocks.setKey).toHaveBeenCalledWith("D");
    expect(mocks.setMode).toHaveBeenCalledWith("dorian");
    expect(mocks.updateConfig).toHaveBeenCalledWith("codeStrip", { bpm: 96 });
    expect(mocks.setMainOctave).toHaveBeenCalledWith(5);
    expect(mocks.setRowCount).toHaveBeenCalledWith(7);
    expect(mocks.openDrawer).toHaveBeenCalledTimes(1);
    expect(mocks.closeDrawer).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
