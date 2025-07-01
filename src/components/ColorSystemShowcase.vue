<template>
  <div class="color-showcase">
    <!-- Header -->
    <div class="showcase-header">
      <h2>🎨 Color System</h2>
      <div class="showcase-controls">
        <label>
          Mode:
          <select v-model="currentMode" class="mode-selector">
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </label>
        <label>
          Octave:
          <input 
            v-model.number="currentOctave" 
            type="range" 
            min="1" 
            max="7" 
            class="octave-slider"
          />
          <span>{{ currentOctave }}</span>
        </label>
      </div>
    </div>

    <div class="showcase-content">
      <!-- Note Colors Section -->
      <section class="showcase-section">
      <div class="section-row">
        <h3 class="section-heading">🎵 Note Colors</h3>
        <div class="note-colors-rows">
          <div 
            v-for="note in SOLFEGE_NOTES" 
            :key="note"
            class="note-row"
          >
            <div class="note-label">{{ note }}</div>
            <div class="color-swatches">
              <div 
                class="color-swatch primary"
                :style="{ backgroundColor: getPrimaryColor(note, currentMode, currentOctave) }"
                :title="`Primary: ${getPrimaryColor(note, currentMode, currentOctave)}`"
              ></div>
              <div 
                class="color-swatch accent"
                :style="{ backgroundColor: getAccentColor(note, currentMode, currentOctave) }"
                :title="`Accent: ${getAccentColor(note, currentMode, currentOctave)}`"
              ></div>
              <div 
                class="color-swatch secondary"
                :style="{ backgroundColor: getSecondaryColor(note, currentMode, currentOctave) }"
                :title="`Secondary: ${getSecondaryColor(note, currentMode, currentOctave)}`"
              ></div>
              <div 
                class="color-swatch tertiary"
                :style="{ backgroundColor: getTertiaryColor(note, currentMode, currentOctave) }"
                :title="`Tertiary: ${getTertiaryColor(note, currentMode, currentOctave)}`"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Linear Gradients Section -->
    <section class="showcase-section">
      <div class="section-row">
        <h3 class="section-heading">📐 Linear Gradients</h3>
        <div class="gradient-rows">
          <div 
            v-for="note in SOLFEGE_NOTES" 
            :key="note"
            class="gradient-row"
          >
            <div class="gradient-label">{{ note }}</div>
            <div class="gradient-samples">
              <div 
                class="gradient-sample"
                :style="{ background: getGradient(note, currentMode, currentOctave, 0) }"
                :title="`0° (horizontal)`"
              ></div>
              <div 
                class="gradient-sample"
                :style="{ background: getGradient(note, currentMode, currentOctave, 45) }"
                :title="`45° (diagonal)`"
              ></div>
              <div 
                class="gradient-sample"
                :style="{ background: getGradient(note, currentMode, currentOctave, 90) }"
                :title="`90° (vertical)`"
              ></div>
              <div 
                class="gradient-sample"
                :style="{ background: getGradient(note, currentMode, currentOctave, 135) }"
                :title="`135° (diagonal)`"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Radial Gradients Section -->
    <section class="showcase-section">
      <div class="section-row">
        <h3 class="section-heading">🔘 Radial Gradients</h3>
        <div class="gradient-rows">
          <div 
            v-for="note in SOLFEGE_NOTES" 
            :key="note"
            class="gradient-row"
          >
            <div class="gradient-label">{{ note }}</div>
            <div class="gradient-samples">
              <div 
                class="gradient-sample radial"
                :style="{ background: getRadialGradient(note, currentMode, currentOctave, 'circle') }"
                :title="`Circle`"
              ></div>
              <div 
                class="gradient-sample radial"
                :style="{ background: getRadialGradient(note, currentMode, currentOctave, 'ellipse') }"
                :title="`Ellipse`"
              ></div>
              <div 
                class="gradient-sample radial"
                :style="{ background: getRadialGradient(note, currentMode, currentOctave, 'circle at top') }"
                :title="`Circle at top`"
              ></div>
              <div 
                class="gradient-sample radial"
                :style="{ background: getRadialGradient(note, currentMode, currentOctave, 'circle at bottom') }"
                :title="`Circle at bottom`"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Conic Gradients Section -->
    <section class="showcase-section">
      <div class="section-row">
        <h3 class="section-heading">🌀 Conic Gradients</h3>
        <div class="gradient-rows">
          <div 
            v-for="note in SOLFEGE_NOTES" 
            :key="note"
            class="gradient-row"
          >
            <div class="gradient-label">{{ note }}</div>
            <div class="gradient-samples">
              <div 
                class="gradient-sample conic"
                :style="{ background: getConicGradient(note, currentMode, currentOctave, 0) }"
                :title="`0° start`"
              ></div>
              <div 
                class="gradient-sample conic"
                :style="{ background: getConicGradient(note, currentMode, currentOctave, 90) }"
                :title="`90° start`"
              ></div>
              <div 
                class="gradient-sample conic"
                :style="{ background: getConicGradient(note, currentMode, currentOctave, 180) }"
                :title="`180° start`"
              ></div>
              <div 
                class="gradient-sample conic"
                :style="{ background: getConicGradient(note, currentMode, currentOctave, 270) }"
                :title="`270° start`"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Interval Glassmorphism Section -->
    <section class="showcase-section">
      <div class="section-row">
        <h3 class="section-heading">🔗 Interval Glass</h3>
        <div class="glassmorphism-rows">
          <div 
            v-for="interval in intervalExamples" 
            :key="interval.name"
            class="glassmorphism-row"
          >
            <div class="glassmorphism-label">{{ interval.name }}</div>
            <div class="glassmorphism-samples">
              <div 
                class="glassmorphism-sample"
                :style="{ 
                  background: createIntervalLinearGlass(interval.from, interval.to),
                  boxShadow: createGlassmorphShadow(getPrimaryColor(interval.from, currentMode, currentOctave))
                }"
                :title="'Linear'"
              ></div>
              <div 
                class="glassmorphism-sample"
                :style="{ 
                  background: createIntervalRadialGlass(interval.from, interval.to),
                  boxShadow: createGlassmorphShadow(getPrimaryColor(interval.from, currentMode, currentOctave))
                }"
                :title="'Radial'"
              ></div>
              <div 
                class="glassmorphism-sample"
                :style="{ 
                  background: createIntervalConicGlass(interval.from, interval.to),
                  boxShadow: createGlassmorphShadow(getPrimaryColor(interval.from, currentMode, currentOctave))
                }"
                :title="'Conic'"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Chord Glassmorphism Section -->
    <section class="showcase-section">
      <div class="section-row">
        <h3 class="section-heading">🎹 Chord Glass</h3>
        <div class="glassmorphism-rows">
          <div 
            v-for="chord in chordExamples" 
            :key="chord.name"
            class="glassmorphism-row"
          >
            <div class="glassmorphism-label">{{ chord.name }}</div>
            <div class="glassmorphism-samples">
              <div 
                class="glassmorphism-sample"
                :style="{ 
                  background: createChordLinearGlass(chord.notes),
                  boxShadow: createChordGlassmorphShadow(chord.notes.map(note => getPrimaryColor(note, currentMode, currentOctave)))
                }"
                :title="'Linear'"
              ></div>
              <div 
                class="glassmorphism-sample"
                :style="{ 
                  background: createChordRadialGlass(chord.notes),
                  boxShadow: createChordGlassmorphShadow(chord.notes.map(note => getPrimaryColor(note, currentMode, currentOctave)))
                }"
                :title="'Radial'"
              ></div>
              <div 
                class="glassmorphism-sample"
                :style="{ 
                  background: createChordConicGlass(chord.notes),
                  boxShadow: createChordGlassmorphShadow(chord.notes.map(note => getPrimaryColor(note, currentMode, currentOctave)))
                }"
                :title="'Conic'"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useColorSystem } from '@/composables/useColorSystem';
import { SOLFEGE_NOTES } from '@/data';
import type { MusicalMode } from '@/types';

const {
  getPrimaryColor,
  getAccentColor,
  getSecondaryColor,
  getTertiaryColor,
  getGradient,
  getConicGradient,
  withAlpha,
  createGlassmorphBackground,
  createGlassmorphShadow,
  createChordGlassmorphBackground,
  createChordGlassmorphShadow,
} = useColorSystem();

// Reactive state
const currentMode = ref<MusicalMode>('major');
const currentOctave = ref(4);

// Interval examples for demonstration
const intervalExamples = [
  { name: 'Unison', from: 'Do', to: 'Do' },
  { name: 'Major 2nd', from: 'Do', to: 'Re' },
  { name: 'Major 3rd', from: 'Do', to: 'Mi' },
  { name: 'Perfect 4th', from: 'Do', to: 'Fa' },
  { name: 'Perfect 5th', from: 'Do', to: 'Sol' },
  { name: 'Major 6th', from: 'Do', to: 'La' },
  { name: 'Major 7th', from: 'Do', to: 'Ti' },
  { name: 'Octave', from: 'Do', to: 'Do' },
];

// Chord examples for demonstration
const chordExamples = [
  { name: 'C Major', notes: ['Do', 'Mi', 'Sol'] },
  { name: 'D Minor', notes: ['Re', 'Fa', 'La'] },
  { name: 'F Major', notes: ['Fa', 'La', 'Do'] },
  { name: 'G Major', notes: ['Sol', 'Ti', 'Re'] },
  { name: 'A Minor', notes: ['La', 'Do', 'Mi'] },
  { name: 'E Minor', notes: ['Mi', 'Sol', 'Ti'] },
];

// Custom gradient functions
const getRadialGradient = (
  noteName: string,
  mode: MusicalMode = 'major',
  octave: number = 3,
  shape: string = 'circle'
): string => {
  const primary = getPrimaryColor(noteName, mode, octave);
  const accent = getAccentColor(noteName, mode, octave);
  const secondary = getSecondaryColor(noteName, mode, octave);
  const tertiary = getTertiaryColor(noteName, mode, octave);
  
  return `radial-gradient(${shape}, ${primary} 20%, ${accent} 40%, ${secondary} 70%, ${tertiary})`;
};

// Glassmorphism functions for intervals
const createIntervalLinearGlass = (fromNote: string, toNote: string): string => {
  const fromColor = getPrimaryColor(fromNote, currentMode.value, currentOctave.value);
  const toColor = getPrimaryColor(toNote, currentMode.value, currentOctave.value);
  
  const fromColorAlpha = withAlpha(fromColor, 0.4);
  const toColorAlpha = withAlpha(toColor, 0.15);
  
  return `linear-gradient(135deg, ${fromColorAlpha}, ${toColorAlpha})`;
};

const createIntervalRadialGlass = (fromNote: string, toNote: string): string => {
  const fromColor = getPrimaryColor(fromNote, currentMode.value, currentOctave.value);
  const toColor = getPrimaryColor(toNote, currentMode.value, currentOctave.value);
  
  const fromColorAlpha = withAlpha(fromColor, 0.4);
  const toColorAlpha = withAlpha(toColor, 0.15);
  
  return `radial-gradient(circle, ${fromColorAlpha} 30%, ${toColorAlpha})`;
};

const createIntervalConicGlass = (fromNote: string, toNote: string): string => {
  const fromColor = getPrimaryColor(fromNote, currentMode.value, currentOctave.value);
  const toColor = getPrimaryColor(toNote, currentMode.value, currentOctave.value);
  
  const fromColorAlpha = withAlpha(fromColor, 0.4);
  const toColorAlpha = withAlpha(toColor, 0.15);
  
  return `conic-gradient(from 0deg, ${fromColorAlpha}, ${toColorAlpha}, ${fromColorAlpha})`;
};

// Glassmorphism functions for chords
const createChordLinearGlass = (notes: string[]): string => {
  const colors = notes.map(note => 
    withAlpha(getPrimaryColor(note, currentMode.value, currentOctave.value), 0.3)
  );
  return `linear-gradient(135deg, ${colors.join(', ')})`;
};

const createChordRadialGlass = (notes: string[]): string => {
  const colors = notes.map(note => 
    withAlpha(getPrimaryColor(note, currentMode.value, currentOctave.value), 0.3)
  );
  return `radial-gradient(circle, ${colors.join(', ')})`;
};

const createChordConicGlass = (notes: string[]): string => {
  const colors = notes.map(note => 
    withAlpha(getPrimaryColor(note, currentMode.value, currentOctave.value), 0.3)
  );
  // Repeat colors to fill the circle
  const extendedColors = [...colors, ...colors];
  return `conic-gradient(from 0deg, ${extendedColors.join(', ')})`;
};
</script>

<style scoped>
.color-showcase {
  padding: 0;
  font-size: 0.85rem;
  line-height: 1.2;
}

.showcase-content {
  padding: 1rem;
}

.showcase-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px 8px 0 0;
}

.showcase-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.showcase-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.showcase-controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.mode-selector {
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  font-size: 0.75rem;
}

.octave-slider {
  width: 60px;
}

.showcase-section {
  margin-bottom: 1.5rem;
}

.section-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.section-heading {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  min-width: 120px;
  padding-top: 0.25rem;
  text-align: right;
  opacity: 0.9;
}

/* Note Colors Rows */
.note-colors-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.note-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.note-label {
  font-weight: 600;
  min-width: 30px;
  font-size: 0.9rem;
}

.color-swatches {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}

.color-swatch {
  flex: 1;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 0;
}

.color-swatch:hover {
  transform: scale(1.1);
}

/* Gradient Rows */
.gradient-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gradient-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.gradient-label {
  font-weight: 600;
  min-width: 30px;
  font-size: 0.9rem;
}

.gradient-samples {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}

.gradient-sample {
  flex: 1;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 0;
}

.gradient-sample.radial {
  border-radius: 6px;
}

.gradient-sample.conic {
  border-radius: 50%;
}

.gradient-sample:hover {
  transform: scale(1.1);
}

/* Glassmorphism Rows */
.glassmorphism-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.glassmorphism-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.glassmorphism-label {
  font-weight: 600;
  min-width: 80px;
  font-size: 0.85rem;
}

.glassmorphism-samples {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}

.glassmorphism-sample {
  flex: 1;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s ease;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  min-width: 0;
}

.glassmorphism-sample:hover {
  transform: scale(1.05);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .section-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .section-heading {
    text-align: left;
    min-width: auto;
  }
  
  .showcase-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
}
</style>