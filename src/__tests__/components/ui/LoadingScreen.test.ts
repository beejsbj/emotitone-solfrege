import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import LoadingScreen from "@/components/compositions/LoadingScreen.vue";

vi.mock("@/components/MidiPermissionIcon.vue", () => ({
  default: { template: '<span data-testid="midi-icon" />' },
}));

describe("LoadingScreen", () => {
  it("renders progress and emits the app actions", async () => {
    const wrapper = mount(LoadingScreen, {
      props: {
        progress: 57,
        phaseLabel: "Tuning the room...",
        stepMessage: "Loading samples",
        midiMessage: "MIDI ready",
        showMidiMessage: true,
        isDev: true,
        mode: "app",
      },
    });

    expect(wrapper.text()).toContain("Tuning the room");
    expect(wrapper.text()).toContain("57% · 120 BPM");
    expect(wrapper.text()).toContain("Loading samples");
    expect(wrapper.text()).toContain("MIDI ready");
    expect(wrapper.findAll(".loading-screen__note--lit")).toHaveLength(3);

    await wrapper.get(".loading-screen__skip").trigger("click");
    expect(wrapper.emitted("skip")).toHaveLength(1);
  });

  it("renders ready and error states from the same source composition", async () => {
    const ready = mount(LoadingScreen, {
      props: {
        isComplete: true,
        checks: [
          { label: "Audio system", complete: true },
          { label: "Visual engine", complete: true },
        ],
      },
    });

    expect(ready.text()).toContain("Audio system");
    expect(ready.text()).toContain("Visual engine");
    await ready.get(".loading-screen__button--start").trigger("click");
    expect(ready.emitted("start")).toHaveLength(1);

    const errored = mount(LoadingScreen, {
      props: {
        hasError: true,
        errorMessage: "Instrument initialization timeout",
      },
    });

    expect(errored.text()).toContain("Instrument initialization timeout");
    await errored.get(".loading-screen__button").trigger("click");
    expect(errored.emitted("retry")).toHaveLength(1);
  });
});
