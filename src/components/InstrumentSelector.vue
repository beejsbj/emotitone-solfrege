<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import { getRegisteredSounds, initSuperdoughAudio } from "@/services/superdoughAudio";
import FloatingDropdown from "./FloatingDropdown.vue";
import { ChevronDown } from "lucide-vue-next";

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

const isFloating = computed(() => props.floating ?? !props.compact);

// All sounds dynamically loaded from superdough after init
const allSounds = ref<string[]>([]);
const query = ref("");

onMounted(async () => {
  await instrumentStore.initializeInstruments();
  allSounds.value = getRegisteredSounds().sort();
});

// Simple categorisation by prefix/suffix heuristics
type Category = "synths" | "keyboards" | "mallets" | "strings" | "organs" | "winds" | "drums" | "gm" | "other";

const CATEGORY_ORDER: Category[] = ["keyboards", "mallets", "strings", "organs", "winds", "synths", "drums", "gm", "other"];

const CATEGORY_LABELS: Record<Category, string> = {
  synths:    "Synths",
  keyboards: "Keyboards",
  mallets:   "Mallets",
  strings:   "Strings",
  organs:    "Organs",
  winds:     "Winds",
  drums:     "Drums & Percussion",
  gm:        "GM Soundfonts",
  other:     "Other",
};

// Curated pitched-melodic sets
const KEYBOARD_SOUNDS = new Set(["piano", "steinway", "kawai", "fmpiano", "clavisynth", "gm_piano", "gm_epiano1", "gm_epiano2", "gm_harpsichord", "gm_clavinet", "gm_music_box", "gm_celesta"]);
const MALLET_SOUNDS   = new Set(["marimba", "vibraphone", "vibraphone_bowed", "vibraphone_soft", "kalimba", "kalimba2", "kalimba3", "kalimba4", "kalimba5", "glockenspiel", "tubularbells", "tubularbells2", "xylophone_hard_ff", "xylophone_hard_pp", "xylophone_medium_ff", "xylophone_medium_pp", "xylophone_soft_ff", "xylophone_soft_pp", "gm_glockenspiel", "gm_xylophone", "gm_vibraphone", "gm_marimba", "gm_tubular_bells", "gm_steel_drums", "gm_kalimba"]);
const STRING_SOUNDS   = new Set(["harp", "folkharp", "gm_orchestral_harp", "gm_pizzicato_strings", "gm_tremolo_strings", "gm_string_ensemble_1", "gm_string_ensemble_2", "gm_synth_strings_1", "gm_synth_strings_2", "gm_violin", "gm_viola", "gm_cello", "gm_contrabass", "gm_fiddle"]);
const ORGAN_SOUNDS    = new Set(["organ_full", "organ_4inch", "organ_8inch", "pipeorgan_loud", "pipeorgan_quiet", "pipeorgan_loud_pedal", "pipeorgan_quiet_pedal", "gm_church_organ", "gm_percussive_organ", "gm_rock_organ", "gm_reed_organ", "gm_drawbar_organ", "organ"]);
const WIND_SOUNDS     = new Set(["sax", "sax_stacc", "sax_vib", "saxello", "saxello_stacc", "saxello_vib", "recorder_alto_stacc", "recorder_alto_sus", "recorder_alto_vib", "recorder_bass_stacc", "recorder_bass_sus", "recorder_bass_vib", "recorder_soprano_stacc", "recorder_soprano_sus", "recorder_tenor_stacc", "recorder_tenor_sus", "recorder_tenor_vib", "ocarina", "ocarina_small", "ocarina_small_stacc", "ocarina_vib", "harmonica", "harmonica_soft", "harmonica_vib", "super64", "super64_acc", "super64_vib", "gm_flute", "gm_clarinet", "gm_oboe", "gm_bassoon", "gm_piccolo", "gm_recorder", "gm_pan_flute", "gm_blown_bottle", "gm_shakuhachi", "gm_whistle", "gm_ocarina", "gm_english_horn", "gm_alto_sax", "gm_tenor_sax", "gm_soprano_sax", "gm_baritone_sax", "gm_shanai", "gm_sitar", "gm_koto", "gm_shamisen", "gm_dulcimer", "gm_banjo"]);
const SYNTH_SOUNDS    = new Set(["triangle", "sine", "square", "sawtooth", "pulse", "supersaw", "tri", "sin", "sqr", "saw", "brown", "white", "pink", "bytebeat", "crackle", "sbd", "zzfx", "user", "z_noise", "z_sine", "z_square", "z_sawtooth", "z_triangle", "z_tan", "gm_lead_1_square", "gm_lead_2_sawtooth", "gm_lead_3_calliope", "gm_lead_4_chiff", "gm_lead_5_charang", "gm_lead_6_voice", "gm_lead_7_fifths", "gm_lead_8_bass_lead", "gm_pad_new_age", "gm_pad_warm", "gm_pad_poly", "gm_pad_choir", "gm_pad_bowed", "gm_pad_metallic", "gm_pad_halo", "gm_pad_sweep", "gm_fx_rain", "gm_fx_soundtrack", "gm_fx_crystal", "gm_fx_atmosphere", "gm_fx_brightness", "gm_fx_goblins", "gm_fx_echoes", "gm_fx_sci_fi", "gm_synth_bass_1", "gm_synth_bass_2", "gm_synth_brass_1", "gm_synth_brass_2", "gm_synth_drum", "gm_synth_choir"]);

function categorise(name: string): Category {
  if (KEYBOARD_SOUNDS.has(name)) return "keyboards";
  if (MALLET_SOUNDS.has(name))   return "mallets";
  if (STRING_SOUNDS.has(name))   return "strings";
  if (ORGAN_SOUNDS.has(name))    return "organs";
  if (WIND_SOUNDS.has(name))     return "winds";
  if (SYNTH_SOUNDS.has(name))    return "synths";
  // Drum / percussion heuristics
  if (/^(gm_drum|gm_taiko|gm_melodic_tom|gm_reverse_cymbal|gm_gunshot|gm_helicopter|gm_applause|gm_bird_tweet|gm_telephone|gm_seashore|gm_orchestra_hit|gm_brass_section|gm_voice_oohs|gm_choir_aahs|bd|sd|hh|cp|cr|cb|mt|ht|lt|misc|kick|snare|clap|hat|bass|tom|perc|rim|cym|cow|tamb|bong|conga|mrid|agogo|anv|brak|bongo|clave|cong|darb|frame|gong|guiro|mark|ocean|ratch|shak|siren|slap|sleigh|slit|sus_c|tamb|timpa|trian|vibra|wine|wood)/.test(name)) return "drums";
  if (name.startsWith("gm_"))    return "gm";
  if (name.startsWith("AJK") || name.startsWith("Akai") || name.startsWith("Roland") || name.includes("_bd") || name.includes("_sd") || name.includes("_hh")) return "drums";
  return "other";
}

const filteredSounds = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? allSounds.value.filter((s) => s.includes(q)) : allSounds.value;
});

const grouped = computed(() => {
  const map: Partial<Record<Category, string[]>> = {};
  for (const s of filteredSounds.value) {
    const cat = categorise(s);
    if (!map[cat]) map[cat] = [];
    map[cat]!.push(s);
  }
  return map;
});

const orderedGroups = computed(() =>
  CATEGORY_ORDER.filter((c) => grouped.value[c]?.length).map((c) => ({
    key: c,
    label: CATEGORY_LABELS[c],
    sounds: grouped.value[c]!,
  }))
);

const displayName = (id: string) => (id.startsWith("gm_") ? id.slice(3) : id);

function selectInstrument(name: string, close: () => void) {
  if (props.onSelectInstrument) {
    props.onSelectInstrument(name);
  } else {
    instrumentStore.setInstrument(name);
  }
  emit("select-instrument", name);
  close();
  props.onClose?.();
  emit("close");
}

</script>

<template>
  <FloatingDropdown position="top-left" max-height="80vh" :floating="isFloating">
    <!-- Trigger -->
    <template #trigger="{ toggle }">
      <button
        @click="toggle"
        :class="[
          'flex items-center gap-2 px-3 py-2 bg-black/80 border border-neutral-700 rounded-md cursor-pointer text-xs transition-all duration-200 backdrop-blur-lg min-w-0 justify-center hover:bg-black/90 hover:border-neutral-500 hover:scale-105',
          compact ? 'px-2 py-1 text-[10px] gap-1 max-w-[150px] rounded' : 'max-w-[200px]',
        ]"
      >
        <span class="font-mono text-[#00ff88] leading-none truncate" :class="compact ? 'text-[10px] max-w-[80px]' : 'text-xs max-w-[120px]'">
          {{ displayName(currentInstrumentId) }}
        </span>
        <ChevronDown :size="compact ? 12 : 14" />
      </button>
    </template>

    <!-- Panel -->
    <template #panel="{ close, toggle, position }">
      <div class="flex flex-col min-h-0 flex-1" :class="compact ? 'text-[11px]' : ''">

        <!-- Header + search -->
        <div
          class="sticky top-0 z-10 bg-black/95 backdrop-blur-lg border-b border-neutral-800"
          :class="position === 'top-left' ? 'flex-col-reverse' : ''"
        >
          <div class="flex items-center justify-between px-3 py-2">
            <span class="text-[#00ff88] font-semibold text-xs tracking-wide">
              Instruments
              <span v-if="allSounds.length" class="text-neutral-500 font-normal ml-1">{{ allSounds.length }}</span>
            </span>
            <button @click="toggle" class="p-1 text-neutral-500 hover:text-white rounded transition-colors">
              <ChevronDown :size="16" />
            </button>
          </div>
          <!-- Search bar -->
          <div class="px-3 pb-2">
            <input
              v-model="query"
              type="text"
              placeholder="search sounds…"
              class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-[11px] text-white placeholder-neutral-500 outline-none focus:border-[#00ff88]/50 focus:ring-0 font-mono"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
            />
          </div>
        </div>

        <!-- Sound list -->
        <div class="overflow-y-auto flex-1 px-2 py-2" style="scrollbar-width: none;">
          <div v-if="!allSounds.length" class="text-neutral-500 text-xs text-center py-6 italic">
            loading sounds…
          </div>

          <div v-else-if="!filteredSounds.length" class="text-neutral-500 text-xs text-center py-6 italic">
            no matches for "{{ query }}"
          </div>

          <template v-else>
            <div v-for="group in orderedGroups" :key="group.key" class="mb-3">
              <!-- Category header -->
              <div class="text-[9px] font-bold uppercase tracking-widest text-neutral-500 px-1 mb-1 mt-1">
                {{ group.label }}
                <span class="text-neutral-700 font-normal normal-case tracking-normal">{{ group.sounds.length }}</span>
              </div>

              <!-- Sound chips -->
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="sound in group.sounds"
                  :key="sound"
                  @click="selectInstrument(sound, close)"
                  :class="[
                    'px-2 py-0.5 rounded text-[10px] font-mono border transition-all duration-150 cursor-pointer whitespace-nowrap',
                    currentInstrumentId === sound
                      ? 'bg-[#00ff88]/15 border-[#00ff88]/50 text-[#00ff88]'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white hover:bg-neutral-800',
                  ]"
                >
                  {{ displayName(sound) }}
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Current selection footer -->
        <div class="border-t border-neutral-800 px-3 py-2 bg-black/80 flex items-center gap-2">
          <span class="text-neutral-500 text-[10px]">playing</span>
          <span class="font-mono text-[#00ff88] text-[11px] font-semibold">{{ displayName(currentInstrumentId) }}</span>
        </div>
      </div>
    </template>
  </FloatingDropdown>
</template>
