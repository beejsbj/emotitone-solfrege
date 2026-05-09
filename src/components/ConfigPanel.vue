<template>
  <TopDrawer anchor="top-right" offset-top="0.75rem" offset-side="0.75rem">
    <template #trigger="{ open }">
      <div class="flex flex-col items-end gap-1.5">
        <button
          data-testid="config-panel-trigger"
          @click="openSettingsPanel(open)"
          class="group relative flex h-10 w-10 items-center justify-center border border-[#4a4a4a]/80 bg-[#090909]/88 text-[#d2d2d2] shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all duration-200 hover:border-[#8b8b8b] hover:text-white [clip-path:polygon(0_8px,8px_0,calc(100%-8px)_0,100%_8px,100%_100%,0_100%)]"
          :aria-label="midiTriggerLabel"
          :title="midiTriggerLabel"
        >
          <span
            class="absolute right-[5px] top-[5px] h-2.5 w-2.5 rounded-full border border-[#050504]/80 transition-all duration-200"
            :class="midiLedToneClass"
          />
          <Settings :size="15" class="shrink-0 transition-transform duration-200 group-hover:rotate-[10deg]" />
        </button>

        <Transition name="config-midi-chip">
          <button
            v-if="showMidiShortcut"
            data-testid="config-midi-trigger"
            @click.stop="openMidiPanel(open)"
            class="group flex h-7 w-7 items-center justify-center self-end overflow-hidden border border-[#444444]/85 bg-[#090909]/88 text-[#cfcfcf] shadow-[0_8px_18px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-200 hover:border-[#8b8b8b] hover:text-white [clip-path:polygon(0_7px,7px_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)]"
            :aria-label="midiTriggerLabel"
            :title="midiTriggerLabel"
          >
            <MidiPermissionIcon
              class="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-y-[-1px]"
            />
          </button>
        </Transition>
      </div>
    </template>

    <template #panel="{ close }">
      <TabbedOverlayPanel
        v-model="activeTab"
        :tabs="allTabs"
        tab-test-id-prefix="config-tab"
        width="min(46rem, calc(100vw - 1.5rem))"
        height="min(54vh, 34rem)"
        max-height="min(54vh, 34rem)"
        body-class="px-3 py-3"
        inactive-tab-width-class="min-w-[3.6rem] max-w-[3.6rem]"
      >
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <div class="flex shrink-0 items-center gap-1">
              <span class="h-2.5 w-7 [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#d4d4d4]" />
              <span class="h-2.5 w-5 [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#8a8a8a]" />
            </div>

            <div class="ml-auto flex shrink-0 items-center gap-1">
              <IconButton
                v-if="activeSectionName && activeSectionHasToggle"
                :data-testid="`section-toggle-${activeSectionName}`"
                :title="
                  activeSectionEnabled
                    ? `Disable ${activeTabMeta.label}`
                    : `Enable ${activeTabMeta.label}`
                "
                :aria-label="
                  activeSectionEnabled
                    ? `Disable ${activeTabMeta.label}`
                    : `Enable ${activeTabMeta.label}`
                "
                @click="toggleSectionEnabled(activeSectionName)"
                :tone="activeSectionEnabled ? 'green' : 'neutral'"
              >
                <ToggleRight v-if="activeSectionEnabled" :size="14" />
                <ToggleLeft v-else :size="14" />
              </IconButton>

              <IconButton
                v-if="activeSectionName"
                :data-testid="`section-reset-${activeSectionName}`"
                :title="`Reset ${activeTabMeta.label}`"
                :aria-label="`Reset ${activeTabMeta.label}`"
                @click="resetSectionToDefaults(activeSectionName)"
                tone="amber"
              >
                <RotateCcw :size="14" />
              </IconButton>

              <IconButton
                data-testid="config-panel-global-toggle"
                :title="visualsEnabled ? 'Disable all visuals' : 'Enable all visuals'"
                :aria-label="visualsEnabled ? 'Disable all visuals' : 'Enable all visuals'"
                @click="setVisualsEnabled(!visualsEnabled)"
                :tone="visualsEnabled ? 'green' : 'red'"
              >
                <Power :size="14" />
              </IconButton>

              <IconButton
                data-testid="config-reset-all"
                title="Reset all settings"
                aria-label="Reset all settings"
                @click="resetToDefaults"
                tone="cream"
              >
                <RefreshCw :size="14" />
              </IconButton>

              <IconButton
                data-testid="config-export"
                title="Export configuration"
                aria-label="Export configuration"
                @click="exportConfig"
                tone="neutral"
              >
                <Download :size="14" />
              </IconButton>

              <IconButton
                data-testid="config-save-as"
                title="Save configuration"
                aria-label="Save configuration"
                @click="promptSaveConfig"
                tone="violet"
              >
                <Save :size="14" />
              </IconButton>

              <IconButton
                title="Close settings"
                aria-label="Close settings"
                @click="close"
                tone="red"
              >
                <X :size="14" />
              </IconButton>
            </div>
          </div>
        </template>

        <div class="space-y-3">
          <TabsContent value="home">
            <section class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <article
                v-for="(preset, index) in builtInPresets"
                :key="preset.id"
                class="relative overflow-hidden rounded-[12px] border border-[#323232] bg-[#111111] px-3 py-3 transition-colors hover:border-[#7b7b7b] hover:bg-[#181818]"
              >
                <span
                  class="absolute inset-y-3 left-0 w-1 rounded-r-full"
                  :class="toneBarClass(sceneTone(index))"
                />

                <div class="pl-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h4
                        class="m-0 truncate text-[13px] uppercase tracking-[0.08em] text-[#efefef]"
                      >
                        {{ preset.name }}
                      </h4>
                    </div>

                    <button
                      :data-testid="`preset-apply-${preset.id}`"
                      @click="applyBuiltInPreset(preset.id)"
                      class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] text-[#e3e3e3] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
                      :class="actionToneClass('green')"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </article>
            </section>
          </TabsContent>

          <TabsContent
            v-for="tab in sectionTabs"
            :key="tab.name"
            :value="tab.name"
          >
            <section
              class="rounded-[14px] border border-[#2c2c2c] bg-[#0a0a0a] px-4 py-4 transition-opacity"
              :class="{
                'pointer-events-none opacity-45':
                  !visualsEnabled || !isSectionInteractable(tab.name),
              }"
            >
              <div
                class="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(96px,1fr))]"
              >
                <template
                  v-for="field in getRenderableFields(tab.name)"
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
            </section>
          </TabsContent>

          <TabsContent value="presets">
            <section class="space-y-3">
              <div class="space-y-2">
                <span class="inline-flex border px-2 py-1 text-[8px] uppercase tracking-[0.24em] text-[#111111] [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#d9d9d9] border-[#d9d9d9]">
                  Built In
                </span>

                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <article
                    v-for="(preset, index) in builtInPresets"
                    :key="`library-${preset.id}`"
                    class="relative overflow-hidden rounded-[12px] border border-[#323232] bg-[#111111] px-3 py-3"
                  >
                    <span
                      class="absolute inset-y-3 left-0 w-1 rounded-r-full"
                      :class="toneBarClass(sceneTone(index))"
                    />
                    <div class="pl-2">
                      <div class="flex items-start justify-between gap-2">
                        <h5
                          class="m-0 truncate text-[12px] uppercase tracking-[0.08em] text-[#efefef]"
                        >
                          {{ preset.name }}
                        </h5>

                        <button
                          :data-testid="`library-apply-${preset.id}`"
                          @click="applyBuiltInPreset(preset.id)"
                          class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] text-[#e3e3e3] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
                          :class="actionToneClass('green')"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              <div class="space-y-2">
                <span class="inline-flex border px-2 py-1 text-[8px] uppercase tracking-[0.24em] text-[#111111] [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#b9b9b9] border-[#b9b9b9]">
                  Saved
                </span>

                <div
                  v-if="savedConfigs.length === 0"
                  class="rounded-[12px] border border-dashed border-[#3a3a3a] bg-[#121212] px-3 py-3 text-[10px] text-neutral-500"
                >
                  No saved configs yet.
                </div>

                <article
                  v-for="savedConfig in savedConfigs"
                  :key="savedConfig.id"
                  class="flex items-center justify-between gap-2 rounded-[12px] border border-[#2c2c2c] bg-[#121212] px-3 py-3"
                >
                  <div class="min-w-0">
                    <h6
                      class="m-0 truncate text-[12px] uppercase tracking-[0.08em] text-[#efefef]"
                    >
                      {{ savedConfig.name }}
                    </h6>
                    <p
                      class="m-0 mt-1 text-[8px] uppercase tracking-[0.18em] text-neutral-600"
                    >
                      {{ formatTimestamp(savedConfig.updatedAt) }}
                    </p>
                  </div>

                  <div class="flex shrink-0 gap-1.5">
                    <button
                      :data-testid="`saved-load-${savedConfig.id}`"
                      @click="loadSavedConfig(savedConfig.id)"
                      class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] text-[#e3e3e3] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
                      :class="actionToneClass('green')"
                    >
                      Load
                    </button>
                    <button
                      :data-testid="`saved-delete-${savedConfig.id}`"
                      @click="deleteSavedConfig(savedConfig.id)"
                      class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
                      :class="actionToneClass('red')"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              </div>

            </section>
          </TabsContent>

          <TabsContent value="midi">
            <section class="grid gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <article
                class="space-y-4 rounded-[14px] border border-[#2e2e2e] bg-[#0f0f0f] px-4 py-4"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
                    :class="midiStatusBadgeClass"
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
                    class="rounded-[12px] border border-[#2f2f2f] bg-[#121212] px-3 py-3"
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
                    class="rounded-[12px] border border-[#2f2f2f] bg-[#121212] px-3 py-3"
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
                class="space-y-3 rounded-[14px] border border-[#2c2c2c] bg-[#121212] px-4 py-4"
              >
                <div class="space-y-2">
                  <span class="inline-flex border px-2 py-1 text-[8px] uppercase tracking-[0.24em] text-[#111111] [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#cfcfcf] border-[#cfcfcf]">
                    ROLI
                  </span>

                  <p class="m-0 text-[11px] leading-relaxed text-neutral-400">
                    Generate a live-sync LittleFoot script from the current
                    palette and load it in ROLI Dashboard or BLOCKS Code.
                  </p>
                  <p class="m-0 text-[10px] leading-relaxed text-neutral-500">
                    {{ roliSyncMessage }}
                  </p>
                </div>

                <div class="flex flex-wrap gap-1.5">
                  <button
                    @click="copyRoliPianoScript"
                    class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
                    :class="actionToneClass('green')"
                  >
                    Copy Script
                  </button>
                  <button
                    @click="downloadRoliPianoScript"
                    class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
                    :class="actionToneClass('cream')"
                  >
                    Download
                  </button>
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
import { storeToRefs } from "pinia";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { CONFIG_SECTIONS, UNIFIED_CONFIG } from "@/data/visual-config-metadata";
import { BUILT_IN_VISUAL_PRESETS } from "@/data/visual-config-presets";
import type { ChromaticNote } from "@/types";
import type { VisualEffectsConfig } from "@/types/visual";
import { TabsContent, IconButton } from "@/components/ui";
import { Knob } from "./knobs";
import MidiPermissionIcon from "./MidiPermissionIcon.vue";
import TabbedOverlayPanel from "./TabbedOverlayPanel.vue";
import TopDrawer from "./TopDrawer.vue";
import {
  Settings,
  X,
  RotateCcw,
  RefreshCw,
  Download,
  Save,
  Power,
  ToggleLeft,
  ToggleRight,
} from "lucide-vue-next";
import { generateRoliPianoScript } from "@/services/roliPianoExport";
import {
  isRoliMidiPortName,
  isVirtualMidiPortName,
} from "@/services/roliLiveSync";

type ConfigSectionKey = keyof VisualEffectsConfig;
type PosterTone = "amber" | "red" | "violet" | "cream" | "green";
type ActionTone = PosterTone | "neutral";
type SectionField = {
  key: string;
  value: string | number | boolean;
};

const SECTION_SHORT_LABELS: Record<ConfigSectionKey, string> = {
  blobs: "Blobs",
  ambient: "Glow",
  particles: "Dust",
  strings: "Lines",
  animation: "Anim",
  frequencyMapping: "Freq",
  dynamicColors: "Color",
  floatingPopup: "Popup",
  hilbertScope: "Scope",
  beatingShapes: "Beat",
  patterns: "Notes",
  keyboard: "Keys",
  liveStrip: "Strip",
};

const SECTION_TONES: PosterTone[] = [
  "amber",
  "red",
  "violet",
  "cream",
  "amber",
  "cream",
  "red",
  "violet",
  "amber",
  "red",
  "cream",
  "violet",
  "amber",
];

const HOME_TAB = {
  value: "home",
  label: "Scenes",
  shortLabel: "Home",
  tone: "amber" as PosterTone,
};

const PRESET_TAB = {
  value: "presets",
  label: "Presets",
  shortLabel: "Presets",
  tone: "violet" as PosterTone,
};

const MIDI_TAB = {
  value: "midi",
  label: "MIDI & ROLI",
  shortLabel: "MIDI",
  tone: "green" as PosterTone,
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
  "floatingPopup",
  "hilbertScope",
  "beatingShapes",
  "patterns",
  "keyboard",
  "liveStrip",
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
  SECTION_ORDER.map((sectionName, index) => {
    const meta = CONFIG_SECTIONS[sectionName];

    return {
      name: sectionName,
      label: meta?.label ?? sectionName,
      shortLabel: SECTION_SHORT_LABELS[sectionName],
      tone: SECTION_TONES[index % SECTION_TONES.length],
    };
  })
);

const allTabs = computed(() => [
  HOME_TAB,
  ...sectionTabs.value.map((tab) => ({
    value: tab.name,
    label: tab.label,
    shortLabel: tab.shortLabel,
    tone: tab.tone,
  })),
  MIDI_TAB,
  PRESET_TAB,
]);

const activeTabMeta = computed(
  () => allTabs.value.find((tab) => tab.value === activeTab.value) ?? HOME_TAB
);

const activeSectionName = computed(() => {
  if (SECTION_ORDER.includes(activeTab.value as ConfigSectionKey)) {
    return activeTab.value as ConfigSectionKey;
  }

  return null;
});

const activeSectionHasToggle = computed(() =>
  activeSectionName.value
    ? getSectionEnableKey(activeSectionName.value) !== null
    : false
);

const activeSectionEnabled = computed(() =>
  activeSectionName.value ? isSectionEnabled(activeSectionName.value) : false
);

const actionToneClass = (tone: ActionTone) =>
  (
    {
      amber:
        "border-[#47433a] bg-[#151413] text-[#d4d0c7] hover:border-[#8d887d] hover:text-white",
      red:
        "border-[#433d3d] bg-[#151313] text-[#d3cccc] hover:border-[#8a8383] hover:text-white",
      violet:
        "border-[#3f4049] bg-[#141418] text-[#d1d2db] hover:border-[#878992] hover:text-white",
      cream:
        "border-[#53504a] bg-[#171615] text-[#e0ddd6] hover:border-[#9a968d] hover:text-white",
      green:
        "border-[#3c443d] bg-[#131613] text-[#d0d7d0] hover:border-[#899089] hover:text-white",
      neutral:
        "border-[#3d3d3d] bg-[#151515] text-neutral-300 hover:border-[#8a8a8a] hover:text-white",
    } as const
  )[tone];

const toneBarClass = (tone: PosterTone) =>
  (
    {
      amber: "bg-[#cfcfcf]",
      red: "bg-[#b5b5b5]",
      violet: "bg-[#9a9a9a]",
      cream: "bg-[#e0e0e0]",
      green: "bg-[#7e7e7e]",
    } as const
  )[tone];

const sceneTone = (index: number): PosterTone =>
  SECTION_TONES[index % SECTION_TONES.length];

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

const toggleSectionEnabled = (sectionName: ConfigSectionKey) => {
  const enableKey = getSectionEnableKey(sectionName);
  if (!enableKey) return;

  updateValue(sectionName, enableKey, !isSectionEnabled(sectionName));
};

const getRenderableFields = (sectionName: ConfigSectionKey): SectionField[] => {
  const section = getSectionConfig(sectionName);
  const enableKey = getSectionEnableKey(sectionName);

  return Object.entries(section)
    .filter(([key]) => key !== enableKey)
    .map(([key, value]) => ({
      key,
      value,
    }));
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

const midiLedToneClass = computed(
  () =>
    (
      {
        connected: "bg-[#d7d7d7] shadow-[0_0_10px_rgba(215,215,215,0.45)]",
        connecting: "bg-[#bdbdbd] shadow-[0_0_10px_rgba(189,189,189,0.55)] animate-pulse",
        error: "bg-[#8a8a8a] shadow-[0_0_10px_rgba(138,138,138,0.45)]",
        idle: "bg-[#5e5e5e]",
      } as const
    )[midiStatusState.value]
);

const midiStatusBadgeClass = computed(
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

const openSettingsPanel = (open: () => void) => {
  open();
};

const openMidiPanel = (open: () => void) => {
  activeTab.value = MIDI_TAB.value;
  open();
};

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
.config-midi-chip-enter-active,
.config-midi-chip-leave-active {
  transition:
    transform 0.22s ease,
    opacity 0.22s ease,
    filter 0.22s ease;
}

.config-midi-chip-enter-from,
.config-midi-chip-leave-to {
  opacity: 0;
  transform: translateY(-0.55rem) scale(0.94);
  filter: blur(4px);
}

.config-midi-chip-enter-to,
.config-midi-chip-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}
</style>
