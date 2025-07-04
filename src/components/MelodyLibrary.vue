<template>
  <FloatingDropdown position="top-left" max-height="80vh" :floating="false">
    <!-- Trigger Button -->
    <template #trigger="{ toggle }">
      <button
        @click="toggle"
        class="p-2 sm:px-3 bg-black/80 border border-gray-600 rounded-md text-white cursor-pointer text-xs flex items-center gap-1.5 sm:gap-2 transition-all duration-200 backdrop-blur-sm min-w-fit justify-center hover:bg-black/90 hover:border-gray-500 hover:scale-105"
      >
        <span class="text-base leading-none">🎼</span>
        <span class="font-medium text-xs whitespace-nowrap"
          >Melody Library</span
        >
        <ChevronDown :size="14" />
      </button>
    </template>

    <!-- Dropdown Panel -->
    <template #panel="{ close, toggle, position }">
      <div class="w-full flex flex-col min-h-0 flex-1">
        <!-- Header -->
        <div
          class="sticky top-0 flex items-center justify-between p-3 border-b border-gray-600 bg-black/95 backdrop-blur-sm z-10"
          :class="{ 'flex-row-reverse': position === 'top-left' }"
        >
          <h3
            class="m-0 text-sm text-emerald-400 flex items-center gap-1.5 font-semibold"
          >
            <Music :size="16" />
            Melody Library
          </h3>
          <button
            @click="toggle"
            class="bg-transparent border-0 text-red-400 cursor-pointer p-1 flex items-center justify-center rounded transition-all duration-200 hover:bg-red-400/20 hover:rotate-180"
            title="Close Library"
          >
            <ChevronDown :size="18" />
          </button>
        </div>

        <div class="p-4 overflow-y-auto flex-1">
          <!-- Search Bar -->
          <div class="mb-5">
            <input
              v-model="searchTerm"
              placeholder="Search melodies by name, emotion, or description..."
              class="w-full p-2 sm:px-3 bg-black/60 border border-white/20 rounded-md text-white text-xs placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:bg-black/80"
            />
          </div>

          <!-- Categorized Melodies Accordion -->
          <div class="space-y-2">
            <div
              v-for="(melodies, category) in categorizedMelodies"
              :key="category"
              class="bg-white/5 border border-white/10 rounded-md overflow-hidden"
            >
              <!-- Category Header -->
              <button
                @click="toggleCategory(category)"
                class="w-full p-3 flex items-center justify-between bg-black/40 cursor-pointer transition-colors duration-200 hover:bg-black/50"
              >
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      getCategoryInfo(category).color.text,
                      getCategoryInfo(category).color.bg,
                    ]"
                    class="px-2 py-1 rounded text-xs font-medium"
                  >
                    {{ getCategoryInfo(category).title }}
                  </span>
                  <span class="text-white/70 text-xs">
                    {{ melodies.length }} melodies
                  </span>
                </div>
                <ChevronDown
                  :size="16"
                  class="text-white/70 transition-transform duration-300"
                  :class="{ 'rotate-180': expandedCategories.has(category) }"
                />
              </button>

              <!-- Category Content -->
              <div
                v-show="expandedCategories.has(category)"
                class="border-t border-white/10"
              >
                <div class="p-2 space-y-2">
                  <div
                    v-for="melody in melodies"
                    :key="melody.name"
                    class="bg-white/5 border border-white/10 rounded-md p-2.5 transition-all duration-200 hover:bg-white/8 hover:border-white/20"
                  >
                    <div class="flex justify-between items-center mb-1.5">
                      <h5 class="m-0 text-xs text-white font-semibold">
                        {{ melody.name }}
                      </h5>
                      <div class="flex items-center gap-1">
                        <!-- Category Badge -->
                        <span
                          :class="[
                            getCategoryInfo(melody.category).color.text,
                            getCategoryInfo(melody.category).color.bg,
                          ]"
                          class="px-1.5 py-0.5 rounded-sm text-xs"
                        >
                          {{ getCategoryInfo(melody.category).title }}
                        </span>
                        <!-- Emotion Badge -->
                        <span
                          v-if="melody.emotion"
                          class="text-xs text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm"
                        >
                          {{ melody.emotion }}
                        </span>
                        <!-- Key & BPM Badge -->
                        <span
                          v-if="melody.defaultKey && melody.defaultBpm"
                          :style="{
                            backgroundColor: `${getKeyColor(
                              melody.defaultKey
                            )}33`,
                            color: getKeyColor(melody.defaultKey),
                          }"
                          class="text-xs px-1.5 py-0.5 rounded-sm"
                        >
                          {{ melody.defaultKey }} {{ melody.defaultBpm }}bpm
                        </span>
                      </div>
                    </div>
                    <div class="text-xs text-white/70 mb-2 leading-tight">
                      {{ melody.description }}
                    </div>
                    <div class="flex flex-wrap items-center gap-1 mb-2">
                      <template
                        v-for="(note, index) in melody.sequence.slice(0, 8)"
                        :key="index"
                      >
                        <span
                          :style="{
                            background: getPrimaryColor(
                              musicStore.getSolfegeByName(note.note)?.name ||
                                note.note
                            ),
                          }"
                          class="inline-flex flex-col items-center px-1.5 py-1 rounded text-black text-xs font-semibold leading-none"
                        >
                          {{ note.note }}
                          <span class="text-xs opacity-80 mt-0.5">{{
                            note.duration
                          }}</span>
                        </span>
                        <span
                          v-if="index !== melody.sequence.length - 1"
                          class="text-white/50 text-xs"
                          >→</span
                        >
                      </template>
                      <span
                        v-if="melody.sequence.length > 8"
                        class="text-white/50 text-xs"
                        >...</span
                      >
                    </div>
                    <div class="flex gap-1">
                      <button
                        @click="playPattern(melody, close)"
                        :disabled="currentlyPlaying === melody.name"
                        class="flex-1 px-2 py-1 border-0 rounded text-xs font-semibold cursor-pointer transition-all duration-200 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {{
                          currentlyPlaying === melody.name
                            ? "Playing..."
                            : "▶ Play"
                        }}
                      </button>
                      <button
                        @click="loadToSequencer(melody, close)"
                        class="flex-1 px-2 py-1 border-0 rounded text-xs font-semibold cursor-pointer transition-all duration-200 bg-blue-500/20 text-blue-500 border border-blue-500/30 hover:bg-blue-500/30"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </FloatingDropdown>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useSequencerStore } from "@/stores/sequencer";
import { useColorSystem } from "@/composables/color";
import useGSAP from "@/composables/useGSAP";
import type {
  CategorizedMelody,
  SequencerBeat,
  ChromaticNote,
} from "@/types/music";
import { ChevronDown, Music } from "lucide-vue-next";
import FloatingDropdown from "./FloatingDropdown.vue";
import { MusicTheoryService, CHROMATIC_NOTES } from "@/services/music";

const musicStore = useMusicStore();
const sequencerStore = useSequencerStore();
const { getPrimaryColor } = useColorSystem();
const { gsap } = useGSAP();

// Local state
const searchTerm = ref("");
const currentlyPlaying = ref<string | null>(null);
const expandedCategories = ref<Set<string>>(new Set(["complete"]));
const originalKey = ref(musicStore.currentKey);

// Filtered and categorized melodies
const categorizedMelodies = computed(() => {
  const melodies = searchTerm.value
    ? musicStore.searchMelodies(searchTerm.value)
    : musicStore.allMelodies;

  return melodies.reduce((acc, melody) => {
    if (!acc[melody.category]) {
      acc[melody.category] = [];
    }
    acc[melody.category].push(melody);
    return acc;
  }, {} as Record<string, CategorizedMelody[]>);
});

// Get category display info
const getCategoryInfo = (category: string) => {
  switch (category) {
    case "intervals":
      return {
        title: "Intervals",
        color: { text: "text-purple-400", bg: "bg-purple-400/10" },
      };
    case "patterns":
      return {
        title: "Melodic Pattern",
        color: { text: "text-yellow-400", bg: "bg-yellow-400/10" },
      };
    case "complete":
      return {
        title: "Complete Melody",
        color: { text: "text-blue-400", bg: "bg-blue-400/10" },
      };
    case "userCreated":
      return {
        title: "User Created",
        color: { text: "text-emerald-400", bg: "bg-emerald-400/10" },
      };
    default:
      return {
        title: "Other",
        color: { text: "text-gray-400", bg: "bg-gray-400/10" },
      };
  }
};

// Toggle category expansion
const toggleCategory = (category: string) => {
  if (expandedCategories.value.has(category)) {
    expandedCategories.value.delete(category);
  } else {
    expandedCategories.value.add(category);
  }
};

// Get the color for a key badge
const getKeyColor = (key: string) => {
  const tempMusicService = new MusicTheoryService();
  tempMusicService.setCurrentKey(key as ChromaticNote);
  const solfegeData = tempMusicService.getCurrentScale().solfege[0];
  return getPrimaryColor(solfegeData.name);
};

// Methods
const loadToSequencer = (
  melody: CategorizedMelody,
  closeDropdown?: () => void
) => {
  if (!sequencerStore.activeSequencer) {
    sequencerStore.createSequencer();
  }

  if (sequencerStore.activeSequencer) {
    sequencerStore.clearBeatsInSequencer(sequencerStore.activeSequencer.id);
    const newBeats = convertPatternToBeats(melody);
    newBeats.forEach((beat) => {
      sequencerStore.addBeatToSequencer(
        sequencerStore.activeSequencer!.id,
        beat
      );
    });
  }

  if (closeDropdown) closeDropdown();
};

// Convert melodic pattern to sequencer beats
const convertPatternToBeats = (melody: CategorizedMelody) => {
  const beats: SequencerBeat[] = [];
  let stepPosition = 0;

  melody.sequence.forEach((noteData, index) => {
    const solfegeName = noteData.note;
    const solfegeIndex = musicStore.solfegeData.findIndex(
      (s) => s.name === solfegeName
    );

    if (solfegeIndex >= 0 && solfegeIndex < 7) {
      const noteDuration = noteData.duration;
      let stepDuration = 1;

      switch (noteDuration) {
        case "1n":
          stepDuration = 16;
          break;
        case "2n":
          stepDuration = 8;
          break;
        case "4n":
          stepDuration = 4;
          break;
        case "8n":
          stepDuration = 2;
          break;
        case "16n":
          stepDuration = 1;
          break;
        case "32n":
          stepDuration = 0.5;
          break;
        default:
          stepDuration = 1;
          break;
      }

      stepDuration = Math.max(1, Math.floor(stepDuration));

      const beat = {
        id: `pattern-${Date.now()}-${index}`,
        ring: 6 - solfegeIndex,
        step: stepPosition % 16,
        duration: stepDuration,
        solfegeName,
        solfegeIndex,
        octave: sequencerStore.activeSequencer?.octave || 4,
      };
      beats.push(beat);

      stepPosition += stepDuration;
    }
  });

  return beats;
};

const playPattern = async (
  melody: CategorizedMelody,
  closeDropdown?: () => void
) => {
  if (currentlyPlaying.value === melody.name) return;

  try {
    currentlyPlaying.value = melody.name;

    // Set the key if specified in the melody
    if (melody.defaultKey) {
      musicStore.setKey(melody.defaultKey);
    }

    // Play each note in sequence
    for (const note of melody.sequence) {
      // Check if we should stop playing
      if (currentlyPlaying.value !== melody.name) break;

      // Calculate note duration in seconds
      let durationTime = 0.25; // default to quarter note
      switch (note.duration) {
        case "1n":
          durationTime = 2;
          break;
        case "2n":
          durationTime = 1;
          break;
        case "4n":
          durationTime = 0.5;
          break;
        case "8n":
          durationTime = 0.25;
          break;
        case "16n":
          durationTime = 0.125;
          break;
        case "32n":
          durationTime = 0.0625;
          break;
      }

      // Get the solfege data for the note
      const solfegeData = musicStore.getSolfegeByName(note.note);
      if (solfegeData) {
        // If it's a solfege note, get its index and convert to chromatic
        const solfegeIndex = musicStore.solfegeData.indexOf(solfegeData);
        if (solfegeIndex !== -1) {
          await musicStore.playNoteWithDuration(solfegeIndex, 4, note.duration);
        }
      } else {
        // If it's not a solfege note, try to play it directly as a chromatic note
        const match = note.note.match(/^([A-G]#?)(\d+)$/);
        if (match) {
          const [, chromatic, octave] = match;
          if (CHROMATIC_NOTES.includes(chromatic as ChromaticNote)) {
            await musicStore.playNoteWithDuration(
              note.note as `${ChromaticNote}${number}`,
              note.duration
            );
          }
        }
      }

      // Wait for the note duration
      await new Promise((resolve) => setTimeout(resolve, durationTime * 1000));
    }
  } catch (error) {
    console.error("Error playing pattern:", error);
  } finally {
    currentlyPlaying.value = null;
    if (closeDropdown) closeDropdown();
  }
};

const stopCurrentPattern = () => {
  currentlyPlaying.value = null;
};

// Cleanup on unmount
onUnmounted(() => {
  stopCurrentPattern();
});
</script>

<style scoped>
/* Mobile responsiveness handled by Tailwind responsive classes */
</style>
