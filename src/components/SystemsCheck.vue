<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { unifiedMusicService } from '@/services/musicUnified';
import { audioService } from '@/services/audio';
import { logger } from '@/utils/logger';
import { useColorSystem } from '@/composables/color';
import { useVisualConfigStore } from '@/stores/visualConfig';
import { Knob } from '@/components/knobs';
import DynamicColorPreview from '@/components/DynamicColorPreview.vue';
import { Note, Interval, Chord, Scale } from '@tonaljs/tonal';
import type { EnhancedMelody } from '@/types/music';

// Color system for Phase 2 testing
const { getNoteColors, getPrimaryColor, createGlassmorphBackground } = useColorSystem();
const visualConfigStore = useVisualConfigStore();

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

// Phase 2 color system tests - Enhanced for interactivity
const colorTestNotes = ref(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti']);
const selectedTestNote = ref('Do');

// Use store settings directly instead of local state
const colorSystemSettings = computed(() => ({
  saturation: visualConfigStore.config.dynamicColors.saturation,
  baseLightness: visualConfigStore.config.dynamicColors.baseLightness,
  lightnessRange: visualConfigStore.config.dynamicColors.lightnessRange,
  hueAnimation: visualConfigStore.config.dynamicColors.hueAnimationAmplitude,
  animationSpeed: visualConfigStore.config.dynamicColors.animationSpeed,
  octave: 4, // Keep local for testing different octaves
  chromaticMapping: visualConfigStore.config.dynamicColors.chromaticMapping
}));

// Local octave setting for testing
const testOctave = ref(4);

// Interactive chord builder
const chordBuilderNotes = ref<string[]>([]);
const availableNotes = ref(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
const isPlaying = ref(false);

// Live performance tracking
const performanceMetrics = ref({
  colorGenerationTime: 0,
  chordAnalysisTime: 0,
  lastUpdateTime: Date.now()
});

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

// Enhanced Phase 2 color system tests with performance tracking
const testNoteColor = (noteName: string) => {
  const startTime = performance.now();
  const color = getPrimaryColor(noteName, currentMode.value, testOctave.value);
  const endTime = performance.now();
  
  performanceMetrics.value.colorGenerationTime = endTime - startTime;
  performanceMetrics.value.lastUpdateTime = Date.now();
  
  logger.dev('SystemsCheck: Color generated', {
    note: noteName,
    color,
    generationTime: performanceMetrics.value.colorGenerationTime,
    octave: testOctave.value,
    storeSettings: colorSystemSettings.value
  });
  
  return color;
};

const testGlassmorphBackground = (noteName: string) => {
  const color = getPrimaryColor(noteName, currentMode.value, testOctave.value);
  return createGlassmorphBackground(color, colorSystemSettings.value.saturation);
};

// Interactive chord builder functions
const toggleNoteInChord = (note: string) => {
  const index = chordBuilderNotes.value.indexOf(note);
  if (index > -1) {
    chordBuilderNotes.value.splice(index, 1);
    logger.dev('SystemsCheck: Note removed from chord', { note, remainingNotes: chordBuilderNotes.value });
  } else {
    chordBuilderNotes.value.push(note);
    logger.dev('SystemsCheck: Note added to chord', { note, chordNotes: chordBuilderNotes.value });
  }
  
  interactionCounts.value.chordBuilds++;
  
  // Auto-analyze chord when notes change
  if (chordBuilderNotes.value.length >= 2) {
    const startTime = performance.now();
    const analysis = unifiedMusicService.analyzeChord(chordBuilderNotes.value);
    const endTime = performance.now();
    
    performanceMetrics.value.chordAnalysisTime = endTime - startTime;
    
    logger.dev('SystemsCheck: Live chord analysis', {
      notes: chordBuilderNotes.value,
      analysis,
      analysisTime: performanceMetrics.value.chordAnalysisTime
    });
  }
};

const playChordBuilderNotes = async () => {
  if (chordBuilderNotes.value.length === 0) return;
  
  isPlaying.value = true;
  interactionCounts.value.notesPlaed++;
  
  logger.dev('SystemsCheck: Playing chord', { notes: chordBuilderNotes.value });
  
  try {
    for (let i = 0; i < chordBuilderNotes.value.length; i++) {
      const note = chordBuilderNotes.value[i] + testOctave.value;
      audioService.playNote(note, "4n");
      if (i < chordBuilderNotes.value.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    logger.warn('SystemsCheck: Failed to play chord', error);
  } finally {
    isPlaying.value = false;
  }
};

const clearChord = () => {
  chordBuilderNotes.value = [];
  logger.dev('SystemsCheck: Chord cleared');
};

// Color system setting handlers with logging
const handleColorSettingChange = (setting: string, value: any) => {
  // Update the store directly
  if (setting === 'saturation') {
    visualConfigStore.updateValue('dynamicColors', 'saturation', value);
  } else if (setting === 'baseLightness') {
    visualConfigStore.updateValue('dynamicColors', 'baseLightness', value);
  } else if (setting === 'lightnessRange') {
    visualConfigStore.updateValue('dynamicColors', 'lightnessRange', value);
  } else if (setting === 'hueAnimation') {
    visualConfigStore.updateValue('dynamicColors', 'hueAnimationAmplitude', value);
  } else if (setting === 'animationSpeed') {
    visualConfigStore.updateValue('dynamicColors', 'animationSpeed', value);
  } else if (setting === 'chromaticMapping') {
    visualConfigStore.updateValue('dynamicColors', 'chromaticMapping', value);
  }
  
  interactionCounts.value.colorChanges++;
  
  logger.dev('SystemsCheck: Color setting changed in store', {
    setting,
    value,
    storeSettings: visualConfigStore.config.dynamicColors
  });
};

const handleKnobChange = (section: string, key: string, value: any) => {
  interactionCounts.value.knobAdjustments++;
  
  logger.dev('SystemsCheck: Knob adjusted', {
    section,
    key,
    value,
    interactionCount: interactionCounts.value.knobAdjustments
  });
};

// Live chord analysis for chord builder
const liveChordAnalysis = computed(() => {
  if (chordBuilderNotes.value.length < 2) return null;
  return unifiedMusicService.analyzeChord(chordBuilderNotes.value);
});

// Color palette for all notes with current settings
const allNotesColorPalette = computed(() => {
  return colorTestNotes.value.map(note => ({
    name: note,
    color: testNoteColor(note),
    colors: getNoteColors(note, currentMode.value, testOctave.value)
  }));
});

// Comprehensive note analysis using Tonal.js
const getComprehensiveNoteAnalysis = (noteName: string, octave: number = testOctave.value) => {
  try {
    const fullNoteName = noteName.includes(octave.toString()) ? noteName : `${noteName}${octave}`;
    const note = Note.get(fullNoteName);
    const pitchClass = Note.get(noteName);
    
    logger.dev('SystemsCheck: Analyzing note', { noteName, fullNoteName, note, pitchClass });
    
    return {
      // Basic note properties
      name: note.name || noteName,
      pc: pitchClass.pc || noteName,
      letter: note.letter || pitchClass.letter || noteName[0],
      step: pitchClass.step !== undefined ? pitchClass.step : -1,
      acc: note.acc || pitchClass.acc || '',
      alt: note.alt !== undefined ? note.alt : (pitchClass.alt !== undefined ? pitchClass.alt : 0),
      oct: note.oct !== undefined ? note.oct : octave,
      chroma: pitchClass.chroma !== undefined ? pitchClass.chroma : -1,
      midi: note.midi || null,
      freq: note.freq || null,
      
      // Our color system integration
      color: testNoteColor(noteName),
      colors: getNoteColors(noteName, currentMode.value, octave),
      
      // Validate note
      isValid: !note.empty && !pitchClass.empty
    };
  } catch (error) {
    logger.warn('SystemsCheck: Note analysis failed', { noteName, error });
    return {
      name: noteName,
      pc: noteName,
      letter: noteName[0] || '',
      step: -1,
      acc: '',
      alt: 0,
      oct: octave,
      chroma: -1,
      midi: null,
      freq: null,
      color: testNoteColor(noteName),
      colors: getNoteColors(noteName, currentMode.value, octave),
      isValid: false
    };
  }
};

// Interval analysis between two notes
const getIntervalAnalysis = (fromNote: string, toNote: string) => {
  try {
    const interval = Interval.distance(fromNote, toNote);
    const intervalData = Interval.get(interval);
    
    logger.dev('SystemsCheck: Interval analysis', { fromNote, toNote, interval, intervalData });
    
    return {
      name: intervalData.name || interval,
      type: intervalData.type || 'unknown',
      dir: intervalData.dir || 1,
      num: intervalData.num || 0,
      q: intervalData.q || '',
      alt: intervalData.alt || 0,
      oct: intervalData.oct || 0,
      semitones: intervalData.semitones || 0,
      simple: intervalData.simple || '',
      distance: interval,
      
      // Color gradient between notes
      fromColor: testNoteColor(fromNote),
      toColor: testNoteColor(toNote),
      gradient: `linear-gradient(90deg, ${testNoteColor(fromNote)}, ${testNoteColor(toNote)})`
    };
  } catch (error) {
    logger.warn('SystemsCheck: Interval analysis failed', { fromNote, toNote, error });
    return null;
  }
};

// Scale analysis
const getScaleAnalysis = (keyCenter: string, scaleType: string = currentMode.value) => {
  try {
    const scale = Scale.get(`${keyCenter} ${scaleType}`);
    
    logger.dev('SystemsCheck: Scale analysis', { keyCenter, scaleType, scale });
    
    return {
      name: scale.name,
      notes: scale.notes,
      intervals: scale.intervals,
      chroma: scale.chroma,
      
      // Get chords that fit this scale
      chords: scale.notes.map((note, index) => {
        const chordNotes = [note, scale.notes[(index + 2) % scale.notes.length], scale.notes[(index + 4) % scale.notes.length]];
        const chordAnalysis = Chord.detect(chordNotes);
        return {
          degree: index + 1,
          note,
          chordNotes,
          chords: chordAnalysis,
          color: testNoteColor(note)
        };
      }),
      
      // Color mapping for degrees
      colorMapping: scale.notes.map(note => ({
        note,
        color: testNoteColor(note),
        colors: getNoteColors(note, currentMode.value, testOctave.value)
      }))
    };
  } catch (error) {
    logger.warn('SystemsCheck: Scale analysis failed', { keyCenter, scaleType, error });
    return null;
  }
};

// Current note analysis
const currentNoteAnalysis = computed(() => {
  return getComprehensiveNoteAnalysis(selectedTestNote.value);
});

// Current scale analysis
const currentScaleAnalysis = computed(() => {
  return getScaleAnalysis(currentKey.value, currentMode.value);
});

// Debug color system
const debugColorSystem = () => {
  logger.dev('SystemsCheck: Color system debug', {
    selectedNote: selectedTestNote.value,
    currentKey: currentKey.value,
    currentMode: currentMode.value,
    testOctave: testOctave.value,
    storeSettings: visualConfigStore.config.dynamicColors,
    computedSettings: colorSystemSettings.value,
    
    // Test color generation
    testColors: colorTestNotes.value.map(note => ({
      note,
      primary: testNoteColor(note),
      colors: getNoteColors(note, currentMode.value, testOctave.value)
    })),
    
    // Test all notes with Do
    doColors: {
      primary: testNoteColor('Do'),
      colors: getNoteColors('Do', currentMode.value, testOctave.value)
    },
    
    // Store state inspection
    isStoreConnected: !!visualConfigStore,
    storeIsEnabled: visualConfigStore.config.dynamicColors.isEnabled
  });
};

// Interactive tracking for validation
const interactionCounts = ref({
  chordBuilds: 0,
  colorChanges: 0,
  knobAdjustments: 0,
  notesPlaed: 0,
  modeSwithces: 0
});

// Run tests on mount
onMounted(() => {
  logger.info('Systems Check: Running functionality tests');
  logger.dev('SystemsCheck: Initializing interactive components');
  
  // Ensure dynamic colors are enabled
  if (!visualConfigStore.config.dynamicColors.isEnabled) {
    visualConfigStore.updateValue('dynamicColors', 'isEnabled', true);
    logger.dev('SystemsCheck: Enabled dynamic colors in store');
  }
  
  testChordAnalysis();
  testKeyDetection();
  testScaleModes();
  testProgressionAnalysis();
  testPatternAnalysis();
  generatedChords.value = generateChordsForKey();
  
  // Debug color system
  debugColorSystem();
  
  // Log initial state for validation
  logger.dev('SystemsCheck: Initial color system state', {
    selectedNote: selectedTestNote.value,
    currentKey: currentKey.value,
    currentMode: currentMode.value,
    testOctave: testOctave.value
  });
});

// Update when mode changes
watch(currentMode, (newMode) => {
  interactionCounts.value.modeSwithces++;
  logger.dev('SystemsCheck: Mode changed', { 
    newMode, 
    switchCount: interactionCounts.value.modeSwithces 
  });
  testScaleModes();
});

// Watch color system settings for live updates
watch(colorSystemSettings, (newSettings) => {
  logger.dev('SystemsCheck: Color system settings updated', newSettings);
}, { deep: true });

// Watch chord builder for live feedback
watch(chordBuilderNotes, (newNotes) => {
  logger.dev('SystemsCheck: Chord builder updated', { 
    noteCount: newNotes.length,
    notes: newNotes,
    hasAnalysis: !!liveChordAnalysis.value
  });
}, { deep: true });

// Helper to format pattern info
const formatPatternInfo = (pattern: EnhancedMelody) => {
  if (!pattern.tonalAnalysis) return 'No analysis';
  return `${pattern.tonalAnalysis.intervalName} - ${pattern.tonalAnalysis.consonance} (tension: ${pattern.tonalAnalysis.tension})`;
};
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 text-white space-y-6 overflow-y-auto">
    <!-- Header with Performance Metrics -->
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-white mb-2">🔧 Interactive Systems Laboratory</h1>
      <p class="text-gray-400">Real-time testing & exploration of refactored functionality</p>
      
      <!-- Live Performance Dashboard -->
      <div class="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <div class="bg-gray-800 rounded p-2">
          <div class="text-gray-400">Chord Builds</div>
          <div class="text-green-400 font-bold">{{ interactionCounts.chordBuilds }}</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <div class="text-gray-400">Color Changes</div>
          <div class="text-purple-400 font-bold">{{ interactionCounts.colorChanges }}</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <div class="text-gray-400">Knob Adjustments</div>
          <div class="text-blue-400 font-bold">{{ interactionCounts.knobAdjustments }}</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <div class="text-gray-400">Color Gen Time</div>
          <div class="text-yellow-400 font-bold">{{ performanceMetrics.colorGenerationTime.toFixed(2) }}ms</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <div class="text-gray-400">Chord Analysis</div>
          <div class="text-orange-400 font-bold">{{ performanceMetrics.chordAnalysisTime.toFixed(2) }}ms</div>
        </div>
      </div>
    </div>

    <!-- Phase 1: Interactive Music Theory Playground -->
    <div class="bg-gray-800 rounded-lg p-6">
      <h2 class="text-xl font-bold text-green-400 mb-4">🎵 Phase 1: Interactive Music Theory Playground</h2>
      
      <!-- Global Music Settings with Knobs -->
      <div class="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 class="font-medium mb-3 text-white">🎛️ Global Music Settings</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Key</label>
                         <Knob
               :model-value="['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(currentKey)"
               :max="11"
               :options="['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']"
               type="options"
               @update:model-value="(value: string | number | boolean) => { const idx = typeof value === 'number' ? value : 0; currentKey = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][idx]; handleKnobChange('music', 'key', currentKey); }"
               :theme-color="'hsla(120, 50%, 50%, 1)'"
             />
            <div class="text-xs text-white mt-1">{{ currentKey }}</div>
          </div>
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Mode</label>
                         <Knob
               :model-value="currentMode === 'major' ? 0 : 1"
               :max="1"
               type="boolean"
               @update:model-value="(value: string | number | boolean) => { const boolVal = typeof value === 'boolean' ? value : (typeof value === 'number' ? value === 0 : false); currentMode = boolVal ? 'major' : 'minor'; handleKnobChange('music', 'mode', currentMode); }"
               :theme-color="'hsla(220, 50%, 50%, 1)'"
             />
            <div class="text-xs text-white mt-1">{{ currentMode }}</div>
          </div>
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Octave</label>
                         <Knob
               :model-value="testOctave - 1"
               :min="0"
               :max="7"
               type="range"
               @update:model-value="(value: string | number | boolean) => { const numVal = typeof value === 'number' ? value : 0; testOctave.value = numVal + 1; handleKnobChange('music', 'octave', numVal + 1); }"
               :theme-color="'hsla(280, 50%, 50%, 1)'"
             />
                          <div class="text-xs text-white mt-1">{{ testOctave }}</div>
          </div>
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Chromatic</label>
                         <Knob
               :model-value="colorSystemSettings.chromaticMapping"
               type="boolean"
               @update:model-value="(value: string | number | boolean) => { const boolVal = typeof value === 'boolean' ? value : Boolean(value); handleColorSettingChange('chromaticMapping', boolVal); handleKnobChange('music', 'chromatic', boolVal); }"
               :theme-color="'hsla(340, 50%, 50%, 1)'"
             />
            <div class="text-xs text-white mt-1">{{ colorSystemSettings.chromaticMapping ? 'ON' : 'OFF' }}</div>
          </div>
        </div>
      </div>

      <!-- Interactive Chord Builder -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-white mb-3">🎹 Live Chord Builder & Analyzer</h3>
        
        <!-- Note Selection Grid -->
        <div class="grid grid-cols-6 gap-2 mb-4">
          <button
            v-for="note in availableNotes"
            :key="note"
            @click="toggleNoteInChord(note)"
            :class="[
              'px-3 py-2 rounded text-sm font-bold transition-all duration-200',
              chordBuilderNotes.includes(note)
                ? 'bg-green-600 text-white shadow-lg scale-105'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            ]"
          >
            {{ note }}
          </button>
        </div>
        
        <!-- Chord Controls -->
        <div class="flex gap-2 mb-4">
          <button
            @click="playChordBuilderNotes"
            :disabled="chordBuilderNotes.length === 0 || isPlaying"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {{ isPlaying ? '🎵 Playing...' : `🎵 Play Chord (${chordBuilderNotes.length})` }}
          </button>
          <button
            @click="clearChord"
            :disabled="chordBuilderNotes.length === 0"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
        
        <!-- Live Analysis Results -->
        <div v-if="liveChordAnalysis" class="bg-gray-700 rounded p-4">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div class="text-gray-400">Chord Type</div>
                             <div class="text-green-400 font-bold">{{ (liveChordAnalysis as any)?.type || liveChordAnalysis?.symbol || 'Unknown' }}</div>
            </div>
            <div>
              <div class="text-gray-400">Root Note</div>
                             <div class="text-green-400 font-bold">{{ (liveChordAnalysis as any)?.root || 'N/A' }}</div>
            </div>
            <div>
              <div class="text-gray-400">Quality</div>
              <div class="text-green-400 font-bold">{{ liveChordAnalysis.quality || 'N/A' }}</div>
            </div>
            <div>
              <div class="text-gray-400">Analysis Time</div>
              <div class="text-yellow-400 font-bold">{{ performanceMetrics.chordAnalysisTime.toFixed(2) }}ms</div>
            </div>
          </div>
          
          <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="text-gray-400 text-sm">Selected Notes:</div>
              <div class="text-white font-mono">{{ chordBuilderNotes.join(', ') }}</div>
            </div>
                         <div v-if="(liveChordAnalysis as any)?.notes">
               <div class="text-gray-400 text-sm">Analyzed Notes:</div>
               <div class="text-white font-mono">{{ (liveChordAnalysis as any).notes.join(', ') }}</div>
             </div>
          </div>
        </div>
        
        <div v-else-if="chordBuilderNotes.length > 0" class="bg-gray-700 rounded p-4 text-center text-gray-400">
          {{ chordBuilderNotes.length === 1 ? 'Add more notes to analyze chord...' : 'Building chord analysis...' }}
        </div>
      </div>

      <!-- Quick Tests Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Key Detection Test -->
        <div class="p-4 bg-gray-700 rounded">
          <h4 class="font-medium mb-2 text-green-400">✅ Key Detection</h4>
          <div v-if="keyDetection" class="text-sm">
            <p>Detected: <span class="text-white font-bold">{{ keyDetection.key }} {{ keyDetection.mode }}</span></p>
            <p>Confidence: <span class="text-blue-400">{{ (keyDetection.confidence * 100).toFixed(0) }}%</span></p>
          </div>
        </div>

        <!-- Generated Chords -->
        <div class="p-4 bg-gray-700 rounded">
          <h4 class="font-medium mb-2 text-green-400">✅ Scale Chords ({{ currentKey }} {{ currentMode }})</h4>
          <div class="text-xs space-y-1">
            <div v-for="chord in generatedChords.slice(0, 4)" :key="chord.degree" class="flex items-center">
              <span class="text-blue-400 w-8 font-medium">{{ chord.roman }}:</span>
              <span class="text-gray-300 text-[10px]">{{ chord.notes.join('-') }}</span>
            </div>
          </div>
        </div>

        <!-- Pattern Analysis Quick View -->
        <div class="p-4 bg-gray-700 rounded">
          <h4 class="font-medium mb-2 text-green-400">✅ Pattern Analysis</h4>
          <div class="text-xs">
            <p class="text-green-400">Consonant: {{ consonantPatterns.length }}</p>
            <p class="text-red-400">Dissonant: {{ dissonantPatterns.length }}</p>
            <p class="text-blue-400">Low Tension: {{ lowTensionPatterns.length }}</p>
            <p class="text-orange-400">High Tension: {{ highTensionPatterns.length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 2: Dynamic Color Laboratory -->
    <div class="bg-gray-800 rounded-lg p-6">
      <h2 class="text-xl font-bold text-purple-400 mb-4">🌈 Phase 2: Dynamic Color Laboratory</h2>
      
      <!-- Color System Control Panel -->
      <div class="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 class="font-medium mb-3 text-white">🎨 Color System Settings</h3>
        <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Saturation</label>
                         <Knob
               :model-value="colorSystemSettings.saturation * 100"
               :max="100"
               type="range"
               @update:model-value="(value: string | number | boolean) => { const numVal = typeof value === 'number' ? value : 0; handleColorSettingChange('saturation', numVal / 100); }"
               :theme-color="'hsla(300, 70%, 50%, 1)'"
             />
            <div class="text-xs text-white mt-1">{{ (colorSystemSettings.saturation * 100).toFixed(0) }}%</div>
          </div>
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Base Light</label>
                         <Knob
               :model-value="colorSystemSettings.baseLightness * 100"
               :max="100"
               type="range"
               @update:model-value="(value: string | number | boolean) => { const numVal = typeof value === 'number' ? value : 0; handleColorSettingChange('baseLightness', numVal / 100); }"
               :theme-color="'hsla(60, 70%, 50%, 1)'"
             />
            <div class="text-xs text-white mt-1">{{ (colorSystemSettings.baseLightness * 100).toFixed(0) }}%</div>
          </div>
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Light Range</label>
                         <Knob
               :model-value="colorSystemSettings.lightnessRange * 100"
               :max="100"
               type="range"
               @update:model-value="(value: string | number | boolean) => { const numVal = typeof value === 'number' ? value : 0; handleColorSettingChange('lightnessRange', numVal / 100); }"
               :theme-color="'hsla(180, 70%, 50%, 1)'"
             />
            <div class="text-xs text-white mt-1">{{ (colorSystemSettings.lightnessRange * 100).toFixed(0) }}%</div>
          </div>
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Hue Anim</label>
                         <Knob
               :model-value="colorSystemSettings.hueAnimation"
               :max="50"
               type="range"
               @update:model-value="(value: string | number | boolean) => { const numVal = typeof value === 'number' ? value : 0; handleColorSettingChange('hueAnimation', numVal); }"
               :theme-color="'hsla(240, 70%, 50%, 1)'"
             />
            <div class="text-xs text-white mt-1">{{ colorSystemSettings.hueAnimation }}°</div>
          </div>
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Anim Speed</label>
                         <Knob
               :model-value="colorSystemSettings.animationSpeed * 10"
               :max="30"
               type="range"
               @update:model-value="(value: string | number | boolean) => { const numVal = typeof value === 'number' ? value : 0; handleColorSettingChange('animationSpeed', numVal / 10); }"
               :theme-color="'hsla(0, 70%, 50%, 1)'"
             />
            <div class="text-xs text-white mt-1">{{ colorSystemSettings.animationSpeed.toFixed(1) }}x</div>
          </div>
          <div class="text-center">
            <label class="text-xs text-gray-400 block mb-2">Gen Time</label>
            <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-xs text-yellow-400 font-bold mx-auto">
              {{ performanceMetrics.colorGenerationTime.toFixed(0) }}
            </div>
            <div class="text-xs text-white mt-1">ms</div>
          </div>
        </div>
      </div>

      <!-- Interactive Note Color Selector -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-white mb-3">🎵 Interactive Solfege Color Selector</h3>
        <div class="grid grid-cols-7 gap-2 mb-4">
          <button
            v-for="note in colorTestNotes"
            :key="note"
            @click="selectedTestNote = note; handleColorSettingChange('selectedNote', note);"
            :class="[
              'px-3 py-2 rounded text-sm font-bold transition-all duration-200 border-2',
              selectedTestNote === note
                ? 'border-white shadow-lg scale-105'
                : 'border-transparent hover:border-gray-400'
            ]"
            :style="{ 
              backgroundColor: testNoteColor(note),
              color: 'white'
            }"
          >
            {{ note }}
          </button>
        </div>
      </div>

             <!-- Dynamic Color Preview Integration -->
       <div class="mb-6">
         <h3 class="text-lg font-semibold text-white mb-3">🎨 Full Color Palette Preview</h3>
         <DynamicColorPreview />
       </div>

       <!-- Comprehensive Note Analysis -->
       <div class="mb-6">
         <h3 class="text-lg font-semibold text-white mb-3">🎵 Comprehensive Note Analysis</h3>
         <div class="p-4 bg-gray-700 rounded-lg">
           <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <!-- Selected Note Analysis -->
             <div>
               <h4 class="font-medium mb-3 text-purple-400">Selected Note: {{ selectedTestNote }}</h4>
               <div v-if="currentNoteAnalysis" class="space-y-2 text-sm">
                 <div class="grid grid-cols-2 gap-3">
                   <div><span class="text-gray-400">Name:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.name }}</span></div>
                   <div><span class="text-gray-400">PC:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.pc }}</span></div>
                   <div><span class="text-gray-400">Letter:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.letter }}</span></div>
                   <div><span class="text-gray-400">Step:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.step }}</span></div>
                   <div><span class="text-gray-400">Acc:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.acc || 'none' }}</span></div>
                   <div><span class="text-gray-400">Alt:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.alt }}</span></div>
                   <div><span class="text-gray-400">Oct:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.oct }}</span></div>
                   <div><span class="text-gray-400">Chroma:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.chroma }}</span></div>
                   <div><span class="text-gray-400">MIDI:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.midi || 'null' }}</span></div>
                   <div><span class="text-gray-400">Freq:</span> <span class="text-white font-mono">{{ currentNoteAnalysis.freq ? currentNoteAnalysis.freq.toFixed(2) + 'Hz' : 'null' }}</span></div>
                 </div>
                 <div class="mt-3">
                   <div class="text-gray-400 text-sm mb-1">Color Integration:</div>
                   <div class="flex items-center gap-2">
                     <div class="w-6 h-6 rounded" :style="{ backgroundColor: currentNoteAnalysis.color }"></div>
                     <span class="text-white font-mono text-xs">{{ currentNoteAnalysis.color }}</span>
                   </div>
                 </div>
                 <div class="mt-2">
                   <div class="text-gray-400 text-sm mb-1">Valid Note:</div>
                   <span :class="currentNoteAnalysis.isValid ? 'text-green-400' : 'text-red-400'">
                     {{ currentNoteAnalysis.isValid ? '✅ Valid' : '❌ Invalid' }}
                   </span>
                 </div>
               </div>
             </div>

             <!-- Scale Analysis -->
             <div v-if="currentScaleAnalysis">
               <h4 class="font-medium mb-3 text-purple-400">Current Scale: {{ currentScaleAnalysis.name }}</h4>
               <div class="space-y-3 text-sm">
                 <div>
                   <div class="text-gray-400 text-sm mb-1">Scale Notes:</div>
                   <div class="flex flex-wrap gap-1">
                     <div 
                       v-for="(note, index) in currentScaleAnalysis.notes" 
                       :key="note"
                       class="px-2 py-1 rounded text-xs text-white font-bold"
                       :style="{ backgroundColor: testNoteColor(note) }"
                     >
                       {{ index + 1 }}. {{ note }}
                     </div>
                   </div>
                 </div>
                 <div>
                   <div class="text-gray-400 text-sm mb-1">Scale Intervals:</div>
                   <div class="text-white font-mono text-xs">{{ currentScaleAnalysis.intervals.join(', ') }}</div>
                 </div>
                 <div>
                   <div class="text-gray-400 text-sm mb-1">Chroma:</div>
                   <div class="text-white font-mono text-xs">{{ currentScaleAnalysis.chroma }}</div>
                 </div>
                 <div>
                   <div class="text-gray-400 text-sm mb-1">Degree Colors:</div>
                   <div class="grid grid-cols-4 gap-1">
                     <div 
                       v-for="(mapping, index) in currentScaleAnalysis.colorMapping.slice(0, 4)" 
                       :key="mapping.note"
                       class="flex items-center gap-1"
                     >
                       <div class="w-3 h-3 rounded" :style="{ backgroundColor: mapping.color }"></div>
                       <span class="text-xs text-white">{{ index + 1 }}</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>

      <!-- Real-time Color Analysis -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Live Color Generation -->
        <div class="p-4 bg-gray-700 rounded-lg">
          <h4 class="font-medium mb-3 text-purple-400">🔍 Live Color Analysis</h4>
          <div class="space-y-3">
            <div class="p-3 rounded-lg" :style="{ backgroundColor: testNoteColor(selectedTestNote) }">
              <div class="text-white font-bold text-center">{{ selectedTestNote }} - Primary</div>
            </div>
                         <div class="grid grid-cols-3 gap-2">
               <div 
                 v-for="(colorType, index) in ['accent', 'secondary', 'tertiary']" 
                 :key="colorType"
                 class="p-2 rounded text-xs text-white text-center font-bold"
                 :style="{ 
                   backgroundColor: colorType === 'accent' 
                     ? getNoteColors(selectedTestNote, currentMode, colorSystemSettings.octave).accent
                     : colorType === 'secondary'
                     ? getNoteColors(selectedTestNote, currentMode, colorSystemSettings.octave).secondary
                     : getNoteColors(selectedTestNote, currentMode, colorSystemSettings.octave).tertiary
                 }"
               >
                 {{ colorType }}
               </div>
             </div>
            <div class="text-xs space-y-1">
              <div class="text-gray-400">Primary: <span class="text-white font-mono">{{ testNoteColor(selectedTestNote) }}</span></div>
              <div class="text-gray-400">Generation Time: <span class="text-yellow-400">{{ performanceMetrics.colorGenerationTime.toFixed(2) }}ms</span></div>
              <div class="text-gray-400">Mode: <span class="text-blue-400">{{ currentMode }}</span></div>
              <div class="text-gray-400">Octave: <span class="text-green-400">{{ colorSystemSettings.octave }}</span></div>
            </div>
          </div>
        </div>

        <!-- Glassmorphism Testing Lab -->
        <div class="p-4 bg-gray-700 rounded-lg">
          <h4 class="font-medium mb-3 text-purple-400">✨ Glassmorphism Lab</h4>
          <div class="space-y-3">
            <!-- Glass effect previews at different intensities -->
            <div 
              v-for="intensity in [0.2, 0.4, 0.6, 0.8]"
              :key="intensity"
              class="p-3 rounded-lg border border-white/20 backdrop-blur-md relative"
              :style="{ 
                background: createGlassmorphBackground(testNoteColor(selectedTestNote), intensity)
              }"
            >
              <div class="text-white font-bold text-sm">
                {{ selectedTestNote }} Glass @ {{ (intensity * 100).toFixed(0) }}%
              </div>
              <div class="text-white/80 text-xs">
                backdrop-blur-md + alpha:{{ intensity }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edge Case Testing -->
      <div class="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 class="font-medium mb-3 text-purple-400">🧪 Edge Case Testing</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <div class="text-gray-400 mb-1">Extreme Saturation (0%)</div>
            <div class="p-2 rounded" :style="{ 
              backgroundColor: getPrimaryColor(selectedTestNote, currentMode, colorSystemSettings.octave).replace(/,\s*[\d.]+\)/, ', 0)')
            }">
              <span class="text-white">{{ selectedTestNote }}</span>
            </div>
          </div>
          <div>
            <div class="text-gray-400 mb-1">Extreme Saturation (100%)</div>
            <div class="p-2 rounded" :style="{ 
              backgroundColor: getPrimaryColor(selectedTestNote, currentMode, colorSystemSettings.octave).replace(/,\s*[\d.]+,/, ', 100%,')
            }">
              <span class="text-white">{{ selectedTestNote }}</span>
            </div>
          </div>
          <div>
            <div class="text-gray-400 mb-1">Very Dark (10%)</div>
            <div class="p-2 rounded" :style="{ 
              backgroundColor: getPrimaryColor(selectedTestNote, currentMode, colorSystemSettings.octave).replace(/,\s*[\d.]+\)$/, ', 10%)')
            }">
              <span class="text-white">{{ selectedTestNote }}</span>
            </div>
          </div>
          <div>
            <div class="text-gray-400 mb-1">Very Light (90%)</div>
            <div class="p-2 rounded" :style="{ 
              backgroundColor: getPrimaryColor(selectedTestNote, currentMode, colorSystemSettings.octave).replace(/,\s*[\d.]+\)$/, ', 90%)')
            }">
              <span class="text-black">{{ selectedTestNote }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Migration Status -->
      <div class="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 class="font-medium mb-3 text-green-400">✅ Migration Completion Status</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>useCircularSequencer</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>useSolfegeInteraction</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>useParticleSystem</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>MelodyLibrary</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>useRenderer</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>FloatingPopup</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>useStringRenderer</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>DynamicColorPreview</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>useAmbientRenderer</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>useBlobRenderer</span>
          </div>
          <div class="flex items-center p-2 bg-gray-600 rounded">
            <span class="text-green-400 mr-2">✅</span>
            <span>ConfigPanel</span>
          </div>
        </div>
                 <div class="mt-3 text-sm text-green-400 font-bold">
           🎉 All 11 components successfully migrated to new modular color system!
         </div>
         
         <!-- Debug Color System Button -->
         <div class="mt-4">
           <button 
             @click="debugColorSystem"
             class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
           >
             🐛 Debug Color System
           </button>
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