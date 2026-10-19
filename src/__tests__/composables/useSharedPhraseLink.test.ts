import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { setActivePinia } from "pinia";
import { createTestPinia } from "../helpers/test-utils";
import {
  sharedPhraseNotice,
  useSharedPhraseLink,
} from "@/composables/useSharedPhraseLink";
import { phraseShareUrl, type SharedPhrase } from "@/services/phraseShare";
import { useInstrumentStore } from "@/stores/instrument";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";

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

const shared: SharedPhrase = {
  name: "Sunday hum",
  notes: [
    { id: "a", note: "D4", octave: 4, scaleDegree: 1, scaleIndex: 0, pressTime: 0, releaseTime: 300, duration: 300 },
    { id: "b", note: "F4", octave: 4, scaleDegree: 3, scaleIndex: 2, pressTime: 400, releaseTime: 700, duration: 300 },
    { id: "c", note: "A4", octave: 4, scaleDegree: 5, scaleIndex: 4, pressTime: 800, releaseTime: 1200, duration: 400 },
  ],
  context: {
    key: "D",
    mode: "minor",
    instrument: "sawtooth",
    bpm: 84,
    shape: { cutoff: 2600, resonance: 3, room: 0.4, delay: 0.25, attack: null, release: 0.9 },
    octave: 3,
  },
  // A whole bar of silence after the last note, as authored.
  duration: 2857,
};

async function settle() {
  for (let index = 0; index < 20; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
  }
}

describe("opening a phrase link", () => {
  let scope = effectScope();

  beforeEach(() => {
    scope = effectScope();
    localStorage.clear();
    setActivePinia(createTestPinia());
    useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
    sharedPhraseNotice.value = null;
  });

  afterEach(() => {
    scope.stop();
    usePhrasesStore().removeEventListeners();
    window.history.replaceState(null, "", "/");
  });

  async function openLink(hash: string) {
    window.history.replaceState(null, "", `/${hash}`);
    const isLoading = ref(true);
    scope.run(() => useSharedPhraseLink(isLoading));
    return isLoading;
  }

  it("puts the phrase on the desk, in the world it was played in, once the app has started", async () => {
    const url = new URL(await phraseShareUrl(shared, "https://emotitone.app/"));
    const phrases = usePhrasesStore();
    const isLoading = await openLink(url.hash);
    await settle();
    // Nothing moves while the splash is up.
    expect(phrases.takeNotes).toEqual([]);

    isLoading.value = false;
    await settle();

    expect(phrases.take.name).toBe("Sunday hum");
    expect(phrases.takeNotes.map((note) => [note.note, note.pressTime, note.duration]))
      .toEqual([["D4", 0, 300], ["F4", 400, 300], ["A4", 800, 400]]);
    expect(phrases.takeDuration).toBe(2857);
    // The controls follow the phrase, as when you open one from the reel.
    expect(useMusicStore().currentKey).toBe("D");
    expect(useMusicStore().currentMode).toBe("minor");
    expect(useVisualConfigStore().config.codeStrip.bpm).toBe(84);
    expect(useKeyboardDrawerStore().keyboardConfig.mainOctave).toBe(3);
    expect(useInstrumentStore().shape).toEqual(shared.context.shape);
    // A reload must not open it a second time.
    expect(window.location.hash).toBe("");
    expect(sharedPhraseNotice.value).toBe("Sunday hum is on the desk. Press play.");
  });

  it("files the phrase in Recent when you move on, like anything else you played", async () => {
    const url = new URL(await phraseShareUrl(shared, "https://emotitone.app/"));
    const phrases = usePhrasesStore();
    const isLoading = await openLink(url.hash);
    isLoading.value = false;
    await settle();

    const id = phrases.takeId;
    phrases.startBlankTake();
    expect(phrases.findPhrase(id)?.shelf).toBe("recent");
    expect(phrases.findPhrase(id)?.name).toBe("Sunday hum");
  });

  it("says so, and changes nothing, when the link is broken", async () => {
    const phrases = usePhrasesStore();
    const before = { key: useMusicStore().currentKey, take: phrases.takeId };
    const isLoading = await openLink("#phrase=zNotAPhrase");
    isLoading.value = false;
    await settle();

    expect(phrases.takeId).toBe(before.take);
    expect(useMusicStore().currentKey).toBe(before.key);
    expect(window.location.hash).toBe("");
    expect(sharedPhraseNotice.value).toBe("That phrase link could not be opened");
  });

  it("leaves an ordinary visit alone", async () => {
    const phrases = usePhrasesStore();
    const before = phrases.takeId;
    const isLoading = await openLink("");
    isLoading.value = false;
    await settle();
    expect(phrases.takeId).toBe(before);
    expect(sharedPhraseNotice.value).toBeNull();
  });
});
