import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "../../helpers/test-utils";
import CodeStripActions from "@/components/compounds/CodeStripActions.vue";

vi.mock("@/components/uniques/CodeStrip/index.vue", () => ({
  default: {
    name: "CodeStrip",
    template: '<div data-testid="code-strip" />',
  },
}));

function render(props: Record<string, unknown> = {}) {
  return createTestWrapper(CodeStripActions, {
    props,
  });
}

describe("CodeStripActions.vue", () => {
  let wrapper: ReturnType<typeof render> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("composes icon-only Play, CodeStrip, Backspace, and Return in accepted order", () => {
    wrapper = render();

    const labels = wrapper.findAll("button").map((button) => button.attributes("aria-label"));
    expect(labels).toEqual(["Play", "Delete last event", "Return"]);
    expect(wrapper.get("[data-testid='code-strip']").exists()).toBe(true);
    expect(wrapper.text()).toBe("");
  });

  it("uses brass for Play, ink for Backspace, and ivory for Return", () => {
    wrapper = render();

    expect(wrapper.get('button[aria-label="Play"]').classes()).toContain("paper-button--brass");
    expect(wrapper.get('button[aria-label="Delete last event"]').classes()).toContain("paper-button--ink");
    expect(wrapper.get('button[aria-label="Return"]').classes()).toContain("paper-button--ivory");
  });

  it("presents Stop as a momentary action without toggle semantics", () => {
    wrapper = render({ isPlaying: true });

    const stop = wrapper.get('button[aria-label="Stop"]');
    expect(stop.attributes("aria-pressed")).toBeUndefined();
    expect(wrapper.find('button[aria-label="Play"]').exists()).toBe(false);
  });

  it("emits the three existing action boundaries", async () => {
    wrapper = render();

    await wrapper.get('button[aria-label="Play"]').trigger("click");
    await wrapper.get('button[aria-label="Delete last event"]').trigger("click");
    await wrapper.get('button[aria-label="Return"]').trigger("click");

    expect(wrapper.emitted("togglePlayback")).toHaveLength(1);
    expect(wrapper.emitted("backspace")).toHaveLength(1);
    expect(wrapper.emitted("return")).toHaveLength(1);
  });
});
