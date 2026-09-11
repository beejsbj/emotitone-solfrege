import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import PerformanceDeck from "@/components/PerformanceDeck.vue";
import Drawer from "@/components/uniques/Drawer/index.vue";

const mocks = vi.hoisted(() => ({
  useKeyboardDrawerStore: vi.fn(),
  useInstrumentStore: vi.fn(),
  useMusicStore: vi.fn(),
  usePatternsStore: vi.fn(),
  useVisualConfigStore: vi.fn(),
  useCodeStripStrudel: vi.fn(),
  useHummingCapture: vi.fn(),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: mocks.useKeyboardDrawerStore,
}));
vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: mocks.useInstrumentStore,
}));
vi.mock("@/stores/music", () => ({ useMusicStore: mocks.useMusicStore }));
vi.mock("@/stores/patterns", () => ({ usePatternsStore: mocks.usePatternsStore }));
vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: mocks.useVisualConfigStore,
}));
vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: mocks.useCodeStripStrudel,
}));
vi.mock("@/composables/useHummingCapture", () => ({
  useHummingCapture: mocks.useHummingCapture,
}));
vi.mock("@/components/uniques/CodeStrip/index.vue", () => ({
  default: { name: "CodeStrip", template: '<div data-testid="code-strip" />' },
}));
vi.mock("@/components/compounds/CodeStripBar.vue", () => ({
  default: { name: "CodeStripBar", template: '<div data-testid="code-strip-bar" />' },
}));
vi.mock("@/components/compounds/ControlBar.vue", () => ({
  default: { name: "ControlBar", template: '<div data-testid="control-bar" />' },
}));
vi.mock("@/components/compounds/Keyboard.vue", () => ({
  default: { name: "Keyboard", template: '<div data-testid="keyboard" />' },
}));
vi.mock("@/components/compounds/PatternReel.vue", () => ({
  default: { name: "PatternReel", template: '<div data-testid="pattern-reel" />' },
}));
vi.mock("@/components/patterns/PatternList.vue", () => ({
  default: { name: "PatternList", template: '<div data-testid="pattern-list" />' },
}));
vi.mock("@/components/humming/HummingCaptureTransport.vue", () => ({
  default: { name: "HummingCaptureTransport", template: '<div data-testid="humming" />' },
}));

const PatternReelStub = defineComponent({
  name: "PatternReel",
  props: ["items", "selectedId", "disabled"],
  emits: ["commit", "delete", "copy", "openStrudel", "rename"],
  template: '<div data-testid="pattern-reel" />',
});
const CodeStripBarStub = defineComponent({
  name: "CodeStripBar",
  props: ["usage", "tokens", "source", "isPlaying", "playDisabled", "haptic"],
  emits: ["togglePlayback", "backspace", "return"],
  template: '<div data-testid="code-strip-bar" />',
});
const ControlBarStub = defineComponent({
  name: "ControlBar",
  props: ["keyValue", "modeValue", "bpm", "octave", "harmonyValue", "haptic"],
  emits: [
    "update:keyValue",
    "update:modeValue",
    "update:bpm",
    "update:octave",
    "update:harmonyValue",
    "harmonyEffective",
  ],
  template: '<div data-testid="control-bar" />',
});
const KeyboardStub = defineComponent({
  name: "Keyboard",
  props: [
    "usage",
    "rows",
    "mainOctave",
    "tonic",
    "scaleType",
    "harmonyAlteration",
    "interactionLocked",
  ],
  emits: ["press", "release", "chordPress", "chordRelease"],
  template: '<div data-testid="keyboard" />',
});
const PatternListStub = defineComponent({
  name: "PatternList",
  template: '<div data-testid="pattern-list" />',
});
const HummingStub = defineComponent({
  name: "HummingCaptureTransport",
  template: '<div data-testid="humming" />',
});

describe("PerformanceDeck controlled usage", () => {
  it("renders the real assembly seam without constructing production wiring", async () => {
    vi.clearAllMocks();
    const wrapper = mount(PerformanceDeck, {
      props: {
        usage: "controlled",
        patterns: [{
          id: "current",
          name: "Current Take",
          instrumentIcon: defineComponent({ template: "<i />" }),
          instrumentLabel: "Piano",
          rootLabel: "C4",
          spine: "red",
          barTape: [{ color: "red", durationMs: 250 }],
        }],
        selectedPatternId: "current",
        warming: true,
        codeStripTokens: [{ type: "note", note: "do", text: "Do" }],
        keyboardRows: [{
          octave: 4,
          keys: [{
            id: "do-4",
            syllable: "Do",
            degree: "I",
            rawPitch: "C4",
            scaleIndex: 0,
          }],
        }],
      },
      global: {
        stubs: {
          PatternReel: PatternReelStub,
          CodeStripBar: CodeStripBarStub,
          ControlBar: ControlBarStub,
          Keyboard: KeyboardStub,
          PatternList: PatternListStub,
          HummingCaptureTransport: HummingStub,
        },
      },
    });

    expect(mocks.useKeyboardDrawerStore).not.toHaveBeenCalled();
    expect(mocks.useInstrumentStore).not.toHaveBeenCalled();
    expect(mocks.useMusicStore).not.toHaveBeenCalled();
    expect(mocks.usePatternsStore).not.toHaveBeenCalled();
    expect(mocks.useVisualConfigStore).not.toHaveBeenCalled();
    expect(mocks.useCodeStripStrudel).not.toHaveBeenCalled();
    expect(mocks.useHummingCapture).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="pattern-list"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="humming"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="pattern-reel"]').exists()).toBe(true);

    const drawer = wrapper.getComponent(Drawer);
    expect(drawer.props("storageKey")).toBeUndefined();
    expect(drawer.props("haptic")).toBe(false);
    expect(wrapper.getComponent(CodeStripBarStub).props("usage")).toBe("controlled");
    expect(wrapper.getComponent(CodeStripBarStub).props("playDisabled")).toBe(true);
    expect(wrapper.getComponent(KeyboardStub).props("usage")).toBe("controlled");
    expect(wrapper.getComponent(KeyboardStub).props("interactionLocked")).toBe(true);
    expect(wrapper.getComponent(ControlBarStub).props("haptic")).toBe(false);

    await wrapper.setProps({ warming: false });
    wrapper.getComponent(CodeStripBarStub).vm.$emit("togglePlayback");
    wrapper.getComponent(PatternReelStub).vm.$emit("commit", "current", "tap");
    wrapper.getComponent(ControlBarStub).vm.$emit("update:bpm", 96);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("togglePlayback")).toHaveLength(1);
    expect(wrapper.emitted("patternCommit")?.[0]).toEqual(["current", "tap"]);
    expect(wrapper.emitted("update:bpm")?.[0]).toEqual([96]);
    wrapper.unmount();
  });
});
