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

  it("renders capture and independently activated live-listening actions", () => {
    wrapper = render();

    const capture = wrapper.get('button[aria-label="Start humming capture"]');
    const listen = wrapper.get('button[aria-label="Start live listening"]');
    expect(capture.text()).toBe("");
    expect(capture.classes()).toContain("paper-button--brass");
    expect(capture.find("svg.lucide-mic").exists()).toBe(true);
    expect(listen.classes()).toContain("paper-button--ink");
    expect(listen.find("svg.lucide-audio-lines").exists()).toBe(true);
    expect(transportSource).toMatch(
      /\.humming-capture-transport\s*{[^}]*position:\s*fixed;[^}]*z-index:\s*110;[^}]*top:[^}]*left:\s*50%;/,
    );
    expect(transportSource).toMatch(
      /\.humming-capture-transport \.humming-capture-transport__primary\s*{[^}]*--button-size:\s*28px;[^}]*--button-rest-shadow:\s*var\(--shadow-key\);/,
    );
  });

  it("uses an ivory check to accept and an ink x to cancel", () => {
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

  it("shows live-listening errors without turning them into capture errors", () => {
    wrapper = render({
      listeningStatus: "error",
      listeningError: "Microphone permission was not granted.",
      listeningStatusMessage: "Microphone permission was not granted.",
    });

    expect(wrapper.get('[role="alert"]').text()).toBe(
      "Microphone permission was not granted.",
    );
    expect(wrapper.get('button[aria-label="Retry live listening"]').exists()).toBe(true);
    expect(wrapper.get('button[aria-label="Start humming capture"]').exists()).toBe(true);
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

  it("emits listening, capture, and cancel actions", async () => {
    wrapper = render({ status: "recording" });

    await wrapper.get('button[aria-label="Start live listening"]').trigger("click");
    await wrapper.get('button[aria-label="Accept humming capture"]').trigger("click");
    await wrapper.get('button[aria-label="Cancel humming capture"]').trigger("click");

    expect(wrapper.emitted("toggleListening")).toHaveLength(1);
    expect(wrapper.emitted("toggle")).toHaveLength(1);
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });
});
