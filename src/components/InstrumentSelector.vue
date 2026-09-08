<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { getRegisteredSounds } from "@/services/superdoughAudio";
import Button from "@/components/primatives/Button.vue";
import Sticker from "@/components/primatives/Sticker.vue";
import TabbedOverlayPanel, {
  type TabbedOverlayTab,
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

const activeTab = ref<Category>(categorise(currentInstrumentId.value));
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

const bankTabs = computed<TabbedOverlayTab[]>(() =>
  categoryTabs.value.map((tab) => ({
    value: tab.key,
    label: tab.label,
    shortLabel: tab.shortLabel,
  })),
);

function syncActiveTabToInstrument(instrumentId: string) {
  const preferredCategory = categorise(instrumentId);
  activeTab.value = allGrouped.value[preferredCategory]?.length
    ? preferredCategory
    : categoryTabs.value[0]?.key ?? preferredCategory;
}

onMounted(async () => {
  try {
    await instrumentStore.initializeInstruments();
  } catch {
    // The global loading flow already reports degraded initialization. Keep
    // the chooser usable for whatever sounds were registered successfully.
  }
  allSounds.value = getRegisteredSounds().sort();
  syncActiveTabToInstrument(currentInstrumentId.value);
});

watch(currentInstrumentId, syncActiveTabToInstrument);

const activeTabMeta = computed(() => ({
  value: activeTab.value,
  label: CATEGORY_LABELS[activeTab.value],
  shortLabel: CATEGORY_SHORT_LABELS[activeTab.value],
}));

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
  if (hasSearchQuery.value) {
    return filteredSounds.value.length;
  }

  return allGrouped.value[activeTab.value]?.length ?? 0;
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
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-1.5">
              <Sticker variant="fill" color="ivory">Sound</Sticker>
              <span
                class="max-w-[12rem] truncate font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--ivory-2)]"
              >
                {{ bankLabel }}
              </span>
            </div>

            <div class="flex shrink-0 items-center gap-1.5">
              <span
                class="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--ivory-3)]"
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
              class="flex flex-1 items-center gap-2 border-b border-[var(--ink-5)] px-0.5 pb-2 pt-0.5 text-[var(--ivory-3)] transition-colors focus-within:border-[var(--ivory-2)] focus-within:text-[var(--ivory)]"
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

        <template #default="{ activeValue: panelTab }">
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
            v-else-if="!orderedGroupsFor(panelTab).length"
            class="border border-dashed border-[#3a3a3a] bg-[#121212] px-4 py-5 text-center text-[10px] italic text-neutral-500 [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]"
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
                <div>
                  {{ group.sounds.length }}
                </div>
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
  .instrument-group__choices { gap: .5625rem .5rem; }
  .instrument-choice__sticker { font-size: 12px; }
}
</style>
