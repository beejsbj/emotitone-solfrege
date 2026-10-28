import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { IDBFactory } from "fake-indexeddb";
import PhraseShelf from "@/components/patterns/PhraseShelf.vue";
import { libraryPhrases, usePhrasesStore } from "@/stores/phrases";
import golden from "../fixtures/open-in-strudel.json";

/**
 * Open in Strudel hands strudel.cc the app's own notation text (BJS-495).
 * Recorded on 2026-10-26 with Strudel 1.2.6 installed: every URL then matched
 * Strudel's own `code2hash`. The app must keep writing exactly these texts
 * and links.
 */
/** The REPL's own decoding of its hash: URI component, base64, UTF-8. */
function codeFromUrl(url: string): string {
  const binary = atob(decodeURIComponent(new URL(url).hash.slice(1)));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

let wrapper: VueWrapper | undefined;
let store: ReturnType<typeof usePhrasesStore>;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("indexedDB", new IDBFactory());
  setActivePinia(createPinia());
  store = usePhrasesStore();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  store.removeEventListeners();
  store.$dispose();
  vi.unstubAllGlobals();
});

function tap(noteId: string, noteName: string, solfegeIndex: number, at: number, holdMs: number) {
  store.handleNotePressed({ detail: { noteId, noteName, solfegeIndex, octave: 4, timestamp: at } } as CustomEvent);
  store.handleNoteReleased({ detail: { noteId, timestamp: at + holdMs } } as CustomEvent);
}

describe("Open in Strudel writes the same code text as before Strudel left", () => {
  it("for every library phrase and a recorded take", async () => {
    // A take played on the keys, then kept, so the shelf exports it by id.
    tap("t1", "C4", 0, 1_000, 400);
    tap("t2", "E4", 2, 1_500, 250);
    tap("t3", "G4", 4, 1_800, 600);
    tap("t4", "A4", 5, 2_600, 120);
    const kept = store.keepTake()!;
    const opened: string[] = [];
    vi.spyOn(window, "open").mockImplementation((url) => { opened.push(String(url)); return null; });
    wrapper = mount(PhraseShelf, { global: { stubs: { PatternReel: true } } });
    await nextTick();
    const reel = wrapper.findComponent({ name: "PatternReel" });
    const targets = [...libraryPhrases.map((phrase) => [phrase.id, phrase.id]), ["recorded take", kept]];
    const links: Record<string, { code: string; url: string }> = {};
    for (const [name, id] of targets) {
      opened.length = 0;
      reel.vm.$emit("openStrudel", id);
      await nextTick();
      expect(opened, name).toHaveLength(1);
      links[name] = { code: codeFromUrl(opened[0]), url: opened[0] };
    }

    expect(Object.keys(links)).toEqual(Object.keys(golden));
    for (const [name, link] of Object.entries(links)) {
      expect(link.code, name).toBe((golden as typeof links)[name].code);
      expect(link.url, name).toBe((golden as typeof links)[name].url);
    }
  });
});
