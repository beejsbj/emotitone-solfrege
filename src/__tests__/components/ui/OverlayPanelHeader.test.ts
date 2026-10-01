import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import OverlayPanelHeader from "@/components/OverlayPanelHeader.vue";

describe("OverlayPanelHeader", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => wrapper?.unmount());

  it("keeps live context, zero status, and actions alongside the band and tape", async () => {
    wrapper = mount(OverlayPanelHeader, {
      props: { title: "Sounds", context: "A long instrument bank name", status: 0 },
      slots: { default: '<button aria-label="Reset sounds">Reset</button>' },
    });

    expect(wrapper.get("p.panel-heading--band").text()).toBe("Sounds");
    expect(wrapper.get("span.panel-heading--tape").text()).toBe("A long instrument bank name");
    expect(wrapper.get(".overlay-panel-header__status").text()).toBe("0");
    expect(wrapper.get('.overlay-panel-header__actions button[aria-label="Reset sounds"]').text())
      .toBe("Reset");

    await wrapper.setProps({ context: "Shape", status: undefined });
    expect(wrapper.get(".panel-heading--tape").text()).toBe("Shape");
    expect(wrapper.find(".overlay-panel-header__status").exists()).toBe(false);

    await wrapper.setProps({ context: "" });
    expect(wrapper.find(".panel-heading--tape").exists()).toBe(false);
    expect(wrapper.get(".panel-heading--band").text()).toBe("Sounds");
    expect(wrapper.get("button").attributes("aria-label")).toBe("Reset sounds");
  });
});
