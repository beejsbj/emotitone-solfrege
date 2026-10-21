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

  it("opens the fallback gate once the required beats land, without waiting on optional MIDI", async () => {
    const wrapper = mount(LoadingScreen, { props: { progress: 95 } });
    expect(wrapper.find(".count-gate--play").exists()).toBe(false);

    await wrapper.setProps({ progress: 97 });
    expect(wrapper.findAll(".count-tile").every((tile) => tile.classes().includes("is-complete"))).toBe(true);
    expect(wrapper.get(".count-and").classes()).toContain("is-active"); // MIDI still resolving
    expect(wrapper.classes()).toContain("is-ready");
    expect(wrapper.find(".count-gate--play").exists()).toBe(true);
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

  it("lets an error win over ready: a completed load with an error offers Retry, never Play", () => {
    const failed = mount(LoadingScreen, {
      props: { progress: 100, isComplete: true, hasError: true, errorMessage: "Instrument initialization timeout" },
    });

    expect(failed.classes()).toContain("is-error");
    expect(failed.classes()).not.toContain("is-ready");
    expect(failed.find(".count-gate--play").exists()).toBe(false);
    expect(failed.find(".count-gate--retry").exists()).toBe(true);
    expect(failed.text()).toContain("Instrument initialization timeout");
  });

  it("lets the audio cue win over ready once the browser blocks the Play tap", () => {
    const blocked = mount(LoadingScreen, {
      props: { progress: 67, isComplete: true, needsAudioInteraction: true, hasError: true },
    });

    expect(blocked.classes()).toContain("is-cue");
    expect(blocked.find(".count-gate--play").exists()).toBe(false);
    expect(blocked.find(".count-gate--retry").exists()).toBe(false);
    expect(blocked.find(".count-gate--cue").exists()).toBe(true);
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

  it("keeps the stage list, the progressbar and the live status separate", async () => {
    const wrapper = mount(LoadingScreen, { props: { progress: 57, phase: "Loading samples", message: "Piano" } });

    // The stage list stays a real list: no role override that would make its items presentational.
    const list = wrapper.get("ol.loading-screen__tiles");
    expect(list.attributes("role")).toBeUndefined();
    expect(list.attributes("aria-label")).toBe("Loading stages");
    expect(list.findAll("li")).toHaveLength(4);
    expect(list.find('[role="progressbar"]').exists()).toBe(false);

    // Progress lives on its own element, outside the live region.
    const bar = wrapper.get('[role="progressbar"]');
    expect(bar.element.tagName).not.toBe("OL");
    expect(bar.attributes()).toMatchObject({ "aria-valuenow": "57", "aria-valuemin": "0", "aria-valuemax": "100" });
    const status = wrapper.get('[role="status"]');
    expect(status.attributes("aria-live")).toBe("polite");
    expect(status.element.contains(bar.element)).toBe(false);
    expect(status.text()).not.toMatch(/\d+%/);

    // A percent tick changes the bar but not the announced text.
    const announced = status.text();
    await wrapper.setProps({ progress: 58 });
    expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBe("58");
    expect(wrapper.get('[role="status"]').text()).toBe(announced);

    await wrapper.setProps({ showProgress: false });
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.get("ol.loading-screen__tiles").attributes("aria-label")).toBe("Loading stages");
  });

  it("renders a composed still frame for Reduced Motion", () => {
    const still = mount(LoadingScreen, { props: { still: true } });
    expect(still.classes()).toContain("is-still");
    expect(loadingScreenSource).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation: none !important/s);
  });
});
