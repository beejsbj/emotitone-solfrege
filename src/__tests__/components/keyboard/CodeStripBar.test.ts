import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createTestWrapper } from "../../helpers/test-utils";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import codeStripSource from "@/components/uniques/CodeStrip/index.vue?raw";
import codeStripBarSource from "@/components/compounds/CodeStripBar.vue?raw";
import controlBarSource from "@/components/compounds/ControlBar.vue?raw";

const designSystemSource = readFileSync(
  resolve(process.cwd(), "src/emotitone-design-system.css"),
  "utf8",
);

vi.mock("@/components/uniques/CodeStrip/index.vue", () => ({
  default: {
    name: "CodeStrip",
    props: ["density", "framed"],
    template: '<div data-testid="code-strip" />',
  },
}));

function render(props: Record<string, unknown> = {}) {
  return createTestWrapper(CodeStripBar, { props });
}

describe("CodeStripBar.vue", () => {
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

  it("integrates a flush, unframed dense CodeStrip into one shared instrument rail", () => {
    wrapper = render();
    const strip = wrapper.getComponent({ name: "CodeStrip" });

    expect(strip.props("density")).toBe("dense");
    expect(strip.props("framed")).toBe(false);
    expect(codeStripSource).toMatch(
      /\.code-strip--dense[\s\S]*?\.cm-content\)[\s\S]*?padding:\s*0;/,
    );
    expect(codeStripSource).toMatch(
      /\.code-strip--unframed\s*{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/,
    );
    expect(designSystemSource).toMatch(/--instrument-bar-surface:\s*rgba\(0, 0, 0, 0\.80\);/);
    expect(codeStripBarSource).toMatch(
      /\.code-strip-bar\s*{[^}]*background-color:\s*var\(--instrument-bar-surface\);/,
    );
    expect(controlBarSource).toMatch(
      /\.control-bar\s*{[^}]*background-color:\s*var\(--instrument-bar-surface\);/,
    );
    expect(codeStripBarSource).toContain(
      "backdrop-filter: var(--instrument-bar-backdrop)",
    );
    expect(controlBarSource).toContain(
      "backdrop-filter: var(--instrument-bar-backdrop)",
    );
    expect(codeStripBarSource).not.toMatch(/\.code-strip-bar\s*{[^}]*\bgap:/);
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
