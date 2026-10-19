import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { IDBFactory } from "fake-indexeddb";
import PhraseShelf from "@/components/patterns/PhraseShelf.vue";
import { libraryPhrases, usePhrasesStore } from "@/stores/phrases";
import { PHRASE_BUDGET_BYTES } from "@/services/phrasePersistence";
import { resetSaveFailure } from "@/services/safeStorage";

// External code generation isn't involved in storage pressure or release.
vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: () => ({ currentCode: "", hasPlayableCode: false }),
}));
vi.mock("@/composables/useStrudel", () => ({ toStrudelSound: (sound: string) => sound }));

let store: ReturnType<typeof usePhrasesStore>;
let wrapper: VueWrapper | undefined;
let consoleError: { mockRestore(): void } | undefined;
// The setup's localStorage keeps vi.fn methods so a suite can make the browser refuse a write.
const storage = localStorage as unknown as { setItem: ReturnType<typeof vi.fn> };
const workingSetItem = storage.setItem.getMockImplementation()!;
beforeEach(() => {
  localStorage.clear();
  resetSaveFailure();
  vi.stubGlobal("indexedDB", new IDBFactory());
  setActivePinia(createPinia());
  store = usePhrasesStore();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  store.$dispose();
  storage.setItem.mockImplementation(workingSetItem);
  consoleError?.mockRestore();
  consoleError = undefined;
  vi.unstubAllGlobals();
});
function phrase(id: string, shelf: "recent" | "kept", stamp: number, name = id) {
  return { ...structuredClone(libraryPhrases[0]), id, shelf, name, createdAt: stamp, closedAt: stamp };
}
function render(attrs: Record<string, string> = {}) {
  wrapper = mount(PhraseShelf, { attrs, global: { stubs: { PatternReel: true } } });
  return wrapper;
}
function tap(noteId: string, solfegeIndex: number, at: number) {
  store.handleNotePressed({ detail: { noteId, noteName: "C4", solfegeIndex, octave: 4, timestamp: at } } as CustomEvent);
  store.handleNoteReleased({ detail: { noteId, timestamp: at + 200 } } as CustomEvent);
}
type SavedPhrase = { id: string; shelf: string; notes: unknown[] };
const savedPhrases = (): SavedPhrase[] => JSON.parse(localStorage.getItem("phrases")!).data.book.phrases;
const notice = (page: VueWrapper) => page.find("[data-shelf-notice]");
const overBudgetRecent = () => phrase("oldest", "recent", 100, "x".repeat(PHRASE_BUDGET_BYTES / 2));

describe("Shelf over budget: warn, keep saving (Burooj, 2026-10-17)", () => {
  it("still saves a new take above 3 MB and warns that it is still saving", async () => {
    store.book.phrases.push(overBudgetRecent());
    await nextTick();
    expect(store.encodedBytes).toBeGreaterThan(PHRASE_BUDGET_BYTES);
    const page = render();
    [0, 2, 4].forEach((degree, index) => tap(`n-${index}`, degree, Date.now() + index * 300));
    await nextTick();
    expect(savedPhrases().find((saved) => saved.id === store.takeId)?.notes).toHaveLength(3);
    expect(savedPhrases().some((saved) => saved.id === "oldest")).toBe(true);
    expect(notice(page).attributes("data-shelf-notice")).toBe("over-budget");
    expect(notice(page).text()).toContain("Still saving");
    expect(notice(page).text()).toContain("Free some space soon");
    expect(page.find('button[aria-label="Release oldest Recent"]').exists()).toBe(true);
  });

  it("still saves a new Keep above 3 MB", async () => {
    store.book.phrases.push(overBudgetRecent());
    await nextTick();
    [0, 2, 4].forEach((degree, index) => tap(`k-${index}`, degree, Date.now() + index * 300));
    const keptId = store.keepTake();
    await nextTick();
    expect(keptId).toBeTruthy();
    expect(store.encodedBytes).toBeGreaterThan(PHRASE_BUDGET_BYTES);
    const kept = savedPhrases().find((saved) => saved.id === keptId);
    expect(kept?.shelf).toBe("kept");
    expect(kept?.notes).toHaveLength(3);
  });

  it("on a real quota failure keeps the previous payload and every phrase, says it is not saving, and still offers release", async () => {
    store.book.phrases.push(phrase("kept", "kept", 0), phrase("oldest", "recent", 100), phrase("newer", "recent", 200));
    await nextTick();
    const before = localStorage.getItem("phrases");
    expect(before).not.toBeNull();
    const page = render();
    expect(notice(page).exists()).toBe(false);
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    storage.setItem.mockImplementation((key: string, value: string) => {
      if (key === "phrases") throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      workingSetItem(key, value);
    });
    [0, 2].forEach((degree, index) => tap(`q-${index}`, degree, Date.now() + index * 300));
    await nextTick();
    expect(localStorage.getItem("phrases")).toBe(before);
    expect(store.takeNotes).toHaveLength(2);
    expect(store.book.phrases.map((phrase) => phrase.id)).toEqual(expect.arrayContaining(["kept", "oldest", "newer"]));
    expect(notice(page).attributes("data-shelf-notice")).toBe("failed");
    expect(notice(page).text()).toContain("New sketches are not being saved");
    expect(page.find('button[aria-label="Release oldest Recent"]').exists()).toBe(true);
    // Storage recovers: the next save writes everything and the failed state clears.
    storage.setItem.mockImplementation(workingSetItem);
    await page.get('button[aria-label="Release oldest Recent"]').trigger("click");
    await page.get('button[aria-label="Confirm release oldest Recent"]').trigger("click");
    await nextTick();
    expect(store.findPhrase("oldest")).toBeUndefined();
    expect(savedPhrases().find((saved) => saved.id === store.takeId)?.notes).toHaveLength(2);
    expect(notice(page).exists()).toBe(false);
  });

  it("confirms release of the oldest Recent, never Kept or the take, then clears the warning", async () => {
    store.book.phrases.push(phrase("kept", "kept", 0), phrase("newer", "recent", 200), overBudgetRecent());
    await nextTick();
    const page = render();
    expect(store.releaseCandidates.map((phrase) => phrase.id)).toEqual(["oldest", "newer"]);
    expect(store.releaseRecent("kept")).toBe(false);
    expect(store.releaseRecent(store.takeId)).toBe(false);
    await page.get('button[aria-label="Release oldest Recent"]').trigger("click");
    expect(store.findPhrase("oldest")).toBeDefined();
    await page.get('button[aria-label="Confirm release oldest Recent"]').trigger("click");
    await nextTick();
    expect(store.shelfNotice).toBeNull();
    expect(notice(page).exists()).toBe(false);
    const saved = savedPhrases();
    expect(saved.find((phrase) => phrase.id === "oldest")).toBeUndefined();
    expect(saved.find((phrase) => phrase.id === "kept")?.shelf).toBe("kept");
    expect(saved.find((phrase) => phrase.id === "newer")).toBeDefined();
  });

  it("never offers or releases a protected phrase (one the Looper is playing)", async () => {
    store.book.phrases.push(phrase("newer", "recent", 200), overBudgetRecent());
    store.setProtectedIds(() => new Set(["oldest"]));
    await nextTick();
    const page = render();
    expect(store.releaseCandidates.map((phrase) => phrase.id)).toEqual(["newer"]);
    expect(store.releaseRecent("oldest")).toBe(false);
    expect(store.findPhrase("oldest")).toBeDefined();
    await page.get('button[aria-label="Release oldest Recent"]').trigger("click");
    await page.get('button[aria-label="Confirm release oldest Recent"]').trigger("click");
    await nextTick();
    expect(store.findPhrase("oldest")).toBeDefined();
    expect(store.findPhrase("newer")).toBeUndefined();
    // Every Recent protected: nothing to offer.
    store.setProtectedIds(() => new Set(["oldest"]));
    expect(store.releaseCandidates).toEqual([]);
    expect(page.find('button[aria-label="Release oldest Recent"]').exists()).toBe(false);
  });

  it("disarms the release confirmation after 2.5 seconds", async () => {
    vi.useFakeTimers();
    try {
      store.book.phrases.push(phrase("oldest", "recent", 100, "x".repeat(PHRASE_BUDGET_BYTES)));
      await nextTick();
      const page = render();
      await page.get('button[aria-label="Release oldest Recent"]').trigger("click");
      expect(page.find('button[aria-label="Confirm release oldest Recent"]').exists()).toBe(true);
      await vi.advanceTimersByTimeAsync(2499);
      expect(page.find('button[aria-label="Confirm release oldest Recent"]').exists()).toBe(true);
      await vi.advanceTimersByTimeAsync(2);
      expect(page.find('button[aria-label="Confirm release oldest Recent"]').exists()).toBe(false);
      await page.get('button[aria-label="Release oldest Recent"]').trigger("click");
      expect(store.findPhrase("oldest")).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("floats the notice over the Stage: inside the occluding root, but not an occlusion part", async () => {
    store.book.phrases.push(overBudgetRecent());
    await nextTick();
    const page = render({ "data-stage-occluder": "" });
    const root = page.element as HTMLElement;
    expect(root.hasAttribute("data-stage-occluder")).toBe(true);
    expect(root.contains(notice(page).element)).toBe(true);
    // A floating notice must not push the Stage's usable rect up and down.
    expect(notice(page).element.closest("[data-stage-occlusion-part]")).toBeNull();
    expect(notice(page).element.querySelector("[data-stage-occlusion-part]")).toBeNull();
    store.book.phrases.pop();
    await nextTick();
    expect(page.element).toBe(root);
    expect(notice(page).exists()).toBe(false);
  });

  it("steps aside while the reel is being scrolled, so the unwound wheel stays visible", async () => {
    store.book.phrases.push(overBudgetRecent());
    await nextTick();
    const page = render();
    const reel = page.findComponent({ name: "PatternReel" });
    expect(notice(page).attributes("data-reel-busy")).toBeUndefined();
    reel.vm.$emit("interactionChange", true);
    await nextTick();
    expect(notice(page).attributes("data-reel-busy")).toBe("true");
    expect(notice(page).attributes("aria-hidden")).toBe("true");
    expect(notice(page).attributes("inert")).toBeDefined();
    reel.vm.$emit("interactionChange", false);
    await nextTick();
    expect(notice(page).attributes("data-reel-busy")).toBeUndefined();
    expect(notice(page).attributes("aria-hidden")).toBeUndefined();
  });

  it("keeps an over-budget all-Kept shelf and explains when no Recent can be released", async () => {
    store.book.phrases.push(phrase("kept", "kept", 0, "x".repeat(PHRASE_BUDGET_BYTES / 2)));
    await nextTick();
    const page = render();
    expect(page.text()).toContain("No Recent phrases to release");
    expect(page.find('button[aria-label="Release oldest Recent"]').exists()).toBe(false);
    expect(store.shelves.kept).toHaveLength(1);
    expect(store.releaseRecent("kept")).toBe(false);
    expect(savedPhrases().find((saved) => saved.id === "kept")?.shelf).toBe("kept");
  });

  it("retains more than 200 Recent phrases when opening a new take and after reload", async () => {
    for (let index = 0; index < 201; index++) store.book.phrases.push(phrase(`recent-${index}`, "recent", index));
    store.openPhrase(libraryPhrases[0].id);
    await nextTick();
    expect(store.shelves.recent).toHaveLength(201);
    const ids = store.shelves.recent.map((phrase) => phrase.id);
    store.$dispose();
    setActivePinia(createPinia());
    store = usePhrasesStore();
    expect(store.shelves.recent.map((phrase) => phrase.id)).toEqual(ids);
  });
});
