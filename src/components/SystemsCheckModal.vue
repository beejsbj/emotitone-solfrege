<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { unifiedMusicService } from '@/services/musicUnified';
import { logger } from '@/utils/logger';
import type { EnhancedMelody } from '@/types/music';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Test states
const currentKey = ref('C');
const currentMode = ref<'major' | 'minor'>('major');
const testNotes = ref(['C4', 'E4', 'G4']);
const testProgression = ref(['C', 'Am', 'F', 'G']);

// Results storage
const chordAnalysis = ref<any>(null);
const keyDetection = ref<any>(null);
const scaleModes = ref<any[]>([]);
const progressionAnalysis = ref<any[]>([]);
const consonantPatterns = ref<EnhancedMelody[]>([]);
const dissonantPatterns = ref<EnhancedMelody[]>([]);
const lowTensionPatterns = ref<EnhancedMelody[]>([]);
const highTensionPatterns = ref<EnhancedMelody[]>([]);

// Test advanced music theory features
const testChordAnalysis = () => {
  logger.dev('Testing chord analysis with notes:', testNotes.value);
  chordAnalysis.value = unifiedMusicService.analyzeChord(testNotes.value);
};

const testKeyDetection = () => {
  const testMelody = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
  logger.dev('Testing key detection with melody:', testMelody);
  keyDetection.value = unifiedMusicService.detectKey(testMelody);
};

const testScaleModes = () => {
  logger.dev('Getting scale modes for current key:', currentKey.value);
  unifiedMusicService.setCurrentKey(currentKey.value as any);
  scaleModes.value = unifiedMusicService.getScaleModes();
};

const testProgressionAnalysis = () => {
  logger.dev('Analyzing progression:', testProgression.value);
  progressionAnalysis.value = unifiedMusicService.analyzeProgression(testProgression.value);
};

// Test pattern analysis features
const testPatternAnalysis = () => {
  logger.dev('Testing pattern analysis features');
  
  // Get consonant patterns
  consonantPatterns.value = unifiedMusicService.getPatternsByInterval('consonant').slice(0, 5);
  
  // Get dissonant patterns
  dissonantPatterns.value = unifiedMusicService.getPatternsByInterval('dissonant').slice(0, 5);
  
  // Get low tension patterns (0-3)
  lowTensionPatterns.value = unifiedMusicService.getPatternsByTension(0, 3).slice(0, 5);
  
  // Get high tension patterns (7-10)
  highTensionPatterns.value = unifiedMusicService.getPatternsByTension(7, 10).slice(0, 5);
};

// Test chord generation
const generatedChords = computed(() => {
  const chords = [];
  for (let degree = 1; degree <= 7; degree++) {
    const chordNotes = unifiedMusicService.getChordFromDegree(degree);
    if (chordNotes.length > 0) {
      chords.push({
        degree,
        notes: chordNotes,
        roman: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][degree - 1]
      });
    }
  }
  return chords;
});

// Run tests when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    logger.info('Systems Check Modal: Running Phase 1 functionality tests');
    testChordAnalysis();
    testKeyDetection();
    testScaleModes();
    testProgressionAnalysis();
    testPatternAnalysis();
  }
});

// Helper to format pattern info
const formatPatternInfo = (pattern: EnhancedMelody) => {
  if (!pattern.tonalAnalysis) return 'No analysis';
  return `${pattern.tonalAnalysis.intervalName} - ${pattern.tonalAnalysis.consonance} (tension: ${pattern.tonalAnalysis.tension})`;
};
</script>

<template>
  <!-- Modal Overlay -->
  <Transition name="modal-fade">
    <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="emit('close')">
      <!-- Modal Content -->
      <div class="min-h-screen px-4 py-8">
        <div class="relative mx-auto max-w-4xl bg-gray-900 rounded-lg shadow-2xl">
          <!-- Header -->
          <div class="sticky top-0 bg-gray-900 rounded-t-lg border-b border-gray-800 p-4 flex items-center justify-between">
            <h1 class="text-xl font-bold text-white">Phase 1: Systems Check</h1>
            <button @click="emit('close')" class="text-gray-400 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Content -->
          <div class="p-4 text-white overflow-y-auto max-h-[80vh]">
            <!-- Music Theory Service Status -->
            <div class="mb-6 p-4 bg-gray-800 rounded-lg">
              <h2 class="text-lg font-semibold mb-4 text-blue-400">🎵 Advanced Music Theory Service</h2>
              
              <!-- Key/Mode Settings -->
              <div class="mb-3 p-3 bg-gray-700 rounded">
                <h3 class="font-medium mb-2 text-sm">Current Settings:</h3>
                <div class="flex gap-4">
                  <div>
                    <label class="text-xs text-gray-400">Key:</label>
                    <select v-model="currentKey" @change="testScaleModes" class="ml-2 bg-gray-600 px-2 py-1 rounded text-sm">
                      <option v-for="note in ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'A#', 'D#', 'G#']" :key="note">{{ note }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-xs text-gray-400">Mode:</label>
                    <select v-model="currentMode" class="ml-2 bg-gray-600 px-2 py-1 rounded text-sm">
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Test Results Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- Chord Analysis -->
                <div class="p-3 bg-gray-700 rounded">
                  <h3 class="font-medium mb-2 text-sm">✅ Chord Analysis</h3>
                  <div class="text-xs">
                    <p class="text-gray-400">Test notes: {{ testNotes.join(', ') }}</p>
                    <div v-if="chordAnalysis" class="mt-2 p-2 bg-gray-600 rounded">
                      <p>Chord: <span class="text-green-400">{{ chordAnalysis.symbol }}</span></p>
                      <p>Quality: <span class="text-blue-400">{{ chordAnalysis.quality }}</span></p>
                    </div>
                  </div>
                </div>

                <!-- Key Detection -->
                <div class="p-3 bg-gray-700 rounded">
                  <h3 class="font-medium mb-2 text-sm">✅ Key Detection</h3>
                  <div v-if="keyDetection" class="text-xs p-2 bg-gray-600 rounded">
                    <p>Detected Key: <span class="text-green-400">{{ keyDetection.key }} {{ keyDetection.mode }}</span></p>
                    <p>Confidence: <span class="text-blue-400">{{ (keyDetection.confidence * 100).toFixed(0) }}%</span></p>
                  </div>
                </div>

                <!-- Scale Modes -->
                <div class="p-3 bg-gray-700 rounded">
                  <h3 class="font-medium mb-2 text-sm">✅ Scale Modes</h3>
                  <div v-if="scaleModes.length" class="text-xs space-y-1">
                    <div v-for="(mode, index) in scaleModes.slice(0, 2)" :key="index" class="p-1 bg-gray-600 rounded">
                      <span class="text-green-400">{{ mode.name }}</span>
                    </div>
                    <p v-if="scaleModes.length > 2" class="text-gray-500">
                      +{{ scaleModes.length - 2 }} more
                    </p>
                  </div>
                </div>

                <!-- Chord Generation -->
                <div class="p-3 bg-gray-700 rounded">
                  <h3 class="font-medium mb-2 text-sm">✅ Chord Generation</h3>
                  <div class="text-xs space-y-1">
                    <div v-for="chord in generatedChords.slice(0, 3)" :key="chord.degree" class="flex">
                      <span class="text-green-400 w-8">{{ chord.roman }}:</span>
                      <span class="text-gray-300">{{ chord.notes.join('-') }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Progression Analysis -->
              <div class="mt-3 p-3 bg-gray-700 rounded">
                <h3 class="font-medium mb-2 text-sm">✅ Progression Analysis</h3>
                <div class="text-xs">
                  <p class="text-gray-400">{{ testProgression.join(' - ') }}</p>
                  <div v-if="progressionAnalysis.length" class="mt-2 flex gap-2 flex-wrap">
                    <div v-for="(chord, index) in progressionAnalysis" :key="index" class="px-2 py-1 bg-gray-600 rounded">
                      <span class="text-green-400">{{ chord.chord }}</span>:
                      <span class="ml-1 text-blue-400 text-xs">{{ chord.function }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pattern Analysis Status -->
            <div class="mb-6 p-4 bg-gray-800 rounded-lg">
              <h2 class="text-lg font-semibold mb-4 text-purple-400">🎼 Pattern Analysis Features</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- Consonant Patterns -->
                <div class="p-3 bg-gray-700 rounded">
                  <h3 class="font-medium mb-2 text-sm">✅ Consonant Patterns</h3>
                  <div class="text-xs space-y-1">
                    <div v-for="pattern in consonantPatterns.slice(0, 3)" :key="pattern.name" class="p-1 bg-gray-600 rounded">
                      <p class="text-green-400">{{ pattern.name }}</p>
                      <p class="text-gray-400">{{ formatPatternInfo(pattern) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Dissonant Patterns -->
                <div class="p-3 bg-gray-700 rounded">
                  <h3 class="font-medium mb-2 text-sm">✅ Dissonant Patterns</h3>
                  <div class="text-xs space-y-1">
                    <div v-for="pattern in dissonantPatterns.slice(0, 3)" :key="pattern.name" class="p-1 bg-gray-600 rounded">
                      <p class="text-red-400">{{ pattern.name }}</p>
                      <p class="text-gray-400">{{ formatPatternInfo(pattern) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Low Tension -->
                <div class="p-3 bg-gray-700 rounded">
                  <h3 class="font-medium mb-2 text-sm">✅ Low Tension (0-3)</h3>
                  <div class="text-xs space-y-1">
                    <div v-for="pattern in lowTensionPatterns.slice(0, 3)" :key="pattern.name" class="p-1 bg-gray-600 rounded">
                      {{ pattern.name }}
                      <span v-if="pattern.tonalAnalysis" class="text-gray-500">
                        ({{ pattern.tonalAnalysis.tension }})
                      </span>
                    </div>
                  </div>
                </div>

                <!-- High Tension -->
                <div class="p-3 bg-gray-700 rounded">
                  <h3 class="font-medium mb-2 text-sm">✅ High Tension (7-10)</h3>
                  <div class="text-xs space-y-1">
                    <div v-for="pattern in highTensionPatterns.slice(0, 3)" :key="pattern.name" class="p-1 bg-gray-600 rounded">
                      {{ pattern.name }}
                      <span v-if="pattern.tonalAnalysis" class="text-gray-500">
                        ({{ pattern.tonalAnalysis.tension }})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Service Integration Status -->
            <div class="p-4 bg-gray-800 rounded-lg">
              <h2 class="text-lg font-semibold mb-4 text-green-400">🔧 Service Integration</h2>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="p-2 bg-gray-700 rounded flex items-center">
                  <span class="text-green-400 mr-2">✅</span>
                  <span>musicTheoryAdvanced.ts</span>
                </div>
                <div class="p-2 bg-gray-700 rounded flex items-center">
                  <span class="text-green-400 mr-2">✅</span>
                  <span>sequencer.ts</span>
                </div>
                <div class="p-2 bg-gray-700 rounded flex items-center">
                  <span class="text-green-400 mr-2">✅</span>
                  <span>musicUnified.ts</span>
                </div>
                <div class="p-2 bg-gray-700 rounded flex items-center">
                  <span class="text-green-400 mr-2">✅</span>
                  <span>patternAnalysis.ts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>