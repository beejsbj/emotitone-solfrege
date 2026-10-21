import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import TokenMotion from "@/style-guide/tokens/TokenMotion.vue";

const DEMO_BAR_MS = 2400;

type ChangeListener = (event: MediaQueryListEvent) => void;

// A controllable prefers-reduced-motion query: flip `matches` and fire change.
function stubReducedMotion(initiallyReduced: boolean) {
  const listeners = new Set<ChangeListener>();
  const query = {
    matches: initiallyReduced,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((type: string, listener: ChangeListener) => {
      if (type === "change") listeners.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: ChangeListener) => {
      if (type === "change") listeners.delete(listener);
    }),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => query));
  return {
    query,
    listeners,
    set(reduced: boolean) {
      query.matches = reduced;
      listeners.forEach((listener) => listener({ matches: reduced } as MediaQueryListEvent));
    },
  };
}

// The Rip Mode demo swaps its outgoing label on every bar, so it reads the replay count.
const outgoingLabel = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find(".cf-label--out").text();

async function advanceBars(bars: number) {
  vi.advanceTimersByTime(DEMO_BAR_MS * bars);
  await nextTick();
}

describe("TokenMotion demo bar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("replays every bar while motion is allowed", async () => {
    stubReducedMotion(false);
    const wrapper = mount(TokenMotion);

    expect(outgoingLabel(wrapper)).toBe("Lydian");
    await advanceBars(1);
    expect(outgoingLabel(wrapper)).toBe("Phrygian");
    await advanceBars(1);
    expect(outgoingLabel(wrapper)).toBe("Lydian");

    wrapper.unmount();
  });

  it("never starts the bar when Reduced Motion is already on", async () => {
    stubReducedMotion(true);
    const wrapper = mount(TokenMotion);

    await advanceBars(3);
    expect(outgoingLabel(wrapper)).toBe("Lydian");
    expect(vi.getTimerCount()).toBe(0);

    wrapper.unmount();
  });

  it("stops when Reduced Motion turns on mid-page and restarts once when it turns off", async () => {
    const media = stubReducedMotion(false);
    const wrapper = mount(TokenMotion);

    await advanceBars(1);
    expect(outgoingLabel(wrapper)).toBe("Phrygian");

    media.set(true);
    expect(vi.getTimerCount()).toBe(0);
    await advanceBars(5);
    expect(outgoingLabel(wrapper)).toBe("Phrygian");

    media.set(false);
    // Exactly one replay interval, so the bar keeps its real tempo.
    expect(vi.getTimerCount()).toBe(1);
    await advanceBars(1);
    expect(outgoingLabel(wrapper)).toBe("Lydian");

    // A repeated no-preference change must not stack a second interval.
    media.set(false);
    expect(vi.getTimerCount()).toBe(1);
    await advanceBars(1);
    expect(outgoingLabel(wrapper)).toBe("Phrygian");

    wrapper.unmount();
  });

  it("removes its listener and stops the bar on unmount", async () => {
    const media = stubReducedMotion(false);
    const wrapper = mount(TokenMotion);

    expect(media.listeners.size).toBe(1);
    const [listener] = media.listeners;
    expect(vi.getTimerCount()).toBe(1);

    wrapper.unmount();

    expect(media.query.removeEventListener).toHaveBeenCalledWith("change", listener);
    expect(media.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
