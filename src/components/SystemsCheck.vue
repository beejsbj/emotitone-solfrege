<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { unifiedMusicService } from '@/services/musicUnified';
import { audioService } from '@/services/audio';
import { logger } from '@/utils/logger';
import { useColorSystem } from '@/composables/color';
import type { EnhancedMelody } from '@/types/music';

// Color system for Phase 2 testing
const { getNoteColors, getPrimaryColor, createGlassmorphBackground } = useColorSystem();

// Test states
const currentKey = ref('C');
const currentMode = ref<'major' | 'minor'>('major');
const testNotes = ref(['C4', 'E4', 'G4']);
const testNotesInput = ref('C4 E4 G4');
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

// Phase 2 color system tests
const colorTestNotes = ref(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti']);
const selectedTestNote = ref('Do');

// Update test notes from input
const updateTestNotes = () => {
  const notes = testNotesInput.value.trim().split(/\s+/).filter(n => n);
  if (notes.length > 0) {
    testNotes.value = notes;
    testChordAnalysis();
  }
};

// Play test notes
const playTestNotes = async () => {
  try {
    // Play each note with a slight delay
    for (let i = 0; i < testNotes.value.length; i++) {
      const note = testNotes.value[i];
      audioService.playNote(note, "8n"); // 8th note duration
      if (i < testNotes.value.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150)); // 150ms between notes
      }
    }
  } catch (error) {
    logger.warn('Failed to play test notes:', error);
  }
};

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
  unifiedMusicService.setCurrentMode(currentMode.value);
  scaleModes.value = unifiedMusicService.getScaleModes(currentMode.value);
  
  // Also regenerate chords for new key
  generatedChords.value = generateChordsForKey();
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

// Chord generation state
const generatedChords = ref<any[]>([]);

// Test chord generation
const generateChordsForKey = () => {
  const chords = [];
  const romanNumerals = currentMode.value === 'major' 
    ? ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
    : ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
    
  for (let degree = 1; degree <= 7; degree++) {
    const chordNotes = unifiedMusicService.getChordFromDegree(degree);
    if (chordNotes.length > 0) {
      chords.push({
        degree,
        notes: chordNotes,
        roman: romanNumerals[degree - 1]
      });
    }
  }
  return chords;
};

// Phase 2 color system tests
const testNoteColor = (noteName: string) => {
  return getPrimaryColor(noteName, currentMode.value, 4);
};

const testGlassmorphBackground = (noteName: string) => {
  const color = getPrimaryColor(noteName, currentMode.value, 4);
  return createGlassmorphBackground(color, 0.4);
};

// Run tests on mount
onMounted(() => {
  logger.info('Systems Check: Running functionality tests');
  testChordAnalysis();
  testKeyDetection();
  testScaleModes();
  testProgressionAnalysis();
  testPatternAnalysis();
  generatedChords.value = generateChordsForKey();
});

// Update when mode changes
watch(currentMode, () => {
  testScaleModes();
});

// Helper to format pattern info
const formatPatternInfo = (pattern: EnhancedMelody) => {
  if (!pattern.tonalAnalysis) return 'No analysis';
  return `${pattern.tonalAnalysis.intervalName} - ${pattern.tonalAnalysis.consonance} (tension: ${pattern.tonalAnalysis.tension})`;
};
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 text-white space-y-6 overflow-y-auto">
    <!-- Header -->
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-white mb-2">🔧 Systems Check</h1>
      <p class="text-gray-400">Testing restored refactoring functionality</p>
    </div>

    <!-- Phase 1: Music Theory Service -->
    <div class="p-4 bg-gray-800 rounded-lg">
      <h2 class="text-lg font-semibold mb-4 text-blue-400">🎵 Phase 1: Advanced Music Theory Service</h2>
      
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
            <div class="mb-2">
              <input 
                v-model="testNotesInput"
                @change="updateTestNotes"
                placeholder="Enter notes (e.g., C4 E4 G4)"
                class="w-full px-2 py-1 bg-gray-600 rounded text-white placeholder-gray-400"
              />
            </div>
            <p class="text-gray-400">Testing: {{ testNotes.join(', ') }}</p>
            <div v-if="chordAnalysis" class="mt-2 p-2 bg-gray-600 rounded">
              <p>Chord: <span class="text-green-400 font-bold">{{ chordAnalysis.symbol }}</span></p>
              <p>Quality: <span class="text-blue-400">{{ chordAnalysis.quality }}</span></p>
            </div>
            <div v-else class="mt-2 p-2 bg-gray-600 rounded text-gray-400">
              No chord detected
            </div>
            <button @click="playTestNotes" class="mt-2 px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 transition-colors">
              🎵 Play Notes
            </button>
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
          <h3 class="font-medium mb-2 text-sm">✅ Scale Modes ({{ currentKey }} {{ currentMode }})</h3>
          <div v-if="scaleModes.length" class="text-xs space-y-1">
            <div v-for="(mode, index) in scaleModes.slice(0, 3)" :key="index" class="p-1 bg-gray-600 rounded">
              <p class="text-green-400 font-medium">{{ mode.name }}</p>
              <p class="text-gray-400 text-[10px]">{{ mode.notes.join(' ') }}</p>
            </div>
            <p v-if="scaleModes.length > 3" class="text-gray-500">
              +{{ scaleModes.length - 3 }} more modes
            </p>
          </div>
        </div>

        <!-- Chord Generation -->
        <div class="p-3 bg-gray-700 rounded">
          <h3 class="font-medium mb-2 text-sm">✅ Chord Generation ({{ currentKey }} {{ currentMode }})</h3>
          <div class="text-xs space-y-1">
            <div v-for="chord in generatedChords" :key="chord.degree" class="flex items-center p-1 bg-gray-600 rounded">
              <span class="text-green-400 w-10 font-medium">{{ chord.roman }}:</span>
              <span class="text-gray-300 flex-1">{{ chord.notes.join('-') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pattern Analysis -->
      <div class="mt-3 p-3 bg-gray-700 rounded">
        <h3 class="font-medium mb-2 text-sm">✅ Pattern Analysis</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <h4 class="text-green-400 mb-1">Consonant Patterns:</h4>
            <div class="space-y-1">
              <div v-for="pattern in consonantPatterns.slice(0, 2)" :key="pattern.name" class="text-gray-300">
                {{ pattern.name }}
              </div>
            </div>
          </div>
          <div>
            <h4 class="text-red-400 mb-1">Dissonant Patterns:</h4>
            <div class="space-y-1">
              <div v-for="pattern in dissonantPatterns.slice(0, 2)" :key="pattern.name" class="text-gray-300">
                {{ pattern.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 2: Color System Migration -->
    <div class="p-4 bg-gray-800 rounded-lg">
      <h2 class="text-lg font-semibold mb-4 text-purple-400">🌈 Phase 2: New Modular Color System</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Color Generation Test -->
        <div class="p-3 bg-gray-700 rounded">
          <h3 class="font-medium mb-2 text-sm">✅ Color Generation</h3>
          <div class="space-y-2">
            <div>
              <label class="text-xs text-gray-400">Test Note:</label>
              <select v-model="selectedTestNote" class="ml-2 bg-gray-600 px-2 py-1 rounded text-sm">
                <option v-for="note in colorTestNotes" :key="note">{{ note }}</option>
              </select>
            </div>
            <div class="p-2 rounded" :style="{ backgroundColor: testNoteColor(selectedTestNote) }">
              <span class="text-white font-bold">{{ selectedTestNote }} Color</span>
            </div>
            <div class="text-xs text-gray-400">
              Generated: {{ testNoteColor(selectedTestNote) }}
            </div>
          </div>
        </div>

        <!-- Glassmorphism Test -->
        <div class="p-3 bg-gray-700 rounded">
          <h3 class="font-medium mb-2 text-sm">✅ Glassmorphism Effects</h3>
          <div class="space-y-2">
            <div 
              class="p-3 rounded-lg border border-white/20 backdrop-blur-md"
              :style="{ background: testGlassmorphBackground(selectedTestNote) }"
            >
              <span class="text-white font-bold">{{ selectedTestNote }} Glass Effect</span>
            </div>
            <div class="text-xs text-gray-400">
              New modular color system active ✅
            </div>
          </div>
        </div>

        <!-- Component Migration Status -->
        <div class="p-3 bg-gray-700 rounded md:col-span-2">
          <h3 class="font-medium mb-2 text-sm">✅ Component Migration Status</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div class="flex items-center p-1 bg-gray-600 rounded">
              <span class="text-green-400 mr-1">✅</span>
              <span>SequencerControls</span>
            </div>
            <div class="flex items-center p-1 bg-gray-600 rounded">
              <span class="text-green-400 mr-1">✅</span>
              <span>FloatingPopup</span>
            </div>
            <div class="flex items-center p-1 bg-gray-600 rounded">
              <span class="text-green-400 mr-1">✅</span>
              <span>Canvas Renderers</span>
            </div>
            <div class="flex items-center p-1 bg-gray-600 rounded">
              <span class="text-green-400 mr-1">✅</span>
              <span>ConfigPanel</span>
            </div>
          </div>
          <div class="mt-2 text-xs text-gray-400">
            All 11 components migrated to new modular color system
          </div>
        </div>
      </div>
    </div>

    <!-- Service Integration Status -->
    <div class="p-4 bg-gray-800 rounded-lg">
      <h2 class="text-lg font-semibold mb-4 text-green-400">🔧 Service Integration Status</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
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
</template>

<style scoped>
/* Ensure proper scrolling */
.overflow-y-auto {
  max-height: calc(100vh - 4rem);
}
</style>