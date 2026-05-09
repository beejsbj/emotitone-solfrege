import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { createTestWrapper } from "../../helpers/test-utils";
import PatternList from "@/components/patterns/PatternList.vue";

const mockPatternsStore = reactive({
  patterns: [] as Array<{ id: string }>,
  focusedPattern: null as { id: string } | null,
  currentSketchNotes: [] as Array<{ id: string }>,
  sendCurrentPattern: vi.fn(),
  loadPatternAsBase: vi.fn(),
});

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mockPatternsStore,
}));

vi.mock("@/components/ui", () => ({
  IconButton: {
    props: ["disabled", "title", "ariaLabel", "size", "tone", "active"],
    template:
      '<button :disabled="disabled" :title="title" :aria-label="ariaLabel"><slot /></button>',
  },
}));

vi.mock("lucide-vue-next", () => ({
  CornerDownRight: { template: '<svg data-testid="send-icon"></svg>' },
}));

vi.mock("@/components/patterns/PatternCard.vue", () => ({
  default: {
    props: ["pattern"],
    template: '<div data-testid="pattern-card">{{ pattern?.id }}</div>',
  },
}));

describe("PatternList.vue", () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPatternsStore.patterns = [];
    mockPatternsStore.focusedPattern = null;
    mockPatternsStore.currentSketchNotes = [];
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("disables the send control until the sketch has enough notes to save", async () => {
    wrapper = createTestWrapper(PatternList);

    let sendButton = wrapper.find('[data-testid="pattern-list-send"]');

    expect(sendButton.exists()).toBe(true);
    expect(sendButton.attributes("disabled")).toBeDefined();

    mockPatternsStore.currentSketchNotes = [{ id: "note-1" }];
    await wrapper.vm.$nextTick();
    sendButton = wrapper.find('[data-testid="pattern-list-send"]');
    expect(sendButton.attributes("disabled")).toBeDefined();

    mockPatternsStore.currentSketchNotes = [{ id: "note-1" }, { id: "note-2" }];
    await wrapper.vm.$nextTick();
    sendButton = wrapper.find('[data-testid="pattern-list-send"]');
    expect(sendButton.attributes("disabled")).toBeDefined();
  });

  it("sends the current sketch from the shell button", async () => {
    mockPatternsStore.currentSketchNotes = [
      { id: "note-1" },
      { id: "note-2" },
      { id: "note-3" },
    ];

    wrapper = createTestWrapper(PatternList);

    const sendButton = wrapper.find('[data-testid="pattern-list-send"]');
    await sendButton.trigger("click");

    expect(mockPatternsStore.sendCurrentPattern).toHaveBeenCalledTimes(1);
  });
});
