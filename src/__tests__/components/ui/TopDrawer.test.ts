import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TopDrawer from "@/components/TopDrawer.vue";

describe("TopDrawer", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("wraps panel content in DrawerShell while preserving the slot API", async () => {
    const wrapper = mount(TopDrawer, {
      attachTo: document.body,
      props: {
        anchor: "top-left",
        offsetTop: "12px",
        offsetSide: "10px",
        handleLabel: "Tap / ESC",
      },
      slots: {
        trigger: `
          <template #trigger="{ open, isOpen }">
            <button data-testid="trigger" @click="open">{{ isOpen ? "open" : "closed" }}</button>
          </template>
        `,
        panel: `
          <template #panel="{ close, isOpen, anchor }">
            <section data-testid="panel-content">
              <span data-testid="state">{{ isOpen ? "open" : "closed" }}</span>
              <span data-testid="anchor">{{ anchor }}</span>
              <button data-testid="close" @click="close">close</button>
            </section>
          </template>
        `,
      },
    });

    expect(document.body.querySelector(".drawer-shell")).toBeNull();
    expect(wrapper.get('[data-testid="trigger"]').text()).toBe("closed");

    await wrapper.get('[data-testid="trigger"]').trigger("click");

    expect(document.body.querySelector(".drawer-shell")).not.toBeNull();
    expect(document.body.querySelector('[data-testid="top-drawer-panel"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="panel-content"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="state"]')?.textContent).toBe("open");
    expect(document.body.querySelector('[data-testid="anchor"]')?.textContent).toBe("top-left");
    expect(document.body.querySelector(".drawer-shell__handle-label")?.textContent).toBe("Tap / ESC");

    (document.body.querySelector('[data-testid="close"]') as HTMLButtonElement).click();
    await wrapper.vm.$nextTick();

    expect(document.body.querySelector(".drawer-shell")).toBeNull();
  });
});
