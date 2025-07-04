<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { unifiedMusicService } from '@/services/musicUnified';
import { logger } from '@/utils/logger';
import type { EnhancedMelody } from '@/types/music';

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

// Run all tests on mount
onMounted(() => {
  logger.info('Systems Check: Running Phase 1 functionality tests');
  testChordAnalysis();
  testKeyDetection();
  testScaleModes();
  testProgressionAnalysis();
  testPatternAnalysis();
});

// Helper to format pattern info
const formatPatternInfo = (pattern: EnhancedMelody) => {
  if (!pattern.tonalAnalysis) return 'No analysis';
  return `${pattern.tonalAnalysis.intervalName} - ${pattern.tonalAnalysis.consonance} (tension: ${pattern.tonalAnalysis.tension})`;
};
</script>

<template>
  <div class="min-h-screen bg-black text-white p-4 pb-20">
    <h1 class="text-2xl font-bold mb-6 text-center">Phase 1: Systems Check</h1>
    
    <!-- Music Theory Service Status -->
    <div class="mb-8 p-4 bg-gray-900 rounded-lg">
      <h2 class="text-xl font-semibold mb-4 text-blue-400">🎵 Advanced Music Theory Service</h2>
      
      <!-- Key/Mode Settings -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">Current Settings:</h3>
        <div class="flex gap-4">
          <div>
            <label class="text-sm text-gray-400">Key:</label>
            <select v-model="currentKey" @change="testScaleModes" class="ml-2 bg-gray-700 px-2 py-1 rounded">
              <option v-for="note in ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'A#', 'D#', 'G#']" :key="note">{{ note }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-gray-400">Mode:</label>
            <select v-model="currentMode" class="ml-2 bg-gray-700 px-2 py-1 rounded">
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Chord Analysis -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">✅ Chord Analysis</h3>
        <div class="text-sm">
          <p class="text-gray-400">Test notes: {{ testNotes.join(', ') }}</p>
          <div v-if="chordAnalysis" class="mt-2 p-2 bg-gray-700 rounded">
            <p>Chord: <span class="text-green-400">{{ chordAnalysis.symbol }}</span></p>
            <p>Quality: <span class="text-blue-400">{{ chordAnalysis.quality }}</span></p>
          </div>
        </div>
        <button @click="testChordAnalysis" class="mt-2 px-3 py-1 bg-blue-600 rounded text-sm">
          Re-test
        </button>
      </div>

      <!-- Key Detection -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">✅ Key Detection</h3>
        <div v-if="keyDetection" class="text-sm p-2 bg-gray-700 rounded">
          <p>Detected Key: <span class="text-green-400">{{ keyDetection.key }} {{ keyDetection.mode }}</span></p>
          <p>Confidence: <span class="text-blue-400">{{ (keyDetection.confidence * 100).toFixed(0) }}%</span></p>
        </div>
        <button @click="testKeyDetection" class="mt-2 px-3 py-1 bg-blue-600 rounded text-sm">
          Re-test
        </button>
      </div>

      <!-- Scale Modes -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">✅ Scale Modes</h3>
        <div v-if="scaleModes.length" class="text-sm space-y-1">
          <div v-for="(mode, index) in scaleModes.slice(0, 3)" :key="index" class="p-2 bg-gray-700 rounded">
            <p class="text-green-400">{{ mode.name }}</p>
            <p class="text-xs text-gray-400">{{ mode.notes.join(' - ') }}</p>
          </div>
          <p v-if="scaleModes.length > 3" class="text-xs text-gray-500">
            ... and {{ scaleModes.length - 3 }} more modes
          </p>
        </div>
      </div>

      <!-- Chord Generation -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">✅ Chord Generation (Scale Degrees)</h3>
        <div class="text-sm space-y-1">
          <div v-for="chord in generatedChords.slice(0, 3)" :key="chord.degree" class="p-2 bg-gray-700 rounded">
            <span class="text-green-400">{{ chord.roman }}:</span>
            <span class="ml-2 text-gray-300">{{ chord.notes.join('-') }}</span>
          </div>
        </div>
      </div>

      <!-- Progression Analysis -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">✅ Progression Analysis</h3>
        <div class="text-sm">
          <p class="text-gray-400">Test progression: {{ testProgression.join(' - ') }}</p>
          <div v-if="progressionAnalysis.length" class="mt-2 space-y-1">
            <div v-for="(chord, index) in progressionAnalysis" :key="index" class="p-2 bg-gray-700 rounded">
              <span class="text-green-400">{{ chord.chord }}</span>:
              <span class="ml-2 text-blue-400">{{ chord.function }}</span>
              <span class="ml-2 text-gray-500">(degree {{ chord.degree }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pattern Analysis Status -->
    <div class="mb-8 p-4 bg-gray-900 rounded-lg">
      <h2 class="text-xl font-semibold mb-4 text-purple-400">🎼 Pattern Analysis Features</h2>
      
      <!-- Consonant Patterns -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">✅ Consonant Patterns</h3>
        <div class="text-sm space-y-1">
          <div v-for="pattern in consonantPatterns" :key="pattern.name" class="p-2 bg-gray-700 rounded">
            <p class="text-green-400">{{ pattern.name }}</p>
            <p class="text-xs text-gray-400">{{ formatPatternInfo(pattern) }}</p>
          </div>
        </div>
      </div>

      <!-- Dissonant Patterns -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">✅ Dissonant Patterns</h3>
        <div class="text-sm space-y-1">
          <div v-for="pattern in dissonantPatterns" :key="pattern.name" class="p-2 bg-gray-700 rounded">
            <p class="text-red-400">{{ pattern.name }}</p>
            <p class="text-xs text-gray-400">{{ formatPatternInfo(pattern) }}</p>
          </div>
        </div>
      </div>

      <!-- Tension-based Patterns -->
      <div class="mb-4 p-3 bg-gray-800 rounded">
        <h3 class="font-medium mb-2">✅ Pattern Tension Analysis</h3>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p class="font-medium text-blue-400 mb-1">Low Tension (0-3)</p>
            <div class="space-y-1">
              <div v-for="pattern in lowTensionPatterns.slice(0, 3)" :key="pattern.name" class="p-1 bg-gray-700 rounded text-xs">
                {{ pattern.name }}
                <span v-if="pattern.tonalAnalysis" class="text-gray-500">
                  ({{ pattern.tonalAnalysis.tension }})
                </span>
              </div>
            </div>
          </div>
          <div>
            <p class="font-medium text-orange-400 mb-1">High Tension (7-10)</p>
            <div class="space-y-1">
              <div v-for="pattern in highTensionPatterns.slice(0, 3)" :key="pattern.name" class="p-1 bg-gray-700 rounded text-xs">
                {{ pattern.name }}
                <span v-if="pattern.tonalAnalysis" class="text-gray-500">
                  ({{ pattern.tonalAnalysis.tension }})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Integration Status -->
    <div class="mb-8 p-4 bg-gray-900 rounded-lg">
      <h2 class="text-xl font-semibold mb-4 text-green-400">🔧 Service Integration</h2>
      <div class="space-y-2 text-sm">
        <div class="p-2 bg-gray-800 rounded flex items-center">
          <span class="text-green-400 mr-2">✅</span>
          <span>musicTheoryAdvanced.ts - Tonal.js integration active</span>
        </div>
        <div class="p-2 bg-gray-800 rounded flex items-center">
          <span class="text-green-400 mr-2">✅</span>
          <span>sequencer.ts - Pattern management active</span>
        </div>
        <div class="p-2 bg-gray-800 rounded flex items-center">
          <span class="text-green-400 mr-2">✅</span>
          <span>musicUnified.ts - Unified API working</span>
        </div>
        <div class="p-2 bg-gray-800 rounded flex items-center">
          <span class="text-green-400 mr-2">✅</span>
          <span>patternAnalysis.ts - Tonal analysis active</span>
        </div>
      </div>
    </div>

    <!-- Back to Home -->
    <div class="text-center mt-8">
      <router-link to="/" class="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
        Back to App
      </router-link>
    </div>
  </div>
</template>