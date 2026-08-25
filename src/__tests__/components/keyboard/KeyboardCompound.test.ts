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
      rows: rows(),
      mainOctave: 4,
      geometryFamily: "offcut",
      editionSeed: "specimen-seed",
    },
    global: { stubs: { Key: KeyStub } },
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
      "Octave 5",
      "Main octave 4",
      "Octave 3",
    ]);
    expect(buttons).toHaveLength(36);
    expect(buttons.filter((button) => button.attributes("tabindex") === "0"))
      .toHaveLength(1);
    expect(buttons[12].text())
      .toContain("Do, scale degree 1, C4, main octave");
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
    const buttons = wrapper.findAll("button");
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
});
