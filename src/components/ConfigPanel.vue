<template>
  <TopDrawer anchor="top-right" offset-top="0.75rem" offset-side="0.75rem">
    <template #trigger="{ toggle }">
      <button
        data-testid="config-panel-trigger"
        @click="toggle"
        class="group flex h-11 items-center gap-2 border border-[#7a6929]/85 bg-[#090805]/94 px-2.5 text-[#00ff88] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 hover:border-[#b39b40] hover:text-white [clip-path:polygon(0_10px,10px_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)]"
      >
        <span class="flex items-center gap-1">
          <span
            class="h-2.5 w-4 [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)] bg-[#f7b22c]"
          />
          <span
            class="h-2.5 w-3 [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)] bg-[#e53d2d]"
          />
          <span
            class="h-2.5 w-3 [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)] bg-[#5a4295]"
          />
        </span>
        <Settings :size="15" class="shrink-0" />
      </button>
    </template>

    <template #panel="{ close }">
      <Tabs :value="activeTab" @update:value="activeTab = $event">
        <OverlayPanelShell
          width="min(46rem, calc(100vw - 1.5rem))"
          height="min(54vh, 34rem)"
          max-height="min(54vh, 34rem)"
          body-class="px-3 py-3"
        >
          <template #toolbar>
            <div class="flex items-center justify-between gap-2">
              <div class="flex shrink-0 items-center gap-1">
                <span class="h-2.5 w-7 [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#f7b22c]" />
                <span class="h-2.5 w-5 [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#e53d2d]" />
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

          <TabsContent value="home">
            <section class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <article
                v-for="(preset, index) in builtInPresets"
                :key="preset.id"
                class="relative overflow-hidden rounded-[12px] border border-[#2d2717] bg-[#0d0c08] px-3 py-3 transition-colors hover:border-[#8c7832] hover:bg-[#131109]"
              >
                <span
                  class="absolute inset-y-3 left-0 w-1 rounded-r-full"
                  :class="toneBarClass(sceneTone(index))"
                />

                <div class="pl-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h4
                        class="m-0 truncate text-[13px] uppercase tracking-[0.08em] text-[#f4efe0]"
                      >
                        {{ preset.name }}
                      </h4>
                    </div>

                    <button
                      :data-testid="`preset-apply-${preset.id}`"
                      @click="applyBuiltInPreset(preset.id)"
                      class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] text-[#b7ffd8] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
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
              class="rounded-[14px] border border-[#2d2717] bg-[#080705] px-4 py-4 transition-opacity"
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
                <span class="inline-flex border px-2 py-1 text-[8px] uppercase tracking-[0.24em] text-[#17120a] [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#efe5cf] border-[#efe5cf]">
                  Built In
                </span>

                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <article
                    v-for="(preset, index) in builtInPresets"
                    :key="`library-${preset.id}`"
                    class="relative overflow-hidden rounded-[12px] border border-[#2d2717] bg-[#0d0c08] px-3 py-3"
                  >
                    <span
                      class="absolute inset-y-3 left-0 w-1 rounded-r-full"
                      :class="toneBarClass(sceneTone(index))"
                    />
                    <div class="pl-2">
                      <div class="flex items-start justify-between gap-2">
                        <h5
                          class="m-0 truncate text-[12px] uppercase tracking-[0.08em] text-[#f4efe0]"
                        >
                          {{ preset.name }}
                        </h5>

                        <button
                          :data-testid="`library-apply-${preset.id}`"
                          @click="applyBuiltInPreset(preset.id)"
                          class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] text-[#b7ffd8] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
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
                <span class="inline-flex border px-2 py-1 text-[8px] uppercase tracking-[0.24em] text-white [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] bg-[#5a4295] border-[#5a4295]">
                  Saved
                </span>

                <div
                  v-if="savedConfigs.length === 0"
                  class="rounded-[12px] border border-dashed border-[#3a321d] bg-[#100e09] px-3 py-3 text-[10px] text-neutral-500"
                >
                  No saved configs yet.
                </div>

                <article
                  v-for="savedConfig in savedConfigs"
                  :key="savedConfig.id"
                  class="flex items-center justify-between gap-2 rounded-[12px] border border-[#2d2717] bg-[#100e09] px-3 py-3"
                >
                  <div class="min-w-0">
                    <h6
                      class="m-0 truncate text-[12px] uppercase tracking-[0.08em] text-[#f4efe0]"
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
                      class="inline-flex h-8 items-center justify-center border px-2.5 text-[8px] uppercase tracking-[0.18em] text-[#b7ffd8] transition-all duration-200 [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]"
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

          <template #footer>
            <TabsList
              class="w-full justify-start gap-1 overflow-x-auto border-0 bg-transparent p-0"
            >
              <TabsTrigger
                v-for="tab in allTabs"
                :key="tab.value"
                :value="tab.value"
                :data-testid="`config-tab-${tab.value}`"
                class="h-9 shrink-0 overflow-hidden border px-2 text-[8px] font-semibold uppercase tracking-[0.2em] transition-[min-width,max-width,padding,background-color,border-color,color] duration-200 [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] data-[state=active]:px-3"
                :class="[
                  tabTriggerToneClass(tab.tone),
                  activeTab === tab.value
                    ? 'min-w-[8.75rem] max-w-[12rem]'
                    : 'min-w-[3.6rem] max-w-[3.6rem]',
                ]"
              >
                <span class="block truncate">
                  {{ activeTab === tab.value ? tab.label : tab.shortLabel }}
                </span>
              </TabsTrigger>
            </TabsList>
          </template>
        </OverlayPanelShell>
      </Tabs>
    </template>
  </TopDrawer>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { CONFIG_SECTIONS, UNIFIED_CONFIG } from "@/data/visual-config-metadata";
import { BUILT_IN_VISUAL_PRESETS } from "@/data/visual-config-presets";
import type { VisualEffectsConfig } from "@/types/visual";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  IconButton,
} from "@/components/ui";
import { Knob } from "./knobs";
import OverlayPanelShell from "./OverlayPanelShell.vue";
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

type ConfigSectionKey = keyof VisualEffectsConfig;
type PosterTone = "amber" | "red" | "violet" | "cream";
type ActionTone = PosterTone | "green" | "neutral";
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
        "border-[#7d6825] bg-[#171209] text-[#f7d167] hover:border-[#f7b22c] hover:text-[#fff1c5]",
      red:
        "border-[#6e2a1d] bg-[#170d0b] text-[#f28b72] hover:border-[#e53d2d] hover:text-white",
      violet:
        "border-[#433066] bg-[#100c18] text-[#d8caf7] hover:border-[#5a4295] hover:text-white",
      cream:
        "border-[#7e7255] bg-[#171209] text-[#efe5cf] hover:border-[#efe5cf] hover:text-white",
      green:
        "border-[#1e7f54] bg-[#072a1d] text-[#b7ffd8] hover:border-[#34c97f] hover:text-white",
      neutral:
        "border-[#37311c] bg-[#15120b] text-neutral-300 hover:border-[#a38d3a] hover:text-white",
    } as const
  )[tone];

const toneBarClass = (tone: PosterTone) =>
  (
    {
      amber: "bg-[#f7b22c]",
      red: "bg-[#e53d2d]",
      violet: "bg-[#5a4295]",
      cream: "bg-[#efe5cf]",
    } as const
  )[tone];

const tabTriggerToneClass = (tone: PosterTone) =>
  (
    {
      amber:
        "border-[#423617] bg-[#131008] text-[#c8bf9b] hover:border-[#7d6825] hover:text-[#f5edd9] data-[state=active]:border-[#f7b22c] data-[state=active]:bg-[#f7b22c] data-[state=active]:text-[#18120a]",
      red:
        "border-[#402019] bg-[#131008] text-[#c8bf9b] hover:border-[#8b392d] hover:text-[#f5edd9] data-[state=active]:border-[#e53d2d] data-[state=active]:bg-[#e53d2d] data-[state=active]:text-white",
      violet:
        "border-[#2b2248] bg-[#131008] text-[#c8bf9b] hover:border-[#5a4295] hover:text-[#f5edd9] data-[state=active]:border-[#5a4295] data-[state=active]:bg-[#5a4295] data-[state=active]:text-white",
      cream:
        "border-[#4a4333] bg-[#131008] text-[#c8bf9b] hover:border-[#a79b7a] hover:text-[#f5edd9] data-[state=active]:border-[#efe5cf] data-[state=active]:bg-[#efe5cf] data-[state=active]:text-[#17120a]",
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
