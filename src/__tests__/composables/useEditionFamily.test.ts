import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, disposePinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import Tabs from "@/components/primatives/Tabs.vue";
import Knob from "@/components/primatives/Knob/index.vue";
import Joystick from "@/components/uniques/Joystick/index.vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import { KEYBOARD_GEOMETRY_FAMILIES, keyboardChordFamily } from "@/components/compounds/keyboardEdition";
import {
  EDITION_FAMILIES,
  SHUFFLE_FAMILIES,
  beginEditionShuffle,
  pinEditionLook,
  readEditionReviewPin,
  useEditionFamily,
} from "@/composables/useEditionFamily";
import { DECK_CONTROL_GROUPS, GLOBAL_CONTROL_GROUPS } from "@/services/configPublicSurface";
import { useVisualConfigStore } from "@/stores/visualConfig";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
}

const family = useEditionFamily();

function mountParts() {
  const tabs = mount(Tabs, {
    props: { tabs: [{ label: "One", value: "one" }, { label: "Two", value: "two" }], modelValue: "one" },
  });
  const knob = mount(Knob, { props: { modelValue: 40, label: "Level" } });
  const joystick = mount(Joystick, { props: { modelValue: "auto" } });
  return {
    read: () => ({
      tabs: tabs.classes().find((name) => name.startsWith("tabs--geometry-")),
      brass: tabs.classes().includes("tabs--tone-brass"),
      knob: knob.find(".knob-face--ring").exists() ? "ring" : knob.find(".knob-face--arc").exists() ? "arc" : null,
      joystick: joystick.classes().find((name) => name.startsWith("joystick--")),
    }),
    unmount: () => { tabs.unmount(); knob.unmount(); joystick.unmount(); },
  };
}

afterEach(() => {
  readEditionReviewPin("");
  pinEditionLook("shuffle");
  beginEditionShuffle(memoryStorage(), () => 0);
});

describe("edition families", () => {
  it("defines every accepted part edition exactly once across the families", () => {
    const tabs = EDITION_FAMILIES.map(({ tabs }) => `${tabs.geometry}-${tabs.tone}`);
    expect(new Set(tabs).size).toBe(7);
    expect(new Set(EDITION_FAMILIES.map(({ knob }) => knob))).toEqual(new Set(["ring", "arc"]));
    expect(new Set(EDITION_FAMILIES.map(({ joystick }) => joystick))).toEqual(new Set(["analog", "digital"]));
  });

  it("shows one family on every unpinned part at once", async () => {
    const parts = mountParts();
    for (const candidate of EDITION_FAMILIES) {
      pinEditionLook(candidate.id);
      await nextTick();
      expect(parts.read(), candidate.id).toEqual({
        tabs: `tabs--geometry-${candidate.tabs.geometry}`,
        brass: candidate.tabs.tone === "brass",
        knob: candidate.knob,
        joystick: `joystick--${candidate.joystick}`,
      });
    }
    parts.unmount();
  });

  it("gives every family a key geometry and surface, namesakes first and most in colour", () => {
    for (const candidate of EDITION_FAMILIES) {
      expect(KEYBOARD_GEOMETRY_FAMILIES, candidate.id).toContain(candidate.keys.geometry);
      expect(["colored", "monochrome"], candidate.id).toContain(candidate.keys.surface);
    }
    for (const namesake of ["tab", "offcut", "tile"] as const) {
      expect(EDITION_FAMILIES.find(({ id }) => id === namesake)?.keys.geometry).toBe(namesake);
    }
    const monochrome = EDITION_FAMILIES.filter(({ keys }) => keys.surface === "monochrome");
    expect(monochrome.length).toBeGreaterThan(0);
    expect(monochrome.length).toBeLessThan(EDITION_FAMILIES.length / 2);
    // No two families present the same keys.
    expect(new Set(EDITION_FAMILIES.map(({ keys }) => `${keys.geometry}-${keys.surface}`)).size)
      .toBe(EDITION_FAMILIES.length);
  });

  it("shows each family on an unpinned Keyboard: its key geometry, a different chord geometry, its surface", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const keyboard = mount(Keyboard, {
      props: {
        usage: "controlled",
        rows: [{
          octave: 4,
          keys: [
            { id: "do-4", syllable: "Do", degree: "I", rawPitch: "C4", scaleIndex: 0 },
            { id: "di-4", syllable: "Di", degree: "♯I", rawPitch: "C#4", scaleIndex: 0, accidental: true },
          ],
        }],
      },
    });
    try {
      for (const candidate of EDITION_FAMILIES) {
        pinEditionLook(candidate.id);
        await nextTick();
        const chordGeometry = keyboard.get(".keyboard__chord-row").attributes("data-geometry-family");
        expect(keyboard.attributes("data-geometry-family"), candidate.id).toBe(candidate.keys.geometry);
        expect(chordGeometry, candidate.id).toBe(keyboardChordFamily(candidate.keys.geometry));
        expect(chordGeometry, candidate.id).not.toBe(candidate.keys.geometry);
        const notes = keyboard.findAll(".keyboard__row .note");
        expect(notes.length, candidate.id).toBe(2);
        for (const note of notes) {
          expect(note.classes(), candidate.id).toContain(`note--geometry-${candidate.keys.geometry}`);
          expect(note.classes(), candidate.id).toContain(`note--surface-${candidate.keys.surface}`);
        }
      }
    } finally {
      keyboard.unmount();
      disposePinia(pinia);
    }
  });

  it("leaves explicitly pinned specimens alone", async () => {
    pinEditionLook("marquee");
    const knob = mount(Knob, { props: { modelValue: 40, label: "Level", visual: "arc" } });
    const joystick = mount(Joystick, { props: { modelValue: "auto", visual: "analog" } });
    await nextTick();
    expect(knob.find(".knob-face--arc").exists()).toBe(true);
    expect(joystick.classes()).toContain("joystick--analog");
  });
});

describe("Shuffle", () => {
  it("picks a floor-meeting family each load and never repeats the previous load", () => {
    const storage = memoryStorage();
    let previous: string | undefined;
    for (let load = 0; load < 40; load += 1) {
      const picked = beginEditionShuffle(storage, () => (load * 0.37) % 1);
      expect(SHUFFLE_FAMILIES).toContain(picked);
      expect(picked.id).not.toBe(previous);
      expect(family.value.id).toBe(picked.id);
      previous = picked.id;
    }
  });

  it("reaches every Shuffle family", () => {
    const seen = new Set<string>();
    for (let step = 0; step < SHUFFLE_FAMILIES.length * 2; step += 1) {
      seen.add(beginEditionShuffle(memoryStorage(), () => step / (SHUFFLE_FAMILIES.length * 2)).id);
    }
    expect(seen).toEqual(new Set(SHUFFLE_FAMILIES.map(({ id }) => id)));
  });

  it("clears the retired per-part rotation keys", () => {
    const storage = memoryStorage({
      "emotitone.tabs.edition": "tab-brass",
      "emotitone.knob.visual": "ring",
      "emotitone.joystick.visual": "digital",
    });
    beginEditionShuffle(storage, () => 0);
    expect([...storage.values.keys()]).toEqual(["emotitone.edition.family"]);
  });

  it("keeps one stable family in memory when storage is blocked", () => {
    const blocked = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    const picked = beginEditionShuffle(blocked, () => 0.99);
    expect(family.value).toEqual(picked);
  });
});

describe("pinning", () => {
  it.each(["current", "legacy"])("normalises an unknown stored family to Shuffle on %s load and drops the override on save", async (format) => {
    localStorage.clear();
    const data = { config: { editions: { family: "retired-family" } } };
    localStorage.setItem("emotitone-visual-config", JSON.stringify(
      format === "current" ? { $version: 1, data } : data,
    ));
    const pinia = createPinia();
    setActivePinia(pinia);
    try {
      const shuffled = beginEditionShuffle(memoryStorage(), () => 0.99);
      const store = useVisualConfigStore();
      await nextTick();
      expect(store.config.editions.family).toBe("shuffle");
      expect(store.globalControls.edition).toBe("shuffle");
      expect(family.value.id).toBe(shuffled.id);
      store.saveToStorage();
      expect(JSON.parse(localStorage.getItem("emotitone-visual-config")!).data.config).not.toHaveProperty("editions");
    } finally {
      disposePinia(pinia);
      localStorage.clear();
    }
  });

  it("a Config pin beats Shuffle, and Shuffle returns when unpinned", () => {
    const shuffled = beginEditionShuffle(memoryStorage(), () => 0);
    const other = EDITION_FAMILIES.find(({ id }) => id !== shuffled.id)!;
    pinEditionLook(other.id);
    expect(family.value.id).toBe(other.id);
    pinEditionLook("shuffle");
    expect(family.value.id).toBe(shuffled.id);
    pinEditionLook("retired-family");
    expect(family.value.id).toBe(shuffled.id);
  });

  it("the ?edition= review pin beats a Config pin and ignores unknown names", () => {
    pinEditionLook("brass");
    expect(readEditionReviewPin("?edition=Marquee")).toBe("marquee");
    expect(family.value.id).toBe("marquee");
    expect(readEditionReviewPin("?edition=nope")).toBeNull();
    expect(family.value.id).toBe("brass");
  });

  it("Config's Note Surface follows the family by default; Color or Monochrome is saved and wins", async () => {
    localStorage.clear();
    const pinia = createPinia();
    setActivePinia(pinia);
    try {
      const store = useVisualConfigStore();
      const control = DECK_CONTROL_GROUPS.flatMap(({ controls }) => controls).find(({ id }) => id === "noteSurface")!;
      expect(control.options?.map(({ value }) => value)).toEqual(["family", "colored", "monochrome"]);
      expect(store.deckControls.noteSurface).toBe("family");

      store.updateDeckControl("noteSurface", "colored");
      store.saveToStorage();
      expect(JSON.parse(localStorage.getItem("emotitone-visual-config")!).data.config.keyboard)
        .toEqual({ surfaceStyle: "colored" });

      store.updateDeckControl("noteSurface", "family");
      store.saveToStorage();
      expect(JSON.parse(localStorage.getItem("emotitone-visual-config")!).data.config)
        .not.toHaveProperty("keyboard");

      // A retired or unknown stored surface follows the family again.
      for (const stored of ["glassmorphism", "neon"]) {
        localStorage.setItem("emotitone-visual-config", JSON.stringify({
          $version: 1, data: { config: { keyboard: { surfaceStyle: stored } } },
        }));
        const reload = createPinia();
        setActivePinia(reload);
        const reloaded = useVisualConfigStore();
        expect(reloaded.deckControls.noteSurface, stored).toBe("family");
        reloaded.updateDeckControl("noteSurface", "monochrome");
        expect(reloaded.importConfig(JSON.stringify({ config: { keyboard: { surfaceStyle: stored } } }))).toBe(true);
        expect(reloaded.deckControls.noteSurface, `imported ${stored}`).toBe("family");
        disposePinia(reload);
      }
    } finally {
      disposePinia(pinia);
      localStorage.clear();
    }
  });

  it("Config's Global Edition control pins a family on every part and saves it", async () => {
    localStorage.clear();
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useVisualConfigStore();
    const parts = mountParts();
    const control = GLOBAL_CONTROL_GROUPS.flatMap(({ controls }) => controls).find(({ id }) => id === "edition")!;
    expect(control.options?.[0]).toEqual({ value: "shuffle", label: "Shuffle" });
    expect(store.globalControls.edition).toBe("shuffle");

    store.updateGlobalControl("edition", "marquee");
    await nextTick();
    expect(store.globalControls.edition).toBe("marquee");
    expect(parts.read()).toEqual({ tabs: "tabs--geometry-marquee", brass: false, knob: "ring", joystick: "joystick--digital" });
    store.saveToStorage();
    expect(JSON.parse(localStorage.getItem("emotitone-visual-config")!).data.config.editions).toEqual({ family: "marquee" });

    store.resetGlobal();
    await nextTick();
    expect(store.globalControls.edition).toBe("shuffle");
    store.saveToStorage();
    expect(JSON.parse(localStorage.getItem("emotitone-visual-config")!).data.config).not.toHaveProperty("editions");
    parts.unmount();
    disposePinia(pinia);
    localStorage.clear();
  });
});
