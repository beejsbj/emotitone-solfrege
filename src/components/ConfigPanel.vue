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
          <div class="config-panel__global-bar">
            <p class="config-panel__title">Config</p>

            <div class="config-panel__global-controls">
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
                data-testid="config-save-as"
                title="Save configuration"
                accessible-name="Save configuration"
                @click="promptSaveConfig"
              >
                <Save :size="14" />
              </Button>

              <Button
                size="sm"
                title="Close settings"
                accessible-name="Close settings"
                @click="close"
              >
                <X :size="14" />
              </Button>
            </div>
          </div>
        </template>

        <div class="space-y-3">
          <TabsContent value="home">
            <section class="config-panel__scene-grid" aria-label="Visual scenes">
              <button
                v-for="preset in builtInPresets"
                :key="preset.id"
                type="button"
                class="config-panel__sticker-action"
                :data-testid="`preset-apply-${preset.id}`"
                :aria-label="`Apply ${preset.name} scene`"
                @click="applyBuiltInPreset(preset.id)"
              >
                <Sticker variant="outline" color="ivory">{{ preset.name }}</Sticker>
                <span class="config-panel__sticker-copy">{{ preset.description }}</span>
              </button>
            </section>
          </TabsContent>

          <TabsContent
            v-for="tab in sectionTabs"
            :key="tab.name"
            :value="tab.name"
          >
            <section
              class="config-panel__section"
              :class="{
                'config-panel__section--disabled':
                  !visualsEnabled || !isSectionInteractable(tab.name),
              }"
            >
              <header class="config-panel__section-header">
                <div>
                  <p class="config-panel__eyebrow">Active section</p>
                  <h2>{{ tab.label }}</h2>
                </div>

                <div class="config-panel__section-controls">
                  <Knob
                    v-if="getSectionEnableKey(tab.name) !== null"
                    type="boolean"
                    :model-value="isSectionEnabled(tab.name)"
                    label="Section"
                    class="config-panel__boolean-knob"
                    :data-testid="`section-toggle-${tab.name}`"
                    :title="isSectionEnabled(tab.name) ? `Disable ${tab.label}` : `Enable ${tab.label}`"
                    :aria-label="isSectionEnabled(tab.name) ? `Disable ${tab.label}` : `Enable ${tab.label}`"
                    @update:modelValue="setSectionEnabled(tab.name, Boolean($event))"
                  />
                  <Button
                    size="sm"
                    :data-testid="`section-reset-${tab.name}`"
                    :title="`Reset ${tab.label}`"
                    :accessible-name="`Reset ${tab.label}`"
                    @click="resetSectionToDefaults(tab.name)"
                  >
                    <RotateCcw :size="14" />
                  </Button>
                </div>
              </header>

              <div class="config-panel__groups">
                <div
                  v-for="group in getRenderableFieldGroups(tab.name)"
                  :key="`${tab.name}-${group.label || 'settings'}`"
                  class="config-panel__group"
                >
                  <p
                    v-if="group.label"
                    class="config-panel__group-label"
                  >
                    {{ group.label }}
                  </p>

                  <div
                    class="config-panel__knob-grid"
                  >
                    <template
                      v-for="field in group.fields"
                      :key="`${tab.name}-${field.key}`"
                    >
                      <Knob
                        v-if="typeof field.value === 'boolean'"
                        :model-value="field.value"
                        type="boolean"
                        :label="formatLabel(tab.name, field.key)"
                        :is-disabled="!visualsEnabled || !isSectionInteractable(tab.name)"
                        @update:modelValue="
                          (newValue) => updateValue(tab.name, field.key, newValue)
                        "
                      />

                      <Knob
                        v-else-if="
                          typeof field.value === 'string' &&
                          hasOptions(tab.name, field.key)
                        "
                        :model-value="field.value"
                        type="options"
                        :options="getFieldOptions(tab.name, field.key)"
                        :label="formatLabel(tab.name, field.key)"
                        :is-disabled="!visualsEnabled || !isSectionInteractable(tab.name)"
                        @update:modelValue="
                          (newValue) => updateValue(tab.name, field.key, newValue)
                        "
                      />

                      <Knob
                        v-else-if="typeof field.value === 'number'"
                        :model-value="field.value"
                        type="range"
                        :min="getNumberMin(tab.name, field.key)"
                        :max="getNumberMax(tab.name, field.key)"
                        :step="getNumberStep(tab.name, field.key)"
                        :label="formatLabel(tab.name, field.key)"
                        :format-value="
                          (val: number) => formatValue(tab.name, field.key, val)
                        "
                        :is-disabled="!visualsEnabled || !isSectionInteractable(tab.name)"
                        @update:modelValue="
                          (newValue) => updateValue(tab.name, field.key, newValue)
                        "
                      />
                    </template>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="presets">
            <section class="config-panel__presets">
              <div class="config-panel__preset-group">
                <p class="config-panel__group-label">Built In</p>

                <div class="config-panel__scene-grid">
                  <button
                    v-for="preset in builtInPresets"
                    :key="`library-${preset.id}`"
                    type="button"
                    class="config-panel__sticker-action"
                    :data-testid="`library-apply-${preset.id}`"
                    :aria-label="`Apply ${preset.name} preset`"
                    @click="applyBuiltInPreset(preset.id)"
                  >
                    <Sticker variant="outline" color="ivory">{{ preset.name }}</Sticker>
                    <span class="config-panel__sticker-copy">{{ preset.description }}</span>
                  </button>
                </div>
              </div>

              <div class="config-panel__preset-group">
                <p class="config-panel__group-label">Saved</p>

                <div
                  v-if="savedConfigs.length === 0"
                  class="config-panel__empty-state"
                >
                  No saved configs yet.
                </div>

                <article
                  v-for="savedConfig in savedConfigs"
                  :key="savedConfig.id"
                  class="config-panel__saved-preset"
                >
                  <button
                    type="button"
                    class="config-panel__saved-load"
                    :data-testid="`saved-load-${savedConfig.id}`"
                    :aria-label="`Load ${savedConfig.name}`"
                    @click="loadSavedConfig(savedConfig.id)"
                  >
                    <Sticker variant="outline" color="ivory">
                      {{ savedConfig.name }}
                    </Sticker>
                    <span
                      class="config-panel__saved-time"
                    >
                      {{ formatTimestamp(savedConfig.updatedAt) }}
                    </span>
                  </button>

                  <Button
                    size="sm"
                    :data-testid="`saved-delete-${savedConfig.id}`"
                    :title="`Delete ${savedConfig.name}`"
                    :accessible-name="`Delete ${savedConfig.name}`"
                    @click="deleteSavedConfig(savedConfig.id)"
                  >
                    <Trash2 :size="14" />
                  </Button>
                </article>
              </div>

            </section>
          </TabsContent>

          <TabsContent value="midi">
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
                      class="m-0 text-[8px] font-semibold uppercase tracking-[0.24em] text-neutral-400"
                    >
                      MIDI Status
                    </p>
                    <h4 class="m-0 text-[13px] uppercase tracking-[0.08em] text-[#f4efe0]">
                      {{ midiStatusHeadline }}
                    </h4>
                    <p class="m-0 text-[11px] leading-relaxed text-neutral-400">
                      {{ midiStatusDetail }}
                    </p>
                  </div>
                </div>

                <div class="grid gap-2 sm:grid-cols-2">
                  <article
                    class="config-panel__midi-port"
                  >
                    <p
                      class="m-0 text-[8px] uppercase tracking-[0.2em] text-neutral-500"
                    >
                      Inputs
                    </p>
                    <p class="m-0 mt-2 text-[11px] leading-relaxed text-neutral-200">
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
                      class="m-0 text-[8px] uppercase tracking-[0.2em] text-neutral-500"
                    >
                      Outputs
                    </p>
                    <p class="m-0 mt-2 text-[11px] leading-relaxed text-neutral-200">
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

                  <p class="m-0 text-[11px] leading-relaxed text-neutral-400">
                    Generate a live-sync LittleFoot script from the current
                    palette and load it in ROLI Dashboard or BLOCKS Code.
                  </p>
                  <p class="m-0 text-[10px] leading-relaxed text-neutral-500">
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

      </TabbedOverlayPanel>
    </template>
  </TopDrawer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import MidiSettingsIcon from "@/components/primatives/MidiSettingsIcon.vue";
import { storeToRefs } from "pinia";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { CONFIG_SECTIONS, UNIFIED_CONFIG } from "@/data/visual-config-metadata";
import { BUILT_IN_VISUAL_PRESETS } from "@/data/visual-config-presets";
import type { ChromaticNote } from "@/types";
import type { VisualEffectsConfig } from "@/types/visual";
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
} from "lucide-vue-next";
import { generateRoliPianoScript } from "@/services/roliPianoExport";
import {
  isRoliMidiPortName,
  isVirtualMidiPortName,
} from "@/services/roliLiveSync";

const drawerContentHeight = ref<number>();

type ConfigSectionKey = keyof VisualEffectsConfig;
type SectionField = {
  key: string;
  value: string | number | boolean;
  group: string;
};

const SECTION_SHORT_LABELS: Record<ConfigSectionKey, string> = {
  blobs: "Blobs",
  ambient: "Glow",
  particles: "Dust",
  strings: "Lines",
  animation: "Anim",
  frequencyMapping: "Freq",
  dynamicColors: "Color",
  hilbertScope: "Scope",
  beatingShapes: "Beat",
  patterns: "Notes",
  keyboard: "Keys",
  codeStrip: "Code Strip",
};

const HOME_TAB = {
  value: "home",
  label: "Scenes",
  shortLabel: "Home",
};

const PRESET_TAB = {
  value: "presets",
  label: "Presets",
  shortLabel: "Presets",
};

const MIDI_TAB = {
  value: "midi",
  label: "MIDI & ROLI",
  shortLabel: "MIDI",
  icon: MidiPermissionIcon,
};

const SECTION_ORDER: ConfigSectionKey[] = [
  "blobs",
  "ambient",
  "particles",
  "strings",
  "animation",
  "frequencyMapping",
  "dynamicColors",
  "hilbertScope",
  "beatingShapes",
  "patterns",
  "keyboard",
  "codeStrip",
];

const visualConfigStore = useVisualConfigStore();
const keyboardDrawerStore = useKeyboardDrawerStore();
const musicStore = useMusicStore();
const activeTab = ref("home");

const { config, visualsEnabled, savedConfigs } = storeToRefs(visualConfigStore);

const {
  updateValue,
  resetToDefaults,
  resetSection,
  exportConfig: storeExportConfig,
  setVisualsEnabled,
  saveConfigAs,
  loadSavedConfig,
  deleteSavedConfig,
  loadConfigSnapshot,
} = visualConfigStore;

const builtInPresets = BUILT_IN_VISUAL_PRESETS;

const sectionTabs = computed(() =>
  SECTION_ORDER.map((sectionName) => {
    const meta = CONFIG_SECTIONS[sectionName];

    return {
      name: sectionName,
      label: meta?.label ?? sectionName,
      shortLabel: SECTION_SHORT_LABELS[sectionName],
    };
  })
);

const allTabs = computed(() => [
  HOME_TAB,
  ...sectionTabs.value.map((tab) => ({
    value: tab.name,
    label: tab.label,
    shortLabel: tab.shortLabel,
  })),
  MIDI_TAB,
  PRESET_TAB,
]);

const getSectionConfig = (sectionName: ConfigSectionKey) =>
  config.value[sectionName] as Record<string, string | number | boolean>;

const getSectionEnableKey = (sectionName: ConfigSectionKey) => {
  const section = getSectionConfig(sectionName);

  if ("isEnabled" in section) {
    return "isEnabled";
  }

  if ("enabled" in section) {
    return "enabled";
  }

  return null;
};

const isSectionEnabled = (sectionName: ConfigSectionKey) => {
  const enableKey = getSectionEnableKey(sectionName);
  if (!enableKey) return true;

  return Boolean(getSectionConfig(sectionName)[enableKey]);
};

const isSectionInteractable = (sectionName: ConfigSectionKey) => {
  const enableKey = getSectionEnableKey(sectionName);
  if (!enableKey) return true;

  return Boolean(getSectionConfig(sectionName)[enableKey]);
};

const setSectionEnabled = (sectionName: ConfigSectionKey, enabled: boolean) => {
  const enableKey = getSectionEnableKey(sectionName);
  if (!enableKey) return;

  updateValue(sectionName, enableKey, enabled);
};

const getRenderableFields = (sectionName: ConfigSectionKey): SectionField[] => {
  const section = getSectionConfig(sectionName);
  const enableKey = getSectionEnableKey(sectionName);

  return Object.entries(section)
    .filter(([key]) => {
      if (key === enableKey) return false;

      const metadata = (UNIFIED_CONFIG[sectionName] as Record<string, any>)[key];
      const visibility = metadata?.visibleWhen;
      return !visibility || visibility.values.includes(section[visibility.field]);
    })
    .map(([key, value]) => ({
      key,
      value,
      group:
        (UNIFIED_CONFIG[sectionName] as Record<string, any>)[key]?.group ?? "",
    }));
};

const getRenderableFieldGroups = (sectionName: ConfigSectionKey) => {
  const groups = new Map<string, SectionField[]>();

  getRenderableFields(sectionName).forEach((field) => {
    const fields = groups.get(field.group) ?? [];
    fields.push(field);
    groups.set(field.group, fields);
  });

  return [...groups].map(([label, fields]) => ({ label, fields }));
};

const resetSectionToDefaults = (sectionName: ConfigSectionKey) => {
  resetSection(sectionName);
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

const midiStatusClass = computed(
  () =>
    (
      {
        connected: "border-[#4a4a4a] bg-[#141414] text-[#e0e0e0]",
        connecting: "border-[#5b5b5b] bg-[#171717] text-[#d7d7d7]",
        error: "border-[#4b4b4b] bg-[#151515] text-[#d2d2d2]",
        idle: "border-[#323232] bg-[#111111] text-[#b6b6b6]",
      } as const
    )[midiStatusState.value]
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

const getFieldMetadata = (sectionName: ConfigSectionKey, fieldName: string) => {
  const section = UNIFIED_CONFIG[sectionName];
  if (
    section &&
    typeof section === "object" &&
    fieldName in section &&
    fieldName !== "_meta"
  ) {
    return (section as Record<string, any>)[fieldName];
  }

  return null;
};

const formatLabel = (sectionName: ConfigSectionKey, key: string) => {
  const metadata = getFieldMetadata(sectionName, key);
  if (metadata?.label) {
    return metadata.label;
  }

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());
};

const formatValue = (
  sectionName: ConfigSectionKey,
  key: string,
  value: number
) => {
  const metadata = getFieldMetadata(sectionName, key);

  if (metadata?.format && typeof metadata.format === "function") {
    try {
      return metadata.format(value);
    } catch (error) {
      console.error(`Error formatting ${sectionName}.${key}:`, error);
    }
  }

  return value.toString();
};

const getNumberMin = (sectionName: ConfigSectionKey, key: string) =>
  getFieldMetadata(sectionName, key)?.min ?? 0;

const getNumberMax = (sectionName: ConfigSectionKey, key: string) =>
  getFieldMetadata(sectionName, key)?.max ?? 100;

const getNumberStep = (sectionName: ConfigSectionKey, key: string) =>
  getFieldMetadata(sectionName, key)?.step ?? 0.1;

const hasOptions = (sectionName: ConfigSectionKey, key: string) => {
  const metadata = getFieldMetadata(sectionName, key);

  return (
    metadata?.options &&
    Array.isArray(metadata.options) &&
    metadata.options.length > 0
  );
};

const getFieldOptions = (sectionName: ConfigSectionKey, key: string) =>
  getFieldMetadata(sectionName, key)?.options || [];

const applyBuiltInPreset = (presetId: string) => {
  const preset = builtInPresets.find((item) => item.id === presetId);
  if (!preset) return;

  loadConfigSnapshot(preset.config);
};

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

const promptSaveConfig = () => {
  const name =
    typeof window !== "undefined" && typeof window.prompt === "function"
      ? window.prompt("Enter a name for this configuration:")
      : null;

  if (!name?.trim()) return;

  saveConfigAs(name.trim());
  notify(`Configuration "${name.trim()}" saved.`);
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
.config-panel__global-bar,
.config-panel__global-controls,
.config-panel__section-header,
.config-panel__section-controls,
.config-panel__midi-actions,
.config-panel__saved-preset {
  display: flex;
  align-items: center;
}

.config-panel__global-bar {
  min-inline-size: 0;
  justify-content: space-between;
  gap: var(--s-3);
}

.config-panel__title,
.config-panel__eyebrow,
.config-panel__group-label,
.config-panel__saved-time,
.config-panel__labeled-action span {
  margin: 0;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.config-panel__title {
  color: var(--ivory);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .22em;
}

.config-panel__global-controls {
  min-inline-size: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--s-1);
}

.config-panel__boolean-knob {
  --knob-size: 2rem;
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
  color: var(--ivory-4);
  font-size: 9px;
  letter-spacing: .18em;
}

.config-panel__section-header h2 {
  margin: var(--s-1) 0 0;
  color: var(--ivory);
  font: var(--t-display-m);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.config-panel__section-controls {
  flex: none;
  gap: var(--s-2);
}

.config-panel__groups,
.config-panel__presets {
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

.config-panel__group-label {
  color: var(--ivory-3);
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
  color: var(--ivory-3);
  font: var(--t-body-mono);
  font-size: 10px;
  line-height: 1.5;
}

.config-panel__empty-state,
.config-panel__saved-preset,
.config-panel__midi-surface,
.config-panel__midi-port {
  background: var(--ink-2);
}

.config-panel__empty-state {
  border-inline-start: 3px solid var(--ink-5);
  padding: var(--s-4);
  color: var(--ivory-4);
  font: var(--t-body-mono);
  font-size: 10px;
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
  color: var(--ivory-4);
  font-size: 8px;
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
  border-radius: 50%;
}

.config-panel__midi-port {
  padding: var(--s-3);
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
  .config-panel__global-bar { align-items: flex-start; }
  .config-panel__title { padding-block-start: var(--s-2); }
  .config-panel__section { padding-inline: 0; }
  .config-panel__scene-grid { padding-inline: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .config-panel__groups { transition: none; }
  .config-panel__sticker-action:active :deep(.sticker),
  .config-panel__saved-load:active :deep(.sticker) { transform: none; }
}
</style>
