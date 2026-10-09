import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, defineStore, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { createApp, nextTick, ref } from "vue";
import SaveFailureNotice from "@/components/ui/SaveFailureNotice.vue";
import {
  createSafeStorage,
  dismissSaveFailure,
  ONE_OFF_NOTICE_MS,
  persistedStatePlugin,
  resetSaveFailure,
  saveFailureNotice,
} from "@/services/safeStorage";

vi.mock("@/services/superdoughAudio", () => ({
  setLiveSynthControls: vi.fn(),
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  stopNote: vi.fn(),
  getAudioContext: vi.fn(() => ({ state: "running", currentTime: 0 })),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
}));

const FULL = "Can't save — storage full";

function quotaError() {
  return new DOMException("The quota has been exceeded.", "QuotaExceededError");
}

/** Makes the app's real localStorage throw until the returned function restores it. */
function breakStorage(error: unknown) {
  const storage = window.localStorage as unknown as { setItem: ReturnType<typeof vi.fn> };
  const original = storage.setItem.getMockImplementation();
  storage.setItem.mockImplementation(() => {
    throw error;
  });
  return () => storage.setItem.mockImplementation(original!);
}

const useSketchStore = defineStore(
  "safe-storage-sketch",
  () => {
    const takes = ref<string[]>([]);
    return { takes };
  },
  { persist: { key: "safe-storage-sketch" } },
);

function freshPinia() {
  // Same order as main.ts: Pinia only runs plugins once an app has installed it.
  const pinia = createPinia();
  createApp({}).use(pinia);
  pinia.use(persistedStatePlugin);
  setActivePinia(pinia);
  return pinia;
}

describe("persisted writes that fail", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.clear();
    resetSaveFailure();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the storage-full Sticker, keeps the take in memory, and clears once a write succeeds", async () => {
    freshPinia();
    const store = useSketchStore();
    const wrapper = mount(SaveFailureNotice);
    const restore = breakStorage(quotaError());

    store.takes.push("take one");
    await nextTick();
    await nextTick();

    expect(store.takes).toEqual(["take one"]);
    expect(saveFailureNotice.value?.message).toBe(FULL);
    expect(wrapper.text()).toContain(FULL);
    expect(wrapper.find(".sticker").exists()).toBe(true);

    restore();
    store.takes.push("take two");
    await nextTick();
    await nextTick();

    expect(store.takes).toEqual(["take one", "take two"]);
    expect(saveFailureNotice.value).toBeNull();
    expect(wrapper.text()).not.toContain("Can't save");
    expect(JSON.parse(window.localStorage.getItem("safe-storage-sketch")!).takes).toEqual([
      "take one",
      "take two",
    ]);
  });

  it("works for a real app store wired through the same plugin", async () => {
    freshPinia();
    const { useKeyboardDrawerStore } = await import("@/stores/keyboardDrawer");
    const store = useKeyboardDrawerStore();
    const before = store.drawer.isOpen;
    const restore = breakStorage(quotaError());

    store.drawer.isOpen = !before;
    await nextTick();
    await nextTick();

    expect(store.drawer.isOpen).toBe(!before);
    expect(saveFailureNotice.value?.message).toBe(FULL);
    restore();
  });

  it("says a plain 'Can't save' for failures that are not quota errors", async () => {
    freshPinia();
    const store = useSketchStore();
    breakStorage(new Error("SecurityError: storage disabled"));

    store.takes.push("take");
    await nextTick();
    await nextTick();

    expect(store.takes).toEqual(["take"]);
    expect(saveFailureNotice.value?.message).toBe("Can't save");
  });

  it("raises one notice per failure burst and does not come back after the player dismisses it", async () => {
    freshPinia();
    const store = useSketchStore();
    const wrapper = mount(SaveFailureNotice);
    breakStorage(quotaError());

    for (const take of ["a", "b", "c"]) {
      store.takes.push(take);
      await nextTick();
      await nextTick();
    }
    expect(wrapper.findAll(".sticker")).toHaveLength(1);

    await wrapper.find("button").trigger("click");
    expect(wrapper.find(".sticker").exists()).toBe(false);

    store.takes.push("d");
    await nextTick();
    await nextTick();
    expect(wrapper.find(".sticker").exists()).toBe(false);
  });

  it("shows the notice again when saving recovers after a dismissal and then fails again", async () => {
    freshPinia();
    const store = useSketchStore();
    const wrapper = mount(SaveFailureNotice);
    const restore = breakStorage(quotaError());
    const settle = async () => {
      await nextTick();
      await nextTick();
    };

    store.takes.push("a");
    await settle();
    await wrapper.find("button").trigger("click");
    expect(wrapper.find(".sticker").exists()).toBe(false);

    restore();
    store.takes.push("b");
    await settle();
    expect(saveFailureNotice.value).toBeNull();

    breakStorage(quotaError());
    store.takes.push("c");
    await settle();

    expect(store.takes).toEqual(["a", "b", "c"]);
    expect(wrapper.find(".sticker").text()).toBe(FULL);
  });

  it("shows the notice again when a different key fails after a dismissal", () => {
    const storage = createSafeStorage(() => ({
      getItem: () => null,
      setItem: () => {
        throw quotaError();
      },
      removeItem: () => {},
    }) as unknown as Storage);

    storage.setItem("emotitone-saved-looks", "x");
    dismissSaveFailure();
    expect(saveFailureNotice.value).toBeNull();

    storage.setItem("emotitone-phrases", "y");
    expect(saveFailureNotice.value?.message).toBe(FULL);
  });

  it("lets a failed explicit save fall away on its own so it cannot hide later failures", () => {
    vi.useFakeTimers();
    try {
      const storage = createSafeStorage(() => ({
        getItem: () => null,
        setItem: () => {
          throw quotaError();
        },
        removeItem: () => {},
      }) as unknown as Storage);

      storage.write("emotitone-saved-looks", "x", { oneOff: true });
      expect(saveFailureNotice.value?.message).toBe(FULL);

      vi.advanceTimersByTime(ONE_OFF_NOTICE_MS + 1);
      expect(saveFailureNotice.value).toBeNull();

      storage.setItem("emotitone-phrases", "y");
      expect(saveFailureNotice.value?.message).toBe(FULL);
    } finally {
      vi.useRealTimers();
    }
  });

  it("logs once per burst, not on every failed write", async () => {
    freshPinia();
    const store = useSketchStore();
    breakStorage(quotaError());

    for (const take of ["a", "b", "c"]) {
      store.takes.push(take);
      await nextTick();
      await nextTick();
    }

    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("does not let a small write that still fits end the burst of a key that keeps failing", () => {
    const backing = new Map<string, string>();
    const storage = createSafeStorage(() => ({
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === "big") throw quotaError();
        backing.set(key, value);
      },
      removeItem: (key: string) => void backing.delete(key),
    }) as unknown as Storage);

    storage.setItem("big", "x");
    expect(saveFailureNotice.value?.message).toBe(FULL);

    storage.setItem("small", "y");
    expect(saveFailureNotice.value?.message).toBe(FULL);
    expect(backing.get("small")).toBe("y");
  });

  it("treats an unavailable storage as a failed write instead of throwing", () => {
    const storage = createSafeStorage(() => undefined);

    expect(() => storage.setItem("k", "v")).not.toThrow();
    expect(storage.getItem("k")).toBeNull();
    expect(saveFailureNotice.value?.message).toBe("Can't save");
  });
});
