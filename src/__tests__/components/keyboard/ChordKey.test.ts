import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChordKey from "@/components/compounds/ChordKey.vue";
import Chord from "@/components/compounds/Chord.vue";

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: () => ({ background: "tomato", primaryColor: "tomato" }),
    getKeyBackgroundByPitchClass: () => ({ background: "tomato", primaryColor: "tomato" }),
  }),
}));

const members = [
  { id: "C4", rawPitch: "C4", scaleIndex: 0, progress: 1 },
  { id: "E4", rawPitch: "E4", scaleIndex: 2, progress: 1 },
  { id: "G4", rawPitch: "G4", scaleIndex: 4, progress: 1 },
];

describe("ChordKey", () => {
  afterEach(() => vi.restoreAllMocks());

  it("wraps the accepted fused Chord in the shared native Key interaction shell", () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });

    expect(wrapper.element.tagName).toBe("BUTTON");
    expect(wrapper.attributes()).toMatchObject({
      type: "button",
      "aria-label": "C major chord",
    });
    expect(wrapper.getComponent(Chord).props()).toMatchObject({
      display: "symbol",
      symbol: "C",
      members,
    });
    expect(wrapper.get(".chord-key__face").attributes("aria-hidden")).toBe("true");
  });

  it("tracks multiple contacts independently and releases them on unmount", async () => {
    const wrapper = mount(ChordKey, {
      props: { members, symbol: "C", accessibleName: "C major chord" },
    });
    vi.spyOn(wrapper.element, "getBoundingClientRect").mockReturnValue({
      left: 0, right: 100, top: 0, bottom: 100,
      width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    const event = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: [] },
      changedTouches: { value: [
        { identifier: 1, clientX: 20, clientY: 20 },
        { identifier: 2, clientX: 80, clientY: 80 },
      ] },
    });
    wrapper.element.dispatchEvent(event);
    await wrapper.vm.$nextTick();

    expect((wrapper.emitted("press") ?? []).map(([payload]) =>
      (payload as { inputId: string }).inputId,
    )).toEqual(["touch:1", "touch:2"]);

    wrapper.unmount();
    expect((wrapper.emitted("release") ?? []).map(([payload]) =>
      (payload as { inputId: string }).inputId,
    )).toEqual(["touch:1", "touch:2"]);
  });
});
