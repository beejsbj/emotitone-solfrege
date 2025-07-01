<template>
  <FloatingDropdown position="top-left" max-height="80vh" :floating="false">
    <!-- Trigger Button -->
    <template #trigger="{ toggle }">
      <button @click="toggle" class="melody-library-toggle">
        <span class="library-icon">🎼</span>
        <span class="library-label">Melody Library</span>
        <ChevronDown :size="14" />
      </button>
    </template>

    <!-- Dropdown Panel -->
    <template #panel="{ close, toggle, position }">
      <div class="melody-library-panel">
        <!-- Header -->
        <div
          class="library-header"
          :class="{ 'flex-row-reverse': position === 'top-left' }"
        >
          <h3>
            <Music :size="16" />
            Melody Library
          </h3>
          <button @click="toggle" class="close-btn" title="Close Library">
            <ChevronDown :size="18" />
          </button>
        </div>

        <div class="library-content">
          <!-- Search Bar -->
          <div class="search-container">
            <input
              v-model="searchTerm"
              placeholder="Search patterns, intervals, melodies..."
              class="search-input"
            />
          </div>

          <!-- Content Sections -->
          <div class="sections-container">
            <!-- Intervals Section -->
            <div class="melody-section">
              <h4 class="section-title">Intervals</h4>
              <div class="patterns-grid">
                <div
                  v-for="pattern in filteredIntervals"
                  :key="pattern.name"
                  class="pattern-card"
                >
                  <div class="pattern-header">
                    <h5 class="pattern-name">{{ pattern.name }}</h5>
                    <span class="pattern-emotion">{{ pattern.emotion }}</span>
                  </div>
                  <div class="pattern-description">
                    {{ pattern.description }}
                  </div>
                  <div class="pattern-sequence">
                    <template
                      v-for="(note, index) in pattern.sequence"
                      :key="index"
                    >
                      <span
                        :style="{ background: getPrimaryColor(note.note) }"
                        class="note-badge"
                      >
                        {{ note.note }}
                        <span class="duration-indicator">{{
                          note.duration
                        }}</span>
                      </span>
                      <span
                        v-if="index !== pattern.sequence.length - 1"
                        class="note-arrow"
                        >→</span
                      >
                    </template>
                  </div>
                  <div class="pattern-actions">
                    <button
                      @click="playPattern(pattern)"
                      :disabled="currentlyPlaying === pattern.name"
                      class="action-btn play-btn"
                    >
                      {{
                        currentlyPlaying === pattern.name
                          ? "Playing..."
                          : "▶ Play"
                      }}
                    </button>
                    <button
                      @click="loadToSequencer(pattern)"
                      class="action-btn load-btn"
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Patterns Section -->
            <div class="melody-section">
              <h4 class="section-title">Melodic Patterns</h4>
              <div class="patterns-grid">
                <div
                  v-for="pattern in filteredPatterns"
                  :key="pattern.name"
                  class="pattern-card"
                >
                  <div class="pattern-header">
                    <h5 class="pattern-name">{{ pattern.name }}</h5>
                    <span class="pattern-emotion">{{ pattern.emotion }}</span>
                  </div>
                  <div class="pattern-description">
                    {{ pattern.description }}
                  </div>
                  <div class="pattern-sequence">
                    <template
                      v-for="(note, index) in pattern.sequence"
                      :key="index"
                    >
                      <span
                        :style="{ background: getPrimaryColor(note.note) }"
                        class="note-badge"
                      >
                        {{ note.note }}
                        <span class="duration-indicator">{{
                          note.duration
                        }}</span>
                      </span>
                      <span
                        v-if="index !== pattern.sequence.length - 1"
                        class="note-arrow"
                        >→</span
                      >
                    </template>
                  </div>
                  <div class="pattern-actions">
                    <button
                      @click="playPattern(pattern)"
                      :disabled="currentlyPlaying === pattern.name"
                      class="action-btn play-btn"
                    >
                      {{
                        currentlyPlaying === pattern.name
                          ? "Playing..."
                          : "▶ Play"
                      }}
                    </button>
                    <button
                      @click="loadToSequencer(pattern)"
                      class="action-btn load-btn"
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Saved Melodies Section -->
            <div v-if="savedMelodies.length > 0" class="melody-section">
              <h4 class="section-title">User Melodies</h4>
              <div class="melodies-grid">
                <div
                  v-for="melody in filteredSavedMelodies"
                  :key="melody.id"
                  class="melody-card"
                >
                  <div class="melody-header">
                    <h5 class="melody-name">{{ melody.name }}</h5>
                    <span class="melody-info"
                      >{{ melody.beats.length }} beats</span
                    >
                  </div>
                  <div class="melody-description">
                    {{ melody.description }}
                  </div>
                  <div class="melody-actions">
                    <button
                      @click="loadMelody(melody.id)"
                      class="action-btn load-btn"
                    >
                      Load
                    </button>
                    <button
                      @click="deleteMelody(melody.id)"
                      class="action-btn delete-btn"
                    >
                      Delete
                    </button>
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
import { useColorSystem } from "@/composables/useColorSystem";
import type { MelodicPattern } from "@/types/music";
import * as Tone from "tone";
import { ChevronDown, Music } from "lucide-vue-next";
import FloatingDropdown from "./FloatingDropdown.vue";

const musicStore = useMusicStore();
const { getPrimaryColor } = useColorSystem();

// Local state
const searchTerm = ref("");
const currentlyPlaying = ref<string | null>(null);
const currentScheduleIds = ref<number[]>([]);

// Computed properties
const allPatterns = computed(() => musicStore.getMelodicPatterns());
const savedMelodies = computed(() => musicStore.savedMelodies);

// Filter patterns by type
const intervalPatterns = computed(() => {
  return allPatterns.value.filter(
    (pattern) => pattern.intervals && pattern.intervals.length === 1
  );
});

const melodicPatterns = computed(() => {
  return allPatterns.value.filter(
    (pattern) => !pattern.intervals || pattern.intervals.length !== 1
  );
});

// Search filtering
const filteredIntervals = computed(() => {
  if (!searchTerm.value) return intervalPatterns.value;
  const term = searchTerm.value.toLowerCase();
  return intervalPatterns.value.filter(
    (pattern) =>
      pattern.name.toLowerCase().includes(term) ||
      pattern.emotion?.toLowerCase().includes(term) ||
      pattern.description?.toLowerCase().includes(term)
  );
});

const filteredPatterns = computed(() => {
  if (!searchTerm.value) return melodicPatterns.value;
  const term = searchTerm.value.toLowerCase();
  return melodicPatterns.value.filter(
    (pattern) =>
      pattern.name.toLowerCase().includes(term) ||
      pattern.emotion?.toLowerCase().includes(term) ||
      pattern.description?.toLowerCase().includes(term)
  );
});

const filteredSavedMelodies = computed(() => {
  if (!searchTerm.value) return savedMelodies.value;
  const term = searchTerm.value.toLowerCase();
  return savedMelodies.value.filter(
    (melody) =>
      melody.name.toLowerCase().includes(term) ||
      melody.description.toLowerCase().includes(term) ||
      melody.emotion.toLowerCase().includes(term)
  );
});

// Methods
const loadToSequencer = (pattern: MelodicPattern) => {
  musicStore.loadPatternToSequencer(pattern);
};

const loadMelody = (melodyId: string) => {
  musicStore.loadMelody(melodyId);
};

const deleteMelody = (melodyId: string) => {
  musicStore.deleteMelody(melodyId);
};

const playPattern = async (pattern: MelodicPattern) => {
  if (currentlyPlaying.value === pattern.name) return;

  try {
    await Tone.start();
    const transport = Tone.getTransport();

    // Clear any existing playback
    stopCurrentPattern();

    transport.cancel();
    transport.stop();
    transport.position = 0;
    transport.bpm.value = 120;

    currentlyPlaying.value = pattern.name;
    currentScheduleIds.value = [];

    let currentTime = 0;

    pattern.sequence.forEach((noteData, index) => {
      const solfegeName = noteData.note;
      const duration = noteData.duration;

      // Find the solfege index
      const solfegeIndex = musicStore.solfegeData.findIndex(
        (s) => s.name === solfegeName
      );

      if (solfegeIndex >= 0) {
        // Calculate duration in seconds
        const durationSeconds = Tone.Time(duration).toSeconds();

        // Schedule note start
        const startId = transport.schedule((time) => {
          musicStore.attackNoteWithOctave(solfegeIndex, 4);
        }, currentTime);

        // Schedule note stop
        const stopId = transport.schedule((time) => {
          musicStore.releaseAllNotes();
        }, currentTime + durationSeconds * 0.9);

        currentScheduleIds.value.push(startId, stopId);
        currentTime += durationSeconds;
      }
    });

    // Schedule playback end
    const endId = transport.schedule(() => {
      stopCurrentPattern();
    }, currentTime);

    currentScheduleIds.value.push(endId);
    transport.start();
  } catch (error) {
    console.error("Error playing pattern:", error);
    stopCurrentPattern();
  }
};

const stopCurrentPattern = () => {
  if (!currentlyPlaying.value) return;

  const transport = Tone.getTransport();

  // Clear all scheduled events
  currentScheduleIds.value.forEach((id) => transport.clear(id));
  currentScheduleIds.value = [];

  // Stop transport and release notes
  transport.cancel();
  transport.stop();
  transport.position = 0;

  musicStore.releaseAllNotes();
  currentlyPlaying.value = null;
};

// Cleanup on unmount
onUnmounted(() => {
  stopCurrentPattern();
});
</script>

<style scoped>
.melody-library-toggle {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #333;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  min-width: auto;
  justify-content: center;
}

.melody-library-toggle:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: #555;
  transform: scale(1.05);
}

.library-icon {
  font-size: 16px;
  line-height: 1;
}

.library-label {
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
}

.melody-library-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.library-header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid #333;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.library-header h3 {
  margin: 0;
  font-size: 14px;
  color: #00ff88;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  transform: rotate(180deg);
}

.library-content {
  padding: 15px;
  overflow-y: auto;
  flex: 1;
}

.search-container {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 12px;
  placeholder-color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  outline: none;
  border-color: #00ff88;
  background: rgba(0, 0, 0, 0.8);
}

.sections-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.melody-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  margin: 0;
  font-size: 11px;
  color: #ffd93d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 217, 61, 0.3);
  padding-bottom: 4px;
}

.patterns-grid,
.melodies-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.pattern-card,
.melody-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px;
  transition: all 0.2s ease;
}

.pattern-card:hover,
.melody-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.pattern-header,
.melody-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.pattern-name,
.melody-name {
  margin: 0;
  font-size: 12px;
  color: white;
  font-weight: 600;
}

.pattern-emotion,
.melody-info {
  font-size: 10px;
  color: #00ff88;
  background: rgba(0, 255, 136, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
}

.pattern-description,
.melody-description {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  line-height: 1.3;
}

.pattern-sequence {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  margin-bottom: 8px;
}

.note-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 3px 6px;
  border-radius: 3px;
  color: black;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.duration-indicator {
  font-size: 8px;
  opacity: 0.8;
  margin-top: 1px;
}

.note-arrow {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
}

.pattern-actions,
.melody-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  flex: 1;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.play-btn {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.play-btn:hover:not(:disabled) {
  background: rgba(0, 255, 136, 0.3);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.load-btn {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.load-btn:hover {
  background: rgba(59, 130, 246, 0.3);
}

.delete-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .patterns-grid,
  .melodies-grid {
    grid-template-columns: 1fr;
  }

  .library-label {
    font-size: 11px;
  }

  .melody-library-toggle {
    padding: 6px 10px;
  }
}
</style>
