<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { getRegisteredSounds } from "@/services/superdoughAudio";
import Button from "@/components/primatives/Button.vue";
import Sticker from "@/components/primatives/Sticker";
import OverlayPanelHeader from "@/components/OverlayPanelHeader.vue";
import TabbedOverlayPanel, {
  type TabbedOverlayTab,
} from "./TabbedOverlayPanel.vue";
import TopDrawer from "./TopDrawer.vue";
import { RotateCcw, Search, X } from "lucide-vue-next";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import Knob from "@/components/primatives/Knob/index.vue";
import { displayInstrumentName } from "@/data/instruments";
import { categoriseInstrument as categorise } from "@/data/instrumentCatalog";
import { SHAPE_KNOB_RANGES } from "@/services/shape";
import type { InstrumentCategory as Category } from "@/types/instrument";

const drawerContentHeight = ref<number>();
const topDrawerRef = ref<
  (InstanceType<typeof TopDrawer> & {
    showPanel: boolean;
    openSession: number;
  }) | null
>(null);
let selectionGeneration = 0;

interface Props {
  currentInstrument?: string;
  onSelectInstrument?: (instrumentId: string) => void;
  onClose?: () => void;
  compact?: boolean;
  floating?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  floating: undefined,
});

const emit = defineEmits<{
  "select-instrument": [instrumentId: string];
  close: [];
}>();

const instrumentStore = useInstrumentStore();
const currentInstrumentId = computed(
  () => props.currentInstrument || instrumentStore.currentInstrument
);
const useStoreAudioFlow = computed(() => !props.onSelectInstrument);
const instrumentIcon = computed(() => instrumentIconFor(currentInstrumentId.value));

const allSounds = ref<string[]>([]);
const query = ref("");

const CATEGORY_ORDER: Category[] = [
  "synths",
  "keyboards",
  "mallets",
  "strings",
  "organs",
  "winds",
  "gm",
];

const CATEGORY_LABELS: Record<Category, string> = {
  synths: "Synths",
  keyboards: "Keyboards",
  mallets: "Mallets",
  strings: "Strings",
  organs: "Organs",
  winds: "Winds",
  gm: "GM Soundfonts",
};

const CATEGORY_SHORT_LABELS: Record<Category, string> = {
  synths: "Synths",
  keyboards: "Keys",
  mallets: "Mallets",
  strings: "Strings",
  organs: "Organs",
  winds: "Winds",
  gm: "GM",
};

const filteredSounds = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  if (!normalizedQuery) {
    return allSounds.value;
  }

  return allSounds.value.filter((sound) => sound.includes(normalizedQuery));
});

function groupSounds(sounds: string[]) {
  const map: Partial<Record<Category, string[]>> = {};

  for (const sound of sounds) {
    const category = categorise(sound);
    if (!category) continue;
    if (!map[category]) {
      map[category] = [];
    }
    map[category]!.push(sound);
  }

  return map;
}

const activeTab = ref<Category | "shape">(categorise(currentInstrumentId.value) ?? "synths");
const shapeHelp = ref("Shape the current sound. Reset restores its natural envelope and removes effects.");
const shapeKnobs = [
  { key: "cutoff", label: "Cutoff", ...SHAPE_KNOB_RANGES.cutoff, step: 100,
    help: "Cutoff: lower it to soften the brightness. Fully up leaves the filter off.",
    format: (v: number) => v >= 12000 ? "Off" : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}Hz` },
  { key: "resonance", label: "Resonance", ...SHAPE_KNOB_RANGES.resonance, step: 0.5,
    help: "Resonance: emphasize the filter edge for a ringing tone. Lower Cutoff to hear it.",
    format: (v: number) => v.toFixed(1) },
  { key: "attack", label: "Attack", ...SHAPE_KNOB_RANGES.attack, step: 0.001,
    help: "Attack: how gently a note fades in. Higher values soften its beginning.",
    format: (v: number) => `${Math.round(v * 1000)}ms` },
  { key: "release", label: "Release", ...SHAPE_KNOB_RANGES.release, step: 0.01,
    help: "Release: how long a note fades after you let go. It cannot extend a sample beyond its recording.",
    format: (v: number) => `${v.toFixed(2)}s` },
  { key: "room", label: "Reverb", ...SHAPE_KNOB_RANGES.room, step: 0.01,
    help: "Reverb: add a sense of space around the sound. Zero is dry.",
    format: (v: number) => `${Math.round(v * 100)}%` },
  { key: "delay", label: "Echo", ...SHAPE_KNOB_RANGES.delay, step: 0.01,
    help: "Echo: add fading repeats, a quarter-second apart. Zero is off.",
    format: (v: number) => `${Math.round(v * 100)}%` },
] as const;
const hasSearchQuery = computed(() => query.value.trim().length > 0);
const allGrouped = computed(() => groupSounds(allSounds.value));
const grouped = computed(() => groupSounds(filteredSounds.value));

const categoryTabs = computed(() =>
  CATEGORY_ORDER.filter((category) => allGrouped.value[category]?.length).map(
    (category) => ({
      key: category,
      label: CATEGORY_LABELS[category],
      shortLabel: CATEGORY_SHORT_LABELS[category],
    })
  )
);

const bankTabs = computed<TabbedOverlayTab[]>(() => [
  { value: "shape", label: "Shape", shortLabel: "Shape", tone: "brass" },
  ...categoryTabs.value.map((tab) => ({
    value: tab.key,
    label: tab.label,
    shortLabel: tab.shortLabel,
  })),
]);

function syncActiveTabToInstrument(instrumentId: string) {
  const preferredCategory = categorise(instrumentId);
  activeTab.value = (preferredCategory && allGrouped.value[preferredCategory]?.length)
    ? preferredCategory
    : categoryTabs.value[0]?.key ?? "synths";
}

onMounted(async () => {
  try {
    await instrumentStore.initializeInstruments();
  } catch {
    // The global loading flow already reports degraded initialization. Keep
    // the chooser usable for whatever sounds were registered successfully.
  }
  allSounds.value = getRegisteredSounds()
    .filter((sound) => categorise(sound) !== null)
    .sort();
  if (activeTab.value !== "shape") syncActiveTabToInstrument(currentInstrumentId.value);
});

watch(currentInstrumentId, (instrumentId) => {
  if (activeTab.value !== "shape") syncActiveTabToInstrument(instrumentId);
});

const activeTabMeta = computed(() => bankTabs.value.find((tab) => tab.value === activeTab.value));

function orderedGroupsFor(tabValue: string) {
  if (hasSearchQuery.value) {
    return CATEGORY_ORDER.filter((category) => grouped.value[category]?.length).map(
      (category) => ({
        key: category,
        label: CATEGORY_LABELS[category],
        sounds: prioritizeSounds(grouped.value[category]!),
      })
    );
  }

  const category = tabValue as Category;
  const sounds = grouped.value[category] ?? [];

  if (!sounds.length) {
    return [];
  }

  return [
    {
      key: category,
      label: CATEGORY_LABELS[category],
      sounds: prioritizeSounds(sounds),
    },
  ];
}

const visibleSoundCount = computed(() => {
  if (activeTab.value === "shape") return undefined;
  if (hasSearchQuery.value) {
    return filteredSounds.value.length;
  }

  return allGrouped.value[activeTab.value]?.length ?? 0;
});

const bankLabel = computed(() => {
  if (activeTab.value === "shape") return `Shape · ${displayInstrumentName(currentInstrumentId.value)}`;
  if (hasSearchQuery.value) {
    return "Search";
  }

  return activeTabMeta.value?.label;
});

const warmupStatusMessage = computed(() => {
  if (
    !useStoreAudioFlow.value ||
    !instrumentStore.isInteractionLocked ||
    !instrumentStore.warmingInstrument
  ) {
    return null;
  }

  return `${instrumentStore.warmupMessage} ${displayInstrumentName(
    instrumentStore.warmingInstrument
  )}`;
});

const warmupErrorMessage = computed(() => {
  if (
    !useStoreAudioFlow.value ||
    !instrumentStore.lastWarmupError ||
    !instrumentStore.lastWarmupErrorInstrument
  ) {
    return null;
  }

  return `Could not load ${displayInstrumentName(
    instrumentStore.lastWarmupErrorInstrument
  )}. ${instrumentStore.lastWarmupError}`;
});

type SoundState = "selected" | "warming" | "ready" | "cold" | "default";

function getSoundState(sound: string): SoundState {
  if (!useStoreAudioFlow.value) {
    return currentInstrumentId.value === sound ? "selected" : "default";
  }

  if (instrumentStore.isInstrumentWarming(sound)) {
    return "warming";
  }

  if (
    currentInstrumentId.value === sound &&
    instrumentStore.isInstrumentReady(sound)
  ) {
    return "selected";
  }

  return instrumentStore.isInstrumentReady(sound) ? "ready" : "cold";
}

function soundStateLabel(sound: string): string {
  return {
    selected: "current",
    warming: "warming",
    ready: "ready",
    cold: "cold",
    default: "available",
  }[getSoundState(sound)];
}

function soundStickerVariant(sound: string): "outline" | "fill" {
  return ["selected", "warming"].includes(getSoundState(sound)) ? "fill" : "outline";
}

function soundPriority(sound: string): number {
  return {
    selected: 0,
    warming: 0,
    ready: 1,
    default: 2,
    cold: 3,
  }[getSoundState(sound)];
}

function prioritizeSounds(sounds: string[]): string[] {
  return [...sounds].sort(
    (a, b) => soundPriority(a) - soundPriority(b) || a.localeCompare(b)
  );
}

function closeSelector(close: () => void) {
  close();
  props.onClose?.();
  emit("close");
}

async function selectInstrument(name: string, close: () => void) {
  const selection = ++selectionGeneration;
  const panelSession = topDrawerRef.value?.openSession;
  emit("select-instrument", name);

  if (!useStoreAudioFlow.value) {
    props.onSelectInstrument?.(name);
    closeSelector(close);
    return;
  }

  const result = await instrumentStore.setInstrument(name);
  if (selection !== selectionGeneration || result.status !== "ready") {
    return;
  }

  const drawer = topDrawerRef.value;
  if (
    panelSession !== undefined &&
    drawer &&
    (!drawer.showPanel || drawer.openSession !== panelSession)
  ) {
    return;
  }

  closeSelector(close);
}
</script>

<template>
  <TopDrawer
    ref="topDrawerRef"
    anchor="top-left"
    :content-height="drawerContentHeight"
    aria-label="Instrument"
    :handle-label="displayInstrumentName(currentInstrumentId)"
    handle-test-id="instrument-selector-trigger"
  >
    <template v-if="instrumentIcon" #icon><component :is="instrumentIcon" /></template>

    <template #panel="{ close }">
      <TabbedOverlayPanel
        @content-height="drawerContentHeight = $event"
        v-model="activeTab"
        :tabs="bankTabs"
        tab-test-id-prefix="instrument-tab"
        tabs-aria-label="Instrument banks"
        embedded
        width="100%"
        height="100%"
        max-height="100%"
        body-class="px-3 py-3"
      >
        <template #header>
          <OverlayPanelHeader
            title="Sounds"
            :context="bankLabel"
            :status="visibleSoundCount"
          >
            <Button
              v-if="activeTab === 'shape'"
              size="sm"
              tone="ink"
              data-testid="shape-reset"
              title="Reset sound shaping"
              accessible-name="Reset sound shaping"
              @click="instrumentStore.resetSynthControls"
            >
              <RotateCcw :size="13" />
            </Button>
            <Button
              size="sm"
              title="Close sounds"
              accessible-name="Close sounds"
              @click="close"
            >
              <X :size="14" />
            </Button>
          </OverlayPanelHeader>
        </template>

        <template #toolbar>
          <div v-if="activeTab !== 'shape'" class="flex items-center gap-2">
            <label
              class="flex flex-1 items-center gap-2 border-b border-[var(--ink-5)] px-0.5 pb-2 pt-0.5 text-[var(--ivory-3)] transition-colors focus-within:border-[var(--ivory-2)] focus-within:text-[var(--ivory)]"
            >
              <Search :size="14" class="text-[var(--ivory-3)]" />
              <input
                v-model="query"
                data-testid="instrument-search"
                type="text"
                placeholder="search sounds"
                class="w-full bg-transparent text-[10px] text-[var(--ivory)] placeholder:text-[var(--ivory-4)] focus:outline-none"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
              />
            </label>

            <span
              class="hidden h-8 shrink-0 items-center border border-[var(--ink-5)] bg-[var(--ink-2)] px-2 text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--ivory-2)] [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)] sm:inline-flex"
            >
              {{ displayInstrumentName(currentInstrumentId) }}
            </span>
          </div>
        </template>

        <template #default="{ activeValue: panelTab }">
          <div class="space-y-3">
            <div
            v-if="warmupStatusMessage"
            data-testid="instrument-warmup-banner"
            role="status"
            aria-live="polite"
            class="flex items-center justify-between gap-3 border border-[var(--ivory-4)] bg-[var(--ink-3)] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[var(--ivory)] [clip-path:polygon(0_8px,8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]"
          >
            <span class="truncate">
              {{ warmupStatusMessage }}
            </span>
            <span class="relative h-3 w-3 shrink-0" aria-hidden="true">
              <span class="absolute inset-0 rounded-full border border-[rgb(244_239_230/0.2)]" />
              <span class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-[var(--ivory)] border-t-[var(--ivory-3)] motion-reduce:animate-none" />
            </span>
          </div>

          <div
            v-else-if="warmupErrorMessage"
            data-testid="instrument-error-banner"
            role="alert"
            class="border border-[#76544f] bg-[#1d1514] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#e2c2bd] [clip-path:polygon(0_8px,8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]"
          >
            {{ warmupErrorMessage }}
          </div>

          <section v-if="panelTab === 'shape'" class="sound-shape" data-testid="sound-shape" aria-label="Sound shaping">
            <div class="sound-shape__grid">
              <div
                v-for="control in shapeKnobs"
                :key="control.key"
                class="sound-shape__knob-cell"
                :title="control.help"
                @mouseenter="shapeHelp = control.help"
                @focusin="shapeHelp = control.help"
              >
                <Knob
                  :model-value="instrumentStore.synthControls[control.key]"
                  type="range"
                  :min="control.min"
                  :max="control.max"
                  :step="control.step"
                  :label="control.label"
                  tone="brass"
                  :data-testid="`shape-knob-${control.key}`"
                  :format-value="control.format"
                  @update:model-value="(v) => instrumentStore.setSynthControl(control.key, Number(v))"
                />
              </div>
            </div>
            <p class="sound-shape__help" aria-live="polite">{{ shapeHelp }}</p>
          </section>

          <div
            v-else-if="!allSounds.length"
            class="border border-dashed border-[var(--ink-5)] bg-[var(--ink-2)] px-4 py-5 text-center text-[10px] italic text-[var(--ivory-3)] [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]"
          >
            loading sounds…
          </div>

          <div
            v-else-if="!filteredSounds.length"
            class="border border-dashed border-[var(--ink-5)] bg-[var(--ink-2)] px-4 py-5 text-center text-[10px] italic text-[var(--ivory-3)] [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]"
          >
            no matches for "{{ query }}"
          </div>

          <div
            v-else-if="!orderedGroupsFor(panelTab).length"
            class="border border-dashed border-[var(--ink-5)] bg-[var(--ink-2)] px-4 py-5 text-center text-[10px] italic text-[var(--ivory-3)] [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]"
          >
            no sounds in this bank yet.
          </div>

          <template v-else>
            <section
              v-for="group in orderedGroupsFor(panelTab)"
              :key="group.key"
              class="instrument-group"
            >
              <div class="instrument-group__heading">
                <span>{{ group.label }}</span>
                <span>{{ group.sounds.length }}</span>
              </div>

              <div class="instrument-group__choices">
                <button
                  v-for="sound in group.sounds"
                  :key="sound"
                  :data-testid="`instrument-option-${sound}`"
                  :data-state="getSoundState(sound)"
                  :title="displayInstrumentName(sound)"
                  :aria-label="`${displayInstrumentName(sound)}, ${soundStateLabel(sound)}`"
                  :aria-pressed="getSoundState(sound) === 'selected'"
                  :disabled="useStoreAudioFlow && instrumentStore.isInstrumentWarming(sound)"
                  @click="selectInstrument(sound, close)"
                  class="instrument-choice"
                >
                  <Sticker
                    class="instrument-choice__sticker"
                    :variant="soundStickerVariant(sound)"
                    color="ivory"
                    :ui-beat="getSoundState(sound) === 'selected'"
                  >
                    <component
                      :is="instrumentIconFor(sound)"
                      :size="12"
                      :stroke-width="1.75"
                      class="instrument-choice__icon"
                      aria-hidden="true"
                    />
                    <span>{{ displayInstrumentName(sound) }}</span>
                  </Sticker>
                </button>
              </div>
            </section>
            </template>
          </div>
        </template>
      </TabbedOverlayPanel>
    </template>
  </TopDrawer>
</template>

<style scoped>
.instrument-group + .instrument-group {
  margin-top: 1.5rem;
}

.sound-shape {
  padding-block: 0.375rem;
}

.sound-shape__grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.375rem;
  align-items: center;
  justify-items: center;
}

.sound-shape__knob-cell {
  width: 100%;
  display: flex;
  justify-content: center;
}

.sound-shape__help {
  min-height: 2.8em;
  margin: .75rem 0 0;
  color: var(--ivory-3);
  font: var(--t-body-mono);
  font-size: 10px;
}

.instrument-group__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  border-bottom: 1px solid var(--ivory-4);
  padding: 0 .125rem .5rem;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.instrument-group__choices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .625rem .75rem;
  padding: .875rem .125rem .125rem;
}

.instrument-choice {
  min-width: 0;
  max-width: 100%;
  border: 0;
  background: transparent;
  padding: .125rem;
  color: inherit;
  cursor: pointer;
  transform: translateY(0);
  transition: opacity var(--dur-tap) var(--ease-stab), transform var(--dur-tap) var(--ease-stab);
  -webkit-tap-highlight-color: transparent;
}

.instrument-choice__sticker {
  max-width: min(15rem, calc(100vw - 8rem));
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.instrument-choice__icon {
  width: .9em;
  height: .9em;
  flex: none;
  margin-right: .4em;
}

.instrument-choice:not(:disabled):hover { transform: translateY(-1px); }
.instrument-choice:not(:disabled):active { transform: translateY(2px); }
.instrument-choice:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }
.instrument-choice:disabled { cursor: wait; }
.instrument-choice[data-state="cold"] { opacity: .38; }
.instrument-choice[data-state="default"] { opacity: .72; }

@media (prefers-reduced-motion: reduce) {
  .instrument-choice { transition: none; }
}

@media (max-width: 460px) {
  .sound-shape__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .instrument-group__choices { gap: .5625rem .5rem; }
  .instrument-choice__sticker { font-size: 12px; }
}
</style>
