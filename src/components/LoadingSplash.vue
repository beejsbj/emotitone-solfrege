<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAppLoading } from "@/composables/useAppLoading";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import MidiPermissionIcon from "@/components/MidiPermissionIcon.vue";

// Props
interface Props {
  autoStart?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoStart: true,
});

// Composables
const keyboardDrawerStore = useKeyboardDrawerStore();
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

const midiMessage = computed(() => {
  const midi = keyboardDrawerStore.midi;

  if (!midi.isSupported) {
    return "";
  }

  if (midi.isConnecting) {
    return "Requesting browser MIDI access...";
  }

  if (midi.lastError) {
    return "MIDI permission wasn’t granted. Touch and QWERTY still work.";
  }

  if (midi.connectedInputs.length > 0) {
    const roliSync = midi.syncedOutput
      ? ` Live sync: ${midi.syncedOutput}.`
      : "";
    return `MIDI ready: ${midi.connectedInputs.join(", ")}.${roliSync}`;
  }

  if (midi.isListening) {
    if (midi.syncedOutput) {
      return `MIDI ready. Live sync armed on ${midi.syncedOutput}.`;
    }

    return "MIDI ready. Connect a controller anytime.";
  }

  return "If you have a controller connected, your browser may ask for MIDI access.";
});

const showMidiMessage = computed(() => Boolean(midiMessage.value));

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
  try {
    await enableAudioContext();
  } catch (error) {
    // Continue anyway - audio will be enabled when user first plays a note
  }

  hideSplash();
};

const handleSkip = () => {
  skipLoading();
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

<template>
  <Transition name="splash" @enter="onEnter" @leave="onLeave">
    <div v-if="isVisible" class="splash">

      <!-- Five staff lines — sheet music texture -->
      <div class="staff" aria-hidden="true">
        <span class="staff-line" />
        <span class="staff-line" />
        <span class="staff-line" />
        <span class="staff-line" />
        <span class="staff-line" />
      </div>

      <!-- Main content column -->
      <div class="content">

        <!-- Logotype -->
        <header class="logotype">
          <span class="logo-glyph" aria-hidden="true">♫</span>
          <div class="logo-words">
            <h1 class="logo-title">EMOTITONE</h1>
            <p class="logo-sub">SOLFÈGE LEARNING</p>
          </div>
        </header>

        <!-- Spectrum waveform — pulses during load, settles when ready -->
        <div
          class="waveform"
          :class="{ 'waveform--ready': loadingState.progress.overall.isComplete }"
          aria-hidden="true"
        >
          <span v-for="i in 16" :key="i" class="bar" :style="{ '--i': i }" />
        </div>

        <!-- Progress meter -->
        <div v-if="loadingState.config.showProgress" class="meter">
          <div class="meter-pct">
            <span class="pct-num">{{ String(overallProgress).padStart(2, '0') }}</span>
            <span class="pct-sign">%</span>
          </div>
          <div class="meter-rail">
            <div class="meter-fill" :style="{ width: overallProgress + '%' }" />
          </div>
        </div>

        <!-- Status messages — shown while loading -->
        <div
          v-if="loadingState.config.showMessages && !loadingState.progress.overall.isComplete && !needsAudioInteraction"
          class="status"
        >
          <p class="status-category">{{ loadingState.progress.overall.message }}</p>
          <p
            v-if="
              !loadingState.progress.instruments.isComplete &&
              loadingState.progress.instruments.message &&
              loadingState.progress.instruments.message !== loadingState.progress.overall.message
            "
            class="status-step"
          >
            {{ loadingState.progress.instruments.message }}
          </p>
          <p v-if="showMidiMessage" class="status-step status-step--midi">
            <span class="midi-inline">
              <MidiPermissionIcon class="midi-inline__icon" />
              <span>{{ midiMessage }}</span>
            </span>
          </p>
        </div>

        <!-- Audio interaction required -->
        <div v-if="needsAudioInteraction" class="audio-gate">
          <p class="audio-gate-label">AUDIO REQUIRES INTERACTION</p>
          <button
            class="btn btn--audio"
            :disabled="audioInitializing"
            @click="handleEnableAudio"
          >
            {{ audioInitializing ? 'ENABLING…' : '♪ ENABLE AUDIO' }}
          </button>
        </div>

        <!-- Ready state -->
        <div v-if="loadingState.progress.overall.isComplete" class="ready">
          <div class="ready-checks">
            <div v-if="loadingState.progress.audioContext.isComplete" class="check">
              <span class="check-pip" />
              <span class="check-label">AUDIO SYSTEM</span>
            </div>
            <div v-if="loadingState.progress.instruments.isComplete" class="check">
              <span class="check-pip" />
              <span class="check-label">ALL INSTRUMENTS</span>
            </div>
            <div v-if="loadingState.progress.visualEffects.isComplete" class="check">
              <span class="check-pip" />
              <span class="check-label">VISUAL ENGINE</span>
            </div>
          </div>
          <p v-if="showMidiMessage" class="ready-midi">
            <span class="midi-inline">
              <MidiPermissionIcon class="midi-inline__icon" />
              <span>{{ midiMessage }}</span>
            </span>
          </p>
          <button class="btn btn--start" @click="handleStartApp">
            ► PLAY
          </button>
        </div>

        <!-- Error state -->
        <div
          v-if="hasError && !loadingState.progress.overall.isComplete"
          class="error-block"
        >
          <p class="error-tag">⚠ ERROR</p>
          <p class="error-msg">{{ errorMessage }}</p>
          <button class="btn btn--retry" @click="handleRetry">RETRY</button>
        </div>

      </div><!-- /content -->

      <!-- Solfège syllable strip — ambient notation texture -->
      <div class="solfege-row" aria-hidden="true">
        <span class="syl" style="--d: 0s">DO</span>
        <span class="syl" style="--d: 0.12s">RE</span>
        <span class="syl" style="--d: 0.24s">MI</span>
        <span class="syl" style="--d: 0.36s">FA</span>
        <span class="syl" style="--d: 0.48s">SOL</span>
        <span class="syl" style="--d: 0.60s">LA</span>
        <span class="syl" style="--d: 0.72s">TI</span>
      </div>

      <!-- Dev skip -->
      <button v-if="isDev" class="dev-skip" @click="handleSkip">skip</button>

    </div>
  </Transition>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

/* ─── Shell ──────────────────────────────────────────── */
.splash {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: hsla(0, 0%, 7%, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Staff lines (background texture) ──────────────── */
.staff {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  padding: 10% 0;
  pointer-events: none;
  z-index: 0;
}

.staff-line {
  display: block;
  height: 1px;
  background: hsla(0, 0%, 100%, 0.03);
}

/* ─── Content column ─────────────────────────────────── */
.content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 3.5rem 1.5rem 5rem;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
}

/* ─── Logotype ───────────────────────────────────────── */
.logotype {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 2.75rem;
}

.logo-glyph {
  font-size: 3rem;
  line-height: 1;
  color: hsla(0, 0%, 82%, 0.85);
  flex-shrink: 0;
  animation: glyph-pulse 3s ease-in-out infinite;
}

@keyframes glyph-pulse {
  0%, 100% { opacity: 0.65; }
  50%       { opacity: 1; }
}

.logo-words {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.logo-title {
  font-family: 'Bebas Neue', 'Arial Black', sans-serif;
  font-size: 2.6rem;
  letter-spacing: 0.05em;
  color: hsla(0, 0%, 97%, 1);
  line-height: 1;
  margin: 0;
}

.logo-sub {
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: hsla(0, 0%, 100%, 0.3);
  margin: 0;
}

/* ─── Spectrum waveform ──────────────────────────────── */
.waveform {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 64px;
  margin-bottom: 2rem;
}

.bar {
  flex: 1;
  height: 64px;
  border-radius: 2px 2px 0 0;
  transform-origin: bottom center;
  transform: scaleY(0.05);
  background: hsl(0, 0%, calc(30% + var(--i, 1) * 2.2%));
  animation:
    wave-live calc(0.48s + var(--i, 1) * 0.027s) ease-in-out infinite alternate;
  animation-delay: calc((var(--i, 1) - 1) * 52ms);
}

@keyframes wave-live {
  from { transform: scaleY(0.05); }
  to   { transform: scaleY(0.95); }
}

/* Settled / ready — gentle low breathing */
.waveform--ready .bar {
  animation-name: wave-settled;
  animation-duration: 2.8s;
}

@keyframes wave-settled {
  from { transform: scaleY(0.18); }
  to   { transform: scaleY(0.38); }
}

/* ─── Progress meter ─────────────────────────────────── */
.meter {
  margin-bottom: 1.75rem;
}

.meter-pct {
  display: flex;
  align-items: baseline;
  gap: 0.05rem;
  margin-bottom: 0.65rem;
  line-height: 1;
}

.pct-num {
  font-family: 'Courier New', Courier, monospace;
  font-size: 5.5rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: hsla(0, 0%, 96%, 1);
  font-variant-numeric: tabular-nums;
}

.pct-sign {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.6rem;
  font-weight: 400;
  color: hsla(0, 0%, 62%, 0.65);
  margin-left: 0.1rem;
}

.meter-rail {
  height: 2px;
  background: hsla(0, 0%, 100%, 0.07);
  border-radius: 1px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    hsla(0, 0%, 42%, 0.9),
    hsla(0, 0%, 78%, 1)
  );
  border-radius: 1px;
  transition: width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 0 14px hsla(0, 0%, 70%, 0.22);
}

/* ─── Status messages ────────────────────────────────── */
.status {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.status-category {
  font-size: 0.52rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: hsla(0, 0%, 100%, 0.38);
  margin: 0;
}

.status-step {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: hsla(0, 0%, 78%, 0.9);
  margin: 0;
  animation: step-in 0.25s ease;
}

.status-step--midi {
  color: hsla(0, 0%, 70%, 0.85);
}

.midi-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.midi-inline__icon {
  width: 0.8rem;
  height: 0.8rem;
  flex-shrink: 0;
  opacity: 0.88;
}

@keyframes step-in {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Audio gate ─────────────────────────────────────── */
.audio-gate {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 0.5rem;
}

.audio-gate-label {
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: hsla(0, 0%, 58%, 0.72);
  margin: 0;
}

/* ─── Ready ──────────────────────────────────────────── */
.ready {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  animation: fade-up 0.45s ease;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ready-checks {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.check-pip {
  width: 0.32rem;
  height: 0.32rem;
  border-radius: 50%;
  background: hsla(0, 0%, 78%, 1);
  box-shadow: 0 0 8px hsla(0, 0%, 76%, 0.24);
  flex-shrink: 0;
}

.check-label {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: hsla(0, 0%, 74%, 0.8);
}

.ready-midi {
  margin: -0.8rem 0 0;
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsla(0, 0%, 70%, 0.85);
}

/* ─── Error ──────────────────────────────────────────── */
.error-block {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1rem;
  border: 1px solid hsla(0, 0%, 100%, 0.08);
  border-left: 2px solid hsla(0, 0%, 72%, 0.5);
  border-radius: 3px;
  background: hsla(0, 0%, 100%, 0.04);
  margin-top: 0.5rem;
}

.error-tag {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: hsla(0, 0%, 84%, 0.9);
  margin: 0;
}

.error-msg {
  font-size: 0.62rem;
  color: hsla(0, 0%, 100%, 0.55);
  margin: 0;
  line-height: 1.5;
}

/* ─── Buttons ────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: opacity 0.15s ease, transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.btn:active {
  transform: scale(0.97);
}

/* Play / start button */
.btn--start {
  font-family: 'Bebas Neue', 'Arial Black', sans-serif;
  font-size: 1.6rem;
  letter-spacing: 0.22em;
  padding: 0.85rem 2rem 0.85rem 2.5rem; /* extra left for letter-spacing */
  background: hsla(0, 0%, 100%, 0.08);
  border: 1px solid hsla(0, 0%, 82%, 0.24);
  color: hsla(0, 0%, 92%, 1);
  width: 100%;
  animation: start-glow 2.2s ease-in-out infinite;
}

@keyframes start-glow {
  0%, 100% {
    box-shadow:
      0 0 10px hsla(0, 0%, 84%, 0.08),
      inset 0 0 0 transparent;
  }
  50% {
    box-shadow:
      0 0 24px hsla(0, 0%, 86%, 0.14),
      0 0 44px hsla(0, 0%, 86%, 0.08),
      inset 0 0 14px hsla(0, 0%, 92%, 0.03);
  }
}

/* Enable audio button */
.btn--audio {
  font-size: 0.58rem;
  padding: 0.7rem 1.25rem;
  background: hsla(0, 0%, 100%, 0.06);
  border: 1px solid hsla(0, 0%, 76%, 0.22);
  color: hsla(0, 0%, 82%, 1);
  align-self: flex-start;
}

.btn--audio:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn--audio:disabled:active {
  transform: none;
}

/* Retry button */
.btn--retry {
  font-size: 0.52rem;
  padding: 0.5rem 1rem;
  background: hsla(0, 0%, 100%, 0.06);
  border: 1px solid hsla(0, 0%, 72%, 0.22);
  color: hsla(0, 0%, 82%, 1);
  align-self: flex-start;
}

/* ─── Solfège syllable strip ─────────────────────────── */
.solfege-row {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.4rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid hsla(0, 0%, 100%, 0.04);
  pointer-events: none;
  z-index: 2;
}

.syl {
  font-size: 0.44rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: hsla(0, 0%, 74%, 0.42);
  opacity: 0.4;
  animation: syl-float 3.2s ease-in-out infinite alternate;
  animation-delay: var(--d, 0s);
}

@keyframes syl-float {
  from { opacity: 0.28; transform: translateY(0); }
  to   { opacity: 0.7;  transform: translateY(-4px); }
}

/* ─── Dev skip button ────────────────────────────────── */
.dev-skip {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 20;
  background: hsla(0, 0%, 100%, 0.05);
  border: 1px solid hsla(0, 0%, 100%, 0.09);
  border-radius: 3px;
  color: hsla(0, 0%, 100%, 0.28);
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
}

/* ─── Splash transition ──────────────────────────────── */
.splash-enter-active {
  transition: opacity 0.45s ease;
}

.splash-leave-active {
  transition: opacity 0.65s ease, transform 0.65s ease;
}

.splash-enter-from {
  opacity: 0;
}

.splash-leave-to {
  opacity: 0;
  transform: scale(1.015);
}
</style>
