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
  return createTestWrapper(CodeStripBar, {
    props,
    global: { stubs: { Teleport: true } },
  });
}

describe("CodeStripBar.vue", () => {
  let wrapper: ReturnType<typeof render> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("keeps transport editing in CodeStrip and exposes humming over the Stage", () => {
    wrapper = render();

    expect(wrapper.get('button[aria-label="Play"]').exists()).toBe(true);
    expect(wrapper.get('button[aria-label="Delete last event"]').exists()).toBe(true);
    expect(wrapper.get('button[aria-label="Return"]').exists()).toBe(true);
    const humming = wrapper.get('button[aria-label="Start humming capture"]');
    expect(humming.text()).toBe("");
    expect(humming.find("svg.lucide-mic").exists()).toBe(true);
    expect(wrapper.get("[data-testid='code-strip']").exists()).toBe(true);
    expect(codeStripBarSource).toMatch(
      /\.humming-capture-transport\s*{[^}]*position:\s*fixed;[^}]*top:[^}]*left:\s*50%;/,
    );
    expect(wrapper.get('[role="status"]').text()).toBe(
      "Ready to capture a hummed pattern",
    );
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
    expect(codeStripSource).toContain("bgFill: false");
    expect(codeStripSource).toMatch(
      /\.code-strip--unframed[\s\S]*?\.cm-activeLine\)[\s\S]*?background-color:\s*transparent\s*!important;/,
    );
    expect(codeStripSource).toMatch(
      /\.code-strip--unframed[\s\S]*?\.cm-line:only-child\)[\s\S]*?min-height:\s*40px;[\s\S]*?align-items:\s*center;/,
    );
    expect(codeStripSource).toMatch(
      /\.code-strip--empty[\s\S]*?\.cm-line:only-child\)[\s\S]*?justify-content:\s*center;[\s\S]*?font-size:\s*11px;/,
    );
    expect(codeStripSource).toMatch(
      /\.code-strip\s*{[\s\S]*?background:\s*var\(--ink-2\);/,
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
  });

  it("uses ivory for Play, brass for Record, ink for Backspace, and ivory for Return", () => {
    wrapper = render();

    expect(wrapper.get('button[aria-label="Play"]').classes()).toContain("paper-button--ivory");
    expect(wrapper.get('button[aria-label="Start humming capture"]').classes()).toContain("paper-button--brass");
    expect(wrapper.get('button[aria-label="Delete last event"]').classes()).toContain("paper-button--ink");
    expect(wrapper.get('button[aria-label="Return"]').classes()).toContain("paper-button--ivory");
  });

  it("presents Stop as a momentary action without toggle semantics", () => {
    wrapper = render({ isPlaying: true });

    const stop = wrapper.get('button[aria-label="Stop"]');
    expect(stop.attributes("aria-pressed")).toBeUndefined();
    expect(stop.classes()).toContain("paper-button--ink");
    expect(wrapper.find('button[aria-label="Play"]').exists()).toBe(false);
  });

  it("presents recording and analysis as accessible humming states", () => {
    wrapper = render({
      hummingStatus: "recording",
      hummingStatusMessage: "Listening to your humming",
    });

    const accept = wrapper.get('button[aria-label="Accept humming capture"]');
    expect(accept.attributes("aria-pressed")).toBeUndefined();
    expect(accept.classes()).toContain("paper-button--ivory");
    expect(accept.find("svg.lucide-check").exists()).toBe(true);
    expect(
      wrapper.get('button[aria-label="Cancel humming capture"]').exists(),
    ).toBe(true);
    expect(wrapper.get('[role="status"]').text()).toBe("Listening to your humming");

    wrapper.unmount();
    wrapper = render({
      hummingStatus: "analyzing",
      hummingStatusMessage: "Melograph is analyzing the phrase",
    });
    const analyzing = wrapper.get('button[aria-label="Analyzing humming"]');
    expect(analyzing.attributes("disabled")).toBeDefined();
    expect(analyzing.attributes("aria-busy")).toBe("true");
  });

  it("selects between separate finalized humming takes", async () => {
    wrapper = render({ hummingTakeCount: 3, selectedHummingTake: 0 });

    await wrapper.get('select[aria-label="Hummed take"]').setValue("2");

    expect(wrapper.emitted("selectHummingTake")).toEqual([[2]]);
  });

  it("emits the existing actions and the humming boundary", async () => {
    wrapper = render();

    await wrapper.get('button[aria-label="Play"]').trigger("click");
    await wrapper.get('button[aria-label="Start humming capture"]').trigger("click");
    await wrapper.get('button[aria-label="Delete last event"]').trigger("click");
    await wrapper.get('button[aria-label="Return"]').trigger("click");

    expect(wrapper.emitted("togglePlayback")).toHaveLength(1);
    expect(wrapper.emitted("toggleHumming")).toHaveLength(1);
    expect(wrapper.emitted("backspace")).toHaveLength(1);
    expect(wrapper.emitted("return")).toHaveLength(1);
  });

  it("emits an explicit cancel boundary while humming is active", async () => {
    wrapper = render({ hummingStatus: "recording" });

    await wrapper.get('button[aria-label="Cancel humming capture"]').trigger("click");

    expect(wrapper.emitted("cancelHumming")).toHaveLength(1);
  });
});
