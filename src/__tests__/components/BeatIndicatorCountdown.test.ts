import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import beatIndicatorSource from "@/components/compounds/BeatIndicator.vue?raw";
import { provideUIBeat, UIBeatClock } from "@/composables/useUIBeat";

/**
 * The beat dots' countdown (the latch's closing bar): fed in as a prop, so the
 * compound stays store-free, and stepped by that prop, not by beat frames.
 */
function mountCountdown(reducedMotion: boolean) {
  const clock = new UIBeatClock({ observeEnvironment: false, reducedMotion: () => reducedMotion, documentVisible: () => true });
  const countdown = ref<number | null>(null);
  const Host = defineComponent({
    setup() {
      provideUIBeat({ clock, presentationEnabled: () => true });
      return () => h(BeatIndicator, { countdown: countdown.value }, () => h("button", "Play"));
    },
  });
  const generation = clock.arm({ mappingAvailable: true, bpm: 120, meter: { beatsPerBar: 4, beatUnit: 4 } });
  clock.publish(generation, { rawPosition: 2.1, barPosition: 2.1 });
  const wrapper = mount(Host);
  const root = () => wrapper.get(".beat-indicator");
  const state = () => ({
    countdown: root().attributes("data-beat-countdown"),
    lit: wrapper.findAll(".beat-indicator__beat--lit").map((chad) => chad.attributes("data-beat")),
    drained: wrapper.findAll(".beat-indicator__beat--drained").map((chad) => chad.attributes("data-beat")),
  });
  return { wrapper, clock, generation, countdown, root, state };
}

describe("BeatIndicator countdown", () => {
  it("drains from the right as the prop counts down, and gives the dots back to the beat after", async () => {
    const { wrapper, clock, generation, countdown, root, state } = mountCountdown(false);
    countdown.value = 4;
    await nextTick();
    expect(state()).toEqual({ countdown: "4", lit: ["1", "2", "3", "4"], drained: [] });
    countdown.value = 2;
    await nextTick();
    expect(state()).toEqual({ countdown: "2", lit: ["1", "2"], drained: ["3", "4"] });
    // Beat frames do not take the dots back while counting down.
    clock.publish(generation, { rawPosition: 2.6, barPosition: 2.6 });
    expect(state()).toEqual({ countdown: "2", lit: ["1", "2"], drained: ["3", "4"] });
    countdown.value = null;
    await nextTick();
    expect(state().countdown).toBeUndefined();
    expect(state().drained).toEqual([]);
    expect(root().attributes("data-ui-beat-state")).not.toBe("countdown");
    wrapper.unmount();
    clock.destroy();
  });

  it("steps under Reduced Motion, where no beat frames arrive, without animated transitions", async () => {
    const { wrapper, clock, countdown, state } = mountCountdown(true);
    for (const left of [4, 3, 2, 1]) {
      countdown.value = left;
      await nextTick();
      expect(state().lit).toHaveLength(left);
      expect(state().drained).toHaveLength(4 - left);
    }
    // The drained chad fades normally; Reduced Motion turns every chad's transition off.
    expect(beatIndicatorSource).toMatch(/\.beat-indicator \.beat-indicator__beat--drained \{[^}]*transition:/);
    const reduced = beatIndicatorSource.slice(beatIndicatorSource.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.beat-indicator__beat \{\s*transition: none !important;/);
    wrapper.unmount();
    clock.destroy();
  });
});
