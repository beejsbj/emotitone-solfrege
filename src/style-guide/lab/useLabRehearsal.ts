import { computed, onBeforeUnmount, ref } from "vue";
import type { LabLoadingStage, LabMidiOutcome } from "@/types/styleGuide";

/**
 * Guide-only load rehearsal. Reproduces the production splash contract —
 * four required stages, then MIDI Input last and optional with a truthful
 * outcome — on a clock the lab can replay, step, or jump to ready.
 */

interface RequiredStage {
  label: string;
  phase: string;
  message: string;
  start: number;
  end: number;
  duration: number;
}

const REQUIRED: RequiredStage[] = [
  { label: "Visual stage", phase: "Setting the visual stage", message: "Preparing the room where sound becomes shape.", start: 0, end: 18, duration: 1100 },
  { label: "Instrument samples", phase: "Loading instrument samples", message: "Gathering the sounds for your first notes.", start: 18, end: 64, duration: 2600 },
  { label: "Audio system", phase: "Warming the audio system", message: "Audio ready (will enable when you start).", start: 64, end: 90, duration: 1300 },
  { label: "Ready to play", phase: "Tuning the last string", message: "Everything is almost in tune.", start: 90, end: 100, duration: 600 },
];

const MIDI_DURATION = 1100;

// Copy mirrors LoadingSplash.vue so each direction is judged on real strings.
const MIDI_COPY: Record<LabMidiOutcome | "checking", { detail: string; stamp: string }> = {
  checking: { detail: "Requesting browser MIDI access.", stamp: "" },
  set: { detail: "MIDI ready. Connect a controller anytime.", stamp: "SET" },
  skip: { detail: "MIDI permission was not granted; touch and QWERTY still work.", stamp: "SKIP" },
  na: { detail: "MIDI is unavailable in this browser; touch and QWERTY still work.", stamp: "N/A" },
};

/** Total steps: four required stages plus the optional MIDI check. */
export const LAB_STEP_COUNT = REQUIRED.length + 1;

export function useLabRehearsal(initial: { step?: number; fraction?: number; running?: boolean } = {}) {
  /** Number of completed stages, 0–5. */
  const step = ref(Math.min(LAB_STEP_COUNT, Math.max(0, initial.step ?? 0)));
  /** Progress through the active stage, 0–1. */
  const fraction = ref(initial.fraction ?? 0);
  const running = ref(initial.running ?? true);
  const midiOutcome = ref<LabMidiOutcome>("set");

  let frame = 0;
  let last = 0;

  const tick = (now: number) => {
    const elapsed = last ? now - last : 0;
    last = now;
    if (running.value && step.value < LAB_STEP_COUNT) {
      const duration = step.value < REQUIRED.length ? REQUIRED[step.value].duration : MIDI_DURATION;
      fraction.value += elapsed / duration;
      if (fraction.value >= 1) {
        step.value += 1;
        fraction.value = 0;
      }
    }
    if (step.value >= LAB_STEP_COUNT) running.value = false;
    frame = running.value ? requestAnimationFrame(tick) : 0;
  };

  const start = () => {
    if (frame) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  const replay = () => {
    stop();
    step.value = 0;
    fraction.value = 0;
    running.value = true;
    start();
  };

  const jumpReady = () => {
    stop();
    running.value = false;
    step.value = LAB_STEP_COUNT;
    fraction.value = 0;
  };

  const stepOnce = () => {
    stop();
    running.value = false;
    step.value = step.value >= LAB_STEP_COUNT ? 0 : step.value + 1;
    fraction.value = step.value < LAB_STEP_COUNT ? .5 : 0;
  };

  const ready = computed(() => step.value >= REQUIRED.length);

  const percent = computed(() => {
    if (ready.value) return 100;
    const stage = REQUIRED[step.value];
    return Math.round(stage.start + (stage.end - stage.start) * Math.min(1, fraction.value));
  });

  const stages = computed<LabLoadingStage[]>(() => {
    const midiDone = step.value >= LAB_STEP_COUNT;
    const midi = MIDI_COPY[midiDone ? midiOutcome.value : "checking"];
    const required = REQUIRED.map((stage, index) => ({
      label: stage.label,
      complete: index < step.value,
      active: index === step.value,
    }));
    return [
      ...required,
      {
        label: "MIDI input",
        icon: "midi" as const,
        optional: true,
        complete: midiDone,
        active: step.value === REQUIRED.length,
        detail: step.value >= REQUIRED.length ? midi.detail : "A connected controller may trigger a browser MIDI permission request.",
        stamp: midiDone ? midi.stamp : undefined,
      },
    ];
  });

  const phase = computed(() => (ready.value ? "Ready to play" : REQUIRED[step.value].phase));
  const message = computed(() => (
    ready.value ? "Everything is tuned. Your first note is waiting." : REQUIRED[step.value].message
  ));

  /** 0–1 fraction inside the active required stage; 1 once ready. */
  const stageFraction = computed(() => (ready.value ? 1 : Math.min(1, fraction.value)));

  if (running.value) start();
  onBeforeUnmount(stop);

  return {
    step,
    running,
    midiOutcome,
    ready,
    percent,
    stages,
    phase,
    message,
    stageFraction,
    replay,
    jumpReady,
    stepOnce,
  };
}
