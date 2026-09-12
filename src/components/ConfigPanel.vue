<template>
  <TopDrawer
    anchor="top-right"
    :content-height="drawerContentHeight"
    :aria-label="midiTriggerLabel"
    handle-test-id="config-panel-trigger"
  >
    <template #icon>
      <span class="flex" :title="midiTriggerLabel"><MidiSettingsIcon :state="midiStatusState" /></span>
    </template>

    <template #panel="{ close }">
      <TabbedOverlayPanel
        @content-height="drawerContentHeight = $event"
        v-model="activeTab"
        :tabs="allTabs"
        tab-test-id-prefix="config-tab"
        tabs-aria-label="Configuration sections"
        embedded
        width="100%"
        height="100%"
        max-height="100%"
        body-class="px-3 py-3"
      >
        <template #header>
          <OverlayPanelHeader title="Config" :context="activeTabLabel">
            <Button
              v-if="showMidiShortcut"
              size="sm"
              data-testid="config-midi-trigger"
              :accessible-name="midiTriggerLabel"
              :title="midiTriggerLabel"
              @click="activeTab = MIDI_TAB.value"
            ><MidiPermissionIcon /></Button>
            <Knob
              data-testid="config-panel-global-toggle"
              type="boolean"
              :model-value="visualsEnabled"
              label="Visuals"
              tone="brass"
              class="config-panel__boolean-knob"
              :title="visualsEnabled ? 'Disable all visuals' : 'Enable all visuals'"
              :aria-label="visualsEnabled ? 'Disable all visuals' : 'Enable all visuals'"
              @update:modelValue="setVisualsEnabled(Boolean($event))"
            />

            <Button
              size="sm"
              data-testid="config-reset-all"
              title="Reset all settings"
              accessible-name="Reset all settings"
              @click="resetToDefaults"
            >
              <RefreshCw :size="14" />
            </Button>

            <Button
              size="sm"
              data-testid="config-export"
              title="Export configuration"
              accessible-name="Export configuration"
              @click="exportConfig"
            >
              <Download :size="14" />
            </Button>

            <Button
              size="sm"
              title="Close settings"
              accessible-name="Close settings"
              @click="close"
            >
              <X :size="14" />
            </Button>
          </OverlayPanelHeader>
        </template>

        <template #default="{ activeValue: panelTab }">
          <div class="space-y-3">
          <TabsContent value="global" :active-value="panelTab">
            <section class="config-panel__section" data-testid="global-public-controls">
              <header class="config-panel__section-header">
                <div>
                  <p class="config-panel__eyebrow">Across EmotiTone</p>
                  <h2>Global</h2>
                  <p class="config-panel__section-copy">
                    Shared color and interface rhythm, independent of the Stage canvas.
                  </p>
                </div>

                <Button
                  size="sm"
                  data-testid="global-reset"
                  title="Reset Global"
                  accessible-name="Reset Global"
                  @click="resetGlobal"
                >
                  <RotateCcw :size="14" />
                </Button>
              </header>

              <div class="config-panel__groups">
                <div
                  v-for="group in GLOBAL_CONTROL_GROUPS"
                  :key="group.label"
                  class="config-panel__group"
                >
                  <p class="config-panel__group-label">{{ group.label }}</p>
                  <p class="config-panel__group-copy">{{ group.description }}</p>
                  <div class="config-panel__knob-grid">
                    <Knob
                      v-for="control in group.controls"
                      :key="control.id"
                      :data-testid="`global-control-${control.id}`"
                      :model-value="globalControls[control.id]"
                      :type="control.type"
                      :options="control.options"
                      :label="control.label"
                      :tone="control.id === 'uiRhythm' ? 'brass' : 'ivory'"
                      :class="{ 'config-panel__boolean-knob': control.id === 'uiRhythm' }"
                      @update:modelValue="handleGlobalControl(control.id, $event)"
                    />
                  </div>
                </div>

                <details v-if="savedConfigs.length > 0" class="config-panel__legacy-configs">
                  <summary>Legacy full configurations</summary>
                  <p class="config-panel__group-copy">
                    Kept for compatibility. Loading one can change every part of Config.
                  </p>
                  <article
                    v-for="savedConfig in savedConfigs"
                    :key="savedConfig.id"
                    class="config-panel__saved-preset"
                  >
                    <button
                      type="button"
                      class="config-panel__saved-load"
                      :data-testid="`saved-load-${savedConfig.id}`"
                      :aria-label="`Load legacy configuration ${savedConfig.name}`"
                      @click="loadSavedConfig(savedConfig.id)"
                    >
                      <Sticker variant="outline" color="ivory">{{ savedConfig.name }}</Sticker>
                      <span class="config-panel__saved-time">{{ formatTimestamp(savedConfig.updatedAt) }}</span>
                    </button>
                    <Button
                      size="sm"
                      :data-testid="`saved-delete-${savedConfig.id}`"
                      :title="`Delete ${savedConfig.name}`"
                      :accessible-name="`Delete ${savedConfig.name}`"
                      @click="deleteSavedConfig(savedConfig.id)"
                    ><Trash2 :size="14" /></Button>
                  </article>
                </details>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="stage" :active-value="panelTab">
            <div class="config-panel__stage-stack">
            <section class="config-panel__presets config-panel__section" data-testid="stage-looks">
              <header class="config-panel__looks-header">
                <div>
                  <p class="config-panel__eyebrow">Stage only</p>
                  <h2>Looks</h2>
                  <p class="config-panel__section-copy">
                    Built-ins preserve Connections and Explanations; saved Looks restore what you saved.
                  </p>
                </div>

                <div class="config-panel__looks-actions">
                  <Button
                    size="sm"
                    data-testid="stage-look-shuffle"
                    title="Shuffle a new Stage Look"
                    accessible-name="Shuffle a new Stage Look"
                    @click="shuffleStageLook()"
                  ><ShuffleIcon :size="14" /></Button>
                  <Button
                    size="sm"
                    data-testid="stage-look-save"
                    title="Save current Stage Look"
                    accessible-name="Save current Stage Look"
                    @click="promptSaveStageLook"
                  ><Save :size="14" /></Button>
                </div>
              </header>

              <div v-if="transientStageLook" class="config-panel__look-preview">
                <p class="config-panel__look-status" role="status">
                  Previewing {{ transientStageLook.name }}. Edits stay temporary until kept.
                </p>
                <div class="config-panel__look-preview-actions">
                  <Button
                    size="sm"
                    data-testid="stage-look-keep"
                    title="Keep this Stage Look"
                    accessible-name="Keep this Stage Look"
                    @click="keepStageLook"
                  ><Check :size="14" /></Button>
                  <Button
                    size="sm"
                    data-testid="stage-look-discard"
                    title="Discard this Stage Look"
                    accessible-name="Discard this Stage Look"
                    @click="clearStageLook"
                  ><RotateCcw :size="14" /></Button>
                </div>
              </div>

              <div class="config-panel__launch-setting">
                <div>
                  <p class="config-panel__group-label">New Look on Reload</p>
                  <p class="config-panel__group-copy">Each reload previews a newly seeded variation. It stays temporary until kept.</p>
                </div>
                <Knob
                  type="boolean"
                  :model-value="newLookOnLaunch"
                  label="On Reload"
                  data-testid="new-look-on-launch"
                  @update:modelValue="setNewLookOnLaunch(Boolean($event))"
                />
              </div>

              <div class="config-panel__preset-group">
                <p class="config-panel__group-label">Built In</p>
                <div class="config-panel__scene-grid">
                  <button
                    v-for="look in builtInLooks"
                    :key="look.id"
                    type="button"
                    class="config-panel__sticker-action"
                    :data-testid="`preset-apply-${look.id}`"
                    :aria-label="`Preview ${look.name} Stage Look`"
                    @click="applyBuiltInStageLook(look.id)"
                  >
                    <Sticker variant="outline" color="ivory">{{ look.name }}</Sticker>
                    <span class="config-panel__sticker-copy">{{ look.description }}</span>
                  </button>
                </div>
              </div>

              <div class="config-panel__preset-group">
                <p class="config-panel__group-label">Saved Stage Looks</p>
                <div v-if="savedStageLooks.length === 0" class="config-panel__empty-state">
                  No saved Stage Looks yet.
                </div>
                <article
                  v-for="look in savedStageLooks"
                  :key="look.id"
                  class="config-panel__saved-preset"
                >
                  <button
                    type="button"
                    class="config-panel__saved-load"
                    :data-testid="`stage-look-load-${look.id}`"
                    :aria-label="`Preview ${look.name}`"
                    @click="loadSavedStageLook(look.id)"
                  >
                    <Sticker variant="outline" color="ivory">{{ look.name }}</Sticker>
                    <span class="config-panel__saved-time">{{ formatTimestamp(look.updatedAt) }}</span>
                  </button>
                  <Button
                    size="sm"
                    :data-testid="`stage-look-delete-${look.id}`"
                    :title="`Delete ${look.name}`"
                    :accessible-name="`Delete ${look.name}`"
                    @click="deleteSavedStageLook(look.id)"
                  ><Trash2 :size="14" /></Button>
                </article>
              </div>

            </section>

            <section
              class="config-panel__section"
              :class="{ 'config-panel__section--disabled': !visualsEnabled }"
              data-testid="stage-public-controls"
            >
              <header class="config-panel__section-header">
                <div>
                  <p class="config-panel__eyebrow">Customize</p>
                  <h2>Stage</h2>
                  <p class="config-panel__section-copy">
                    Hilbert Scope leads. Bodies, atmosphere, strings, and flecks support it.
                  </p>
                </div>

                <div class="config-panel__section-controls">
                  <Knob
                    type="boolean"
                    :model-value="stageControls.stageEnabled"
                    label="Stage"
                    tone="brass"
                    class="config-panel__boolean-knob"
                    data-testid="stage-toggle"
                    :is-disabled="!visualsEnabled"
                    @update:modelValue="updateStageControl('stageEnabled', Boolean($event))"
                  />
                  <Button
                    size="sm"
                    data-testid="stage-reset"
                    title="Reset Stage"
                    accessible-name="Reset Stage"
                    @click="resetStage"
                  >
                    <RotateCcw :size="14" />
                  </Button>
                </div>
              </header>

              <div class="config-panel__groups">
                <div
                  v-for="group in STAGE_CONTROL_GROUPS"
                  :key="group.label"
                  class="config-panel__group"
                >
                  <p class="config-panel__group-label">{{ group.label }}</p>
                  <p class="config-panel__group-copy">{{ group.description }}</p>
                  <div class="config-panel__knob-grid">
                    <Knob
                      v-for="control in group.controls"
                      :key="control.id"
                      :data-testid="`stage-control-${control.id}`"
                      :model-value="stageControls[control.id]"
                      :type="control.type"
                      :min="control.min"
                      :max="control.max"
                      :step="control.step"
                      :options="control.options"
                      :label="control.label"
                      :format-value="control.format"
                      :is-disabled="!visualsEnabled || !stageControls.stageEnabled"
                      @update:modelValue="updateStageControl(control.id, $event)"
                    />
                  </div>
                </div>
              </div>
            </section>
            </div>
          </TabsContent>

          <TabsContent value="deck" :active-value="panelTab">
            <section class="config-panel__section" data-testid="deck-public-controls">
              <header class="config-panel__section-header">
                <div>
                  <p class="config-panel__eyebrow">Performance surface</p>
                  <h2>Deck</h2>
                  <p class="config-panel__section-copy">
                    Shared notation and the useful Keyboard and Code Strip choices.
                  </p>
                </div>

                <Button
                  size="sm"
                  data-testid="deck-reset"
                  title="Reset Deck"
                  accessible-name="Reset Deck"
                  @click="resetDeck"
                >
                  <RotateCcw :size="14" />
                </Button>
              </header>

              <div class="config-panel__groups">
                <div
                  v-for="group in DECK_CONTROL_GROUPS"
                  :key="group.label"
                  class="config-panel__group"
                >
                  <p class="config-panel__group-label">{{ group.label }}</p>
                  <p class="config-panel__group-copy">{{ group.description }}</p>
                  <div class="config-panel__knob-grid">
                    <Knob
                      v-for="control in group.controls"
                      :key="control.id"
                      :data-testid="`deck-control-${control.id}`"
                      :model-value="deckControls[control.id]"
                      :type="control.type"
                      :options="control.options"
                      :label="control.label"
                      :is-disabled="control.id === 'showRests' && !deckControls.codeStrip"
                      @update:modelValue="handleDeckControl(control.id, $event)"
                    />
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="midi" :active-value="panelTab">
            <section class="config-panel__midi-grid">
              <article
                class="config-panel__midi-surface"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="config-panel__midi-mark"
                    :class="midiStatusClass"
                  >
                    <MidiPermissionIcon class="h-4.5 w-4.5" />
                  </div>

                  <div class="min-w-0 space-y-1">
                    <p
                      class="config-panel__midi-kicker"
                    >
                      MIDI Status
                    </p>
                    <h4 class="config-panel__midi-heading">
                      {{ midiStatusHeadline }}
                    </h4>
                    <p class="config-panel__midi-copy">
                      {{ midiStatusDetail }}
                    </p>
                  </div>
                </div>

                <div class="grid gap-2 sm:grid-cols-2">
                  <article
                    class="config-panel__midi-port"
                  >
                    <p
                      class="config-panel__midi-port-label"
                    >
                      Inputs
                    </p>
                    <p class="config-panel__midi-port-value">
                      {{
                        connectedInputs.length > 0
                          ? connectedInputs.join(", ")
                          : "No connected MIDI inputs yet."
                      }}
                    </p>
                  </article>

                  <article
                    class="config-panel__midi-port"
                  >
                    <p
                      class="config-panel__midi-port-label"
                    >
                      Outputs
                    </p>
                    <p class="config-panel__midi-port-value">
                      {{
                        connectedOutputs.length > 0
                          ? connectedOutputs.join(", ")
                          : "No connected MIDI outputs yet."
                      }}
                    </p>
                  </article>
                </div>
              </article>

              <article
                class="config-panel__midi-surface"
              >
                <div class="space-y-2">
                  <p class="config-panel__group-label">ROLI</p>

                  <p class="config-panel__midi-copy">
                    Generate a live-sync LittleFoot script from the current
                    palette and load it in ROLI Dashboard or BLOCKS Code.
                  </p>
                  <p class="config-panel__midi-hint">
                    {{ roliSyncMessage }}
                  </p>
                </div>

                <div class="config-panel__midi-actions">
                  <div class="config-panel__labeled-action">
                    <Button
                      size="sm"
                      title="Copy ROLI script"
                      accessible-name="Copy ROLI script"
                      @click="copyRoliPianoScript"
                    >
                      <ClipboardCopy :size="14" />
                    </Button>
                    <span>Copy</span>
                  </div>
                  <div class="config-panel__labeled-action">
                    <Button
                      size="sm"
                      title="Download ROLI script"
                      accessible-name="Download ROLI script"
                      @click="downloadRoliPianoScript"
                    >
                      <FileDown :size="14" />
                    </Button>
                    <span>Download</span>
                  </div>
                </div>
              </article>
            </section>
            </TabsContent>
          </div>
        </template>

      </TabbedOverlayPanel>
    </template>
  </TopDrawer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import MidiSettingsIcon from "@/components/primatives/MidiSettingsIcon.vue";
import OverlayPanelHeader from "@/components/OverlayPanelHeader.vue";
import { storeToRefs, type Pinia } from "pinia";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { BUILT_IN_STAGE_LOOKS } from "@/data/visual-config-presets";
import {
  STAGE_CONTROL_GROUPS,
} from "@/services/stageAppearance";
import {
  DECK_CONTROL_GROUPS,
  GLOBAL_CONTROL_GROUPS,
  type DeckControlId,
  type GlobalControlId,
} from "@/services/configPublicSurface";
import type { ChromaticNote } from "@/types";
import { TabsContent } from "@/components/ui";
import Button from "@/components/primatives/Button.vue";
import Knob from "@/components/primatives/Knob/index.vue";
import Sticker from "@/components/primatives/Sticker.vue";
import MidiPermissionIcon from "./MidiPermissionIcon.vue";
import TabbedOverlayPanel from "./TabbedOverlayPanel.vue";
import TopDrawer from "./TopDrawer.vue";
import {
  X,
  RotateCcw,
  RefreshCw,
  Download,
  Save,
  Trash2,
  ClipboardCopy,
  FileDown,
  Shuffle as ShuffleIcon,
  Check,
} from "lucide-vue-next";
import { generateRoliPianoScript } from "@/services/roliPianoExport";
import {
  isRoliMidiPortName,
  isVirtualMidiPortName,
} from "@/services/roliLiveSync";

const drawerContentHeight = ref<number>();

const props = defineProps<{
  visualConfigPinia?: Pinia;
}>();

const GLOBAL_TAB = {
  value: "global",
  label: "Global",
  shortLabel: "Global",
};

const STAGE_TAB = {
  value: "stage",
  label: "Stage",
  shortLabel: "Stage",
};

const DECK_TAB = {
  value: "deck",
  label: "Deck",
  shortLabel: "Deck",
};

const MIDI_TAB = {
  value: "midi",
  label: "MIDI & ROLI",
  shortLabel: "MIDI",
  icon: MidiPermissionIcon,
};

const visualConfigStore = useVisualConfigStore(props.visualConfigPinia);
const keyboardDrawerStore = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const activeTab = ref("global");

const {
  config,
  visualsEnabled,
  savedConfigs,
  savedStageLooks,
  newLookOnLaunch,
  transientStageLook,
  stageControls,
  globalControls,
  deckControls,
} = storeToRefs(visualConfigStore);

const {
  resetToDefaults,
  exportConfig: storeExportConfig,
  setVisualsEnabled,
  loadSavedConfig,
  deleteSavedConfig,
  updateStageControl,
  applyBuiltInStageLook,
  shuffleStageLook,
  keepStageLook,
  clearStageLook,
  resetStage,
  saveStageLookAs,
  loadSavedStageLook,
  deleteSavedStageLook,
  setNewLookOnLaunch,
  updateGlobalControl,
  resetGlobal,
  updateDeckControl,
  resetDeck,
} = visualConfigStore;

const builtInLooks = BUILT_IN_STAGE_LOOKS;

const allTabs = computed(() => [
  GLOBAL_TAB,
  STAGE_TAB,
  DECK_TAB,
  MIDI_TAB,
]);

const activeTabLabel = computed(
  () => allTabs.value.find((tab) => tab.value === activeTab.value)?.label ?? ""
);

const handleGlobalControl = (
  control: GlobalControlId,
  value: string | number | boolean,
) => {
  if (typeof value === "number") return;
  updateGlobalControl(control, value);
};

const handleDeckControl = (
  control: DeckControlId,
  value: string | number | boolean,
) => {
  if (typeof value === "number") return;
  updateDeckControl(control, value);
};

const connectedInputs = computed(() => keyboardDrawerStore.midi.connectedInputs);
const connectedOutputs = computed(() => keyboardDrawerStore.midi.connectedOutputs);
const physicalInputs = computed(() =>
  connectedInputs.value.filter((name) => !isVirtualMidiPortName(name))
);
const physicalOutputs = computed(() =>
  connectedOutputs.value.filter((name) => !isVirtualMidiPortName(name))
);
const virtualPortNames = computed(() =>
  Array.from(
    new Set(
      [...connectedInputs.value, ...connectedOutputs.value].filter((name) =>
        isVirtualMidiPortName(name)
      )
    )
  )
);
const hasConnectedInput = computed(() => physicalInputs.value.length > 0);
const detectedRoliOutput = computed(
  () =>
    physicalOutputs.value.find((outputName) => isRoliMidiPortName(outputName))
    ?? null
);
const hasVirtualOnlyMidiPorts = computed(
  () =>
    !hasConnectedInput.value
    && !detectedRoliOutput.value
    && !keyboardDrawerStore.midi.syncedOutput
    && virtualPortNames.value.length > 0
);

const hasActionableMidiDevice = computed(
  () =>
    hasConnectedInput.value
    || Boolean(detectedRoliOutput.value)
    || Boolean(keyboardDrawerStore.midi.syncedOutput)
);

const midiStatusState = computed(() => {
  const midi = keyboardDrawerStore.midi;

  if (midi.lastError) {
    return "error";
  }

  if (midi.isConnecting) {
    return "connecting";
  }

  if (hasActionableMidiDevice.value) {
    return "connected";
  }

  return "idle";
});

const showMidiShortcut = computed(
  () => keyboardDrawerStore.midi.isSupported && hasActionableMidiDevice.value
);

const midiStatusHeadline = computed(() => {
  const midi = keyboardDrawerStore.midi;

  if (!midi.isSupported) {
    return "Browser MIDI unavailable";
  }

  if (midi.lastError) {
    return "MIDI permission blocked";
  }

  if (midi.isConnecting) {
    return "Requesting MIDI access";
  }

  if (midi.syncedOutput) {
    return `Live sync armed on ${midi.syncedOutput}`;
  }

  if (hasConnectedInput.value) {
    return "MIDI controller connected";
  }

  if (detectedRoliOutput.value) {
    return "ROLI/LUMI output detected";
  }

  if (hasVirtualOnlyMidiPorts.value) {
    return "Virtual MIDI ports detected";
  }

  if (physicalOutputs.value.length > 0) {
    return "MIDI output available";
  }

  if (midi.isListening) {
    return "MIDI ready for hot-plug";
  }

  return "Waiting for MIDI";
});

const midiStatusDetail = computed(() => {
  const midi = keyboardDrawerStore.midi;

  if (!midi.isSupported) {
    return "This browser does not expose the Web MIDI API, so external controllers cannot be connected here.";
  }

  if (midi.lastError) {
    return "The app still works with touch and QWERTY input, but browser MIDI access was not granted.";
  }

  if (hasVirtualOnlyMidiPorts.value) {
    const visiblePortList = virtualPortNames.value.join(", ");
    return `Chrome can see software MIDI ports like ${visiblePortList}. Those are virtual loopback connections, not physical controllers.`;
  }

  return roliSyncMessage.value;
});

const midiTriggerLabel = computed(() => {
  if (showMidiShortcut.value) {
    return `Open MIDI and ROLI controls. ${midiStatusHeadline.value}.`;
  }

  return `Open settings. ${midiStatusHeadline.value}.`;
});

const midiStatusClass = computed(() =>
  midiStatusState.value === "idle"
    ? "config-panel__midi-mark--quiet"
    : "config-panel__midi-mark--active"
);

const roliSyncMessage = computed(() => {
  const midi = keyboardDrawerStore.midi;

  if (midi.syncedOutput) {
    return `Live sync active on ${midi.syncedOutput}.`;
  }

  if (detectedRoliOutput.value) {
    return `ROLI output ${detectedRoliOutput.value} is connected. Load the script onto the keyboard to arm live sync.`;
  }

  if (physicalOutputs.value.length > 0) {
    return "MIDI outputs are connected, but none look like a ROLI/LUMI port yet.";
  }

  return "When a LUMI/ROLI MIDI output is connected, the app will mirror notes and push palette changes automatically after the script is loaded.";
});

const exportConfig = async () => {
  const configJson = storeExportConfig();

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(configJson);
      notify("Configuration copied to clipboard.");
      return;
    }
  } catch {
    // Fall through to console logging below.
  }

  console.log(configJson);
  notify("Configuration logged to console.");
};

const getRoliPianoScript = () =>
  generateRoliPianoScript({
    dynamicColorConfig: { ...config.value.dynamicColors },
    currentKey: musicStore.currentKey as ChromaticNote,
    currentMode: musicStore.currentMode,
  });

const downloadTextFile = (filename: string, contents: string) => {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
};

const copyRoliPianoScript = async () => {
  const script = getRoliPianoScript();

  try {
    await navigator.clipboard.writeText(script);
    alert("ROLI live-sync LittleFoot script copied to clipboard!");
  } catch {
    alert("Clipboard unavailable, downloading the script instead.");
    downloadTextFile("emotitone-roli-live-sync.littlefoot", script);
  }
};

const downloadRoliPianoScript = () => {
  downloadTextFile(
    "emotitone-roli-live-sync.littlefoot",
    getRoliPianoScript()
  );
};

const promptSaveStageLook = () => {
  const name =
    typeof window !== "undefined" && typeof window.prompt === "function"
      ? window.prompt("Enter a name for this Stage Look:")
      : null;

  if (!name?.trim()) return;

  saveStageLookAs(name.trim());
  notify(`Stage Look "${name.trim()}" saved.`);
};

const notify = (message: string) => {
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  }
};

const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "Unknown";
  }
};

</script>

<style scoped>
.config-panel__section-header,
.config-panel__section-controls,
.config-panel__looks-header,
.config-panel__looks-actions,
.config-panel__look-preview,
.config-panel__look-preview-actions,
.config-panel__launch-setting,
.config-panel__midi-actions,
.config-panel__saved-preset {
  display: flex;
  align-items: center;
}

.config-panel__eyebrow,
.config-panel__group-label,
.config-panel__saved-time,
.config-panel__labeled-action span {
  margin: 0;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.config-panel__boolean-knob {
  --knob-size: 32px;
  flex: 0 0 var(--knob-size);
  inline-size: var(--knob-size);
}

.config-panel__section {
  padding: clamp(var(--s-2), 2vw, var(--s-5)) var(--s-1) var(--s-5);
}

.config-panel__section-header {
  justify-content: space-between;
  gap: var(--s-4);
  margin-block-end: clamp(var(--s-5), 4vw, var(--s-7));
}

.config-panel__eyebrow,
.config-panel__group-label,
.config-panel__saved-time,
.config-panel__labeled-action span {
  color: var(--ivory);
  font-size: 9px;
  letter-spacing: .18em;
  opacity: .52;
}

.config-panel__section-header h2 {
  margin: var(--s-1) 0 0;
  color: var(--ivory);
  font: var(--t-display-m);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.config-panel__section-copy,
.config-panel__group-copy,
.config-panel__look-status,
.config-panel__legacy-configs {
  margin: 0;
  color: var(--ivory);
  font: var(--t-body-mono);
  font-size: 10px;
  line-height: 1.55;
  opacity: .58;
}

.config-panel__section-copy {
  max-inline-size: 54ch;
  margin-block-start: var(--s-2);
}

.config-panel__look-preview {
  justify-content: space-between;
  gap: var(--s-3);
  border-inline-start: 3px solid var(--brass);
  padding: var(--s-3) var(--s-4);
  background: var(--ink);
}

.config-panel__section > .config-panel__look-preview {
  margin-block: calc(-1 * var(--s-3)) var(--s-6);
}

.config-panel__presets > .config-panel__look-preview {
  margin-block: calc(-1 * var(--s-3));
}

.config-panel__look-status {
  flex: 1;
  opacity: .82;
}

.config-panel__look-preview-actions {
  flex: none;
  gap: var(--s-2);
}

.config-panel__section-controls {
  align-items: flex-start;
  flex: none;
  gap: var(--s-2);
}

.config-panel__groups,
.config-panel__presets,
.config-panel__stage-stack {
  display: grid;
  gap: clamp(var(--s-7), 5vw, var(--s-9));
}

.config-panel__groups {
  transition: opacity var(--dur-ui) var(--ease-stab);
}

.config-panel__section--disabled .config-panel__groups {
  pointer-events: none;
  opacity: .38;
}

.config-panel__group,
.config-panel__preset-group {
  display: grid;
  gap: var(--s-4);
}

.config-panel__group-copy {
  max-inline-size: 56ch;
  margin-block-start: calc(-1 * var(--s-2));
}

.config-panel__looks-header,
.config-panel__launch-setting {
  justify-content: space-between;
  gap: var(--s-4);
}

.config-panel__looks-header h2 {
  margin: var(--s-1) 0 0;
  color: var(--ivory);
  font: var(--t-display-m);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.config-panel__looks-actions {
  align-items: flex-start;
  flex: none;
  gap: var(--s-2);
}

.config-panel__launch-setting {
  align-items: center;
  padding: var(--s-4);
  background: var(--ink);
}

.config-panel__legacy-configs {
  display: grid;
  gap: var(--s-3);
  opacity: .72;
}

.config-panel__legacy-configs summary {
  cursor: pointer;
  color: var(--ivory);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: .12em;
}

.config-panel__group-label {
  color: var(--ivory);
  opacity: .64;
}

.config-panel__knob-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(var(--s-5), 4vw, var(--s-8)) var(--s-3);
}

.config-panel__scene-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(var(--s-5), 4vw, var(--s-8)) clamp(var(--s-3), 3vw, var(--s-6));
  padding: var(--s-3) var(--s-1) var(--s-6);
}

.config-panel__sticker-action,
.config-panel__saved-load {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.config-panel__sticker-action {
  display: grid;
  min-inline-size: 0;
  justify-items: start;
  align-content: start;
  gap: var(--s-3);
  padding: var(--s-2);
  text-align: start;
}

.config-panel__sticker-action :deep(.sticker),
.config-panel__saved-load :deep(.sticker) {
  max-inline-size: 100%;
}

.config-panel__sticker-action:active :deep(.sticker),
.config-panel__saved-load:active :deep(.sticker) {
  transform: translateY(2px) rotate(0deg) scale(.97);
  box-shadow: none;
}

.config-panel__sticker-action:focus-visible,
.config-panel__saved-load:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 4px;
}

.config-panel__sticker-copy {
  max-inline-size: 34ch;
  color: var(--ivory);
  font: var(--t-body-mono);
  font-size: 10px;
  line-height: 1.5;
  opacity: .58;
}

.config-panel__empty-state,
.config-panel__saved-preset,
.config-panel__midi-surface,
.config-panel__midi-port {
  background: var(--ink);
}

.config-panel__empty-state {
  border-inline-start: 3px solid rgb(244 239 230 / 22%);
  padding: var(--s-4);
  color: var(--ivory);
  font: var(--t-body-mono);
  font-size: 10px;
  opacity: .58;
}

.config-panel__saved-preset {
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-4);
}

.config-panel__saved-load {
  display: flex;
  min-inline-size: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-3);
  text-align: start;
}

.config-panel__saved-time {
  color: var(--ivory);
  font-size: 8px;
  opacity: .5;
}

.config-panel__midi-grid {
  display: grid;
  gap: var(--s-3);
}

.config-panel__midi-surface {
  display: grid;
  align-content: start;
  gap: var(--s-4);
  padding: var(--s-5);
}

.config-panel__midi-mark {
  display: grid;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  flex: none;
  place-items: center;
  border: 1px solid rgb(244 239 230 / 22%);
  border-radius: 50%;
  background: var(--ink);
  color: var(--ivory);
}

.config-panel__midi-mark--quiet { opacity: .48; }
.config-panel__midi-mark--active {
  border-color: var(--ivory);
  box-shadow: 0 0 12px rgb(244 239 230 / 14%);
}

.config-panel__midi-port {
  padding: var(--s-3);
  border: 1px solid rgb(244 239 230 / 12%);
}

.config-panel__midi-kicker,
.config-panel__midi-heading,
.config-panel__midi-copy,
.config-panel__midi-port-label,
.config-panel__midi-port-value,
.config-panel__midi-hint {
  margin: 0;
  color: var(--ivory);
}

.config-panel__midi-kicker,
.config-panel__midi-port-label {
  font-size: 8px;
  text-transform: uppercase;
}

.config-panel__midi-kicker {
  font-weight: 600;
  letter-spacing: .24em;
  opacity: .62;
}

.config-panel__midi-heading {
  font-size: 13px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.config-panel__midi-copy,
.config-panel__midi-port-value {
  font-size: 11px;
  line-height: 1.6;
}

.config-panel__midi-copy { opacity: .62; }
.config-panel__midi-port-label {
  letter-spacing: .2em;
  opacity: .5;
}
.config-panel__midi-port-value { margin-block-start: var(--s-2); }
.config-panel__midi-hint {
  font-size: 10px;
  line-height: 1.6;
  opacity: .5;
}

.config-panel__midi-actions {
  gap: var(--s-4);
}

.config-panel__labeled-action {
  display: grid;
  justify-items: center;
  gap: var(--s-2);
}

@media (min-width: 560px) {
  .config-panel__knob-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .config-panel__scene-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (min-width: 960px) {
  .config-panel__knob-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .config-panel__midi-grid { grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr); }
}

@media (min-width: 1380px) {
  .config-panel__knob-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); }
}

@media (max-width: 420px) {
  .config-panel__section { padding-inline: 0; }
  .config-panel__scene-grid { padding-inline: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .config-panel__groups { transition: none; }
  .config-panel__sticker-action:active :deep(.sticker),
  .config-panel__saved-load:active :deep(.sticker) { transform: none; }
}
</style>
