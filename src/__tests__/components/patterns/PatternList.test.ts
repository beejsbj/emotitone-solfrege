import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "../../helpers/test-utils";
import PatternList from "@/components/patterns/PatternList.vue";

const mockPatternsStore = {
  patterns: [
    {
      id: "pattern-1",
      name: "Pattern 1",
      notes: [],
      key: "C",
      mode: "major",
      bpm: 120,
      instrument: "piano",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      noteCount: 4,
      duration: 1000,
    },
  ],
  focusedPattern: {
    id: "pattern-1",
    name: "Pattern 1",
    notes: [],
    key: "C",
    mode: "major",
    bpm: 120,
    instrument: "piano",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    noteCount: 4,
    duration: 1000,
  },
  loadPatternAsBase: vi.fn(),
  sendCurrentPattern: vi.fn(),
  currentSketchNotes: [{ id: "note-1" }],
};

vi.mock("@/stores/patterns", () => ({
  usePatternsStore: () => mockPatternsStore,
}));

vi.mock("@/components/patterns/PatternCard.vue", () => ({
  default: {
    name: "PatternCard",
    props: ["pattern"],
    template: '<div data-testid="pattern-card-stub">{{ pattern?.name }}</div>',
  },
}));

describe("PatternList.vue", () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("renders a send button even when the deck is collapsed", () => {
    wrapper = createTestWrapper(PatternList);

    const sendButton = wrapper.find('[data-testid="pattern-send-button"]');

    expect(sendButton.exists()).toBe(true);
    expect(sendButton.text().toLowerCase()).toContain("new line");
  });

  it("commits the current pattern from the collapsed deck action", async () => {
    wrapper = createTestWrapper(PatternList);

    await wrapper.find('[data-testid="pattern-send-button"]').trigger("click");

    expect(mockPatternsStore.sendCurrentPattern).toHaveBeenCalledTimes(1);
  });
});
