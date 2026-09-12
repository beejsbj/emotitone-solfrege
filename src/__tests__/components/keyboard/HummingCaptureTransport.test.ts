import { afterEach, describe, expect, it } from "vitest";
import { createTestWrapper } from "../../helpers/test-utils";
import HummingCaptureTransport from "@/components/humming/HummingCaptureTransport.vue";
import transportSource from "@/components/humming/HummingCaptureTransport.vue?raw";

function render(props: Record<string, unknown> = {}) {
  return createTestWrapper(HummingCaptureTransport, {
    props,
    global: { stubs: { Teleport: true } },
  });
}

describe("HummingCaptureTransport.vue", () => {
  let wrapper: ReturnType<typeof render> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("renders one microphone action to start listening and capturing", async () => {
    wrapper = render();

    const capture = wrapper.get('button[aria-label="Start humming capture"]');
    expect(wrapper.findAll("button")).toHaveLength(1);
    expect(capture.text()).toBe("");
    expect(capture.classes()).toContain("paper-button--brass");
    expect(capture.find("svg.lucide-mic").exists()).toBe(true);
    await capture.trigger("click");
    expect(wrapper.emitted("toggle")).toHaveLength(1);
    expect(transportSource).toMatch(
      /\.humming-capture-transport\s*{[^}]*position:\s*fixed;[^}]*z-index:\s*110;[^}]*top:[^}]*left:\s*50%;/,
    );
    expect(transportSource).toMatch(
      /\.humming-capture-transport \.humming-capture-transport__primary\s*{[^}]*--button-size:\s*28px;[^}]*--button-rest-shadow:\s*var\(--shadow-key\);/,
    );
  });

  it("uses a check to accept and an x to cancel a recording", () => {
    wrapper = render({ status: "recording" });

    const accept = wrapper.get('button[aria-label="Accept humming capture"]');
    const cancel = wrapper.get('button[aria-label="Cancel humming capture"]');
    expect(accept.classes()).toContain("paper-button--ivory");
    expect(accept.find("svg.lucide-check").exists()).toBe(true);
    expect(cancel.classes()).toContain("paper-button--ink");
    expect(cancel.find("svg.lucide-x").exists()).toBe(true);
  });

  it("shows capture errors visibly while preserving an alert", () => {
    wrapper = render({
      status: "error",
      error: "Microphone permission was not granted.",
      statusMessage: "Microphone permission was not granted.",
    });

    expect(wrapper.get('[role="alert"]').text()).toBe(
      "Microphone permission was not granted.",
    );
    expect(wrapper.get('button[aria-label="Retry humming capture"]').exists()).toBe(true);
  });

  it("keeps recording available for explicit acceptance", () => {
    wrapper = render({
      status: "recording",
      statusMessage: "Listening… Check to save, or cancel to discard.",
    });

    expect(wrapper.get('[role="status"]').text()).toBe(
      "Listening… Check to save, or cancel to discard.",
    );
    expect(wrapper.get('button[aria-label="Accept humming capture"]').attributes("disabled"))
      .toBeUndefined();
    expect(wrapper.emitted("toggle")).toBeUndefined();
  });

  it("keeps capture cancellable while microphone permission is pending", async () => {
    wrapper = render({ status: "requesting" });

    expect(wrapper.get('button[aria-label="Requesting microphone"]').attributes("disabled"))
      .toBeDefined();
    const cancel = wrapper.get('button[aria-label="Cancel humming capture"]');
    expect(cancel.attributes("disabled")).toBeUndefined();
    await cancel.trigger("click");

    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.emitted("toggle")).toBeUndefined();
  });

  it("selects finalized takes outside the CodeStrip compound", async () => {
    wrapper = render({
      takeLabels: ["Take 1", "Take 3"],
      selectedTakeIndex: 0,
    });

    const select = wrapper.get('select[aria-label="Hummed take"]');
    expect(select.findAll("option").map((option) => option.text())).toEqual([
      "Take 1",
      "Take 3",
    ]);
    await select.setValue("1");

    expect(wrapper.emitted("selectTake")).toEqual([[1]]);
  });

  it("emits accept and cancel actions for a recording", async () => {
    wrapper = render({ status: "recording" });

    await wrapper.get('button[aria-label="Accept humming capture"]').trigger("click");
    await wrapper.get('button[aria-label="Cancel humming capture"]').trigger("click");

    expect(wrapper.emitted("toggle")).toHaveLength(1);
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });
});
