import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { createTestPinia } from "../helpers/test-utils";
import PhraseShelf from "@/components/patterns/PhraseShelf.vue";
import { decodePhraseShare, phraseShareToken } from "@/services/phraseShare";
import { libraryPhrases, usePhrasesStore } from "@/stores/phrases";

vi.mock("@/services/superdoughAudio", () => ({
  setStrudelLaBasedMinor: vi.fn(),
  setLiveSynthControls: vi.fn(),
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  stopNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
  initSuperdoughAudio: vi.fn().mockResolvedValue(undefined),
  isPrewarmed: vi.fn().mockReturnValue(true),
  prewarmSoundSamples: vi.fn().mockResolvedValue(undefined),
  getAudioContext: vi.fn(() => ({ state: "running", currentTime: 0 })),
  playStrudelCode: vi.fn().mockResolvedValue(undefined),
  stopStrudelPlayback: vi.fn(),
}));

const library = libraryPhrases[libraryPhrases.length - 1];

function shareButton(wrapper: ReturnType<typeof mount>, name: string) {
  const button = wrapper.findAll('[data-action="share"]')
    .find((candidate) => candidate.attributes("aria-label")?.includes(name));
  if (!button) throw new Error(`No share button for ${name}`);
  return button;
}

async function linkedPhrase(url: string) {
  return decodePhraseShare(phraseShareToken(new URL(url).hash)!);
}

describe("sharing a phrase from the reel", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createTestPinia());
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      media: "",
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    // On the desk, only looked at: the strip is a copy that carries its source's name.
    usePhrasesStore().openPhrase(library.id);
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });

  afterEach(() => {
    usePhrasesStore().removeEventListeners();
    vi.unstubAllGlobals();
  });

  it("copies a link that opens the same phrase, in its own key and sound", async () => {
    const wrapper = mount(PhraseShelf);
    await shareButton(wrapper, library.name!).trigger("click");
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await flushPromises();

    const url = writeText.mock.calls[0][0] as string;
    expect(url.startsWith(`${window.location.origin}/#phrase=`)).toBe(true);
    const received = await linkedPhrase(url);
    expect(received?.name).toBe(library.name);
    expect(received?.context).toMatchObject({
      key: library.context.key,
      mode: library.context.mode,
      bpm: library.context.bpm,
      shape: library.context.shape,
    });
    expect(received?.notes.map((note) => note.note)).toEqual(library.notes.map((note) => note.note));
    // The button says the link is on the clipboard.
    expect(shareButton(wrapper, library.name!).attributes("aria-label")).toBe(`Copied a link to ${library.name}`);
  });

  it("hands the link to the phone's share sheet where there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const wrapper = mount(PhraseShelf);
    await shareButton(wrapper, library.name!).trigger("click");
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    await flushPromises();

    expect(share.mock.calls[0][0].title).toBe(library.name);
    expect((await linkedPhrase(share.mock.calls[0][0].url))?.name).toBe(library.name);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("sends nothing when the player closes the share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const wrapper = mount(PhraseShelf);
    await shareButton(wrapper, library.name!).trigger("click");
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    await flushPromises();
    expect(writeText).not.toHaveBeenCalled();
  });
});
