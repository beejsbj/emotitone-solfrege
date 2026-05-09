import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive, nextTick } from "vue";
import { createTestWrapper } from "../helpers/test-utils";
import DrawerKeyboard from "@/components/DrawerKeyboard.vue";

const drawerState = reactive({ isOpen: true });

const mockKeyboardDrawerStore = reactive({
  drawer: drawerState,
  keyboardConfig: {
    mainOctave: 4,
    rowCount: 3,
    keySize: "1",
    keyGaps: "small",
    keyboardPadding: false,
  },
  visibleOctaves: [4],
  solfegeData: [{ name: "Do", intervalName: "unison" }],
  openDrawer: vi.fn(() => {
    drawerState.isOpen = true;
  }),
  closeDrawer: vi.fn(() => {
    drawerState.isOpen = false;
  }),
  toggleDrawer: vi.fn(() => {
    drawerState.isOpen = !drawerState.isOpen;
  }),
});

const animateDrawer = vi.fn();

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => mockKeyboardDrawerStore,
}));

vi.mock("@/composables/useKeyboardDrawer", () => ({
  useKeyboardDrawer: () => ({
    animateDrawer,
  }),
}));

vi.mock("@/composables/useKeyboardControls", () => ({
  useKeyboardControls: vi.fn(),
}));

vi.mock("@/components/keyboard/KeyboardActionBar.vue", () => ({
  default: { template: '<div data-testid="keyboard-action-bar"></div>' },
}));

vi.mock("@/components/patterns/LiveCard.vue", () => ({
  default: { template: '<div data-testid="live-card"></div>' },
}));

vi.mock("@/components/patterns/PatternList.vue", () => ({
  default: { template: '<div data-testid="pattern-list"></div>' },
}));

vi.mock("@/components/keyboard/KeyboardKey.vue", () => ({
  default: { template: '<div data-testid="keyboard-key"></div>' },
}));

vi.mock("@/components/ui", () => ({
  IconButton: {
    props: ["disabled", "title", "ariaLabel", "size", "tone", "active"],
    template:
      '<button :disabled="disabled" :title="title" :aria-label="ariaLabel"><slot /></button>',
  },
}));

vi.mock("lucide-vue-next", () => ({
  ChevronDown: { template: '<svg data-testid="chevron-down"></svg>' },
  ChevronUp: { template: '<svg data-testid="chevron-up"></svg>' },
}));

describe("DrawerKeyboard.vue", () => {
  let wrapper: ReturnType<typeof createTestWrapper> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    drawerState.isOpen = true;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("renders an external drawer trigger that can close and reopen the drawer", async () => {
    wrapper = createTestWrapper(DrawerKeyboard);

    const trigger = wrapper.find('[data-testid="drawer-toggle"]');
    expect(trigger.attributes("aria-label")).toBe("Close keyboard drawer");

    await trigger.trigger("click");
    await nextTick();

    expect(mockKeyboardDrawerStore.toggleDrawer).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="drawer-toggle"]').attributes("aria-label")).toBe(
      "Open keyboard drawer"
    );

    await wrapper.find('[data-testid="drawer-toggle"]').trigger("click");
    await nextTick();

    expect(mockKeyboardDrawerStore.toggleDrawer).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="drawer-toggle"]').attributes("aria-label")).toBe(
      "Close keyboard drawer"
    );
  });
});
