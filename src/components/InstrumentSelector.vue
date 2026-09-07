<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { getRegisteredSounds } from "@/services/superdoughAudio";
import Button from "@/components/primatives/Button.vue";
import TabbedOverlayPanel, {
  type TabbedOverlayTab,
  type TabbedOverlayTone,
} from "./TabbedOverlayPanel.vue";
import TopDrawer from "./TopDrawer.vue";
import { Search, X } from "lucide-vue-next";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import { instrumentCatalog } from "@/data/instruments";
import type { InstrumentCategoryId } from "@/types/instrument";

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
const currentInstrument = computed(() =>
  instrumentCatalog.describe(currentInstrumentId.value)
);
const useStoreAudioFlow = computed(() => !props.onSelectInstrument);
const instrumentIcon = computed(() => instrumentIconFor(currentInstrumentId.value));

const allSounds = ref<string[]>([]);
const query = ref("");

onMounted(async () => {
  try {
    await instrumentStore.initializeInstruments();
  } catch {
    // The global loading flow already reports degraded initialization. Keep
    // the chooser usable for whatever sounds were registered successfully.
  }
  allSounds.value = getRegisteredSounds();
});

type PanelTone = Extract<TabbedOverlayTone, "amber" | "red" | "violet" | "cream">;
type PanelTab = "all" | InstrumentCategoryId;

const activeTab = ref<PanelTab>("all");
const hasSearchQuery = computed(() => query.value.trim().length > 0);
const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const registeredGroups = computed(() =>
  instrumentCatalog.groupRegistered(allSounds.value)
);
const filteredGroups = computed(() =>
  registeredGroups.value
    .map((group) => ({
      ...group,
      instruments: group.instruments.filter((instrument) =>
        instrument.id.includes(normalizedQuery.value)
      ),
    }))
    .filter((group) => group.instruments.length)
);
const filteredSoundCount = computed(() =>
  filteredGroups.value.reduce(
    (count, group) => count + group.instruments.length,
    0
  )
);

const categoryTabs = computed(() =>
  registeredGroups.value.map((group, index) => ({
    key: group.id,
    label: group.label,
    shortLabel: group.shortLabel,
    tone: sceneTone(index),
  }))
);

const allTabs = computed<TabbedOverlayTab[]>(() => [
  {
    value: "all",
    label: "All Sounds",
    shortLabel: "All",
    tone: "amber",
  },
  ...categoryTabs.value.map((tab) => ({
    value: tab.key,
    label: tab.label,
    shortLabel: tab.shortLabel,
    tone: tab.tone,
  })),
]);

const activeTabMeta = computed(
  () =>
    allTabs.value.find((tab) => tab.value === activeTab.value) ?? {
      value: "all",
      label: "All Sounds",
      shortLabel: "All",
      tone: "amber" as TabbedOverlayTone,
    }
);

const orderedGroups = computed(() => {
  const groups = hasSearchQuery.value
    ? filteredGroups.value
    : activeTab.value === "all"
      ? registeredGroups.value
      : registeredGroups.value.filter((group) => group.id === activeTab.value);

  return groups.map((group) => ({
    key: group.id,
    label: group.label,
    sounds: group.instruments,
    tone:
      categoryTabs.value.find((tab) => tab.key === group.id)?.tone ?? "amber",
  }));
});

const visibleSoundCount = computed(() => {
  if (hasSearchQuery.value) {
    return filteredSoundCount.value;
  }

  if (activeTab.value === "all") {
    return allSounds.value.length;
  }

  return (
    registeredGroups.value.find((group) => group.id === activeTab.value)
      ?.instruments.length ?? 0
  );
});

const bankLabel = computed(() => {
  if (hasSearchQuery.value) {
    return "Search";
  }

  return activeTabMeta.value.label;
});

const warmupStatusMessage = computed(() => {
  if (
    !useStoreAudioFlow.value ||
    !instrumentStore.isInteractionLocked ||
    !instrumentStore.warmingInstrument
  ) {
    return null;
  }

  return `${instrumentStore.warmupMessage} ${
    instrumentCatalog.describe(instrumentStore.warmingInstrument).displayName
  }`;
});

const warmupErrorMessage = computed(() => {
  if (
    !useStoreAudioFlow.value ||
    !instrumentStore.lastWarmupError ||
    !instrumentStore.lastWarmupErrorInstrument
  ) {
    return null;
  }

  return `Could not load ${
    instrumentCatalog.describe(instrumentStore.lastWarmupErrorInstrument)
      .displayName
  }. ${instrumentStore.lastWarmupError}`;
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

function soundButtonClass(sound: string): string {
  return {
    selected: "border-[#8b8b8b] bg-[#242424] text-white",
    warming:
      "border-[#bdbdbd] bg-[#222222] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.18)]",
    ready:
      "border-[#555555] bg-[#191919] text-[#dddddd] hover:border-[#8a8a8a] hover:text-white",
    cold:
      "border-[#353535] bg-[#111111] text-neutral-500 hover:border-[#686868] hover:text-neutral-300",
    default:
      "border-[#3d3d3d] bg-[#151515] text-neutral-300 hover:border-[#7f7f7f] hover:text-white",
  }[getSoundState(sound)];
}

function closeSelector(close: () => void) {
  close();
  props.onClose?.();
  emit("close");
}

function sceneTone(index: number): PanelTone {
  return ["amber", "red", "violet", "cream"][index % 4] as PanelTone;
}

function toneChipClass(tone: PanelTone) {
  return (
    {
      amber: "bg-[#d2d2d2] text-[#111111]",
      red: "bg-[#ababab] text-[#111111]",
      violet: "bg-[#929292] text-[#111111]",
      cream: "bg-[#e2e2e2] text-[#111111]",
    } as const
  )[tone];
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
    :handle-label="currentInstrument.displayName"
    handle-test-id="instrument-selector-trigger"
  >
    <template v-if="instrumentIcon" #icon><component :is="instrumentIcon" /></template>

    <template #panel="{ close }">
      <TabbedOverlayPanel
        @content-height="drawerContentHeight = $event"
        v-model="activeTab"
        :tabs="allTabs"
        tab-test-id-prefix="instrument-tab"
        embedded
        width="100%"
        height="100%"
        max-height="100%"
        body-class="px-3 py-3"
      >
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-1.5">
              <span
                class="inline-flex h-6 items-center px-2 text-[7px] font-semibold uppercase tracking-[0.22em] [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]"
                :class="toneChipClass('amber')"
              >
                Sound
              </span>
              <span
                class="inline-flex h-6 max-w-[12rem] items-center border border-[#3b3b3b] bg-[#141414] px-2 text-[7px] font-semibold uppercase tracking-[0.24em] text-[#d3d3d3] [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]"
              >
                <span class="truncate">
                  {{ bankLabel }}
                </span>
              </span>
            </div>

            <div class="flex shrink-0 items-center gap-1.5">
              <span
                class="inline-flex h-8 items-center border border-[#3d3d3d] bg-[#151515] px-2 text-[8px] uppercase tracking-[0.18em] text-neutral-400 [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]"
              >
                {{ visibleSoundCount }}
              </span>

              <Button
                title="Close sounds"
                accessible-name="Close sounds"
                @click="close"
              >
                <X :size="14" />
              </Button>
            </div>
          </div>
        </template>

        <template #toolbar>
          <div class="flex items-center gap-2">
            <label
              class="flex flex-1 items-center gap-2 border border-[#3d3d3d] bg-[#151515] px-2.5 py-1.5 text-neutral-300 transition-colors focus-within:border-[#7d7d7d] focus-within:text-white [clip-path:polygon(2%_0,100%_0,98%_100%,0_100%)]"
            >
              <Search :size="14" class="text-neutral-500" />
              <input
                v-model="query"
                data-testid="instrument-search"
                type="text"
                placeholder="search sounds"
                class="w-full bg-transparent text-[10px] text-white placeholder:text-neutral-600 focus:outline-none"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
              />
            </label>

            <span
              class="hidden h-8 shrink-0 items-center border border-[#3b3b3b] bg-[#141414] px-2 text-[8px] font-mono uppercase tracking-[0.14em] text-[#dfdfdf] [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)] sm:inline-flex"
            >
              {{ currentInstrument.displayName }}
            </span>
          </div>
        </template>

        <div class="space-y-3">
          <div
            v-if="warmupStatusMessage"
            data-testid="instrument-warmup-banner"
            role="status"
            aria-live="polite"
            class="flex items-center justify-between gap-3 border border-[#5d5d5d] bg-[#1b1b1b] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[#e6e6e6] [clip-path:polygon(0_8px,8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]"
          >
            <span class="truncate">
              {{ warmupStatusMessage }}
            </span>
            <span class="relative h-3 w-3 shrink-0" aria-hidden="true">
              <span class="absolute inset-0 rounded-full border border-white/20" />
              <span class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-white border-t-neutral-400 motion-reduce:animate-none" />
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

          <div
            v-if="!allSounds.length"
            class="border border-dashed border-[#3a3a3a] bg-[#121212] px-4 py-5 text-center text-[10px] italic text-neutral-500 [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]"
          >
            loading sounds…
          </div>

          <div
            v-else-if="!filteredSoundCount"
            class="border border-dashed border-[#3a3a3a] bg-[#121212] px-4 py-5 text-center text-[10px] italic text-neutral-500 [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]"
          >
            no matches for "{{ query }}"
          </div>

          <div
            v-else-if="!orderedGroups.length"
            class="border border-dashed border-[#3a3a3a] bg-[#121212] px-4 py-5 text-center text-[10px] italic text-neutral-500 [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]"
          >
            no sounds in this bank yet.
          </div>

          <template v-else>
            <section
              v-for="group in orderedGroups"
              :key="group.key"
              class="border border-[#2d2d2d] bg-[#121212] px-3 py-2.5 [clip-path:polygon(0_12px,12px_0,calc(100%-12px)_0,100%_12px,100%_100%,0_100%)]"
            >
              <div class="mb-2 flex items-center justify-between gap-2 px-0.5">
                <span
                  class="px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.2em] [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]"
                  :class="toneChipClass(group.tone)"
                >
                  {{ group.label }}
                </span>
                <div class="text-[8px] uppercase tracking-[0.18em] text-neutral-600">
                  {{ group.sounds.length }}
                </div>
              </div>

              <div
                class="grid grid-cols-[repeat(auto-fill,minmax(6.7rem,1fr))] gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(7.2rem,1fr))]"
              >
                <button
                  v-for="sound in group.sounds"
                  :key="sound.id"
                  :data-testid="`instrument-option-${sound.id}`"
                  :data-state="getSoundState(sound.id)"
                  :title="sound.displayName"
                  :disabled="
                    useStoreAudioFlow &&
                    instrumentStore.isInstrumentWarming(sound.id)
                  "
                  @click="selectInstrument(sound.id, close)"
                  :class="[
                    'relative min-w-0 w-full overflow-hidden border px-2.5 py-1.5 font-mono text-[9px] transition-colors disabled:pointer-events-none [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]',
                    soundButtonClass(sound.id),
                  ]"
                >
                  <span
                    v-if="getSoundState(sound.id) === 'warming'"
                    class="pointer-events-none absolute inset-[1px] animate-spin border-2 border-transparent border-r-white border-t-neutral-400 motion-reduce:animate-none [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]"
                    aria-hidden="true"
                  />

                  <span class="relative block truncate">
                    {{ sound.displayName }}
                  </span>
                  <span
                    v-if="useStoreAudioFlow"
                    class="relative mt-1 block text-[7px] uppercase tracking-[0.16em]"
                    :class="{
                      'text-white': getSoundState(sound.id) === 'selected',
                      'text-neutral-300': getSoundState(sound.id) === 'warming',
                      'text-neutral-400': ['ready', 'cold'].includes(
                        getSoundState(sound.id)
                      ),
                    }"
                  >
                    {{ soundStateLabel(sound.id) }}
                  </span>
                </button>
              </div>
            </section>
          </template>
        </div>
      </TabbedOverlayPanel>
    </template>
  </TopDrawer>
</template>
