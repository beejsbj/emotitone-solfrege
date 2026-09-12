import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, provide, reactive, toRefs } from "vue";
import { createTestWrapper } from "../../helpers/test-utils";
import ConfigPanel from "@/components/ConfigPanel.vue";
import configPanelSource from "@/components/ConfigPanel.vue?raw";
import {
  CONFIG_SECTIONS,
  UNIFIED_CONFIG,
} from "@/data/visual-config-metadata";
import { STAGE_CONTROL_DEFINITIONS } from "@/services/stageAppearance";

const keyboardDrawerStore = reactive({
  midi: {
    isSupported: true,
    isConnecting: false,
    isListening: true,
    connectedInputs: [] as string[],
    connectedOutputs: [] as string[],
    syncedOutput: null as string | null,
    lastError: null as string | null,
  },
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
  toggleDrawer: vi.fn(),
});

const visualConfigStore = reactive({
  config: {
    stage: { isEnabled: true },
    keyboard: {
      isEnabled: true,
      mainOctave: 4,
      rowCount: 3,
    },
    codeStrip: {
      bpm: 120,
    },
  },
  visualsEnabled: true,
  savedConfigs: [] as Array<{ id: string; name: string; updatedAt: string }>,
  savedStageLooks: [] as Array<{ id: string; name: string; updatedAt: string }>,
  newLookOnLaunch: false,
  transientStageLook: null as null | { name: string },
  stageControls: {
    stageEnabled: true,
    scopeSize: 0.6,
    scopeStrength: 0.7,
    scopeLineWeight: 1.5,
    scopeGlow: 0.2,
    scopeTrail: 0.2,
    bodiesVisible: true,
    bodySize: 0.1,
    bodyStrength: 0.5,
    bodyMotion: 0.5,
    connectionMode: "off",
    connectionStrength: 0.4,
    atmosphereStrength: 0.6,
    atmosphereColorDepth: 0.8,
    stringPresence: 0.9,
    stringResponse: 0.25,
    fleckAmount: 10,
    fleckEnergy: 0.3,
    showChords: false,
    showIntervals: false,
    showEmotion: false,
    labelStrength: 0.5,
  },
  updateValue: vi.fn(),
  resetToDefaults: vi.fn(),
  resetSection: vi.fn(),
  exportConfig: vi.fn(),
  setVisualsEnabled: vi.fn(),
  saveConfigAs: vi.fn(),
  loadSavedConfig: vi.fn(),
  deleteSavedConfig: vi.fn(),
  loadConfigSnapshot: vi.fn(),
  updateStageControl: vi.fn(),
  applyBuiltInStageLook: vi.fn(),
  shuffleStageLook: vi.fn(),
  keepStageLook: vi.fn(),
  clearStageLook: vi.fn(),
  resetStage: vi.fn(),
  saveStageLookAs: vi.fn(),
  loadSavedStageLook: vi.fn(),
  deleteSavedStageLook: vi.fn(),
  setNewLookOnLaunch: vi.fn(),
});

const musicStore = reactive({
  currentKey: "C",
  currentMode: "major",
  setKey: vi.fn(),
  setMode: vi.fn(),
});

vi.mock("pinia", async (importOriginal) => ({
  ...await importOriginal<typeof import("pinia")>(),
  storeToRefs: (store: object) => toRefs(store),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => keyboardDrawerStore,
}));

vi.mock("@/stores/visualConfig", () => ({
  useVisualConfigStore: () => visualConfigStore,
}));

vi.mock("@/stores/music", () => ({
  useMusicStore: () => musicStore,
}));

vi.mock("@/components/TopDrawer.vue", () => ({
  default: {
    props: ['handleTestId', 'ariaLabel'],
    template: '<div data-testid="top-drawer"><button :data-testid="handleTestId" :aria-label="ariaLabel"><slot name="icon" /><slot name="status" /></button><section data-testid="panel"><slot name="panel" :close="close" /></section></div>',

    setup() {
      return {
        isOpen: false,
        open: vi.fn(),
        close: vi.fn(),
      };
    },
  },
}));


vi.mock("@/components/TabbedOverlayPanel.vue", () => ({
  default: {
    name: "TabbedOverlayPanel",
    props: ["modelValue", "tabs"],
    template: '<div :data-tab="modelValue"><slot name="header" /><slot /></div>',
    setup(props: { modelValue: string }) {
      const { modelValue } = toRefs(props);
      provide("tabs-context", { value: modelValue });
    },
  },
}));

vi.mock("@/components/primatives/Knob/index.vue", () => ({
  default: {
    name: "Knob",
    props: {
      tone: { type: String, default: "ivory" },
    },
    template: '<div data-testid="mock-knob" :data-tone="tone"></div>',
  },
}));

vi.mock("lucide-vue-next", () => ({
  Settings: { template: '<svg data-testid="settings-icon"></svg>' },
  X: { template: '<svg data-testid="close-icon"></svg>' },
  RotateCcw: { template: '<svg data-testid="reset-icon"></svg>' },
  RefreshCw: { template: '<svg data-testid="refresh-icon"></svg>' },
  Download: { template: '<svg data-testid="download-icon"></svg>' },
  Save: { template: '<svg data-testid="save-icon"></svg>' },
  Power: { template: '<svg data-testid="power-icon"></svg>' },
  ToggleLeft: { template: '<svg data-testid="toggle-left-icon"></svg>' },
  ToggleRight: { template: '<svg data-testid="toggle-right-icon"></svg>' },
  Trash2: { template: '<svg data-testid="trash-icon"></svg>' },
  ClipboardCopy: { template: '<svg data-testid="clipboard-copy-icon"></svg>' },
  FileDown: { template: '<svg data-testid="file-down-icon"></svg>' },
  Shuffle: { template: '<svg data-testid="shuffle-icon"></svg>' },
  Check: { template: '<svg data-testid="check-icon"></svg>' },
}));

function resetMidiState() {
  keyboardDrawerStore.midi.isSupported = true;
  keyboardDrawerStore.midi.isConnecting = false;
  keyboardDrawerStore.midi.isListening = true;
  keyboardDrawerStore.midi.connectedInputs = [];
  keyboardDrawerStore.midi.connectedOutputs = [];
  keyboardDrawerStore.midi.syncedOutput = null;
  keyboardDrawerStore.midi.lastError = null;
}

describe("ConfigPanel.vue", () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    resetMidiState();

    visualConfigStore.visualsEnabled = true;
    visualConfigStore.savedConfigs = [];
    musicStore.currentKey = "C";
    musicStore.currentMode = "major";
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("assigns repeated section-toggle emissions without inverting twice", async () => {
    visualConfigStore.config.keyboard.isEnabled = true;
    visualConfigStore.updateValue.mockImplementation((section, key, value) => {
      if (section === "keyboard" && key === "isEnabled") {
        visualConfigStore.config.keyboard.isEnabled = value;
      }
    });
    wrapper = createTestWrapper(ConfigPanel);
    wrapper.getComponent({ name: "TabbedOverlayPanel" }).vm.$emit("update:modelValue", "keyboard");
    await nextTick();
    const section = wrapper.findComponent('[data-testid="section-toggle-keyboard"]');
    section.vm.$emit("update:modelValue", false);
    await nextTick();
    section.vm.$emit("update:modelValue", false);
    await nextTick();
    expect(visualConfigStore.config.keyboard.isEnabled).toBe(false);
    expect(visualConfigStore.updateValue).toHaveBeenLastCalledWith("keyboard", "isEnabled", false);
  });

  it("publishes one consolidated Stage destination and removes renderer-shaped tabs", () => {
    wrapper = createTestWrapper(ConfigPanel);
    const tabs = wrapper
      .getComponent({ name: "TabbedOverlayPanel" })
      .props("tabs") as Array<{ value: string }>;

    expect(tabs.map((tab) => tab.value)).toContain("stage");
    expect(tabs.map((tab) => tab.value)).toContain("looks");
    expect(tabs.slice(0, 2).map((tab) => tab.value)).toEqual(["looks", "stage"]);
    expect(tabs.map((tab) => tab.value)).toContain("uiBeat");
    expect(tabs.map((tab) => tab.value)).toContain("dynamicColors");
    expect(tabs.map((tab) => tab.value)).not.toContain("blobs");
    expect(tabs.map((tab) => tab.value)).not.toContain("ambient");
    expect(tabs.map((tab) => tab.value)).not.toContain("strings");
    expect(tabs.map((tab) => tab.value)).not.toContain("particles");
    expect(tabs.map((tab) => tab.value)).not.toContain("hilbertScope");
    expect(tabs.map((tab) => tab.value)).not.toContain("animation");
    expect(tabs.map((tab) => tab.value)).not.toContain("frequencyMapping");
    expect(tabs.map((tab) => tab.value)).not.toContain("beatingShapes");
    expect(tabs.map((tab) => tab.value)).not.toContain("floatingPopup");
    expect(CONFIG_SECTIONS).not.toHaveProperty("floatingPopup");
    expect(CONFIG_SECTIONS).not.toHaveProperty("beatingShapes");
    expect(Object.keys(UNIFIED_CONFIG.uiBeat).filter((key) => key !== "_meta"))
      .toEqual(["isEnabled"]);
    expect(UNIFIED_CONFIG.blobs.connectionMode.group).toBe("Relationships");
    expect(UNIFIED_CONFIG.blobs.analysisHoldTime.group).toBe("Analysis");
    expect(UNIFIED_CONFIG.blobs.showChordLabel.group).toBe("Labels");
    expect(UNIFIED_CONFIG.blobs.webOpacity.visibleWhen).toEqual({
      field: "connectionMode",
      values: ["web"],
    });
    expect(STAGE_CONTROL_DEFINITIONS).toHaveLength(22);
  });

  it("keeps drag-owned keyboard row count out of generated settings", () => {
    expect(UNIFIED_CONFIG.keyboard.rowCount.hidden).toBe(true);
    expect(configPanelSource).toContain("if (metadata?.hidden) return false");
  });

  it("uses ivory Sticker faces for Stage Looks without Badge or brass", async () => {
    wrapper = createTestWrapper(ConfigPanel);
    wrapper.getComponent({ name: "TabbedOverlayPanel" }).vm.$emit("update:modelValue", "looks");
    await nextTick();

    expect(wrapper.findAll('[data-testid^="preset-apply-"]')).toHaveLength(3);
    const scene = wrapper.get('[data-testid="preset-apply-soft"]');
    expect(scene.element.tagName).toBe("BUTTON");
    expect(scene.find(".sticker--outline.sticker--color-ivory").exists()).toBe(true);
    expect(wrapper.find(".sticker--badge").exists()).toBe(false);
    expect(wrapper.find('[class*="sticker--color-brass"]').exists()).toBe(false);
  });

  it("reserves brass Knobs for global and section enable controls", async () => {
    wrapper = createTestWrapper(ConfigPanel);

    expect(
      wrapper.getComponent('[data-testid="config-panel-global-toggle"]').props("tone")
    ).toBe("brass");

    wrapper.getComponent({ name: "TabbedOverlayPanel" }).vm.$emit("update:modelValue", "keyboard");
    await nextTick();

    expect(
      wrapper.getComponent('[data-testid="section-toggle-keyboard"]').props("tone")
    ).toBe("brass");
    expect(
      wrapper.findAllComponents({ name: "Knob" }).filter((knob) => knob.props("tone") === "brass")
    ).toHaveLength(2);
  });

  it("keeps Config chrome on the workhorse Ink and Ivory palette", () => {
    expect(configPanelSource).not.toContain("text-neutral-");
    expect(configPanelSource).not.toContain("var(--ink-2)");
    expect(configPanelSource).not.toContain("var(--ivory-3)");
    expect(configPanelSource).not.toContain("var(--ivory-4)");
  });

  it("aligns action Knobs with small Buttons", () => {
    wrapper = createTestWrapper(ConfigPanel);

    expect(configPanelSource).toContain("--knob-size: 32px");
    expect(configPanelSource).toMatch(
      /\.config-panel__section-controls\s*\{[^}]*align-items: flex-start;/s,
    );
    expect(wrapper.get('[data-testid="overlay-panel-header"] .overlay-panel-header__title').text())
      .toBe("Config");
    expect(wrapper.get('[data-testid="overlay-panel-header"] .overlay-panel-header__context').text())
      .toBe("Looks");
    expect(wrapper.get('button[aria-label="Close settings"]').classes())
      .toContain("paper-button--sm");
  });

  it("hides the MIDI shortcut when only generic outputs are present", async () => {
    keyboardDrawerStore.midi.connectedOutputs = ["Scarlett 2i2 MIDI"];

    wrapper = createTestWrapper(ConfigPanel);
    await nextTick();

    expect(wrapper.find('[data-testid="config-midi-trigger"]').exists()).toBe(false);
  });

  it("treats virtual loopback ports as non-actionable MIDI state", async () => {
    keyboardDrawerStore.midi.connectedInputs = ["IAC Driver Bus 1"];
    keyboardDrawerStore.midi.connectedOutputs = ["IAC Driver Bus 1"];

    wrapper = createTestWrapper(ConfigPanel);
    await nextTick();

    expect(wrapper.find('[data-testid="config-midi-trigger"]').exists()).toBe(false);
    expect(
      wrapper.find('[data-testid="config-panel-trigger"]').attributes("aria-label")
    ).toContain("Virtual MIDI ports detected");
  });

  it("shows the MIDI shortcut for a connected input", async () => {
    keyboardDrawerStore.midi.connectedInputs = ["Launchkey Mini MK3"];

    wrapper = createTestWrapper(ConfigPanel);
    await nextTick();

    const trigger = wrapper.find('[data-testid="config-midi-trigger"]');

    expect(trigger.exists()).toBe(true);
    expect(wrapper.get('[data-testid="panel"]').find('[data-testid="config-midi-trigger"]').exists()).toBe(true);
    await trigger.trigger("click");
    expect(wrapper.find("[data-tab]").attributes("data-tab")).toBe("midi");
    expect(trigger.attributes("aria-label")).toContain(
      "Open MIDI and ROLI controls"
    );
  });

  it("shows the MIDI shortcut for a ROLI or LUMI output", async () => {
    keyboardDrawerStore.midi.connectedOutputs = ["LUMI Keys BLOCK"];

    wrapper = createTestWrapper(ConfigPanel);
    await nextTick();

    expect(wrapper.find('[data-testid="config-midi-trigger"]').exists()).toBe(true);
  });
});
