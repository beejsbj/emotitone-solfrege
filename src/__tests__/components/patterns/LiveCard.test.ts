import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive, ref } from "vue";
import { createTestWrapper } from "../../helpers/test-utils";
import LiveCard from "@/components/patterns/LiveCard.vue";

const mockPatternsStore = reactive({
  currentSketchNotes: [] as Array<{ id: string }>,
  removeLastFromCurrentSketch: vi.fn(),
});

const mockMirror = {
  isPlaying: ref(false),
  hasPlayableCode: ref(false),
  toggle: vi.fn(),
};

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mockPatternsStore,
}));

vi.mock("@/composables/useLiveStrudelMirror", () => ({
  useLiveStrudelMirror: () => mockMirror,
}));

vi.mock("@/components/ui", () => ({
  IconButton: {
    props: ["disabled", "title", "ariaLabel", "size", "tone", "active"],
    template:
      '<button :disabled="disabled" :title="title" :aria-label="ariaLabel"><slot /></button>',
  },
}));

vi.mock("lucide-vue-next", () => ({
  Delete: { template: '<svg data-testid="delete-icon"></svg>' },
  Play: { template: '<svg data-testid="play-icon"></svg>' },
  Square: { template: '<svg data-testid="square-icon"></svg>' },
}));

vi.mock("@/components/patterns/LiveStrip.vue", () => ({
  default: {
    template: '<div data-testid="live-strip-stub"></div>',
  },
}));

describe("LiveCard.vue", () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPatternsStore.currentSketchNotes = [];
    mockMirror.isPlaying.value = false;
    mockMirror.hasPlayableCode.value = false;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("disables playback when there is no playable sketch", () => {
    wrapper = createTestWrapper(LiveCard);

    expect(wrapper.find('[data-testid="live-card-play"]').attributes("disabled")).toBeDefined();
  });

  it("toggles playback from the left transport button when code is playable", async () => {
    mockMirror.hasPlayableCode.value = true;

    wrapper = createTestWrapper(LiveCard);
    await wrapper.find('[data-testid="live-card-play"]').trigger("click");

    expect(mockMirror.toggle).toHaveBeenCalledTimes(1);
  });

  it("removes the last sketch note from the right transport button", async () => {
    mockPatternsStore.currentSketchNotes = [{ id: "note-1" }];

    wrapper = createTestWrapper(LiveCard);
    await wrapper.find('[data-testid="live-card-delete"]').trigger("click");

    expect(mockPatternsStore.removeLastFromCurrentSketch).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="live-card-delete"]').attributes("disabled")).toBeUndefined();
  });
});
