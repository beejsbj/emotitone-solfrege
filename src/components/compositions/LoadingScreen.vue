<script setup lang="ts">
import MidiPermissionIcon from "@/components/MidiPermissionIcon.vue";

type LoadingCheck = {
  label: string;
  complete: boolean;
};

const props = withDefaults(
  defineProps<{
    mode?: "app" | "specimen";
    progress?: number;
    phaseLabel?: string;
    stepMessage?: string;
    midiMessage?: string;
    showMidiMessage?: boolean;
    showProgress?: boolean;
    isComplete?: boolean;
    needsAudioInteraction?: boolean;
    audioInitializing?: boolean;
    hasError?: boolean;
    errorMessage?: string;
    isDev?: boolean;
    checks?: LoadingCheck[];
  }>(),
  {
    mode: "specimen",
    progress: 57,
    phaseLabel: "Tuning the room...",
    stepMessage: "",
    midiMessage: "",
    showMidiMessage: false,
    showProgress: true,
    isComplete: false,
    needsAudioInteraction: false,
    audioInitializing: false,
    hasError: false,
    errorMessage: "",
    isDev: false,
    checks: () => [],
  },
);

const emit = defineEmits<{
  "enable-audio": [];
  start: [];
  retry: [];
  skip: [];
}>();

const notes = ["do", "re", "mi", "fa", "sol", "la", "ti"] as const;

const isNoteLit = (index: number) => {
  if (props.isComplete) return true;
  return props.progress >= ((index + 1) / notes.length) * 100;
};
</script>

<template>
  <div
    class="loading-screen"
    :class="[
      `loading-screen--${mode}`,
      {
        'loading-screen--ready': isComplete,
        'loading-screen--error': hasError && !needsAudioInteraction && !isComplete,
      },
    ]"
  >
    <span class="loading-screen__filemark">SOLFÈGE · 01 / FOUNDATIONS</span>

    <span class="loading-screen__scatter" aria-hidden="true">
      <svg viewBox="0 0 180 180">
        <path d="M30 18 L36 32 L42 44 L48 56 L54 68 L60 80 L66 92 L68 100 L52 98 L36 100 L20 98 L8 96 L6 94 L12 80 L18 66 L24 52 Z" fill="var(--brass)" opacity=".18" />
        <path d="M118 14 L128 22 L138 14 L148 24 L156 38 L154 56 L156 76 L154 92 L140 92 L128 96 L114 90 L106 78 L100 64 L104 48 L112 32 Z" fill="var(--plum)" opacity=".22" />
        <circle cx="70" cy="148" r="18" fill="var(--bone)" opacity=".14" />
        <path d="M152 130 L168 138 L172 152 L164 168 L150 168 L142 158 L144 144 Z" fill="var(--tomato)" opacity=".22" />
      </svg>
    </span>

    <div class="loading-screen__header">
      <svg class="loading-screen__mark" width="120" height="120" viewBox="0 0 80 80" aria-hidden="true">
        <path d="M41 6 L46 17 L51 25 L57 36 L62 46 L67 56 L72 67 L74 73 L62 71 L49 73 L36 71 L22 73 L9 72 L7 71 L13 60 L18 50 L23 41 L29 30 L34 19 Z" fill="var(--brass)" />
      </svg>
      <span class="loading-screen__sticker">
        <span class="loading-screen__sticker-dot" />
        Solfège · v0.1
      </span>
    </div>

    <h1 class="loading-screen__title">
      Cut-paper <span>jazz,</span><br>
      lit by a <em>synth.</em>
    </h1>

    <p class="loading-screen__lede">
      A directed visual language for a music-theory instrument. Loading samples,
      wiring transport, tuning the room.
    </p>

    <section v-if="needsAudioInteraction" class="loading-screen__state">
      <p class="loading-screen__tag">Audio requires interaction</p>
      <button
        type="button"
        class="loading-screen__button"
        :disabled="audioInitializing"
        @click="emit('enable-audio')"
      >
        {{ audioInitializing ? "Enabling..." : "Enable audio" }}
      </button>
    </section>

    <section v-else-if="hasError && !isComplete" class="loading-screen__state loading-screen__state--error">
      <p class="loading-screen__tag">Error</p>
      <p class="loading-screen__message">{{ errorMessage || "An error occurred during initialization" }}</p>
      <button type="button" class="loading-screen__button" @click="emit('retry')">Retry</button>
    </section>

    <section v-else-if="isComplete" class="loading-screen__state loading-screen__state--ready">
      <div class="loading-screen__checks">
        <div
          v-for="check in checks.filter((item) => item.complete)"
          :key="check.label"
          class="loading-screen__check"
        >
          <span />
          {{ check.label }}
        </div>
      </div>
      <p v-if="showMidiMessage" class="loading-screen__message loading-screen__message--midi">
        <span class="loading-screen__midi">
          <MidiPermissionIcon class="loading-screen__midi-icon" />
          <span>{{ midiMessage }}</span>
        </span>
      </p>
      <button type="button" class="loading-screen__button loading-screen__button--start" @click="emit('start')">
        Play
      </button>
    </section>

    <section v-else-if="showProgress" class="loading-screen__progress">
      <div class="loading-screen__progress-row">
        <span class="loading-screen__progress-label">{{ phaseLabel }}</span>
        <span class="loading-screen__progress-meta">{{ String(progress).padStart(2, "0") }}% · 120 BPM</span>
      </div>
      <div class="loading-screen__tape" aria-hidden="true">
        <span
          v-for="(note, index) in notes"
          :key="note"
          :class="[
            `loading-screen__note loading-screen__note--${note}`,
            { 'loading-screen__note--lit': isNoteLit(index) },
          ]"
        />
      </div>
      <p v-if="stepMessage" class="loading-screen__message">{{ stepMessage }}</p>
      <p v-if="showMidiMessage" class="loading-screen__message loading-screen__message--midi">
        <span class="loading-screen__midi">
          <MidiPermissionIcon class="loading-screen__midi-icon" />
          <span>{{ midiMessage }}</span>
        </span>
      </p>
    </section>

    <span class="loading-screen__stamp">BUILD · 0.1 · NOT FOR PRESS</span>

    <button
      v-if="isDev && mode === 'app'"
      type="button"
      class="loading-screen__skip"
      @click="emit('skip')"
    >
      skip
    </button>
  </div>
</template>

<style scoped>
.loading-screen {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid var(--hairline);
  background:
    radial-gradient(
      120% 80% at 50% 0%,
      color-mix(in oklch, var(--ink-2) 82%, var(--brass) 18%) 0%,
      var(--ink) 60%
    ),
    var(--ink);
  color: var(--ivory);
}

.loading-screen--app {
  position: fixed;
  inset: 0;
  z-index: 10000;
  border: 0;
  padding: clamp(24px, 7vw, 48px);
}

.loading-screen--specimen {
  min-height: 560px;
  padding: 40px 44px;
}

.loading-screen__filemark {
  position: absolute;
  top: 14px;
  right: 18px;
  border: 1px solid var(--hairline);
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .22em;
  padding: 4px 8px;
  text-transform: uppercase;
  transform: rotate(2deg);
}

.loading-screen__stamp {
  position: absolute;
  bottom: 14px;
  left: 18px;
  color: var(--ivory-4);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .22em;
  text-transform: uppercase;
}

.loading-screen__scatter {
  position: absolute;
  top: 20px;
  left: 32px;
  width: 180px;
  height: 180px;
  pointer-events: none;
}

.loading-screen__scatter svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.loading-screen__header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: clamp(44px, 9vh, 72px);
}

.loading-screen__mark {
  flex: 0 0 auto;
  filter: drop-shadow(4px 4px 0 rgba(0, 0, 0, .55));
  transform: rotate(-2deg);
}

.loading-screen__sticker {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 10px;
  background: var(--ivory);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, .7);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .14em;
  padding: 6px 14px 5px;
  text-transform: uppercase;
  transform: rotate(-3deg) translateY(-6px);
  white-space: nowrap;
}

.loading-screen__sticker-dot {
  width: 8px;
  height: 8px;
  background: var(--ink);
}

.loading-screen__title {
  max-width: 14ch;
  margin: 14px 0 0;
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: clamp(44px, 8vw, 60px);
  font-weight: 700;
  letter-spacing: .01em;
  line-height: .94;
  text-transform: uppercase;
}

.loading-screen__title span {
  color: var(--brass);
}

.loading-screen__title em {
  color: var(--tomato);
  font-style: normal;
}

.loading-screen__lede {
  max-width: 52ch;
  margin-top: 18px;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 13px;
  line-height: 1.55;
}

.loading-screen__progress,
.loading-screen__state {
  display: flex;
  margin-top: auto;
  flex-direction: column;
  gap: 10px;
}

.loading-screen__progress-row {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.loading-screen__progress-label,
.loading-screen__tag {
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .14em;
  margin: 0;
  text-transform: uppercase;
}

.loading-screen__progress-meta {
  margin-left: auto;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.loading-screen__tape {
  display: flex;
  height: 14px;
  border: 1px solid var(--hairline);
}

.loading-screen__note {
  display: block;
  height: 100%;
  flex: 16;
  opacity: .15;
  transition: opacity var(--dur-ui) var(--ease-brush), filter var(--dur-ui) var(--ease-brush);
}

.loading-screen__note--lit {
  animation: loading-note-pulse 500ms cubic-bezier(.2, .9, .2, 1) infinite;
  opacity: 1;
}

.loading-screen__note--do { background: var(--note-do); }
.loading-screen__note--re { background: var(--note-re); }
.loading-screen__note--mi { background: var(--note-mi); }
.loading-screen__note--fa { background: var(--note-fa); }
.loading-screen__note--sol { background: var(--note-sol); }
.loading-screen__note--la { flex: 12; background: var(--note-la); }
.loading-screen__note--ti { flex: 8; background: var(--note-ti); }

.loading-screen__message {
  max-width: 62ch;
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 11px;
  letter-spacing: .08em;
  line-height: 1.45;
  text-transform: uppercase;
}

.loading-screen__message--midi {
  color: var(--ivory-2);
}

.loading-screen__midi {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.loading-screen__midi-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.loading-screen__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.loading-screen__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ink-5);
  color: var(--ivory-2);
  font: var(--t-label);
  font-size: 10px;
  letter-spacing: .16em;
  padding: 7px 10px;
  text-transform: uppercase;
}

.loading-screen__check span {
  width: 6px;
  height: 6px;
  background: var(--brass);
  box-shadow: var(--shadow-glow-brass);
}

.loading-screen__button,
.loading-screen__skip {
  border: 1px solid var(--ink-5);
  background: var(--ivory);
  color: var(--ink);
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .16em;
  padding: 9px 16px 8px;
  text-transform: uppercase;
}

.loading-screen__button:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.loading-screen__button--start {
  width: min(260px, 100%);
  background: var(--brass);
}

.loading-screen__state--error .loading-screen__button {
  align-self: flex-start;
  background: var(--tomato);
}

.loading-screen__skip {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 20;
  background: transparent;
  color: var(--ivory-4);
  font-size: 10px;
  padding: 5px 8px;
}

@keyframes loading-note-pulse {
  0%, 100% { filter: brightness(1); }
  20% { filter: brightness(1.18); }
}

@media (max-width: 620px) {
  .loading-screen--app,
  .loading-screen--specimen {
    padding: 28px 22px;
  }

  .loading-screen__filemark,
  .loading-screen__stamp {
    font-size: 7px;
  }

  .loading-screen__mark {
    width: 82px;
    height: 82px;
  }

  .loading-screen__progress-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .loading-screen__progress-meta {
    margin-left: 0;
  }
}
</style>
