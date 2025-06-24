<template>
  <div class="music-demo">
    <div class="demo-header">
      <h2>Enhanced Music System Demo</h2>
      <p>Test the new piano-like envelope, multiple instruments, and polyphonic capabilities</p>
    </div>

    <div class="demo-controls">
      <!-- Instrument Selector -->
      <InstrumentSelector />

      <!-- Key and Mode Controls -->
      <div class="music-controls">
        <div class="control-group">
          <label>Key:</label>
          <select v-model="selectedKey" @change="setKey">
            <option v-for="key in keys" :key="key" :value="key">{{ key }}</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>Mode:</label>
          <select v-model="selectedMode" @change="setMode">
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </div>
      </div>

      <!-- Octave Controls -->
      <div class="octave-controls">
        <label>Base Octave:</label>
        <div class="octave-buttons">
          <button 
            v-for="octave in [3, 4, 5, 6]" 
            :key="octave"
            @click="baseOctave = octave"
            :class="{ active: baseOctave === octave }"
            class="octave-btn"
          >
            {{ octave }}
          </button>
        </div>
      </div>
    </div>

    <!-- Piano-like Interface -->
    <div class="piano-interface">
      <h3>Solfege Piano ({{ musicStore.currentKeyDisplay }})</h3>
      <div class="piano-keys">
        <div
          v-for="(solfege, index) in musicStore.solfegeData"
          :key="solfege.name"
          class="piano-key"
          :class="{ 
            active: isNoteActive(index),
            playing: musicStore.isPlaying && musicStore.currentNote === solfege.name
          }"
          @mousedown="startNote(index)"
          @mouseup="stopNote(index)"
          @mouseleave="stopNote(index)"
          @touchstart.prevent="startNote(index)"
          @touchend.prevent="stopNote(index)"
        >
          <div class="key-label">{{ solfege.name }}</div>
          <div class="key-emotion">{{ solfege.emotion }}</div>
        </div>
      </div>
    </div>

    <!-- Chord Buttons -->
    <div class="chord-section">
      <h3>Test Chords</h3>
      <div class="chord-buttons">
        <button @click="playChord([0, 2, 4])" class="chord-btn">I (Do-Mi-Sol)</button>
        <button @click="playChord([3, 5, 0])" class="chord-btn">IV (Fa-La-Do)</button>
        <button @click="playChord([4, 6, 1])" class="chord-btn">V (Sol-Ti-Re)</button>
        <button @click="releaseAllNotes" class="chord-btn release">Release All</button>
      </div>
    </div>

    <!-- Active Notes Display -->
    <div class="active-notes" v-if="activeNotes.length > 0">
      <h4>Active Notes:</h4>
      <div class="note-list">
        <span 
          v-for="note in activeNotes" 
          :key="note.noteId"
          class="active-note"
        >
          {{ note.noteName }} ({{ note.solfege.name }})
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMusicStore } from '@/stores/music'
import { useInstrumentStore } from '@/stores/instrument'
import InstrumentSelector from './InstrumentSelector.vue'

const musicStore = useMusicStore()
const instrumentStore = useInstrumentStore()

// Local state
const selectedKey = ref('C')
const selectedMode = ref<'major' | 'minor'>('major')
const baseOctave = ref(4)
const activeNoteIds = ref<Set<string>>(new Set())

// Available keys
const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Computed
const activeNotes = computed(() => musicStore.getActiveNotes())

// Methods
const setKey = () => {
  musicStore.setKey(selectedKey.value)
}

const setMode = () => {
  musicStore.setMode(selectedMode.value)
}

const isNoteActive = (solfegeIndex: number): boolean => {
  return activeNotes.value.some(note => note.solfegeIndex === solfegeIndex)
}

const startNote = async (solfegeIndex: number) => {
  const noteId = await musicStore.attackNoteWithOctave(solfegeIndex, baseOctave.value)
  if (noteId) {
    activeNoteIds.value.add(noteId)
  }
}

const stopNote = (solfegeIndex: number) => {
  // Find and release notes for this solfege index
  const notesToRelease = activeNotes.value.filter(note => note.solfegeIndex === solfegeIndex)
  notesToRelease.forEach(note => {
    musicStore.releaseNote(note.noteId)
    activeNoteIds.value.delete(note.noteId)
  })
}

const playChord = async (solfegeIndices: number[]) => {
  // Release any existing notes first
  releaseAllNotes()
  
  // Play chord notes
  for (const index of solfegeIndices) {
    const noteId = await musicStore.attackNoteWithOctave(index, baseOctave.value)
    if (noteId) {
      activeNoteIds.value.add(noteId)
    }
  }
}

const releaseAllNotes = () => {
  musicStore.releaseAllNotes()
  activeNoteIds.value.clear()
}

// Initialize
onMounted(async () => {
  await instrumentStore.initializeInstruments()
  musicStore.setKey(selectedKey.value)
  musicStore.setMode(selectedMode.value)
})

// Cleanup
onUnmounted(() => {
  releaseAllNotes()
})
</script>

<style scoped>
.music-demo {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-header {
  text-align: center;
  margin-bottom: 2rem;
}

.demo-header h2 {
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
}

.demo-header p {
  color: rgba(255, 255, 255, 0.7);
}

.demo-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.music-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.control-group select {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.octave-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.octave-controls label {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.octave-buttons {
  display: flex;
  gap: 0.5rem;
}

.octave-btn {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.octave-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.octave-btn.active {
  background: rgba(74, 144, 226, 0.5);
  border-color: rgba(74, 144, 226, 0.8);
}

.piano-interface {
  margin-bottom: 2rem;
}

.piano-interface h3 {
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
}

.piano-keys {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.piano-key {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1.5rem 1rem;
  cursor: pointer;
  transition: all 0.1s ease;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.piano-key:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.piano-key.active {
  background: rgba(74, 144, 226, 0.4);
  border-color: rgba(74, 144, 226, 0.8);
  transform: translateY(-4px);
}

.piano-key.playing {
  background: rgba(255, 100, 100, 0.4);
  border-color: rgba(255, 100, 100, 0.8);
}

.key-label {
  font-weight: bold;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
}

.key-emotion {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.chord-section {
  margin-bottom: 2rem;
}

.chord-section h3 {
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
}

.chord-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.chord-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chord-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.chord-btn.release {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.4);
}

.chord-btn.release:hover {
  background: rgba(255, 100, 100, 0.3);
}

.active-notes {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
}

.active-notes h4 {
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
}

.note-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.active-note {
  background: rgba(74, 144, 226, 0.3);
  border: 1px solid rgba(74, 144, 226, 0.5);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .demo-controls {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .piano-keys {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
  
  .chord-buttons {
    justify-content: center;
  }
}
</style>
