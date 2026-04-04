import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createTestWrapper, waitForUpdates } from "../../helpers/test-utils";
import LiveCard from "@/components/patterns/LiveCard.vue";

const mockPatternsStore = {
  removeLastFromCurrentSketch: vi.fn(),
};

const mockMirror = {
  toggle: vi.fn(),
  isPlaying: ref(false),
  hasPlayableCode: ref(true),
};

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mockPatternsStore,
}));

vi.mock("@/composables/useLiveStrudelMirror", () => ({
  useLiveStrudelMirror: () => mockMirror,
}));

vi.mock("@/components/patterns/LiveStrip.vue", () => ({
  default: {
    name: "LiveStrip",
    template: '<div data-testid="live-strip-stub"></div>',
  },
}));

describe("LiveCard.vue", () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMirror.isPlaying.value = false;
    mockMirror.hasPlayableCode.value = true;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("renders compact live-strip actions for playback and backspace", () => {
    wrapper = createTestWrapper(LiveCard);

    expect(wrapper.find('[data-testid="live-strip-action-play"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="live-strip-action-backspace"]').exists()).toBe(true);
  });

  it("routes playback and backspace actions to the mirror and pattern store", async () => {
    wrapper = createTestWrapper(LiveCard);

    await wrapper.find('[data-testid="live-strip-action-play"]').trigger("click");
    await wrapper.find('[data-testid="live-strip-action-backspace"]').trigger("click");
    await waitForUpdates();

    expect(mockMirror.toggle).toHaveBeenCalledTimes(1);
    expect(mockPatternsStore.removeLastFromCurrentSketch).toHaveBeenCalledTimes(1);
  });
});
