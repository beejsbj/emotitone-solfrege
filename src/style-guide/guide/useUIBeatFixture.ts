import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import {
  provideUIBeat,
  UIBeatClock,
  type UIBeatMeter,
} from "@/composables/useUIBeat";

interface UIBeatFixtureOptions {
  bpm: Ref<number>;
  meter: Ref<UIBeatMeter>;
  autoplay?: boolean;
}

/**
 * Guide-only transport. Provides one isolated UIBeat clock to the calling
 * specimen's subtree and drives it from requestAnimationFrame, so real
 * consumers show beat motion without attaching to production playback.
 * Tempo changes keep the current bar position; meter changes restart the bar.
 */
export function useUIBeatFixture({
  bpm,
  meter,
  autoplay = true,
}: UIBeatFixtureOptions) {
  const running = ref(false);
  const clock = new UIBeatClock();
  provideUIBeat({ clock, presentationEnabled: () => true });

  let generation = 0;
  let frame: number | null = null;
  let barPosition = 0;
  let previousTimestamp: number | null = null;

  function cancelFrame() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }

  function tick(timestamp: number) {
    if (!running.value) return;
    const beatDuration = 60_000 / bpm.value;
    const barDuration = beatDuration * meter.value.beatsPerBar;
    const elapsed = previousTimestamp === null
      ? 0
      : Math.max(0, timestamp - previousTimestamp);
    previousTimestamp = timestamp;
    barPosition += elapsed / barDuration;
    clock.publish(generation, { rawPosition: barPosition, barPosition });
    frame = requestAnimationFrame(tick);
  }

  function start() {
    cancelFrame();
    barPosition = 0;
    previousTimestamp = null;
    generation = clock.arm({
      mappingAvailable: true,
      bpm: bpm.value,
      meter: meter.value,
    });
    running.value = true;
    frame = requestAnimationFrame(tick);
  }

  function preserveTempoPhase() {
    if (!running.value) return;
    generation = clock.arm({
      mappingAvailable: true,
      bpm: bpm.value,
      meter: meter.value,
    });
    clock.publish(generation, { rawPosition: barPosition, barPosition });
    previousTimestamp = performance.now();
  }

  function stop() {
    cancelFrame();
    running.value = false;
    clock.stop(generation);
  }

  function toggle() {
    if (running.value) stop();
    else start();
  }

  watch(bpm, preserveTempoPhase);
  watch(meter, () => {
    if (running.value) start();
  });

  onMounted(() => {
    if (autoplay) start();
  });
  onBeforeUnmount(() => {
    stop();
    clock.destroy();
  });

  return { running, toggle };
}
