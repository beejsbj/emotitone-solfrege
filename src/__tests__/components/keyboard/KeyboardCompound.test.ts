import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Keyboard from "@/components/compounds/Keyboard.vue";
import type { KeyboardRowView } from "@/components/compounds/Keyboard.vue";

const KeyStub = defineComponent({
  name: "Key",
  inheritAttrs: false,
  props: {
    geometry: String,
    visibleLabels: Array,
    proportion: String,
    pressed: Boolean,
    sounding: Boolean,
    ariaLabel: String,
  },
  emits: ["press", "release"],
  template: '<button class="key-stub" v-bind="$attrs">{{ ariaLabel }}</button>',
});

const ChordKeyStub = defineComponent({
  name: "ChordKey",
  inheritAttrs: false,
  props: {
    members: Array,
    symbol: String,
    accessibleName: String,
    geometry: String,
    pressed: Boolean,
  },
  emits: ["press", "release"],
  template: '<button class="chord-key-stub" v-bind="$attrs">{{ symbol }}</button>',
});

function rows(): KeyboardRowView[] {
  return [5, 4, 3].map((octave) => ({
    octave,
    keys: Array.from({ length: 12 }, (_, scaleIndex) => ({
      id: `${scaleIndex}_${octave}`,
      syllable: scaleIndex === 0 ? "Do" : `S${scaleIndex}`,
      degree: String(scaleIndex + 1),
      rawPitch: `${scaleIndex === 0 ? "C" : "D"}${octave}`,
      scaleIndex,
      sounding: octave === 4 && scaleIndex === 2,
      pressed: octave === 4 && scaleIndex === 3,
    })),
  }));
}

function mountKeyboard() {
  return mount(Keyboard, {
    props: {
      usage: "controlled",
      rows: rows(),
      mainOctave: 4,
      geometryFamily: "offcut",
      editionSeed: "specimen-seed",
    },
    global: { stubs: { Key: KeyStub, ChordKey: ChordKeyStub } },
    attachTo: document.body,
  });
}

describe("Keyboard compound", () => {
  it("renders grouped octave rows with one roving focus entry", () => {
    const wrapper = mountKeyboard();
    const groups = wrapper.findAll('[role="group"]');
    const buttons = wrapper.findAll("button");

    expect(wrapper.attributes("aria-label")).toBe("Solfège keyboard");
    expect(groups.map((group) => group.attributes("aria-label"))).toEqual([
      "Solfège keyboard",
      "Harmony chords",
      "Octave 5",
      "Main octave 4",
      "Octave 3",
    ]);
    expect(buttons).toHaveLength(43);
    expect(buttons.filter((button) => button.attributes("tabindex") === "0"))
      .toHaveLength(2);
    expect(wrapper.findAll(".key-stub")[12].text())
      .toContain("Do, scale degree one, C four, main octave");
  });

  it("applies one stable authored family with per-key edition recipes", () => {
    const wrapper = mountKeyboard();
    const keys = wrapper.findAllComponents(KeyStub);

    expect(wrapper.attributes("data-geometry-family")).toBe("offcut");
    expect(keys.every((key) => key.props("geometry") === "offcut")).toBe(true);
    expect(keys[0].attributes("style")).toContain("--keyboard-offcut-cut-");
    expect(keys[0].attributes("data-edition-variant")).toMatch(/^[1-3]$/);
    expect(keys[0].attributes("style")).toBe(
      mountKeyboard().findAllComponents(KeyStub)[0].attributes("style"),
    );
  });

  it("moves focus spatially and treats Space as a held input", async () => {
    const wrapper = mountKeyboard();
    const buttons = wrapper.findAll(".key-stub");
    const tonic = buttons[12];

    await tonic.trigger("focus");
    await tonic.trigger("keydown", { key: "ArrowRight", code: "ArrowRight" });
    await nextTick();
    expect(document.activeElement).toBe(buttons[13].element);

    await buttons[13].trigger("keydown", { key: " ", code: "Space" });
    await buttons[13].trigger("keydown", { key: " ", code: "Space", repeat: true });
    await buttons[13].trigger("keyup", { key: " ", code: "Space" });

    expect(wrapper.emitted("press")).toHaveLength(1);
    expect(wrapper.emitted("release")).toHaveLength(1);
    expect(wrapper.emitted("press")?.[0][0]).toMatchObject({
      keyId: "1_4",
      scaleIndex: 1,
      octave: 4,
      source: "focus",
    });
  });

  it.each([
    ["major pentatonic", 5],
    ["major blues", 6],
    ["major", 7],
    ["chromatic", 12],
  ] as const)("renders one playable chord for every %s scale degree", async (scaleType, count) => {
    const wrapper = mountKeyboard();

    await wrapper.setProps({ scaleType });

    expect(wrapper.findAllComponents(ChordKeyStub)).toHaveLength(count);
    expect(wrapper.get('[aria-label="Harmony chords"]').attributes("data-chord-count"))
      .toBe(String(count));
    wrapper.unmount();
  });

  it("keeps idle chord faces fully colored and preserves exact borrowed pitch identities", async () => {
    const wrapper = mountKeyboard();
    await wrapper.setProps({ scaleType: "major", harmonyAlteration: "dominant7" });
    const members = wrapper.findAllComponents(ChordKeyStub)[0].props("members") as Array<{ progress: number; rawPitch: string; pitchClassIndex: number }>;
    expect(members.every(member => member.progress === 1)).toBe(true);
    expect(members.map(member => member.pitchClassIndex)).toEqual([0, 4, 7, 10]);
    expect(members.at(-1)?.rawPitch).toMatch(/^(A#|Bb)4$/);
    wrapper.unmount();
  });

  it("restores a valid chord-row tab stop when scale cardinality shrinks", async () => {
    const wrapper = mountKeyboard();
    const majorChords = wrapper.findAll(".chord-key-stub");
    await majorChords[6].trigger("focus");

    await wrapper.setProps({ scaleType: "major pentatonic" });
    await nextTick();

    const pentatonicChords = wrapper.findAll(".chord-key-stub");
    expect(pentatonicChords).toHaveLength(5);
    expect(pentatonicChords.filter((chord) => chord.attributes("tabindex") === "0"))
      .toHaveLength(1);
    expect(pentatonicChords[0].attributes("tabindex")).toBe("0");
    wrapper.unmount();
  });

  it("moves through the chord row and treats Enter as a held chord input", async () => {
    const wrapper = mountKeyboard();
    const chords = wrapper.findAll(".chord-key-stub");

    await chords[0].trigger("focus");
    await chords[0].trigger("keydown", { key: "ArrowRight", code: "ArrowRight" });
    await nextTick();
    expect(document.activeElement).toBe(chords[1].element);

    await chords[1].trigger("keydown", { key: "Enter", code: "Enter" });
    await chords[1].trigger("keydown", { key: "Enter", code: "Enter", repeat: true });
    await chords[1].trigger("keyup", { key: "Enter", code: "Enter" });

    expect(wrapper.emitted("chordPress")).toHaveLength(1);
    expect(wrapper.emitted("chordRelease")).toHaveLength(1);
    expect(wrapper.emitted("chordPress")?.[0][0]).toMatchObject({
      chordId: "degree-2",
      source: "focus",
      chord: {
        symbol: "Dm",
        alteration: "auto",
      },
    });
    wrapper.unmount();
  });

  it("releases a held chord when focus leaves the Keyboard", async () => {
    const wrapper = mountKeyboard();
    const chord = wrapper.findAll(".chord-key-stub")[0];
    const outside = document.createElement("button");
    document.body.append(outside);

    await chord.trigger("focus");
    await chord.trigger("keydown", { key: "Enter", code: "Enter" });
    chord.element.dispatchEvent(new FocusEvent("focusout", {
      bubbles: true,
      relatedTarget: outside,
    }));
    await nextTick();

    expect(wrapper.emitted("chordRelease")?.[0][0]).toMatchObject({
      chordId: "degree-1",
      inputId: "focus:Enter:chord",
    });
    outside.remove();
    wrapper.unmount();
  });

  it("exposes controlled keyboard padding and reserves it in allocated height", async () => {
    const wrapper = mountKeyboard();
    await wrapper.setProps({ availableHeight: 400, keyboardPadding: true });
    let keys = wrapper.findAllComponents(KeyStub);
    expect(parseFloat((keys[0].element as HTMLElement).style.getPropertyValue("--keyboard-note-height")))
      .toBeCloseTo(96.6, 1);
    expect(parseFloat((keys[12].element as HTMLElement).style.getPropertyValue("--keyboard-note-height")))
      .toBeCloseTo(151.8, 1);

    await wrapper.setProps({ keyboardPadding: false });
    keys = wrapper.findAllComponents(KeyStub);
    expect(parseFloat((keys[0].element as HTMLElement).style.getPropertyValue("--keyboard-note-height")))
      .toBeCloseTo(98.84, 1);
    expect(parseFloat((keys[12].element as HTMLElement).style.getPropertyValue("--keyboard-note-height")))
      .toBeCloseTo(155.32, 1);
  });

  it.each([" ", "Enter"])(
    "releases a held %s input after focus moves to another key",
    async (activationKey) => {
      const wrapper = mountKeyboard();
      const buttons = wrapper.findAll(".key-stub");
      const original = buttons[12];
      const next = buttons[13];
      const code = activationKey === " " ? "Space" : "Enter";

      await original.trigger("focus");
      await original.trigger("keydown", { key: activationKey, code });
      await original.trigger("keydown", { key: "ArrowRight", code: "ArrowRight" });
      await nextTick();
      await next.trigger("keyup", { key: activationKey, code });

      expect(wrapper.emitted("release")?.[0][0]).toMatchObject({
        keyId: "0_4",
        inputId: `focus:${code}`,
      });

      await next.trigger("keydown", { key: activationKey, code });
      await next.trigger("keyup", { key: activationKey, code });
      expect(wrapper.emitted("press")).toHaveLength(2);
      expect(wrapper.emitted("release")).toHaveLength(2);
    },
  );
});
