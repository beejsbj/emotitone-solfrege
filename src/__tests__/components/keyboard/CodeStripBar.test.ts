import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createTestWrapper } from "../../helpers/test-utils";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import Button from "@/components/primatives/Button.vue";
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
  });
}

describe("CodeStripBar.vue", () => {
  let wrapper: ReturnType<typeof render> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("keeps transport editing in a closed CodeStrip compound", () => {
    wrapper = render();

    expect(wrapper.get('button[aria-label="Play"]').exists()).toBe(true);
    expect(wrapper.get('button[aria-label="Delete last event"]').exists()).toBe(true);
    expect(wrapper.get('button[aria-label="Return"]').exists()).toBe(true);
    const beats = wrapper.get('[aria-label="Pattern beat"]').findAll(".beat-indicator__beat");
    expect(beats).toHaveLength(4);
    expect(beats.map((beat) => beat.attributes("data-mark")))
      .toEqual(["square", "square", "square", "square"]);
    expect(codeStripBarSource).not.toContain(":marks=");
    expect(wrapper.get("[data-testid='code-strip']").exists()).toBe(true);
    expect(codeStripBarSource).not.toContain("humming-capture-transport");
    expect(codeStripBarSource).not.toContain("Hummed take");
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
    expect(designSystemSource).toMatch(/--instrument-bar-surface:\s*var\(--ink\);/);
    expect(designSystemSource).not.toContain("--instrument-bar-backdrop");
    expect(codeStripBarSource).toMatch(
      /\.code-strip-bar\s*{[^}]*background-color:\s*var\(--instrument-bar-surface\);/,
    );
    expect(controlBarSource).toMatch(
      /\.control-bar\s*{[^}]*background-color:\s*var\(--instrument-bar-surface\);/,
    );
    expect(codeStripBarSource).not.toContain("backdrop-filter");
    expect(controlBarSource).not.toContain("backdrop-filter");
  });

  it("uses ivory for Play, ink for Backspace, and ivory for Return", () => {
    wrapper = render();

    expect(wrapper.get('button[aria-label="Play"]').classes()).toContain("paper-button--ivory");
    expect(wrapper.get('button[aria-label="Delete last event"]').classes()).toContain("paper-button--ink");
    expect(wrapper.get('button[aria-label="Return"]').classes()).toContain("paper-button--ivory");
  });

  it("presents Stop as a momentary action without toggle semantics", () => {
    wrapper = render({ isPlaying: true });

    const stop = wrapper.get('button[aria-label="Stop"]');
    expect(stop.attributes("aria-pressed")).toBeUndefined();
    expect(stop.classes()).toContain("paper-button--ink");
    expect(wrapper.find('button[aria-label="Play"]').exists()).toBe(false);
    expect(wrapper.findAllComponents(Button).map((button) => button.props("uiBeat")))
      .toEqual([true, true, true]);
    expect(codeStripBarSource).not.toContain("ui-beat");
  });

  it("emits the existing actions", async () => {
    wrapper = render();

    await wrapper.get('button[aria-label="Play"]').trigger("click");
    await wrapper.get('button[aria-label="Delete last event"]').trigger("click");
    await wrapper.get('button[aria-label="Return"]').trigger("click");

    expect(wrapper.emitted("togglePlayback")).toHaveLength(1);
    expect(wrapper.emitted("backspace")).toHaveLength(1);
    expect(wrapper.emitted("return")).toHaveLength(1);
  });

});
