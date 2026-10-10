import { expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import LazyConfigPanel from "@/components/LazyConfigPanel.vue";
import LazyInstrumentSelector from "@/components/LazyInstrumentSelector.vue";

vi.mock("@/components/ConfigPanel.vue", () => { throw new Error("Offline"); });
vi.mock("@/components/InstrumentSelector.vue", () => { throw new Error("Offline"); });

it.each([LazyConfigPanel, LazyInstrumentSelector])("shows an offline message when a panel chunk cannot load", async component => {
  const wrapper = mount(component, {
    global: {
      plugins: [createPinia()],
      config: { errorHandler: error => { expect(error).toMatchObject({ cause: { message: "Offline" } }); } },
      stubs: { TopDrawer: { template: '<div><slot name="panel" :close="() => {}" /></div>' } },
    },
  });
  try {
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true));
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe("Panel unavailable offline. Reconnect and reopen it.");
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  } finally { wrapper.unmount(); }
});
