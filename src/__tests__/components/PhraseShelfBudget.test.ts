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
  vi.unstubAllGlobals();
});
function phrase(id: string, shelf: "recent" | "kept", stamp: number, name = id) {
  return { ...structuredClone(libraryPhrases[0]), id, shelf, name, createdAt: stamp, closedAt: stamp };
}
function render() {
  wrapper = mount(PhraseShelf, { global: { stubs: { PatternReel: true } } });
  return wrapper;
}

describe("Shelf full in the phrase reel", () => {
  it("retains every phrase on refusal, offers the oldest Recent, confirms release, then saves with Kept intact", async () => {
    store.book.phrases.push(phrase("kept", "kept", 0));
    await nextTick();
    const before = localStorage.getItem("phrases");
    store.book.phrases.push(phrase("newer", "recent", 200), phrase("oldest", "recent", 100, "x".repeat(PHRASE_BUDGET_BYTES / 2)));
    await nextTick();
    const page = render();
    expect(page.get('[role="status"]').text()).toContain("Shelf full");
    expect(store.releaseCandidates.map((phrase) => phrase.id)).toEqual(["oldest", "newer"]);
    expect(localStorage.getItem("phrases")).toBe(before);
    expect(store.book.phrases.map((phrase) => phrase.id)).toEqual(expect.arrayContaining(["kept", "newer", "oldest"]));
    expect(store.releaseRecent("kept")).toBe(false);
    expect(store.releaseRecent(store.takeId)).toBe(false);
    await page.get('button[aria-label="Release oldest Recent"]').trigger("click");
    expect(store.findPhrase("oldest")).toBeDefined();
    await page.get('button[aria-label="Confirm release oldest Recent"]').trigger("click");
    await nextTick();
    expect(store.isShelfFull).toBe(false);
    expect(page.find('[role="status"]').exists()).toBe(false);
    const saved = JSON.parse(localStorage.getItem("phrases")!).data.book.phrases;
    expect(saved.find((phrase: { id: string }) => phrase.id === "oldest")).toBeUndefined();
    expect(saved.find((phrase: { id: string }) => phrase.id === "kept").shelf).toBe("kept");
    expect(saved.find((phrase: { id: string }) => phrase.id === "newer")).toBeDefined();
  });

  it("keeps an over-budget all-Kept shelf and explains when no Recent can be released", async () => {
    store.book.phrases.push(phrase("kept", "kept", 0, "x".repeat(PHRASE_BUDGET_BYTES / 2)));
    await nextTick();
    const page = render();
    expect(page.text()).toContain("No Recent phrases to release");
    expect(page.find('button[aria-label="Release oldest Recent"]').exists()).toBe(false);
    expect(store.shelves.kept).toHaveLength(1);
    expect(store.releaseRecent("kept")).toBe(false);
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
