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
import { displayInstrumentName } from "@/data/instruments";

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

onMounted(async () => {
  try {
    await instrumentStore.initializeInstruments();
  } catch {
    // The global loading flow already reports degraded initialization. Keep
    // the chooser usable for whatever sounds were registered successfully.
  }
  allSounds.value = getRegisteredSounds().sort();
});

type Category =
  | "synths"
  | "keyboards"
  | "mallets"
  | "strings"
  | "organs"
  | "winds"
  | "drums"
  | "gm"
  | "other";

const CATEGORY_ORDER: Category[] = [
  "keyboards",
  "mallets",
  "strings",
  "organs",
  "winds",
  "synths",
  "drums",
  "gm",
  "other",
];

const CATEGORY_LABELS: Record<Category, string> = {
  synths: "Synths",
  keyboards: "Keyboards",
  mallets: "Mallets",
  strings: "Strings",
  organs: "Organs",
  winds: "Winds",
  drums: "Drums & Percussion",
  gm: "GM Soundfonts",
  other: "Other",
};

const CATEGORY_SHORT_LABELS: Record<Category, string> = {
  synths: "Synths",
  keyboards: "Keys",
  mallets: "Mallets",
  strings: "Strings",
  organs: "Organs",
  winds: "Winds",
  drums: "Drums",
  gm: "GM",
  other: "Other",
};

const KEYBOARD_SOUNDS = new Set([
  "piano",
  "steinway",
  "kawai",
  "fmpiano",
  "clavisynth",
  "gm_piano",
  "gm_epiano1",
  "gm_epiano2",
  "gm_harpsichord",
  "gm_clavinet",
  "gm_music_box",
  "gm_celesta",
]);
const MALLET_SOUNDS = new Set([
  "marimba",
  "vibraphone",
  "vibraphone_bowed",
  "vibraphone_soft",
  "kalimba",
  "kalimba2",
  "kalimba3",
  "kalimba4",
  "kalimba5",
  "glockenspiel",
  "tubularbells",
  "tubularbells2",
  "xylophone_hard_ff",
  "xylophone_hard_pp",
  "xylophone_medium_ff",
  "xylophone_medium_pp",
  "xylophone_soft_ff",
  "xylophone_soft_pp",
  "gm_glockenspiel",
  "gm_xylophone",
  "gm_vibraphone",
  "gm_marimba",
  "gm_tubular_bells",
  "gm_steel_drums",
  "gm_kalimba",
]);
const STRING_SOUNDS = new Set([
  "harp",
  "folkharp",
  "gm_orchestral_harp",
  "gm_pizzicato_strings",
  "gm_tremolo_strings",
  "gm_string_ensemble_1",
  "gm_string_ensemble_2",
  "gm_synth_strings_1",
  "gm_synth_strings_2",
  "gm_violin",
  "gm_viola",
  "gm_cello",
  "gm_contrabass",
  "gm_fiddle",
]);
const ORGAN_SOUNDS = new Set([
  "organ_full",
  "organ_4inch",
  "organ_8inch",
  "pipeorgan_loud",
  "pipeorgan_quiet",
  "pipeorgan_loud_pedal",
  "pipeorgan_quiet_pedal",
  "gm_church_organ",
  "gm_percussive_organ",
  "gm_rock_organ",
  "gm_reed_organ",
  "gm_drawbar_organ",
  "organ",
]);
const WIND_SOUNDS = new Set([
  "sax",
  "sax_stacc",
  "sax_vib",
  "saxello",
  "saxello_stacc",
  "saxello_vib",
  "recorder_alto_stacc",
  "recorder_alto_sus",
  "recorder_alto_vib",
  "recorder_bass_stacc",
  "recorder_bass_sus",
  "recorder_bass_vib",
  "recorder_soprano_stacc",
  "recorder_soprano_sus",
  "recorder_tenor_stacc",
  "recorder_tenor_sus",
  "recorder_tenor_vib",
  "ocarina",
  "ocarina_small",
  "ocarina_small_stacc",
  "ocarina_vib",
  "harmonica",
  "harmonica_soft",
  "harmonica_vib",
  "super64",
  "super64_acc",
  "super64_vib",
  "gm_flute",
  "gm_clarinet",
  "gm_oboe",
  "gm_bassoon",
  "gm_piccolo",
  "gm_recorder",
  "gm_pan_flute",
  "gm_blown_bottle",
  "gm_shakuhachi",
  "gm_whistle",
  "gm_ocarina",
  "gm_english_horn",
  "gm_alto_sax",
  "gm_tenor_sax",
  "gm_soprano_sax",
  "gm_baritone_sax",
  "gm_shanai",
  "gm_sitar",
  "gm_koto",
  "gm_shamisen",
  "gm_dulcimer",
  "gm_banjo",
]);
const SYNTH_SOUNDS = new Set([
  "triangle",
  "sine",
  "square",
  "sawtooth",
  "pulse",
  "supersaw",
  "tri",
  "sin",
  "sqr",
  "saw",
  "brown",
  "white",
  "pink",
  "bytebeat",
  "crackle",
  "sbd",
  "zzfx",
  "user",
  "z_noise",
  "z_sine",
  "z_square",
  "z_sawtooth",
  "z_triangle",
  "z_tan",
  "gm_lead_1_square",
  "gm_lead_2_sawtooth",
  "gm_lead_3_calliope",
  "gm_lead_4_chiff",
  "gm_lead_5_charang",
  "gm_lead_6_voice",
  "gm_lead_7_fifths",
  "gm_lead_8_bass_lead",
  "gm_pad_new_age",
  "gm_pad_warm",
  "gm_pad_poly",
  "gm_pad_choir",
  "gm_pad_bowed",
  "gm_pad_metallic",
  "gm_pad_halo",
  "gm_pad_sweep",
  "gm_fx_rain",
  "gm_fx_soundtrack",
  "gm_fx_crystal",
  "gm_fx_atmosphere",
  "gm_fx_brightness",
  "gm_fx_goblins",
  "gm_fx_echoes",
  "gm_fx_sci_fi",
  "gm_synth_bass_1",
  "gm_synth_bass_2",
  "gm_synth_brass_1",
  "gm_synth_brass_2",
  "gm_synth_drum",
  "gm_synth_choir",
]);

function categorise(name: string): Category {
  if (KEYBOARD_SOUNDS.has(name)) return "keyboards";
  if (MALLET_SOUNDS.has(name)) return "mallets";
  if (STRING_SOUNDS.has(name)) return "strings";
  if (ORGAN_SOUNDS.has(name)) return "organs";
  if (WIND_SOUNDS.has(name)) return "winds";
  if (SYNTH_SOUNDS.has(name)) return "synths";
  if (
    /^(gm_drum|gm_taiko|gm_melodic_tom|gm_reverse_cymbal|gm_gunshot|gm_helicopter|gm_applause|gm_bird_tweet|gm_telephone|gm_seashore|gm_orchestra_hit|gm_brass_section|gm_voice_oohs|gm_choir_aahs|bd|sd|hh|cp|cr|cb|mt|ht|lt|misc|kick|snare|clap|hat|bass|tom|perc|rim|cym|cow|tamb|bong|conga|mrid|agogo|anv|brak|bongo|clave|cong|darb|frame|gong|guiro|mark|ocean|ratch|shak|siren|slap|sleigh|slit|sus_c|tamb|timpa|trian|vibra|wine|wood)/.test(
      name
    )
  ) {
    return "drums";
  }
  if (name.startsWith("gm_")) return "gm";
  if (
    name.startsWith("AJK") ||
    name.startsWith("Akai") ||
    name.startsWith("Roland") ||
    name.includes("_bd") ||
    name.includes("_sd") ||
    name.includes("_hh")
  ) {
    return "drums";
  }

  return "other";
}

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
    if (!map[category]) {
      map[category] = [];
    }
    map[category]!.push(sound);
  }

  return map;
}


type PanelTone = Extract<TabbedOverlayTone, "amber" | "red" | "violet" | "cream">;
type PanelTab = "all" | Category;

const activeTab = ref<PanelTab>("all");
const hasSearchQuery = computed(() => query.value.trim().length > 0);
const allGrouped = computed(() => groupSounds(allSounds.value));
const grouped = computed(() => groupSounds(filteredSounds.value));

const categoryTabs = computed(() =>
  CATEGORY_ORDER.filter((category) => allGrouped.value[category]?.length).map(
    (category, index) => ({
      key: category,
      label: CATEGORY_LABELS[category],
      shortLabel: CATEGORY_SHORT_LABELS[category],
      tone: sceneTone(index),
    })
  )
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
  if (hasSearchQuery.value || activeTab.value === "all") {
    return CATEGORY_ORDER.filter((category) => grouped.value[category]?.length).map(
      (category) => ({
        key: category,
        label: CATEGORY_LABELS[category],
        sounds: grouped.value[category]!,
        tone:
          categoryTabs.value.find((tab) => tab.key === category)?.tone ?? "amber",
      })
    );
  }

  const category = activeTab.value as Category;
  const sounds = grouped.value[category] ?? [];

  if (!sounds.length) {
    return [];
  }

  return [
    {
      key: category,
      label: CATEGORY_LABELS[category],
      sounds,
      tone:
        categoryTabs.value.find((tab) => tab.key === category)?.tone ?? "amber",
    },
  ];
});

const visibleSoundCount = computed(() => {
  if (hasSearchQuery.value) {
    return filteredSounds.value.length;
  }

  if (activeTab.value === "all") {
    return allSounds.value.length;
  }

  return allGrouped.value[activeTab.value as Category]?.length ?? 0;
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
    :handle-label="displayInstrumentName(currentInstrumentId)"
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
              {{ displayInstrumentName(currentInstrumentId) }}
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
            v-else-if="!filteredSounds.length"
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
                  :key="sound"
                  :data-testid="`instrument-option-${sound}`"
                  :data-state="getSoundState(sound)"
                  :title="displayInstrumentName(sound)"
                  :disabled="useStoreAudioFlow && instrumentStore.isInstrumentWarming(sound)"
                  @click="selectInstrument(sound, close)"
                  :class="[
                    'relative min-w-0 w-full overflow-hidden border px-2.5 py-1.5 font-mono text-[9px] transition-colors disabled:pointer-events-none [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]',
                    soundButtonClass(sound),
                  ]"
                >
                  <span
                    v-if="getSoundState(sound) === 'warming'"
                    class="pointer-events-none absolute inset-[1px] animate-spin border-2 border-transparent border-r-white border-t-neutral-400 motion-reduce:animate-none [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]"
                    aria-hidden="true"
                  />

                  <span class="relative block truncate">
                    {{ displayInstrumentName(sound) }}
                  </span>
                  <span
                    v-if="useStoreAudioFlow"
                    class="relative mt-1 block text-[7px] uppercase tracking-[0.16em]"
                    :class="{
                      'text-white': getSoundState(sound) === 'selected',
                      'text-neutral-300': getSoundState(sound) === 'warming',
                      'text-neutral-400': getSoundState(sound) === 'ready',
                      'text-neutral-600': getSoundState(sound) === 'cold',
                    }"
                  >
                    {{ soundStateLabel(sound) }}
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
