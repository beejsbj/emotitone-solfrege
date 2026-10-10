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

function mountWithClock(
  template: string,
  presentationEnabled: () => boolean = () => true,
  bindings: Record<string, unknown> = {},
) {
  const clock = new UIBeatClock({
    observeEnvironment: false,
    reducedMotion: () => false,
    documentVisible: () => true,
  });
  const Host = defineComponent({
    components: { BeatIndicator },
    setup() {
      provideUIBeat({ clock, presentationEnabled });
      return bindings;
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

describe("Beat Indicator crown", () => {
  it("renders ordered chads with deterministic tilts and a lit Brass downbeat", () => {
    const wrapper = mount(BeatIndicator, { props: { beats: 5 } });
    const crown = wrapper.get("div.beat-indicator__crown");
    const beats = crown.findAll("span.beat-indicator__beat");

    expect(beats).toHaveLength(5);
    expect(beats.map((beat) => beat.attributes("data-beat"))).toEqual(["1", "2", "3", "4", "5"]);
    expect(beats[0].classes()).toContain("beat-indicator__beat--downbeat");
    expect(beats[0].classes()).toContain("brass");
    expect(beats[0].classes()).toContain("beat-indicator__beat--lit");
    expect(beats.slice(1).some((beat) => beat.classes().includes("beat-indicator__beat--downbeat")))
      .toBe(false);
    beats.slice(1).forEach((beat) => {
      expect(beat.classes()).not.toContain("brass");
      expect(beat.classes()).not.toContain("beat-indicator__beat--lit");
    });
    beats.forEach((beat, index) => {
      expect((beat.element as HTMLElement).style.getPropertyValue("--beat-tilt"))
        .toBe(`${((index * 37) % 11) - 5}deg`);
      expect((beat.element as HTMLElement).style.opacity).toBe("");
    });
    wrapper.unmount();
  });

  it("defaults to four beats and supports a single Brass downbeat", () => {
    const defaults = mount(BeatIndicator);
    expect(defaults.findAll(".beat-indicator__beat")).toHaveLength(4);
    expect(defaults.get(".beat-indicator__crown").attributes("aria-label"))
      .toBe("Beat indicator");

    const single = mount(BeatIndicator, { props: { beats: 1 } });
    expect(single.findAll("span.beat-indicator__beat")).toHaveLength(1);
    expect(single.get(".beat-indicator__beat").classes())
      .toEqual(expect.arrayContaining(["beat-indicator__beat--downbeat", "beat-indicator__beat--lit", "brass"]));
    defaults.unmount();
    single.unmount();
  });

  it("wraps its control without hiding it inside the decorative image", () => {
    const wrapper = mount(BeatIndicator, {
      props: { ariaLabel: "Pattern beat" },
      slots: { default: '<button type="button" aria-label="Play">Play</button>' },
    });

    const crown = wrapper.get('div.beat-indicator__crown[aria-label="Pattern beat"]');
    expect(crown.attributes("role")).toBe("img");
    expect(crown.attributes("aria-hidden")).toBe("true");
    expect(crown.find("button").exists()).toBe(false);
    const content = wrapper.get("div.beat-indicator__content");
    expect(content.find('button[aria-label="Play"]').exists())
      .toBe(true);
    expect(content.get("button").element.closest('[role="img"]')).toBeNull();
    wrapper.unmount();
  });

  it("stays hidden until the transport arms and hides again when it stops", async () => {
    const { clock, wrapper } = mountWithClock('<BeatIndicator :beats="4" />');
    const root = () => wrapper.get(".beat-indicator");

    expect(root().attributes("data-beat-transport")).toBe("idle");
    expect(wrapper.get(".beat-indicator__crown").attributes("aria-hidden")).toBe("true");

    const generation = armFourFour(clock);
    await nextTick();
    expect(root().attributes("data-beat-transport")).toBe("active");
    expect(wrapper.get(".beat-indicator__crown").attributes("aria-hidden")).toBe("false");
    expect(root().attributes("data-ui-beat-state")).toBe("idle");
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1"]);

    clock.stop(generation);
    await nextTick();
    expect(root().attributes("data-beat-transport")).toBe("idle");
    expect(wrapper.get(".beat-indicator__crown").attributes("aria-hidden")).toBe("true");
    wrapper.unmount();
    clock.destroy();
  });

  it("renders one injected transport frame without owning a timer", () => {
    const { clock, wrapper } = mountWithClock('<BeatIndicator :beats="4" />');
    const generation = armFourFour(clock);

    const cells = wrapper.findAll(".beat-indicator__beat");
    clock.publish(generation, { rawPosition: 0.25, barPosition: 0.25 });
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("running");
    expect(cells[0].classes()).toContain("beat-indicator__beat--lit");
    expect(cells[1].attributes("style")).toContain("scale(1.000)");
    expect(cells[1].classes()).toContain("beat-indicator__beat--lit");

    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(cells[0].classes()).toContain("beat-indicator__beat--lit");
    expect(cells[1].attributes("style")).toContain("scale(1.120)");
    expect(cells[1].classes()).toContain("beat-indicator__beat--lit");

    // The settling tail keeps the current beat lit until the next boundary.
    clock.publish(generation, { rawPosition: 0.49, barPosition: 0.49 });
    expect(cells[1].classes()).toContain("beat-indicator__beat--lit");

    clock.publish(generation, { rawPosition: 0.035, barPosition: 0.035 });
    expect(cells[0].attributes("style")).toContain("scale(1.180)");

    clock.stop(generation);
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("idle");
    expect(cells[0].attributes("style")).toContain("scale(1)");
    expect(cells[0].classes()).toContain("beat-indicator__beat--lit");
    expect(cells[1].classes()).not.toContain("beat-indicator__beat--lit");
    wrapper.unmount();
    clock.destroy();
  });

  it("advances left to right through a full bar while the Brass downbeat stays lit", () => {
    const { clock, wrapper } = mountWithClock('<BeatIndicator :beats="4" />');
    const generation = armFourFour(clock);
    const cells = wrapper.findAll(".beat-indicator__beat");

    // Deliberately assert without nextTick: UIBeat frames write to the DOM synchronously.
    for (const [position, litBeats] of [
      [0, ["1"]],
      [0.25, ["1", "2"]],
      [0.5, ["1", "3"]],
      [0.75, ["1", "4"]],
      [1, ["1"]],
    ] as const) {
      clock.publish(generation, { rawPosition: position, barPosition: position });
      expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
        .toEqual(litBeats);
      expect(cells[0].classes()).toEqual(expect.arrayContaining(["brass", "beat-indicator__beat--downbeat"]));
      cells.forEach((beat) => expect((beat.element as HTMLElement).style.opacity).toBe(""));
    }

    clock.stop(generation);
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1"]);
    wrapper.unmount();
    clock.destroy();
  });

  it("recollects chads and reapplies downbeat changes during playback", async () => {
    const beats = ref(4);
    const downbeat = ref(true);
    const { clock, wrapper } = mountWithClock(
      '<BeatIndicator :beats="beats" :downbeat="downbeat" />',
      () => true,
      { beats, downbeat },
    );
    const generation = armFourFour(clock);
    clock.publish(generation, { rawPosition: 0.75, barPosition: 0.75 });

    beats.value = 3;
    await nextTick();
    await nextTick();
    expect(wrapper.findAll(".beat-indicator__beat")).toHaveLength(3);
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1"]);

    downbeat.value = false;
    await nextTick();
    clock.publish(generation, { rawPosition: 1.25, barPosition: 1.25 });
    expect(wrapper.find(".beat-indicator__beat--downbeat").exists()).toBe(false);
    expect(wrapper.find(".brass").exists()).toBe(false);
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["2"]);

    downbeat.value = true;
    await nextTick();
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1", "2"]);
    expect(wrapper.get(".beat-indicator__beat--downbeat").classes()).toContain("brass");

    clock.stop(generation);
    wrapper.unmount();
    clock.destroy();
  });

  it("holds a still crown during playback while the provider's presentation gate is off", async () => {
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
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1"]);

    presentationEnabled.value = true;
    await nextTick();
    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(root().attributes("data-ui-beat-state")).toBe("running");
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1", "2"]);

    presentationEnabled.value = false;
    await nextTick();
    expect(root().attributes("data-ui-beat-state")).toBe("idle");
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1"]);
    wrapper.findAll(".beat-indicator__beat").forEach((beat) => {
      expect((beat.element as HTMLElement).style.transform).toBe("scale(1)");
      expect((beat.element as HTMLElement).style.opacity).toBe("");
    });
    wrapper.unmount();
    clock.destroy();
  });

  it("keeps only the downbeat lit when the consumer is disabled", async () => {
    const enabled = ref(true);
    const { clock, wrapper } = mountWithClock(
      '<BeatIndicator :enabled="enabled" />',
      () => true,
      { enabled },
    );
    const generation = armFourFour(clock);
    clock.publish(generation, { rawPosition: 0.535, barPosition: 0.535 });
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1", "3"]);

    enabled.value = false;
    await nextTick();
    clock.publish(generation, { rawPosition: 0.785, barPosition: 0.785 });
    expect(wrapper.get(".beat-indicator").attributes("data-beat-transport")).toBe("active");
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("idle");
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1"]);
    wrapper.findAll(".beat-indicator__beat").forEach((beat) => {
      expect((beat.element as HTMLElement).style.transform).toBe("scale(1)");
      expect((beat.element as HTMLElement).style.opacity).toBe("");
    });
    wrapper.unmount();
    clock.destroy();
  });

  it("shows static specimens without transport and keeps them still during playback", () => {
    const { clock, wrapper } = mountWithClock('<BeatIndicator static />');

    expect(wrapper.get(".beat-indicator").attributes("data-beat-transport")).toBe("active");
    expect(wrapper.get(".beat-indicator__crown").attributes("aria-hidden")).toBe("false");
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1"]);

    const generation = armFourFour(clock);
    clock.publish(generation, { rawPosition: 0.285, barPosition: 0.285 });
    expect(wrapper.get(".beat-indicator").attributes("data-ui-beat-state")).toBe("idle");
    expect(wrapper.findAll(".beat-indicator__beat--lit").map((beat) => beat.attributes("data-beat")))
      .toEqual(["1"]);
    wrapper.findAll(".beat-indicator__beat").forEach((beat) => {
      expect((beat.element as HTMLElement).style.transform).toBe("scale(1)");
      expect((beat.element as HTMLElement).style.opacity).toBe("");
    });
    wrapper.unmount();
    clock.destroy();
  });

  it("keeps unlit chads opaque unlit-LED and neutralizes motion under Reduced Motion", () => {
    // The DOM harness does not render scoped CSS or emulate media queries.
    // These checks cover only the material and accessibility CSS contracts.
    const beatRule = beatIndicatorSource.match(/\.beat-indicator__beat\s*\{([^}]*)\}/)?.[1];
    expect(beatRule).toMatch(/background:\s*var\(--led-off\)/);
    expect(beatRule).not.toMatch(/opacity\s*:/);

    const reducedMotion = beatIndicatorSource.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)(?=@media|<\/style>)/,
    )?.[1];
    expect(reducedMotion).toMatch(/\.beat-indicator__beat\s*\{[^}]*transform:\s*none\s*!important/);
    expect(reducedMotion).toMatch(/\.beat-indicator__beat\s*\{[^}]*transition:\s*none\s*!important/);
    expect(reducedMotion).toMatch(/::after\s*\{[^}]*animation:\s*none\s*!important/);
  });
});
