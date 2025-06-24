<template>
  <div v-if="!audioReady" class="audio-initializer">
    <div class="audio-prompt">
      <div class="audio-icon">🔊</div>
      <h3>Enable Audio</h3>
      <p>Click to enable audio for the best experience</p>
      <button @click="initializeAudio" class="enable-audio-btn" :disabled="initializing">
        {{ initializing ? 'Initializing...' : 'Enable Audio' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { audioService } from '@/services/audio'

const audioReady = ref(false)
const initializing = ref(false)

const initializeAudio = async () => {
  initializing.value = true
  try {
    const success = await audioService.startAudioContext()
    if (success) {
      audioReady.value = true
      console.log('Audio context successfully initialized')
    } else {
      console.warn('Failed to initialize audio context')
    }
  } catch (error) {
    console.error('Error initializing audio:', error)
  } finally {
    initializing.value = false
  }
}

// Check if audio is already ready
onMounted(async () => {
  // Give a small delay to let other components initialize
  setTimeout(async () => {
    try {
      const success = await audioService.startAudioContext()
      if (success) {
        audioReady.value = true
      }
    } catch (error) {
      // Audio not ready, user will need to click
      console.log('Audio requires user interaction')
    }
  }, 500)
})
</script>

<style scoped>
.audio-initializer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(10px);
}

.audio-prompt {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 400px;
  margin: 1rem;
}

.audio-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.audio-prompt h3 {
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.audio-prompt p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 2rem 0;
  line-height: 1.5;
}

.enable-audio-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;
}

.enable-audio-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.enable-audio-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.enable-audio-btn:active:not(:disabled) {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .audio-prompt {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .audio-icon {
    font-size: 2.5rem;
  }
  
  .audio-prompt h3 {
    font-size: 1.3rem;
  }
  
  .enable-audio-btn {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }
}
</style>
