import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import beatIndicatorSource from "@/components/compounds/BeatIndicator.vue?raw";
import Mark from "@/components/primatives/Mark.vue";
import Sticker from "@/components/primatives/Sticker.vue";
import { MARK_DEFINITIONS, MARK_NAMES, markViewBox } from "@/components/primatives/marks";
import { provideUIBeat, UIBeatClock } from "@/composables/useUIBeat";

describe("Mark lineage", () => {
  it("exposes every structural and musical glyph through one registry", () => {
    expect(MARK_NAMES).toHaveLength(29);
    expect(MARK_NAMES).toContain("triangle");
    expect(MARK_NAMES).toContain("square");
    expect(MARK_NAMES).toContain("clef");
    expect(MARK_NAMES).toContain("natural");
    expect(MARK_NAMES).toContain("quarter-rest");
    expect(MARK_NAMES).toContain("bass-clef");
    expect(MARK_NAMES).not.toContain("sparkle");
    expect(MARK_NAMES).not.toContain("mist");
  });

  it("renders the SVG primitive from the authoritative path definition", () => {
    const wrapper = mount(Mark, { props: { name: "clef" } });

    expect(wrapper.attributes("viewBox")).toBe(markViewBox("clef"));
    expect(wrapper.findAll("path")).toHaveLength(MARK_DEFINITIONS.clef.paths.length);
  });

  it("routes marked content through the authoritative Sticker seam", () => {
    const wrapper = mount(Sticker, {
      props: { variant: "fill", color: "tomato", mark: "diamond" },
      slots: { default: "Section 03" },
    });

    expect(wrapper.find(".sticker--marked").exists()).toBe(true);
    expect(wrapper.find(".sticker__marked-text").text()).toBe("Section 03");
    expect(wrapper.find("svg.mark").attributes("data-mark")).toBe("diamond");
  });

  it("builds Beat Indicator cells from a selected Mark set", () => {
    const wrapper = mount(BeatIndicator, {
      props: { beats: 5, marks: ["disk", "eighth"] },
    });

    expect(wrapper.findAll(".beat-indicator__beat")).toHaveLength(5);
    expect(wrapper.findAll("svg.mark")).toHaveLength(5);
    expect(wrapper.findAll(".beat-indicator__beat").map((beat) => beat.attributes("data-mark"))).toEqual([
      "disk", "eighth", "disk", "eighth", "disk",
    ]);
  });

  it("defaults to four repeated square Marks", () => {
    const wrapper = mount(BeatIndicator);

    expect(wrapper.findAll(".beat-indicator__beat")).toHaveLength(4);
    expect(wrapper.findAll(".beat-indicator__beat").map((beat) => beat.attributes("data-mark")))
      .toEqual(["square", "square", "square", "square"]);
    expect(wrapper.findAll("svg.mark").every((mark) => mark.attributes("data-mark") === "square"))
      .toBe(true);
  });

  it("renders one injected transport frame without owning a timer", () => {
    const clock = new UIBeatClock({
      observeEnvironment: false,
      reducedMotion: () => false,
      documentVisible: () => true,
    });
    const Host = defineComponent({
      components: { BeatIndicator },
      setup() {
        provideUIBeat({ clock, presentationEnabled: () => true });
      },
      template: '<BeatIndicator :beats="4" :marks="[\'disk\', \'eighth\']" />',
    });
    const wrapper = mount(Host);
    const generation = clock.arm({
      mappingAvailable: true,
      bpm: 120,
      meter: { beatsPerBar: 4, beatUnit: 4 },
    });

    const cells = wrapper.findAll(".beat-indicator__beat");
    clock.publish(generation, { rawPosition: 0.25, barPosition: 0.25 });
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("running");
    expect(cells[0].attributes("style")).toContain("opacity: 0.14");
    expect(cells[1].attributes("style")).toContain("scale(0.780)");
    expect(cells[1].attributes("style")).toContain("opacity: 0.220");

    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(cells[1].attributes("style")).toContain("scale(1.420)");
    expect(cells[1].attributes("style")).toContain("opacity: 1");

    clock.publish(generation, { rawPosition: 0.035, barPosition: 0.035 });
    expect(cells[0].attributes("style")).toContain("scale(1.520)");

    clock.stop(generation);
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("idle");
    expect(cells[0].attributes("style")).toContain("scale(1)");
    expect(beatIndicatorSource).toMatch(
      /\.beat-indicator__beat--downbeat\s*\{[^}]*opacity: 1 !important;[^}]*transform: none !important;/s,
    );
    wrapper.unmount();
    clock.destroy();
  });

  it("keeps transport phase independent from the provider's presentation gate", async () => {
    const presentationEnabled = ref(false);
    const clock = new UIBeatClock({
      observeEnvironment: false,
      reducedMotion: () => false,
      documentVisible: () => true,
    });
    const Host = defineComponent({
      components: { BeatIndicator },
      setup() {
        provideUIBeat({
          clock,
          presentationEnabled: () => presentationEnabled.value,
        });
      },
      template: '<BeatIndicator :beats="4" :marks="[\'disk\', \'eighth\']" />',
    });
    const wrapper = mount(Host);
    const generation = clock.arm({
      mappingAvailable: true,
      bpm: 120,
      meter: { beatsPerBar: 4, beatUnit: 4 },
    });

    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(clock.snapshot.status).toBe("running");
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("idle");

    presentationEnabled.value = true;
    await nextTick();
    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("running");
    wrapper.unmount();
    clock.destroy();
  });
});
