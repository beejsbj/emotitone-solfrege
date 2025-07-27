<template>
  <Transition name="splash" @enter="onEnter" @leave="onLeave">
    <div
      v-if="isVisible"
      class="loading-splash"
      :class="{ 'splash-complete': loadingState.progress.overall.isComplete }"
    >
      <!-- Background with subtle animation -->
      <div class="splash-background">
        <div class="background-gradient"></div>
        <div class="background-particles">
          <div
            v-for="i in 20"
            :key="i"
            class="particle"
            :style="getParticleStyle(i)"
          ></div>
        </div>
      </div>

      <!-- Main content -->
      <div class="splash-content">
        <!-- Logo/Brand -->
        <div v-if="loadingState.config.showLogo" class="splash-logo">
          <div class="logo-icon">🎵</div>
          <h1 class="logo-text">Emotitone</h1>
          <p class="logo-subtitle">Solfege Learning</p>
        </div>

        <!-- Progress section -->
        <div v-if="loadingState.config.showProgress" class="progress-section">
          <!-- Overall progress bar -->
          <div class="progress-container">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${overallProgress}%` }"
              ></div>
            </div>
            <div class="progress-text">{{ overallProgress }}%</div>
          </div>

          <!-- Current message -->
          <div v-if="loadingState.config.showMessages" class="loading-message">
            {{ loadingState.progress.overall.message }}
          </div>

          <!-- Detailed instrument loading message -->
          <div v-if="loadingState.progress.instruments.message && !loadingState.progress.instruments.isComplete" class="loading-submessage">
            {{ loadingState.progress.instruments.message }}
          </div>

          <!-- Detailed progress (development mode) -->
          <div v-if="isDev" class="detailed-progress">
            <div class="progress-item">
              <span>Audio Context:</span>
              <span>{{ loadingState.progress.audioContext.progress }}%</span>
            </div>
            <div class="progress-item">
              <span>Instruments:</span>
              <span>{{ loadingState.progress.instruments.progress }}%</span>
            </div>
            <div class="progress-item">
              <span>Visual Effects:</span>
              <span>{{ loadingState.progress.visualEffects.progress }}%</span>
            </div>
          </div>
        </div>

        <!-- Audio enablement button -->
        <div v-if="needsAudioInteraction" class="audio-section">
          <div class="audio-prompt">
            <div class="audio-icon">🔊</div>
            <h3>Enable Audio</h3>
            <p>Click to enable audio for the best experience</p>
            <button
              @click="handleEnableAudio"
              class="enable-audio-btn"
              :disabled="audioInitializing"
            >
              {{ audioInitializing ? "Enabling..." : "Enable Audio" }}
            </button>
          </div>
        </div>

        <!-- Ready to start -->
        <div
          v-if="loadingState.progress.overall.isComplete"
          class="ready-section"
        >
          <div class="ready-icon">🎵</div>
          <h3>Ready to Play!</h3>
          <p>All instruments and resources are loaded</p>
          <button @click="handleStartApp" class="start-app-btn">
            Start App
          </button>

          <!-- Loading summary -->
          <div class="loading-summary">
            <div class="summary-item" v-if="loadingState.progress.audioContext.isComplete">
              ✓ Audio System Ready
            </div>
            <div class="summary-item" v-if="loadingState.progress.instruments.isComplete">
              ✓ All Instruments Loaded
            </div>
            <div class="summary-item" v-if="loadingState.progress.visualEffects.isComplete">
              ✓ Visual Effects Ready
            </div>
          </div>
        </div>

        <!-- Error state -->
        <div
          v-if="hasError && !loadingState.progress.overall.isComplete"
          class="error-section"
        >
          <div class="error-icon">⚠️</div>
          <p class="error-message">{{ errorMessage }}</p>
          <button @click="handleRetry" class="retry-btn">Try Again</button>
        </div>
      </div>

      <!-- Skip button (for development) -->
      <button v-if="isDev" @click="handleSkip" class="skip-btn">
        Skip Loading
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAppLoading } from "@/composables/useAppLoading";

// Props
interface Props {
  autoStart?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoStart: true,
});

// Composables
const {
  loadingState,
  isVisible,
  overallProgress,
  updatePhase,
  enableAudioContext,
  initializeInstruments,
  initializeVisualEffects,
  hideSplash,
  skipLoading,
  resetLoading,
} = useAppLoading();

// Local state
const audioInitializing = ref(false);
const isDev = import.meta.env.DEV;

// Computed
const needsAudioInteraction = computed(() => {
  return (
    loadingState.progress.audioContext.phase === "audio-context" &&
    !loadingState.progress.audioContext.isComplete &&
    loadingState.progress.audioContext.error
  );
});

const hasError = computed(() => {
  return Object.values(loadingState.progress).some((state) => state.error);
});

const errorMessage = computed(() => {
  const errorState = Object.values(loadingState.progress).find(
    (state) => state.error
  );
  return errorState?.error || "An error occurred during initialization";
});

// Methods
const handleEnableAudio = async () => {
  audioInitializing.value = true;
  try {
    const success = await enableAudioContext();
    if (success) {
      // Continue with other initialization
      await initializeInstruments();
      await initializeVisualEffects();
    }
  } catch (error) {
    console.error("Error enabling audio:", error);
  } finally {
    audioInitializing.value = false;
  }
};

const handleRetry = () => {
  resetLoading();
  startInitialization();
};

const handleStartApp = async () => {
  // Initialize audio context when user clicks "Start App"
  // This provides the required user interaction for audio
  try {
    await enableAudioContext();
    console.log("Audio context enabled on app start");
  } catch (error) {
    console.warn("Audio context initialization failed:", error);
    // Continue anyway - audio will be enabled when user first plays a note
  }

  hideSplash();
};

const handleSkip = () => {
  skipLoading();
};

const getParticleStyle = (index: number) => {
  const delay = index * 0.1;
  const duration = 3 + (index % 3);
  return {
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    left: `${(index * 5) % 100}%`,
    top: `${(index * 7) % 100}%`,
  };
};

const startInitialization = async () => {
  if (!props.autoStart) return;

  try {
    // Start with visual effects (doesn't require user interaction)
    await initializeVisualEffects();

    // Initialize instruments (doesn't require audio context to be running)
    await initializeInstruments();

    // Skip audio context initialization during loading
    // Audio context will be enabled when user clicks "Start App"
    // Mark audio as "ready" for loading completion
    updatePhase("audioContext", {
      phase: "audio-context",
      progress: 100,
      message: "Audio ready (will enable when you start)",
      isComplete: true,
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
};

// Animation callbacks
const onEnter = (el: Element) => {
  if (loadingState.config.enableAnimations) {
    // Add enter animation logic if needed
  }
};

const onLeave = (el: Element) => {
  if (loadingState.config.enableAnimations) {
    // Add leave animation logic if needed
  }
};

// Lifecycle
onMounted(() => {
  startInitialization();
});

onUnmounted(() => {
  // Cleanup if needed
});
</script>

<style scoped>
.loading-splash {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.splash-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
}

.background-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    hsla(220, 70%, 10%, 1) 0%,
    hsla(260, 60%, 15%, 1) 50%,
    hsla(300, 50%, 20%, 1) 100%
  );
}

.background-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: hsla(0, 0%, 100%, 0.3);
  border-radius: 50%;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
    opacity: 0.8;
  }
}

.splash-content {
  text-align: center;
  color: white;
  max-width: 500px;
  padding: 2rem;
}

.splash-logo {
  margin-bottom: 3rem;
}

.logo-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.logo-text {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 1.1rem;
  opacity: 0.8;
  margin: 0;
}

.progress-section {
  margin-bottom: 2rem;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: hsla(0, 0%, 100%, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-weight: 600;
  min-width: 3rem;
}

.loading-message {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.loading-submessage {
  font-size: 0.875rem;
  opacity: 0.7;
  margin-bottom: 1rem;
  font-style: italic;
}

.detailed-progress {
  font-size: 0.875rem;
  opacity: 0.7;
  text-align: left;
}

.progress-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.audio-section {
  margin-bottom: 2rem;
}

.audio-prompt {
  background: hsla(0, 0%, 100%, 0.1);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid hsla(0, 0%, 100%, 0.2);
}

.audio-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.audio-prompt h3 {
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.audio-prompt p {
  margin: 0 0 1.5rem 0;
  opacity: 0.8;
}

.enable-audio-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
}

.enable-audio-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px hsla(240, 70%, 60%, 0.4);
}

.enable-audio-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.ready-section {
  background: hsla(120, 50%, 50%, 0.1);
  border: 1px solid hsla(120, 50%, 50%, 0.3);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.ready-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.ready-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: hsla(120, 50%, 70%, 1);
}

.ready-section p {
  margin: 0 0 1.5rem 0;
  opacity: 0.8;
}

.start-app-btn {
  background: linear-gradient(
    135deg,
    hsla(120, 50%, 50%, 0.8) 0%,
    hsla(140, 60%, 40%, 0.8) 100%
  );
  border: none;
  border-radius: 8px;
  color: white;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
}

.start-app-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px hsla(120, 50%, 50%, 0.4);
  background: linear-gradient(
    135deg,
    hsla(120, 50%, 50%, 1) 0%,
    hsla(140, 60%, 40%, 1) 100%
  );
}

.loading-summary {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid hsla(120, 50%, 50%, 0.2);
}

.summary-item {
  font-size: 0.875rem;
  color: hsla(120, 50%, 70%, 0.9);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.error-section {
  background: hsla(0, 70%, 50%, 0.1);
  border: 1px solid hsla(0, 70%, 50%, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-message {
  margin: 0 0 1rem 0;
  opacity: 0.9;
}

.retry-btn {
  background: hsla(0, 70%, 50%, 0.8);
  border: none;
  border-radius: 6px;
  color: white;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: background 0.3s ease;
}

.retry-btn:hover {
  background: hsla(0, 70%, 50%, 1);
}

.skip-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: hsla(0, 0%, 100%, 0.1);
  border: 1px solid hsla(0, 0%, 100%, 0.3);
  border-radius: 6px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.skip-btn:hover {
  background: hsla(0, 0%, 100%, 0.2);
}

/* Transitions */
.splash-enter-active,
.splash-leave-active {
  transition: all 0.5s ease;
}

.splash-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.splash-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

/* Responsive */
@media (max-width: 768px) {
  .splash-content {
    padding: 1.5rem;
    max-width: 90vw;
  }

  .logo-icon {
    font-size: 3rem;
  }

  .logo-text {
    font-size: 2rem;
  }

  .audio-prompt {
    padding: 1.5rem;
  }
}
</style>
