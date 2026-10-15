import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import specimenSource from "@/style-guide/compounds/CompoundKeyboard.vue?raw";
import UniqueDrawer from "@/style-guide/uniques/UniqueDrawer.vue";
import CompoundKeyboard from "@/style-guide/compounds/CompoundKeyboard.vue";
import { getSolfegeLabelForInterval } from "@/domain/solfege";

vi.mock("@/domain/solfege", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/domain/solfege")>();
  return { ...actual, getSolfegeLabelForInterval: vi.fn(actual.getSolfegeLabelForInterval) };
});

// The drawer's code editor is unrelated to keyboard labels and imports the
// browser-only Strudel transport. Keep the real Drawer, Keyboard and Notes.
vi.mock("@/components/compounds/CodeStripBar.vue", () => ({
  default: { template: "<div />" },
}));

describe("Keyboard style-guide specimen", () => {
  it("imports the authoritative compound and remains inert", () => {
    expect(specimenSource).toContain(
      'import Keyboard from "@/components/compounds/Keyboard.vue"',
    );
    expect(specimenSource).not.toMatch(
      /@\/stores|useSolfegeInteraction|attackNote|releaseNote|triggerNoteHaptic|localStorage/,
    );
    expect(specimenSource.match(/usage="controlled"/g)).toHaveLength(2);
    expect(specimenSource).toContain("inert · no input yet");
  });

  it.each([
    ["Keyboard", CompoundKeyboard],
    ["Drawer", UniqueDrawer],
  ] as const)("shows Fi for the chromatic raised fourth in the %s specimen", (_name, component) => {
    const wrapper = mount(component);
    try {
      const labels = wrapper.findAll(".keyboard__row .note__label--rank-primary")
        .map((label) => label.text());
      expect(labels).toContain("Fi");
      expect(labels).not.toContain("Se");
    } finally {
      wrapper.unmount();
    }
  });

  it.each([CompoundKeyboard, UniqueDrawer])("derives specimen labels from the shared vocabulary", (component) => {
    const helper = vi.mocked(getSolfegeLabelForInterval);
    const original = helper.getMockImplementation()!;
    helper.mockReturnValue("Shared");
    const wrapper = mount(component);
    try {
      const labels = wrapper.findAll(".keyboard__row .note__label--rank-primary.note__label--syllable");
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.map((label) => label.text().replace(/\s+/g, ""))).toEqual(labels.map(() => "Shared"));
    } finally {
      wrapper.unmount();
      helper.mockImplementation(original);
    }
  });

  // Mounting two full Keyboards and re-rendering them three times takes about
  // 1s idle but blew the 5s default on loaded hosts. 20s still bounds a real hang.
  it("wires specimen controls to live Keyboard props and rendered row count", async () => {
    const wrapper = mount(CompoundKeyboard);

    // Find the width selector and change it
    const widthSelectors = wrapper.findAll("select");
    const widthSelect = widthSelectors.find((sel) => sel.element.parentElement?.textContent?.includes("Content width"));
    expect(widthSelect).toBeDefined();
    expect(widthSelect?.element.value).toBe("960");

    await widthSelect?.setValue("320");
    await nextTick();

    // Assert the width changed in the readout
    expect(wrapper.text()).toContain("320px content");

    // Find the row count selector and change it
    const rowCountSelect = widthSelectors.find((sel) => sel.element.parentElement?.textContent?.includes("Requested rows"));
    expect(rowCountSelect).toBeDefined();
    expect(rowCountSelect?.element.value).toBe("3");

    await rowCountSelect?.setValue("5");
    await nextTick();

    // Assert the row count changed in the readout
    expect(wrapper.text()).toContain("5 rendered / 5 requested rows");

    // Find the scale type selector and change it
    const scaleSelect = widthSelectors.find((sel) => sel.element.parentElement?.textContent?.includes("Chord-row scale"));
    expect(scaleSelect).toBeDefined();

    await scaleSelect?.setValue("chromatic");
    await nextTick();

    // Assert the scale type changed in the readout
    expect(wrapper.text()).toContain("chromatic");

    // Verify the component has both Keyboard instances (hero and stage)
    const keyboards = wrapper.findAllComponents({ name: "Keyboard" });
    expect(keyboards.length).toBeGreaterThanOrEqual(2);

    wrapper.unmount();
  }, 20_000);
});
