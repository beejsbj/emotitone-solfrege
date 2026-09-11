import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PerformanceDeck from "@/components/PerformanceDeck.vue";
import Drawer from "@/components/uniques/Drawer/index.vue";

const mocks = vi.hoisted(() => ({
  removeLastFromCurrentSketch: vi.fn(),
  sendCurrentPattern: vi.fn(),
  toggle: vi.fn(),
  stop: vi.fn(),
  toggleHumming: vi.fn(),
  cancelHumming: vi.fn(),
  selectHummingTake: vi.fn(),
  isPlaying: { value: false, __v_isRef: true },
  hasPlayableCode: { value: true, __v_isRef: true },
  hummingStatus: { value: "idle", __v_isRef: true },
  hummingError: { value: null, __v_isRef: true },
  hummingStatusMessage: { value: "Ready", __v_isRef: true },
  hummingTakeLabels: { value: [] as string[], __v_isRef: true },
  selectedHummingTake: { value: 0, __v_isRef: true },
  animateDrawer: vi.fn(),
  setKey: vi.fn(),
  setMode: vi.fn(),
  updateConfig: vi.fn(),
  setMainOctave: vi.fn(),
  setRowCount: vi.fn(),
  triggerUIHaptic: vi.fn(),
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
  toggleDrawer: vi.fn(),
  instrumentStore: {
    isInteractionLocked: false,
    warmingInstrument: null as string | null,
    warmupMessage: "",
  },
  keyboardConfig: {
    keySize: 1,
    mainOctave: 4,
    rowCount: 3,
    hapticFeedback: true,
  },
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => ({
    drawer: { isOpen: false },
    keyboardConfig: mocks.keyboardConfig,
    setMainOctave: mocks.setMainOctave,
    setRowCount: mocks.setRowCount,
    openDrawer: mocks.openDrawer,
    closeDrawer: mocks.closeDrawer,
    toggleDrawer: mocks.toggleDrawer,
  }),
}));

vi.mock("@/utils/hapticFeedback", () => ({
  triggerUIHaptic: mocks.triggerUIHaptic,
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({
    currentKey: "C",
    currentMode: "major",
    setKey: mocks.setKey,
    setMode: mocks.setMode,
  }),
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
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

vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: () => ({
    toggle: mocks.toggle,
    stop: mocks.stop,
    isPlaying: mocks.isPlaying,
    hasPlayableCode: mocks.hasPlayableCode,
  }),
}));

vi.mock("@/composables/useHummingCapture", () => ({
  useHummingCapture: () => ({
    status: mocks.hummingStatus,
    error: mocks.hummingError,
    statusMessage: mocks.hummingStatusMessage,
    takeLabels: mocks.hummingTakeLabels,
    selectedTakeIndex: mocks.selectedHummingTake,
    toggle: mocks.toggleHumming,
    cancel: mocks.cancelHumming,
    selectTake: mocks.selectHummingTake,
  }),
}));

vi.mock("@/components/compounds/CodeStripBar.vue", () => ({
  default: {
    name: "CodeStripBar",
    props: ["isPlaying", "playDisabled"],
    emits: ["togglePlayback", "backspace", "return"],
    template: '<div data-testid="code-strip-bar" />',
  },
}));

vi.mock("@/components/humming/HummingCaptureTransport.vue", () => ({
  default: {
    name: "HummingCaptureTransport",
    props: ["status", "error", "statusMessage", "takeLabels", "selectedTakeIndex"],
    emits: ["toggle", "cancel", "selectTake"],
    template: '<div data-testid="humming-capture-transport" />',
  },
}));

vi.mock("@/components/compounds/Keyboard.vue", () => ({
  default: {
    name: "Keyboard",
    props: { harmonyAlteration: String, availableHeight: Number },
    template: '<div data-testid="keyboard" />',
  },
}));

vi.mock("@/components/patterns/PatternList.vue", () => ({
  default: {
    name: "PatternList",
    emits: ["contextChange"],
    template: '<div data-testid="pattern-list" />',
  },
}));

vi.mock("@/components/compounds/ControlBar.vue", () => ({
  default: {
    name: "ControlBar",
    props: ["changeSignals"],
    emits: [
      "update:keyValue",
      "update:modeValue",
      "update:bpm",
      "update:octave",
      "update:rows",
      "update:harmonyValue",
      "harmonyEffective",
      "update:drawerOpen",
    ],
    template: '<div data-testid="control-bar" />',
  },
}));

describe("PerformanceDeck CodeStrip Bar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPlaying.value = false;
    mocks.hasPlayableCode.value = true;
    mocks.instrumentStore.isInteractionLocked = false;
    mocks.instrumentStore.warmingInstrument = null;
    mocks.instrumentStore.warmupMessage = "";
    mocks.hummingStatus.value = "idle";
    mocks.keyboardConfig.rowCount = 3;
    mocks.keyboardConfig.hapticFeedback = true;
  });

  it("stops Strudel before starting humming and wires take selection", async () => {
    mocks.isPlaying.value = true;
    const wrapper = mount(PerformanceDeck, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripBar: true,
        },
      },
    });
    const actions = wrapper.getComponent({ name: "HummingCaptureTransport" });

    actions.vm.$emit("toggle");
    actions.vm.$emit("cancel");
    actions.vm.$emit("selectTake", 1);
    await wrapper.vm.$nextTick();

    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(mocks.toggleHumming).toHaveBeenCalledTimes(1);
    expect(mocks.cancelHumming).toHaveBeenCalledTimes(1);
    expect(mocks.stop.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.toggleHumming.mock.invocationCallOrder[0],
    );
    expect(mocks.selectHummingTake).toHaveBeenCalledWith(1);
    wrapper.unmount();
  });

  it("cancels active humming before starting Strudel playback", async () => {
    mocks.hummingStatus.value = "recording";
    const wrapper = mount(PerformanceDeck, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripBar: true,
          HummingCaptureTransport: true,
        },
      },
    });

    wrapper.getComponent({ name: "CodeStripBar" }).vm.$emit("togglePlayback");
    await vi.waitFor(() => expect(mocks.toggle).toHaveBeenCalledTimes(1));

    expect(mocks.cancelHumming).toHaveBeenCalledTimes(1);
    expect(mocks.cancelHumming.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.toggle.mock.invocationCallOrder[0],
    );
    wrapper.unmount();
  });

  it("preserves playback, remove-last, and commit-and-clear behavior", async () => {
    const wrapper = mount(PerformanceDeck, {
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

  it("forwards pattern-context changes as independent Knob bounce signals", async () => {
    const wrapper = mount(PerformanceDeck, {
      global: {
        stubs: {
          Keyboard: true,
          CodeStripBar: true,
          HummingCaptureTransport: true,
        },
      },
    });
    const patternList = wrapper.getComponent({ name: "PatternList" });
    const controlBar = wrapper.getComponent({ name: "ControlBar" });

    patternList.vm.$emit("contextChange", ["key", "octave"]);
    await wrapper.vm.$nextTick();

    expect(controlBar.props("changeSignals")).toMatchObject({
      key: 1,
      mode: 0,
      bpm: 0,
      octave: 1,
    });
    wrapper.unmount();
  });

  it("does not start playback when CodeStrip has no playable document", async () => {
    mocks.hasPlayableCode.value = false;
    const wrapper = mount(PerformanceDeck, {
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

  it("disables and ignores pattern playback while samples are warming", async () => {
    mocks.instrumentStore.isInteractionLocked = true;
    const wrapper = mount(PerformanceDeck, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripBar: true,
        },
      },
    });
    const actions = wrapper.getComponent({ name: "CodeStripBar" });

    expect(actions.props("playDisabled")).toBe(true);
    actions.vm.$emit("togglePlayback");
    await wrapper.vm.$nextTick();

    expect(mocks.toggle).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("preserves the five remaining Control Bar mutations in the production composition", async () => {
    const wrapper = mount(PerformanceDeck, {
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
    controls.vm.$emit("update:harmonyValue", "jazzy7");
    controls.vm.$emit("harmonyEffective", "sus4");
    await wrapper.vm.$nextTick();

    expect(mocks.setKey).toHaveBeenCalledWith("D");
    expect(mocks.setMode).toHaveBeenCalledWith("dorian");
    expect(mocks.updateConfig).toHaveBeenCalledWith("codeStrip", { bpm: 96 });
    expect(mocks.setMainOctave).toHaveBeenCalledWith(5);
    expect(mocks.setRowCount).not.toHaveBeenCalled();
    expect(wrapper.getComponent({ name: "Keyboard" }).props("harmonyAlteration"))
      .toBe("sus4");
    wrapper.unmount();
  });

  it("turns each usable drawer allocation into whole keyboard rows", async () => {
    const wrapper = mount(PerformanceDeck, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripBar: true,
        },
      },
    });

    const drawer = wrapper.getComponent(Drawer);
    expect(drawer.classes()).toContain("performance-deck-drawer");
    expect(drawer.props("storageKey")).toBe("keyboard");
    expect(drawer.props("handlePlacement")).toBe("persistent");
    expect(drawer.props("maxHeightRatio")).toBe(0.95);
    expect(drawer.props("haptic")).toBe(true);
    drawer.vm.$emit("contentResize", 320);
    await wrapper.vm.$nextTick();

    expect(mocks.setRowCount).toHaveBeenCalledWith(5);
    expect(mocks.triggerUIHaptic).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("ticks once when a pointer drag crosses a whole-row boundary", async () => {
    const wrapper = mount(PerformanceDeck, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripBar: true,
        },
      },
    });
    const drawer = wrapper.getComponent(Drawer);

    drawer.vm.$emit("contentResize", 320, "pointer");
    await wrapper.vm.$nextTick();
    expect(mocks.triggerUIHaptic).toHaveBeenCalledOnce();

    mocks.keyboardConfig.hapticFeedback = false;
    drawer.vm.$emit("contentResize", 320, "pointer");
    await wrapper.vm.$nextTick();
    expect(mocks.triggerUIHaptic).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("covers and names the keyboard while instrument samples are warming", () => {
    mocks.instrumentStore.isInteractionLocked = true;
    mocks.instrumentStore.warmingInstrument = "gm_vibraphone";
    mocks.instrumentStore.warmupMessage = "Samples being downloaded...";

    const wrapper = mount(PerformanceDeck, {
      global: {
        stubs: {
          PatternList: true,
          Keyboard: true,
          CodeStripBar: true,
        },
      },
    });

    const overlay = wrapper.get('[data-testid="keyboard-warmup-overlay"]');
    expect(overlay.attributes("role")).toBe("status");
    expect(overlay.text()).toContain("Samples being downloaded...");
    expect(overlay.text()).toContain("vibraphone");
    expect(wrapper.get("keyboard-stub").classes()).toContain("pointer-events-none");
    wrapper.unmount();
  });
});
