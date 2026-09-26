import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import beatIndicatorSource from "@/components/compounds/BeatIndicator.vue?raw";
import Mark from "@/components/primatives/Mark.vue";
import Sticker from "@/components/primatives/Sticker";
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

});

function mountWithClock(template: string, presentationEnabled: () => boolean = () => true) {
  const clock = new UIBeatClock({
    observeEnvironment: false,
    reducedMotion: () => false,
    documentVisible: () => true,
  });
  const Host = defineComponent({
    components: { BeatIndicator },
    setup() {
      provideUIBeat({ clock, presentationEnabled });
    },
    template,
  });
  return { clock, wrapper: mount(Host) };
}

const armFourFour = (clock: UIBeatClock) => clock.arm({
  mappingAvailable: true,
  bpm: 120,
  meter: { beatsPerBar: 4, beatUnit: 4 },
});

describe("Beat Indicator ring", () => {
  it("draws one knob-style segment per beat over a full-circle track", () => {
    const wrapper = mount(BeatIndicator, { props: { beats: 5 } });
    const beats = wrapper.findAll(".beat-indicator__beat");

    expect(beats).toHaveLength(5);
    expect(beats.map((beat) => beat.attributes("data-beat"))).toEqual(["1", "2", "3", "4", "5"]);
    expect(beats[0].classes()).toContain("beat-indicator__beat--downbeat");
    expect(beats.slice(1).some((beat) => beat.classes().includes("beat-indicator__beat--downbeat")))
      .toBe(false);
    beats.forEach((beat) => {
      expect(beat.attributes("d").match(/A /g)).toHaveLength(1);
      expect(beat.attributes("stroke-width")).toBe("8");
    });
    const track = wrapper.get("circle.beat-indicator__track");
    expect(track.attributes("stroke-width")).toBe("2");
    expect(track.attributes("r")).toBe("46");
    expect(beatIndicatorSource).toMatch(/\.beat-indicator__track\s*\{\s*opacity: 0\.4;/);
    expect(beatIndicatorSource).toMatch(/stroke-linecap: butt;/);
    expect(wrapper.find("svg.mark").exists()).toBe(false);
  });

  it("defaults to four segments, and closes a single beat into a full circle", () => {
    expect(mount(BeatIndicator).findAll(".beat-indicator__beat")).toHaveLength(4);

    const single = mount(BeatIndicator, { props: { beats: 1 } }).get(".beat-indicator__beat");
    // Two half-circle arcs: SVG cannot draw a closed ring as one arc command.
    expect(single.attributes("d").match(/A /g)).toHaveLength(2);
  });

  it("wraps its control without hiding it inside the decorative image", () => {
    const wrapper = mount(BeatIndicator, {
      props: { ariaLabel: "Pattern beat" },
      slots: { default: '<button type="button" aria-label="Play">Play</button>' },
    });

    const ring = wrapper.get('[aria-label="Pattern beat"]');
    expect(ring.element.tagName.toLowerCase()).toBe("svg");
    expect(ring.attributes("role")).toBe("img");
    expect(ring.find("button").exists()).toBe(false);
    expect(wrapper.get(".beat-indicator__content").find('button[aria-label="Play"]').exists())
      .toBe(true);
  });

  it("stays hidden until the transport arms and hides again when it stops", () => {
    const { clock, wrapper } = mountWithClock('<BeatIndicator :beats="4" />');
    const root = () => wrapper.get(".beat-indicator");

    expect(root().attributes("data-beat-transport")).toBe("idle");
    expect(beatIndicatorSource).toMatch(
      /\[data-beat-transport="idle"\] \.beat-indicator__ring\s*\{\s*opacity: 0;/,
    );

    const generation = armFourFour(clock);
    expect(root().attributes("data-beat-transport")).toBe("active");
    expect(root().attributes("data-ui-beat-state")).toBe("idle");

    clock.stop(generation);
    expect(root().attributes("data-beat-transport")).toBe("idle");
    wrapper.unmount();
    clock.destroy();
  });

  it("renders one injected transport frame without owning a timer", () => {
    const { clock, wrapper } = mountWithClock('<BeatIndicator :beats="4" />');
    const generation = armFourFour(clock);

    const cells = wrapper.findAll(".beat-indicator__beat");
    clock.publish(generation, { rawPosition: 0.25, barPosition: 0.25 });
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("running");
    expect(cells[0].attributes("style")).toContain("opacity: 0.2;");
    expect(cells[1].attributes("style")).toContain("scale(1.000)");
    expect(cells[1].attributes("style")).toContain("opacity: 1");

    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(cells[1].attributes("style")).toContain("scale(1.120)");
    expect(cells[1].attributes("style")).toContain("opacity: 1");

    // The settling tail keeps the active material opaque instead of muddying it.
    clock.publish(generation, { rawPosition: 0.49, barPosition: 0.49 });
    expect(cells[1].attributes("style")).toContain("opacity: 1");

    clock.publish(generation, { rawPosition: 0.035, barPosition: 0.035 });
    expect(cells[0].attributes("style")).toContain("scale(1.180)");

    clock.stop(generation);
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("idle");
    expect(cells[0].attributes("style")).toContain("scale(1)");
    expect(beatIndicatorSource).toMatch(
      /\.beat-indicator__beat--downbeat\s*\{[^}]*opacity: 1 !important;[^}]*transform: none !important;/s,
    );
    wrapper.unmount();
    clock.destroy();
  });

  it("holds a still ring during playback while the provider's presentation gate is off", async () => {
    const presentationEnabled = ref(false);
    const { clock, wrapper } = mountWithClock(
      '<BeatIndicator :beats="4" />',
      () => presentationEnabled.value,
    );
    const generation = armFourFour(clock);
    const root = () => wrapper.get(".beat-indicator");

    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(clock.snapshot.status).toBe("running");
    expect(root().attributes("data-ui-beat-state")).toBe("idle");
    expect(root().attributes("data-beat-transport")).toBe("active");
    expect(wrapper.findAll(".beat-indicator__beat")[0].attributes("style")).toContain("opacity: 1");

    presentationEnabled.value = true;
    await nextTick();
    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(root().attributes("data-ui-beat-state")).toBe("running");
    wrapper.unmount();
    clock.destroy();
  });

  it("shows static specimens without a running transport", () => {
    const wrapper = mount(BeatIndicator, { props: { static: true } });

    expect(wrapper.get(".beat-indicator").attributes("data-beat-transport")).toBe("active");
    expect(wrapper.findAll(".beat-indicator__beat")[0].attributes("style")).toContain("opacity: 1");
  });
});
