import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import Key from "@/components/compounds/Key.vue";

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getKeyBackground: () => ({ background: "red", primaryColor: "red" }),
  }),
}));

describe("Key", () => {
  let wrapper: VueWrapper | undefined;
  afterEach(() => wrapper?.unmount());

  it("emits semantic local input while keeping physical press separate from sounding", async () => {
    wrapper = mount(Key, { props: { sounding: true } });
    const button = wrapper.get("button");

    expect(button.attributes("aria-pressed")).toBe("true");
    expect(wrapper.classes()).not.toContain("key--pressed");

    await button.trigger("mousedown");
    expect(wrapper.classes()).toContain("key--pressed");
    expect(wrapper.emitted("press")?.[0]?.[0]).toMatchObject({ inputId: "mouse" });

    await button.trigger("mouseup");
    expect(wrapper.classes()).not.toContain("key--pressed");
    expect(wrapper.emitted("release")?.[0]?.[0]).toMatchObject({ inputId: "mouse" });
  });

  it("exposes native locked semantics and emits no input while locked", async () => {
    wrapper = mount(Key, { props: { inputLocked: true } });
    const button = wrapper.get("button");
    expect(button.attributes()).toHaveProperty("disabled");
    await button.trigger("mousedown");
    expect(wrapper.emitted("press")).toBeUndefined();
  });
});
