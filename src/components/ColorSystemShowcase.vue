<template>
  <div class="color-showcase">
    <!-- Header -->
    <div class="showcase-header">
      <h2>🎨 Color System Showcase</h2>
      <p>Exploring all color functions and effects</p>
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

    <!-- Note Colors Section -->
    <section class="showcase-section">
      <h3>🎵 Note Colors</h3>
      <div class="note-colors-grid">
        <div 
          v-for="note in SOLFEGE_NOTES" 
          :key="note"
          class="note-color-card"
        >
          <div class="note-name">{{ note }}</div>
          <div class="color-relationships">
            <div 
              class="color-swatch primary"
              :style="{ backgroundColor: getPrimaryColor(note, currentMode, currentOctave) }"
              :title="`Primary: ${getPrimaryColor(note, currentMode, currentOctave)}`"
            >
              Primary
            </div>
            <div 
              class="color-swatch accent"
              :style="{ backgroundColor: getAccentColor(note, currentMode, currentOctave) }"
              :title="`Accent: ${getAccentColor(note, currentMode, currentOctave)}`"
            >
              Accent
            </div>
            <div 
              class="color-swatch secondary"
              :style="{ backgroundColor: getSecondaryColor(note, currentMode, currentOctave) }"
              :title="`Secondary: ${getSecondaryColor(note, currentMode, currentOctave)}`"
            >
              Secondary
            </div>
            <div 
              class="color-swatch tertiary"
              :style="{ backgroundColor: getTertiaryColor(note, currentMode, currentOctave) }"
              :title="`Tertiary: ${getTertiaryColor(note, currentMode, currentOctave)}`"
            >
              Tertiary
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Gradients Section -->
    <section class="showcase-section">
      <h3>🌈 Color Gradients</h3>
      <div class="gradients-grid">
        <div 
          v-for="note in SOLFEGE_NOTES" 
          :key="note"
          class="gradient-card"
        >
          <div class="gradient-name">{{ note }}</div>
          <div 
            class="gradient-sample"
            :style="{ background: getGradient(note, currentMode, currentOctave, 45) }"
          ></div>
          <div class="gradient-directions">
            <div 
              class="gradient-mini"
              :style="{ background: getGradient(note, currentMode, currentOctave, 0) }"
              title="0° (horizontal)"
            ></div>
            <div 
              class="gradient-mini"
              :style="{ background: getGradient(note, currentMode, currentOctave, 90) }"
              title="90° (vertical)"
            ></div>
            <div 
              class="gradient-mini"
              :style="{ background: getGradient(note, currentMode, currentOctave, 135) }"
              title="135° (diagonal)"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Glassmorphism Section -->
    <section class="showcase-section">
      <h3>✨ Glassmorphism Effects</h3>
      <div class="glassmorphism-grid">
        <div 
          v-for="note in SOLFEGE_NOTES" 
          :key="note"
          class="glassmorphism-card"
          :style="{ 
            background: createGlassmorphBackground(getPrimaryColor(note, currentMode, currentOctave)),
            boxShadow: createGlassmorphShadow(getPrimaryColor(note, currentMode, currentOctave))
          }"
        >
          <div class="glassmorphism-content">
            <div class="note-label">{{ note }}</div>
            <div class="glassmorphism-demo">Glassmorphism</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Alpha Variations Section -->
    <section class="showcase-section">
      <h3>🔍 Alpha Variations</h3>
      <div class="alpha-grid">
        <div 
          v-for="note in ['Do', 'Mi', 'Sol']" 
          :key="note"
          class="alpha-demo"
        >
          <div class="alpha-note">{{ note }}</div>
          <div class="alpha-samples">
            <div 
              v-for="alpha in [1.0, 0.8, 0.6, 0.4, 0.2]"
              :key="alpha"
              class="alpha-swatch"
              :style="{ backgroundColor: withAlpha(getPrimaryColor(note, currentMode, currentOctave), alpha) }"
            >
              {{ (alpha * 100).toFixed(0) }}%
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Chord Colors Section -->
    <section class="showcase-section">
      <h3>🎹 Chord Color Examples</h3>
      <div class="chord-grid">
        <div 
          v-for="chord in chordExamples" 
          :key="chord.name"
          class="chord-card"
        >
          <div class="chord-name">{{ chord.name }}</div>
          <div class="chord-notes">{{ chord.notes.join(' - ') }}</div>
          <div 
            class="chord-background"
            :style="{ 
              background: createChordGlassmorphBackground(
                chord.notes.map(note => getPrimaryColor(note, currentMode, currentOctave))
              ),
              boxShadow: createChordGlassmorphShadow(
                chord.notes.map(note => getPrimaryColor(note, currentMode, currentOctave))
              )
            }"
          >
            <div class="chord-content">Chord Colors</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Conic Gradients Section -->
    <section class="showcase-section">
      <h3>🌀 Conic Gradients</h3>
      <div class="conic-grid">
        <div 
          v-for="note in ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti']" 
          :key="note"
          class="conic-card"
        >
          <div class="conic-name">{{ note }}</div>
          <div 
            class="conic-sample"
            :style="{ background: getConicGradient(note, currentMode, currentOctave) }"
          ></div>
        </div>
      </div>
    </section>

    <!-- Color Analysis Section -->
    <section class="showcase-section">
      <h3>📊 Color Analysis</h3>
      <div class="analysis-grid">
        <div 
          v-for="note in ['Do', 'Mi', 'Sol']" 
          :key="note"
          class="analysis-card"
        >
          <div class="analysis-note">{{ note }}</div>
          <div class="color-info">
            <div class="color-preview" :style="{ backgroundColor: getPrimaryColor(note, currentMode, currentOctave) }"></div>
            <div class="color-details">
              <div class="color-value">{{ getPrimaryColor(note, currentMode, currentOctave) }}</div>
              <div class="color-static">Static: {{ getStaticPrimaryColor(note, currentMode, currentOctave) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Technical Info -->
    <section class="showcase-section">
      <h3>⚙️ Technical Information</h3>
      <div class="tech-info">
        <div class="info-card">
          <h4>Dynamic Colors</h4>
          <p>Enabled: {{ isDynamicColorsEnabled ? 'Yes' : 'No' }}</p>
          <p>Animation: Real-time hue shifts</p>
        </div>
        <div class="info-card">
          <h4>Color Functions</h4>
          <ul>
            <li>Primary/Accent/Secondary/Tertiary Colors</li>
            <li>Static vs Animated Variants</li>
            <li>Gradients (Linear & Conic)</li>
            <li>Glassmorphism Effects</li>
            <li>Alpha Channel Manipulation</li>
            <li>Chord Color Blending</li>
          </ul>
        </div>
        <div class="info-card">
          <h4>Music Theory Integration</h4>
          <ul>
            <li>Solfege-based color mapping</li>
            <li>Octave lightness variations</li>
            <li>Major/Minor mode differences</li>
            <li>Harmonic color relationships</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useColorSystem } from '@/composables/useColorSystem';
import { SOLFEGE_NOTES } from '@/data';
import type { MusicalMode } from '@/types';

const {
  getNoteColors,
  getPrimaryColor,
  getAccentColor,
  getSecondaryColor,
  getTertiaryColor,
  getStaticPrimaryColor,
  getGradient,
  getConicGradient,
  withAlpha,
  createGlassmorphBackground,
  createGlassmorphShadow,
  createChordGlassmorphBackground,
  createChordGlassmorphShadow,
  isDynamicColorsEnabled,
} = useColorSystem();

// Reactive state
const currentMode = ref<MusicalMode>('major');
const currentOctave = ref(4);

// Chord examples for demonstration
const chordExamples = [
  { name: 'C Major', notes: ['Do', 'Mi', 'Sol'] },
  { name: 'D Minor', notes: ['Re', 'Fa', 'La'] },
  { name: 'F Major', notes: ['Fa', 'La', 'Do'] },
  { name: 'G Major', notes: ['Sol', 'Ti', 'Re'] },
];
</script>

<style scoped>
.color-showcase {
  padding: 2rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(255, 255, 255, 0.02));
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 2rem;
}

.showcase-header {
  text-align: center;
  margin-bottom: 3rem;
}

.showcase-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.showcase-header p {
  font-size: 1.2rem;
  opacity: 0.8;
  margin-bottom: 1.5rem;
}

.showcase-controls {
  display: flex;
  gap: 2rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.showcase-controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.mode-selector {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  font-size: 0.9rem;
}

.octave-slider {
  width: 100px;
  margin: 0 0.5rem;
}

.showcase-section {
  margin-bottom: 3rem;
}

.showcase-section h3 {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
}

/* Note Colors Grid */
.note-colors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.note-color-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}

.note-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.color-relationships {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.color-swatch {
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.color-swatch:hover {
  transform: scale(1.05);
}

/* Gradients Grid */
.gradients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.gradient-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}

.gradient-name {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.gradient-sample {
  height: 80px;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.gradient-directions {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.gradient-mini {
  width: 30px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
}

/* Glassmorphism Grid */
.glassmorphism-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.glassmorphism-card {
  height: 120px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.glassmorphism-card:hover {
  transform: translateY(-5px);
}

.glassmorphism-content {
  text-align: center;
}

.note-label {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.glassmorphism-demo {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* Alpha Grid */
.alpha-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.alpha-demo {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}

.alpha-note {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.alpha-samples {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.alpha-swatch {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 500;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

/* Chord Grid */
.chord-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.chord-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}

.chord-name {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.chord-notes {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 1rem;
}

.chord-background {
  height: 80px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chord-content {
  font-weight: 500;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

/* Conic Grid */
.conic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.conic-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}

.conic-name {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.conic-sample {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto;
}

/* Analysis Grid */
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.analysis-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
}

.analysis-note {
  font-size: 1.3rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1rem;
}

.color-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-preview {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  flex-shrink: 0;
}

.color-details {
  flex: 1;
}

.color-value {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.color-static {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* Tech Info */
.tech-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.info-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
}

.info-card h4 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #667eea;
}

.info-card ul {
  list-style: none;
  padding: 0;
}

.info-card li {
  padding: 0.25rem 0;
  opacity: 0.9;
}

.info-card li::before {
  content: '•';
  color: #667eea;
  margin-right: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .color-showcase {
    padding: 1rem;
  }
  
  .showcase-header h2 {
    font-size: 2rem;
  }
  
  .showcase-controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .note-colors-grid,
  .gradients-grid,
  .glassmorphism-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .tech-info {
    grid-template-columns: 1fr;
  }
}
</style>