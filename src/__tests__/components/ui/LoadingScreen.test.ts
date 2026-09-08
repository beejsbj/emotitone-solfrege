import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import LoadingScreen from "@/components/compositions/LoadingScreen.vue";

vi.mock("@/components/MidiPermissionIcon.vue", () => ({
  default: { template: '<span data-testid="midi-icon" />' },
}));

describe("LoadingScreen", () => {
  it("renders the accepted loading anatomy and development action", async () => {
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
    expect(wrapper.text()).toContain("EMOTITONE");
    expect(wrapper.text()).toContain("LET'S MAKESOME MUSIC.");
    expect(wrapper.text()).toContain("Tuning the room");
    expect(wrapper.text()).toContain("57%");
    expect(wrapper.text()).toContain("Loading samples");
    expect(wrapper.findAll(".converged-loader__bars > .is-filled")).toHaveLength(13);
    const lanes = wrapper.findAll(".converged-loader__lane");
    expect(lanes).toHaveLength(12);
    expect(new Set(lanes.map((lane) => lane.attributes("style").match(/--lane-neutral:\s*([^;]+)/)?.[1])))
      .toEqual(new Set(["var(--ink)", "var(--ivory)"]));
    expect(wrapper.findAll(".converged-loader__floating-mark")).toHaveLength(5);
    const midiStage = wrapper.findAll(".converged-loader__stages li").at(-1)!;
    expect(midiStage.text()).toContain("MIDI input");
    expect(midiStage.attributes("aria-label")).toContain("pending");
    expect(wrapper.find('[data-testid="midi-icon"]').exists()).toBe(true);

    await wrapper.setProps({ progress: 99 });
    expect(wrapper.findAll(".converged-loader__bars > .is-filled")).toHaveLength(23);

    await wrapper.get(".converged-loader__skip").trigger("click");
    expect(wrapper.emitted("skip")).toHaveLength(1);
  });

  it("emits start from the brass completion gate", async () => {
    const wrapper = mount(LoadingScreen, {
      props: {
        progress: 100,
        isComplete: true,
      },
    });

    expect(wrapper.classes()).toContain("is-ready");
    const play = wrapper.get(".converged-loader__completion-action");
    expect(play.attributes("aria-label")).toBe("Play EmotiTone");
    await play.trigger("click");
    expect(wrapper.emitted("start")).toHaveLength(1);
  });

  it("retains retry and audio-interaction states in the same composition", async () => {
    const errored = mount(LoadingScreen, {
      props: {
        progress: 48,
        isComplete: false,
        hasError: true,
        errorMessage: "Instrument initialization timeout",
      },
    });

    expect(errored.text()).toContain("Instrument initialization timeout");
    await errored.get(".converged-loader__state-action--retry").trigger("click");
    expect(errored.emitted("retry")).toHaveLength(1);

    const audio = mount(LoadingScreen, {
      props: {
        progress: 20,
        isComplete: false,
        needsAudioInteraction: true,
      },
    });

    await audio.get(".converged-loader__state-action").trigger("click");
    expect(audio.emitted("enable-audio")).toHaveLength(1);
  });
});
