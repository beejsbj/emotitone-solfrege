import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import specimenSource from "@/style-guide/compounds/CompoundKeyboard.vue?raw";
import CompoundKeyboard from "@/style-guide/compounds/CompoundKeyboard.vue";

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
  });
});
