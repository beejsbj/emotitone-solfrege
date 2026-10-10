<script setup lang="ts">
import { computed } from "vue";
import MidiPermissionIcon from "@/components/MidiPermissionIcon.vue";
import Mark from "@/components/primatives/Mark.vue";
import Sticker from "@/components/primatives/Sticker";
import BrandLogo from "@/components/uniques/BrandLogo.vue";
import SourceCredits from "@/components/uniques/SourceCredits.vue";
import type { LoadingStage } from "@/types/loading";

/**
 * Count-In (adopted 2026-09-26). The load is the band counting in: each
 * required stage is one beat of "one, two, three, four", pasted up as a
 * gig-poster tile when it lands. MIDI is the "and" — the pickup, optional.
 * Ready opens the Brass Play gate, the only Brass on the screen.
 *
 * Behaviour lives in LoadingSplash.vue; this composition only renders the
 * props it is given and emits intent.
 */
const props = withDefaults(defineProps<{
  mode?: "app" | "specimen";
  progress?: number;
  stages?: LoadingStage[];
  /** 0–1 progress inside the active required stage; derived from progress when omitted. */
  stageProgress?: number;
  phase?: string;
  message?: string;
  showProgress?: boolean;
  showMessages?: boolean;
  isComplete?: boolean;
  needsAudioInteraction?: boolean;
  audioInitializing?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  /** Offer the quieter "play with basic synths" way in beside the retry gate. */
  canPlayBasicSynths?: boolean;
  /** How the error gate recovers: retry in place, or reload when the audio engine stalled. */
  recovery?: "retry" | "reload";
  isDev?: boolean;
  /** Composed still frame: the Reduced Motion rendering, forced for review. */
  still?: boolean;
}>(), {
  mode: "specimen",
  progress: 38,
  stages: undefined,
  stageProgress: undefined,
  phase: "Loading instrument samples",
  message: "Gathering the sounds for your first notes.",
  showProgress: true,
  showMessages: true,
  isComplete: undefined,
  needsAudioInteraction: false,
  audioInitializing: false,
  hasError: false,
  errorMessage: "",
  canPlayBasicSynths: false,
  recovery: "retry",
  isDev: false,
  still: false,
});

const emit = defineEmits<{
  "enable-audio": [];
  start: [];
  retry: [];
  reload: [];
  "play-basic-synths": [];
  skip: [];
}>();

const PAPERS = ["tomato", "mustard", "cobalt", "pine"] as const;
const INKS = ["ink", "ink", "ivory", "ivory"] as const;
const WORDS = ["ONE", "TWO", "THREE", "FOUR"] as const;

const percent = computed(() => (
  Math.round(Math.min(100, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0)))
));

/** Specimen stand-in when no live stages are given: each stage owns a slice of the percentage. */
const FALLBACK_STAGES = [
  { label: "Visual stage", start: 0, end: 18 },
  { label: "Instrument samples", start: 18, end: 64 },
  { label: "Audio system", start: 64, end: 90 },
  { label: "Ready to play", start: 90, end: 96 },
  { label: "MIDI input", start: 96, end: 100, icon: "midi" as const, optional: true },
];

const resolvedStages = computed<LoadingStage[]>(() => {
  if (props.stages) return props.stages;

  return FALLBACK_STAGES.map((stage) => ({
    label: stage.label,
    icon: stage.icon,
    optional: stage.optional,
    complete: percent.value >= stage.end,
    active: percent.value >= stage.start && percent.value < stage.end,
  }));
});

const isOptional = (stage: LoadingStage) => stage.optional ?? stage.icon === "midi";
const required = computed(() => resolvedStages.value.filter((stage) => !isOptional(stage)));
const midi = computed(() => resolvedStages.value.find(isOptional));

// Precedence: a blocked audio cue, then an error, and only then ready. A held
// state always wins, so a failure can never be dismissed through the Play gate.
const needsCue = computed(() => props.needsAudioInteraction);
const isStopped = computed(() => props.hasError && !needsCue.value);
// Without an explicit isComplete, ready means every required beat has landed;
// the optional MIDI "and" never holds the gate.
const requiredComplete = computed(() => required.value.length > 0 && required.value.every((stage) => stage.complete));
const isReady = computed(() => (
  !needsCue.value && !isStopped.value && (props.isComplete ?? requiredComplete.value)
));

/**
 * How far the active beat's tile has filled. The adapter passes the active
 * phase's own progress; the specimen fallback reads its stage's slice. With
 * neither, the tile shows a token fill rather than guessing from the average.
 */
const activeFill = computed(() => {
  if (props.stageProgress !== undefined) return Math.min(1, Math.max(0, props.stageProgress));
  const slice = props.stages ? undefined : FALLBACK_STAGES.find((stage) => percent.value >= stage.start && percent.value < stage.end);
  if (!slice) return .12;
  return Math.min(1, Math.max(.12, (percent.value - slice.start) / (slice.end - slice.start)));
});

/** A held beat carries a stamp that says why the count paused. */
const heldStamp = computed(() => (isStopped.value ? "STOP" : needsCue.value ? "CUE" : ""));

const kicker = computed(() => {
  if (isStopped.value) return "COUNT STOPPED";
  if (needsCue.value) return "WAITING ON YOU";
  return "SOUNDCHECK";
});

const titleLines = computed(() => {
  if (isStopped.value) return props.recovery === "reload" ? ["FROM", "SCRATCH."] : ["FROM", "THE TOP."];
  if (needsCue.value) return ["GIVE US", "A CUE."];
  return ["COUNT", "IT IN."];
});

const displayedPhase = computed(() => {
  if (needsCue.value) return "Audio needs a tap";
  if (isStopped.value) return "Soundcheck interrupted";
  return props.phase;
});

const displayedMessage = computed(() => {
  if (needsCue.value) return "Your browser needs permission before the sound system can continue.";
  if (isStopped.value) return props.errorMessage || "An error occurred during initialization.";
  return props.message;
});

const showStatusCopy = computed(() => props.showMessages || needsCue.value || isStopped.value);

function stageState(stage: LoadingStage) {
  if (stage.complete) return "is-complete";
  if (stage.active) return heldStamp.value ? "is-active is-held" : "is-active";
  return "is-pending";
}

function stageLabel(stage: LoadingStage) {
  const state = stage.complete
    ? stage.stamp === "SKIP" ? "skipped" : stage.stamp === "N/A" ? "not available" : "complete"
    : stage.active ? isStopped.value ? "stopped" : needsCue.value ? "waiting for audio" : "current" : "pending";
  return [stage.label, isOptional(stage) ? "optional" : "", state, stage.detail].filter(Boolean).join(", ");
}

function tileStyle(stage: LoadingStage, index: number) {
  const beat = index % PAPERS.length;
  return {
    "--tile-paper": `var(--${PAPERS[beat]})`,
    "--tile-ink": `var(--${INKS[beat]})`,
    "--tile-fill": stage.complete ? 1 : stage.active ? activeFill.value : 0,
    "--tile-tilt": index % 2 ? "var(--rot-mark)" : "var(--rot-sticker)",
  };
}

const midiPaper = computed(() => (midi.value?.stamp === "SET" ? "plum" : "ink-4"));
</script>

<template>
  <section
    class="loading-screen"
    :class="[
      `loading-screen--${mode}`,
      {
        'is-ready': isReady,
        'is-error': isStopped,
        'is-cue': needsCue,
        'is-still': still,
      },
    ]"
    aria-label="EmotiTone loading screen"
  >
    <div class="loading-screen__marks" aria-hidden="true">
      <Mark class="loading-screen__float loading-screen__float--1" name="wave" tone="inherit" :size="30" />
      <Mark class="loading-screen__float loading-screen__float--2" name="sharp" tone="inherit" :size="22" />
      <Mark class="loading-screen__float loading-screen__float--3" name="star" tone="inherit" :size="24" />
    </div>

    <div class="loading-screen__stage">
      <header class="loading-screen__head">
        <BrandLogo class="loading-screen__logo" layout="stacked" size="var(--count-logo)" />
        <div class="loading-screen__call">
          <p class="loading-screen__kicker">
            <span>{{ kicker }}</span>
            <span v-if="!isStopped && !needsCue" class="loading-screen__tempo">♩ = 104</span>
          </p>
          <h1 class="loading-screen__title">{{ titleLines[0] }}<br>{{ titleLines[1] }}</h1>
        </div>
      </header>

      <div class="loading-screen__board">
        <ol class="loading-screen__tiles" aria-label="Loading stages">
          <li
            v-for="(stage, index) in required"
            :key="stage.label"
            class="count-tile"
            :class="stageState(stage)"
            :style="tileStyle(stage, index)"
            :aria-label="stageLabel(stage)"
            :aria-current="stage.active ? 'step' : undefined"
          >
            <span class="count-tile__fill" aria-hidden="true" />
            <span class="count-tile__number" aria-hidden="true">{{ index + 1 }}</span>
            <span class="count-tile__word" aria-hidden="true">{{ WORDS[index % WORDS.length] }}</span>
            <span class="count-tile__label">{{ stage.label }}</span>
            <span class="count-tile__stamp" aria-hidden="true">
              <Sticker v-if="stage.complete" variant="fill" color="ink">{{ stage.stamp ?? "SET" }}</Sticker>
              <Sticker v-else-if="stage.active && heldStamp" variant="fill" :color="isStopped ? 'tomato' : 'ivory'">
                {{ heldStamp }}
              </Sticker>
            </span>
          </li>
        </ol>

        <div
          v-if="midi"
          class="count-and"
          role="group"
          :class="stageState(midi)"
          :style="{ '--and-paper': `var(--${midiPaper})` }"
          :aria-label="stageLabel(midi)"
        >
          <span class="count-and__glyph" aria-hidden="true">&amp;</span>
          <span class="count-and__copy">
            <span class="count-and__label">
              <MidiPermissionIcon class="count-and__icon" />
              {{ midi.label }}
              <small>optional</small>
            </span>
            <span v-if="midi.detail" class="count-and__detail">{{ midi.detail }}</span>
          </span>
          <span class="count-and__stamp" :class="{ 'is-visible': midi.complete }" aria-hidden="true">
            <Sticker variant="fill" color="ivory">{{ midi.stamp ?? "SET" }}</Sticker>
          </span>
        </div>
      </div>

      <footer class="loading-screen__foot">
        <div class="loading-screen__readout">
          <!-- Live region: announces stage and message changes only, never the percent. -->
          <p class="loading-screen__status" role="status" aria-live="polite">
            <template v-if="showStatusCopy">
              <strong>{{ displayedPhase }}</strong>
              <span>{{ displayedMessage }}</span>
            </template>
          </p>
          <span
            v-if="showProgress"
            class="loading-screen__percent"
            role="progressbar"
            aria-label="Loading progress"
            :aria-valuenow="percent"
            aria-valuemin="0"
            aria-valuemax="100"
          >{{ String(percent).padStart(2, "0") }}%</span>
        </div>

        <button
          v-if="isReady"
          type="button"
          class="count-gate count-gate--play brass"
          :aria-label="audioInitializing ? 'Preparing EmotiTone' : 'Play EmotiTone'"
          title="Enter EmotiTone"
          :disabled="audioInitializing"
          :aria-busy="audioInitializing || undefined"
          @click="emit('start')"
        >
          <span class="count-gate__label"><span aria-hidden="true">►</span> {{ audioInitializing ? "PREPARING…" : "PLAY" }}</span>
          <span class="count-gate__sub">{{ audioInitializing ? "getting your sound ready" : "on the downbeat" }}</span>
        </button>

        <button
          v-else-if="needsCue"
          type="button"
          class="count-gate count-gate--cue"
          :disabled="audioInitializing"
          @click="emit('enable-audio')"
        >
          <span class="count-gate__label">{{ audioInitializing ? "ENABLING…" : "ENABLE AUDIO" }}</span>
          <span class="count-gate__sub">{{ audioInitializing ? "listening for the room" : "one tap lets the band play" }}</span>
        </button>

        <div v-else-if="isStopped" class="count-gates">
          <button
            v-if="recovery === 'reload'"
            type="button"
            class="count-gate count-gate--retry count-gate--reload"
            aria-label="Reload EmotiTone"
            :disabled="audioInitializing"
            :aria-busy="audioInitializing || undefined"
            @click="emit('reload')"
          >
            <span class="count-gate__label"><span aria-hidden="true">↻</span> RELOAD</span>
            <span class="count-gate__sub">the audio engine stalled</span>
          </button>
          <button
            v-else
            type="button"
            class="count-gate count-gate--retry"
            aria-label="Retry loading"
            :disabled="audioInitializing"
            :aria-busy="audioInitializing || undefined"
            @click="emit('retry')"
          >
            <span class="count-gate__label"><span aria-hidden="true">↺</span> FROM THE TOP</span>
            <span class="count-gate__sub">retry the soundcheck</span>
          </button>
          <!-- Secondary and quieter: paper, never Brass; the retry stays the gate. -->
          <button
            v-if="canPlayBasicSynths"
            type="button"
            class="count-fallback"
            :disabled="audioInitializing"
            :aria-busy="audioInitializing || undefined"
            @click="emit('play-basic-synths')"
          >
            <strong><span aria-hidden="true">► </span>{{ audioInitializing ? "Starting…" : "Play on" }}</strong>
            <span>with basic synths</span>
          </button>
        </div>

        <div v-else class="count-gate-slot" aria-hidden="true">
          <span v-for="beat in 4" :key="beat" class="count-gate-slot__beat" :style="{ '--beat-index': beat - 1 }" />
          <span class="count-gate-slot__copy">waiting for the downbeat</span>
        </div>

        <SourceCredits class="loading-screen__credits" />
      </footer>
    </div>

    <button
      v-if="isDev && mode === 'app'"
      type="button"
      class="loading-screen__skip"
      @click="emit('skip')"
    >
      Skip
    </button>
  </section>
</template>

<style scoped>
.loading-screen {
  --count-beat: 577ms;

  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--ink);
  color: var(--ivory);
  container-type: size;
  isolation: isolate;
}

.loading-screen--app {
  position: fixed;
  z-index: 10000;
  inset: 0;
  height: 100dvh;
}

.loading-screen *,
.loading-screen *::before,
.loading-screen *::after { box-sizing: border-box; }

.loading-screen__stage {
  --count-logo: clamp(76px, 22cqi, 104px);
  --gate-height: clamp(76px, 10cqh, 96px);

  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: clamp(12px, 2.2cqh, 22px);
  padding:
    max(clamp(16px, 5cqi, 28px), env(safe-area-inset-top))
    clamp(16px, 5cqi, 28px)
    max(clamp(14px, 2.4cqh, 24px), env(safe-area-inset-bottom));
}

/* ── Floating Marks ─────────────────────────────── */
.loading-screen__marks { position: absolute; z-index: -1; inset: 0; pointer-events: none; }
.loading-screen__float { position: absolute; opacity: .7; animation: count-float calc(var(--count-beat) * 8) var(--ease-brush) infinite alternate; }
.loading-screen__float--1 { top: 22%; right: 6%; color: var(--cobalt); rotate: -12deg; }
.loading-screen__float--2 { top: 17%; right: 4%; color: var(--plum); rotate: 8deg; animation-delay: calc(var(--count-beat) * -3); }
.loading-screen__float--3 { top: 1.5%; left: 3%; color: var(--mustard); rotate: 14deg; animation-delay: calc(var(--count-beat) * -5); }

/* ── Head ───────────────────────────────────────── */
.loading-screen__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: end;
  gap: clamp(12px, 4cqi, 24px);
}

/* The Brand Logo is static; the screen counts the band in on its beats and scraps. */
.loading-screen__logo :deep(.brand-logo__beat) {
  transform-box: fill-box;
  transform-origin: center;
  animation: count-logo-beat calc(var(--count-beat) * 4) var(--ease-stab) infinite;
}

.loading-screen__logo :deep(.brand-logo__beat:nth-child(2)) { animation-delay: var(--count-beat); }
.loading-screen__logo :deep(.brand-logo__beat:nth-child(3)) { animation-delay: calc(var(--count-beat) * 2); }
.loading-screen__logo :deep(.brand-logo__beat:nth-child(4)) { animation-delay: calc(var(--count-beat) * 3); }

.loading-screen__logo :deep(.brand-logo__scrap) {
  transform-box: fill-box;
  transform-origin: 50% 90%;
  animation: count-logo-slap calc(var(--count-beat) * 2) var(--ease-stab) infinite;
}

.loading-screen__logo :deep(.brand-logo__scrap--t) { animation-delay: var(--count-beat); }

.loading-screen__kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0 0 6px;
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
}

.loading-screen__kicker > span:first-child {
  padding: 4px 6px 3px;
  background: var(--ivory);
  color: var(--ink);
  clip-path: var(--clip-tab);
}

.loading-screen.is-error .loading-screen__kicker > span:first-child { background: var(--tomato); color: var(--ivory); }

.loading-screen__tempo { align-self: center; color: var(--ivory-3); }

.loading-screen__title {
  margin: 0;
  font: 700 clamp(44px, 15cqi, 64px)/1.14 var(--font-display);
  letter-spacing: var(--tracking-display);
}

/* ── Count tiles ────────────────────────────────── */
.loading-screen__board {
  display: grid;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: clamp(10px, 1.6cqh, 16px);
}

.loading-screen__tiles {
  display: grid;
  min-height: 0;
  margin: 0;
  padding: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: clamp(8px, 3cqi, 16px);
  list-style: none;
}

.count-tile {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: clamp(8px, 3cqi, 16px);
  grid-template-rows: minmax(0, 1fr) auto auto;
  align-items: end;
  background: var(--ink-2);
  color: var(--ivory-3);
  clip-path: var(--clip-tile);
  transition: background-color var(--dur-ui) var(--ease-brush), color var(--dur-ui) var(--ease-brush);
}

.count-tile__fill {
  position: absolute;
  inset: 0;
  background: var(--tile-paper);
  clip-path: var(--clip-offcut);
  transform: translateY(calc((1 - var(--tile-fill)) * 104%));
  transition: transform var(--dur-panel) var(--ease-brush);
}

.count-tile.is-pending .count-tile__fill { opacity: 0; }
.count-tile.is-active .count-tile__fill { opacity: .9; }

.count-tile__number {
  position: relative;
  align-self: start;
  justify-self: start;
  margin: 0 0 0 -.02em;
  font: 700 clamp(64px, min(28cqi, 14cqh), 200px)/.92 var(--font-display);
  color: transparent;
  -webkit-text-stroke: 2px var(--ivory-4);
}

.count-tile__word {
  position: relative;
  font: 700 11px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  opacity: .8;
}

.count-tile__label {
  position: relative;
  margin-top: 4px;
  font: 700 clamp(15px, 4.4cqi, 22px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.count-tile__stamp {
  position: absolute;
  top: clamp(8px, 2.6cqi, 14px);
  right: clamp(8px, 2.6cqi, 14px);
  opacity: 0;
  transform: scale(1.6) rotate(-14deg);
}

.count-tile__stamp :deep(.sticker) { font-size: 12px; padding: 4px 8px 3px; }

/* Active: the beat is being counted right now. */
.count-tile.is-active { color: var(--ivory); }
.count-tile.is-active .count-tile__number {
  -webkit-text-stroke-color: var(--ivory);
  transform-origin: 20% 80%;
  animation: count-beat var(--count-beat) var(--ease-stab) infinite;
}

/* Held: the count paused on this beat — stopped by an error or waiting on the audio cue. */
.count-tile.is-held .count-tile__number { animation: none; }
.count-tile.is-held .count-tile__stamp { opacity: 1; transform: rotate(var(--rot-sticker)); }
.loading-screen.is-error .count-tile.is-held .count-tile__number { -webkit-text-stroke-color: var(--tomato); }
.loading-screen.is-error .count-tile.is-held .count-tile__fill { opacity: .28; }

/* Complete: pasted up, slapped on at a tilt. */
.count-tile.is-complete {
  background: var(--tile-paper);
  color: var(--tile-ink);
  transform: rotate(var(--tile-tilt));
  animation: count-slap var(--dur-scene) var(--ease-stab) both;
}

.count-tile.is-complete .count-tile__number {
  color: var(--tile-ink);
  -webkit-text-stroke-color: transparent;
}

.count-tile.is-complete .count-tile__stamp {
  opacity: 1;
  transform: rotate(var(--rot-sticker));
  transition: opacity var(--dur-tap) var(--ease-stab) 120ms, transform var(--dur-ui) var(--ease-stab) 120ms;
}

/* ── The "and": MIDI, the pickup ────────────────── */
.count-and {
  position: relative;
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 14px 8px 10px;
  background: var(--ink-2);
  color: var(--ivory-3);
  clip-path: var(--clip-offcut);
}

.count-and__glyph {
  padding: 4px 0 2px 6px;
  font: 700 clamp(40px, 12cqi, 56px)/1 var(--font-display);
  color: transparent;
  -webkit-text-stroke: 1.5px var(--ivory-4);
}

.count-and__copy { display: grid; min-width: 0; gap: 3px; }

.count-and__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font: 700 17px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.count-and__label small {
  font: 700 9px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  opacity: .8;
}

.count-and__icon { width: 16px; height: 16px; flex: 0 0 auto; }

.count-and__detail {
  display: -webkit-box;
  overflow: hidden;
  font: var(--t-caption);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.count-and__stamp { opacity: 0; }
.count-and__stamp.is-visible { opacity: 1; }
.count-and__stamp :deep(.sticker) { font-size: 12px; padding: 4px 8px 3px; }

.count-and.is-active { color: var(--ivory); }
.count-and.is-active .count-and__glyph { -webkit-text-stroke-color: var(--ivory); animation: count-beat var(--count-beat) var(--ease-stab) calc(var(--count-beat) / 2) infinite; }

.count-and.is-complete {
  background: var(--and-paper);
  color: var(--ivory);
  animation: count-slap var(--dur-scene) var(--ease-stab) both;
}

.count-and.is-complete .count-and__glyph { color: var(--ivory); -webkit-text-stroke-color: transparent; }

/* ── Foot: status and the gate ──────────────────── */
.loading-screen__foot { display: grid; gap: clamp(10px, 1.6cqh, 16px); }

.loading-screen__credits { grid-column: 1 / -1; }

.loading-screen__readout {
  display: grid;
  min-height: 34px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.loading-screen__status {
  display: grid;
  min-width: 0;
  gap: 2px;
  margin: 0;
}

.loading-screen__status strong {
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.loading-screen__status span {
  color: var(--ivory-3);
  font: var(--t-caption);
  overflow-wrap: anywhere; /* raw error text can carry an unbroken URL */
}

.loading-screen.is-error .loading-screen__status span { color: var(--ivory-2); }

.loading-screen__percent {
  grid-column: 2;
  font: 700 34px/1 var(--font-display);
  font-variant-numeric: tabular-nums;
}

.count-gate,
.count-gate-slot {
  position: relative;
  display: flex;
  width: 100%;
  height: var(--gate-height);
  align-items: center;
  justify-content: center;
}

.count-gate {
  flex-direction: column;
  gap: 8px;
  border: 0;
  clip-path: var(--clip-tab);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  animation: count-gate-in var(--dur-scene) var(--ease-swing) both;
}

/* Brass is the single signal, and it lives only here. The finish, its edge
   shadows and its sheen come from the shared .brass owner in the design system;
   the gate adds only its own geometry above. */

/* The recovery gates are paper, never Brass: Ivory for the cue, Tomato to take it from the top. */
.count-gate--cue { background: var(--ivory); color: var(--ink); }
.count-gate--retry { background: var(--tomato); color: var(--ivory); }

.count-gate--cue .count-gate__label,
.count-gate--retry .count-gate__label { font-size: clamp(24px, 7cqi, 36px); letter-spacing: .08em; }

.count-gate:disabled { cursor: wait; opacity: .6; }

.count-gate__label {
  display: inline-flex;
  align-items: center;
  gap: .3em;
  font: 700 clamp(30px, 9cqi, 44px)/1 var(--font-display);
  letter-spacing: .14em;
}

.count-gate__label > span { font-size: .5em; }

.count-gate__sub {
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

/* The fallback sits beside the retry gate at gate height, so the tiles keep their room. */
.count-gates { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.count-gates > :only-child { grid-column: 1 / -1; }

.count-fallback {
  display: grid;
  width: clamp(92px, 26cqi, 140px);
  height: var(--gate-height);
  place-content: center;
  gap: 4px;
  padding: 8px 10px;
  border: 0;
  background: var(--ink-2);
  color: var(--ivory-2);
  clip-path: var(--clip-tab);
  cursor: pointer;
  font: 700 10px/1.2 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-align: center;
  text-transform: uppercase;
  -webkit-tap-highlight-color: transparent;
  animation: count-gate-in var(--dur-scene) var(--ease-swing) both;
}

.count-fallback strong {
  font: 700 clamp(15px, 4.4cqi, 20px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  color: var(--ivory);
}

.count-fallback:disabled { cursor: wait; opacity: .6; }
.count-fallback:not(:disabled):hover { background: var(--ink-3); color: var(--ivory); }
.count-fallback:not(:disabled):active { transform: translateY(1px); }
.count-fallback:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }

.count-gate:not(:disabled):active { transform: translateY(2px); }
.count-gate:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }

.count-gate-slot {
  gap: 10px;
  background: var(--ink-2);
  color: var(--ivory-3);
  clip-path: var(--clip-tab);
}

.count-gate-slot__beat {
  width: 10px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--ivory-4);
  animation: count-tick calc(var(--count-beat) * 4) var(--ease-stab) calc(var(--beat-index) * var(--count-beat)) infinite;
}

.count-gate-slot__beat:first-child { background: var(--tomato); }

.count-gate-slot__copy {
  margin-left: 6px;
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.loading-screen__skip {
  position: absolute;
  z-index: 8;
  top: max(10px, env(safe-area-inset-top));
  right: 10px;
  min-height: 28px;
  padding: 6px 12px;
  border: 0;
  background: var(--ink-3);
  color: var(--ivory-3);
  clip-path: var(--clip-tab);
  cursor: pointer;
  font: 700 9px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  opacity: .68;
}

/* ── Desktop: poster left, count right ──────────── */
@container (min-width: 820px) {
  .loading-screen__stage {
    --count-logo: clamp(160px, 18cqi, 240px);
    --gate-height: clamp(84px, 11cqh, 110px);

    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    column-gap: clamp(32px, 5cqi, 80px);
    padding: clamp(28px, 4cqi, 56px);
  }

  .loading-screen__head {
    grid-template-columns: 1fr;
    align-content: center;
    align-items: start;
    justify-items: start;
    gap: 28px;
  }

  .loading-screen__title { font-size: clamp(72px, 9cqi, 132px); }
  .loading-screen__board { grid-column: 2; grid-row: 1; }
  .loading-screen__foot { grid-column: 1 / -1; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); column-gap: clamp(32px, 5cqi, 80px); align-items: end; }
  .count-tile__number { font-size: clamp(110px, 13cqh, 200px); }
}

@container (max-height: 700px) {
  .loading-screen__stage { --count-logo: 64px; --gate-height: 68px; }
  .loading-screen__title { font-size: 40px; }
  .count-tile__number { font-size: clamp(56px, 12cqh, 120px); }
  .count-tile__word { display: none; }
}

/* ── Keyframes ──────────────────────────────────── */
@keyframes count-beat {
  0% { transform: scale(1.08) rotate(-2deg); }
  40%, 100% { transform: scale(1) rotate(0); }
}

@keyframes count-slap {
  0% { opacity: 0; transform: scale(1.22) rotate(-7deg); }
  60% { opacity: 1; transform: scale(.98) rotate(var(--tile-tilt, 0deg)); }
  100% { opacity: 1; transform: scale(1) rotate(var(--tile-tilt, 0deg)); }
}

@keyframes count-gate-in {
  from { opacity: 0; transform: translateY(60%) rotate(-3deg); }
  to { opacity: 1; transform: none; }
}

@keyframes count-tick {
  0% { transform: scale(1.7); background: var(--ivory); }
  25%, 100% { transform: scale(1); }
}

@keyframes count-float {
  from { translate: 0 -6px; }
  to { translate: 0 6px; }
}

@keyframes count-logo-beat {
  0% { opacity: 1; transform: scale(1.5); }
  22%, 100% { opacity: .5; transform: scale(1); }
}

@keyframes count-logo-slap {
  0% { transform: rotate(-1.4deg) scale(1.025); }
  30%, 100% { transform: rotate(0) scale(1); }
}

/* ── Still frame: Reduced Motion, or forced for review ── */
.loading-screen.is-still *,
.loading-screen.is-still *::after,
.loading-screen.is-still :deep(*) { animation: none !important; transition: none !important; }

@media (prefers-reduced-motion: reduce) {
  .loading-screen *,
  .loading-screen *::after,
  .loading-screen :deep(*) { animation: none !important; transition: none !important; }
}

@media (forced-colors: active) {
  .count-tile.is-complete,
  .count-and.is-complete { background: Highlight; color: HighlightText; }
  .count-gate,
  .count-fallback,
  .loading-screen__skip { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; }
}
</style>
