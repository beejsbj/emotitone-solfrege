import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import HummingCaptureTransport from "@/components/humming/HummingCaptureTransport.vue";
import SaveFailureNotice from "@/components/ui/SaveFailureNotice.vue";
import { setTopNoticeClearance } from "@/composables/useTopNoticeClearance";
import { reportSaveFailure, resetSaveFailure } from "@/services/safeStorage";

// happy-dom does no layout, so each feedback box reports a fixed height under
// the key. The behaviour under test is that the save warning follows it.
const FEEDBACK_TOP = 48;
const rectOf = (height: number) => () =>
  ({ top: FEEDBACK_TOP, bottom: FEEDBACK_TOP + height, height }) as DOMRect;
const originalRect = Element.prototype.getBoundingClientRect;

function noticeClearance(notice: ReturnType<typeof mount>): number {
  const raw = notice.get('[data-testid="save-failure-notice"]').element.style.getPropertyValue("--save-notice-clearance");
  return raw ? parseFloat(raw) : 0;
}

describe("the save warning and the humming feedback share the top of the screen", () => {
  let transport: ReturnType<typeof mount> | undefined;
  let notice: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    resetSaveFailure();
    setTopNoticeClearance(0);
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.classList.contains("humming-capture-transport__feedback")) {
        return rectOf(this.querySelector("select") && this.querySelector("p") ? 86 : 38)();
      }
      return originalRect.call(this);
    };
    notice = mount(SaveFailureNotice);
    reportSaveFailure("quota", "k");
  });

  afterEach(() => {
    transport?.unmount();
    notice?.unmount();
    transport = notice = undefined;
    Element.prototype.getBoundingClientRect = originalRect;
    resetSaveFailure();
  });

  function showTransport(props: Record<string, unknown>) {
    transport = mount(HummingCaptureTransport, { props, global: { stubs: { Teleport: true } } });
    return nextTick().then(() => nextTick());
  }

  it("keeps its default place while the humming transport shows no feedback", async () => {
    await showTransport({ status: "idle" });
    expect(noticeClearance(notice!)).toBe(0);
  });

  it.each([
    ["recording", { status: "recording", remainingSeconds: 5 }, 38],
    ["an error", { status: "error", error: "blocked", statusMessage: "Microphone blocked" }, 38],
    ["several takes", { status: "ready", takeLabels: ["Take 1", "Take 2"] }, 38],
    ["an error with several takes", { status: "error", error: "x", statusMessage: "x", takeLabels: ["Take 1", "Take 2"] }, 86],
  ])("sits below the feedback while humming is %s", async (_name, props, height) => {
    await showTransport(props);
    await nextTick();
    expect(noticeClearance(notice!)).toBe(FEEDBACK_TOP + height + 8);
  });

  it("returns to its default place when the feedback goes away", async () => {
    await showTransport({ status: "error", error: "x", statusMessage: "x" });
    await nextTick();
    expect(noticeClearance(notice!)).toBeGreaterThan(0);
    await transport!.setProps({ status: "idle" });
    await nextTick();
    await nextTick();
    expect(noticeClearance(notice!)).toBe(0);
    transport!.unmount();
    transport = undefined;
  });

  it("clears the clearance when the transport unmounts mid-feedback, and follows a prop change", async () => {
    await showTransport({ status: "idle" });
    await transport!.setProps({ status: "error", error: "x", statusMessage: "x" });
    await nextTick();
    await nextTick();
    expect(noticeClearance(notice!)).toBe(FEEDBACK_TOP + 38 + 8);
    transport!.unmount();
    transport = undefined;
    await nextTick();
    expect(noticeClearance(notice!)).toBe(0);
  });
});
