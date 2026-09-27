import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import LoadingScreen from "@/components/compositions/LoadingScreen.vue";
import loadingScreenSource from "@/components/compositions/LoadingScreen.vue?raw";

vi.mock("@/components/MidiPermissionIcon.vue", () => ({
  default: { template: '<span data-testid="midi-icon" />' },
}));

describe("LoadingScreen · Count-In", () => {
  it("counts the four required stages in as beats, with MIDI as the optional “and”", async () => {
    const wrapper = mount(LoadingScreen, {
      props: {
        progress: 57,
        phase: "Tuning the room...",
        message: "Loading samples",
        isDev: true,
        mode: "app",
      },
    });

    expect(wrapper.classes()).toContain("loading-screen--app");
    expect(wrapper.find(".brand-logo").exists()).toBe(true);
    expect(wrapper.text()).toContain("EMOTITONE");
    expect(wrapper.text()).toContain("COUNTIT IN.");
    expect(wrapper.text()).toContain("Tuning the room");
    expect(wrapper.text()).toContain("57%");
    expect(wrapper.text()).toContain("Loading samples");

    const progress = wrapper.get('[role="progressbar"]');
    expect(progress.attributes("aria-valuenow")).toBe("57");

    const tiles = wrapper.findAll(".count-tile");
    expect(tiles.map((tile) => tile.find(".count-tile__label").text())).toEqual([
      "Visual stage",
      "Instrument samples",
      "Audio system",
      "Ready to play",
    ]);
    expect(tiles.map((tile) => tile.classes().find((name) => name.startsWith("is-")))).toEqual([
      "is-complete",
      "is-active",
      "is-pending",
      "is-pending",
    ]);
    expect(tiles[1].attributes("aria-current")).toBe("step");

    const midi = wrapper.get(".count-and");
    expect(midi.text()).toContain("MIDI input");
    expect(midi.text()).toContain("optional");
    expect(midi.attributes("aria-label")).toContain("pending");
    expect(wrapper.find('[data-testid="midi-icon"]').exists()).toBe(true);

    // The gate stays shut until ready: no Play, only the waiting slot.
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);
    expect(wrapper.find(".count-gate-slot").exists()).toBe(true);

    await wrapper.get(".loading-screen__skip").trigger("click");
    expect(wrapper.emitted("skip")).toHaveLength(1);
  });

  it("emits start from the Brass Play gate, the only Brass on the screen", async () => {
    const wrapper = mount(LoadingScreen, {
      props: {
        progress: 100,
        isComplete: true,
      },
    });

    expect(wrapper.classes()).toContain("is-ready");
    const play = wrapper.get(".count-gate--play");
    expect(play.attributes("aria-label")).toBe("Play EmotiTone");
    await play.trigger("click");
    expect(wrapper.emitted("start")).toHaveLength(1);

    // The gate wears the shared .brass owner; the composition never re-derives the finish.
    expect(play.classes()).toContain("brass");
    expect(wrapper.findAll(".brass")).toHaveLength(1);
    const style = loadingScreenSource.slice(loadingScreenSource.indexOf("<style"));
    expect(style).not.toMatch(/--brass-|brass-sheen|--shadow-glow-brass/);
  });

  it("holds the count on error and offers Retry, never Play", async () => {
    const errored = mount(LoadingScreen, {
      props: {
        progress: 48,
        isComplete: false,
        hasError: true,
        errorMessage: "Instrument initialization timeout",
      },
    });

    expect(errored.classes()).toContain("is-error");
    expect(errored.text()).toContain("Soundcheck interrupted");
    expect(errored.text()).toContain("Instrument initialization timeout");
    expect(errored.text()).toContain("FROM THE TOP");
    expect(errored.get(".count-tile.is-held").text()).toContain("STOP");
    expect(errored.find(".count-gate--play").exists()).toBe(false);
    await errored.get(".count-gate--retry").trigger("click");
    expect(errored.emitted("retry")).toHaveLength(1);
  });

  it("asks for the audio cue instead of surfacing the raw audio error", async () => {
    const audio = mount(LoadingScreen, {
      props: {
        progress: 20,
        isComplete: false,
        needsAudioInteraction: true,
        hasError: true,
        errorMessage: "Raw audio context error",
      },
    });

    expect(audio.classes()).toContain("is-cue");
    expect(audio.classes()).not.toContain("is-error");
    expect(audio.text()).toContain("Audio needs a tap");
    expect(audio.text()).toContain("browser needs permission");
    expect(audio.text()).not.toContain("Raw audio context error");
    expect(audio.find(".count-gate--retry").exists()).toBe(false);
    const cue = audio.get(".count-gate--cue");
    expect(cue.text()).toContain("ENABLE AUDIO");
    await cue.trigger("click");
    expect(audio.emitted("enable-audio")).toHaveLength(1);

    await audio.setProps({ audioInitializing: true });
    expect(audio.get(".count-gate--cue").attributes("disabled")).toBeDefined();
    expect(audio.get(".count-gate--cue").text()).toContain("ENABLING");
  });

  it("renders a composed still frame for Reduced Motion", () => {
    const still = mount(LoadingScreen, { props: { still: true } });
    expect(still.classes()).toContain("is-still");
    expect(loadingScreenSource).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation: none !important/s);
  });
});
