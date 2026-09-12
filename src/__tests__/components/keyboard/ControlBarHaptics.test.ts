import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ControlBar from "@/components/compounds/ControlBar.vue";

const haptics = vi.hoisted(() => ({
  triggerUIHaptic: vi.fn(),
  triggerLatchHaptic: vi.fn(),
}));

vi.mock("@/composables/useGSAP", () => ({ default: () => ({}) }));
vi.mock("@/utils/hapticFeedback", () => haptics);

describe("ControlBar haptic boundary", () => {
  it("keeps real Knob and Joystick intents live while haptics are suppressed", async () => {
    haptics.triggerUIHaptic.mockClear();
    haptics.triggerLatchHaptic.mockClear();
    const wrapper = mount(ControlBar, { props: { haptic: false } });

    await wrapper.findAll(".knob-wrapper")[0].trigger("click");
    const joystickOptions = wrapper.findAll(".joystick__option");
    await joystickOptions[5].trigger("click", { detail: 0 });

    expect(wrapper.emitted("update:keyValue")?.[0]).toEqual(["C#"]);
    expect(wrapper.emitted("update:harmonyValue")?.[0]).toEqual(["jazzy7"]);
    expect(haptics.triggerUIHaptic).not.toHaveBeenCalled();
    expect(haptics.triggerLatchHaptic).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
