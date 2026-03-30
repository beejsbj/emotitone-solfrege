import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive } from "vue";
import { createTestWrapper } from "../../helpers/test-utils";
import ConfigPanel from "@/components/ConfigPanel.vue";

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
    keyboard: {
      mainOctave: 4,
      rowCount: 3,
    },
    liveStrip: {
      bpm: 120,
    },
  },
  visualsEnabled: true,
  savedConfigs: [] as Array<{ id: string; name: string; updatedAt: string }>,
  updateValue: vi.fn(),
  resetToDefaults: vi.fn(),
  resetSection: vi.fn(),
  exportConfig: vi.fn(),
  setVisualsEnabled: vi.fn(),
  saveConfigAs: vi.fn(),
  loadSavedConfig: vi.fn(),
  deleteSavedConfig: vi.fn(),
  loadConfigSnapshot: vi.fn(),
});

const musicStore = reactive({
  currentKey: "C",
  currentMode: "major",
  setKey: vi.fn(),
  setMode: vi.fn(),
});

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
    template:
      '<div data-testid="top-drawer"><slot name="trigger" :open="open" :close="close" :is-open="isOpen" /></div>',
    setup() {
      return {
        isOpen: false,
        open: vi.fn(),
        close: vi.fn(),
      };
    },
  },
}));

vi.mock("../../../components/knobs", () => ({
  Knob: {
    template: '<div data-testid="mock-knob"></div>',
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
    expect(trigger.text().trim()).toBe("");
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
