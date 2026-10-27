import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { useMusicStore } from "@/stores/music";
import { patternNoteIdentity } from "@/services/patternMember";
import type { ChromaticNote } from "@/types/music";
import { musicTheory } from "@/services/music";

// Keep the store and theory real; replace only the browser audio graph. The audio-side probe is the identity a pattern
// note gets from the shared theory context at the moment it is built.
vi.mock("@/services/audioRuntime", () => ({
  getAudioContext: () => ({ state: "running", currentTime: 12 }),
  getMasterGain: () => null,
  initializeAudio: vi.fn(),
  LIVE_ORBIT: 2,
}));

let pinia: Pinia;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  pinia = createPinia().use(piniaPluginPersistedstate);
  createApp({}).use(pinia);
  setActivePinia(pinia);
});

afterEach(() => {
  disposePinia(pinia);
  vi.clearAllTimers();
  vi.useRealTimers();
  localStorage.clear();
});

function expectDisplayContext(music: ReturnType<typeof useMusicStore>) {
  expect(music.currentKeyDisplay).toBe("D Harmonic Minor");
  expect(music.currentScale.degreeCount).toBe(7);
  expect(music.currentScaleNotes).toEqual(["D", "E", "F", "G", "A", "A#", "C#"]);
  expect(music.solfegeData.map(note => note.name)).toEqual(["Do", "Re", "Me", "Fa", "Sol", "Le", "Ti"]);
  expect(music.getNoteName(2, 4)).toBe("F4");
}

/** What a pattern note built now would carry: the shared theory context. */
function probe(noteName: string) {
  const key = musicTheory.getCurrentKey() as ChromaticNote;
  const mode = musicTheory.getCurrentMode();
  return { key, mode, ...patternNoteIdentity(noteName, key, mode) };
}

function expectAudioContext() {
  expect([probe("F4")]).toEqual([
    expect.objectContaining({
      key: "D", mode: "harmonic minor", noteName: "F4", solfegeIndex: 2,
      solfege: expect.objectContaining({ name: "Me" }),
    }),
  ]);
}

describe("shared musical context", () => {
  it.each([["Db", "C#"], ["invalid", "C"], [null, "C"]])(
    "normalizes persisted key %s in the ref and shared context while restoring mode",
    async (key, expectedKey) => {
      localStorage.setItem("music", JSON.stringify({ currentKey: key, currentMode: "harmonic minor" }));
      const music = useMusicStore();
      const output = probe(`${expectedKey}4`);
      expect(output).toMatchObject({
        key: expectedKey, mode: "harmonic minor", solfege: { name: "Do" },
      });
      expect(music.currentKey).toBe(expectedKey);
      expect(music.currentMode).toBe("harmonic minor");
      expect(musicTheory.getCurrentKey()).toBe(expectedKey);
      expect(musicTheory.getCurrentMode()).toBe("harmonic minor");
      expect(music.currentKeyDisplay).toBe(`${expectedKey} Harmonic Minor`);
      expect(music.currentScaleNotes[0]).toBe(expectedKey);
    },
  );

  it("updates key and mode independently, including sparse scales and borrowed pitches", async () => {
    const music = useMusicStore();
    expect(music.currentScaleNotes[0]).toBe("C");
    expect(music.currentScale.degreeCount).toBe(7);

    music.setKey("G");
    const firstOutput = probe("C5");
    expect(firstOutput).toMatchObject({
      key: "G", mode: "major", solfegeIndex: 3, keyboardOctave: 4, solfege: { name: "Fa" },
    });
    expect(music.currentKeyDisplay).toBe("G Major");
    expect(music.currentScaleNotes).toEqual(["G", "A", "B", "C", "D", "E", "F#"]);

    music.setMode("major pentatonic");
    const secondOutput = probe("C5");
    expect(secondOutput).toMatchObject({
      key: "G", mode: "major pentatonic", solfegeIndex: -1, solfege: { name: "Fa" },
    });
    expect(music.currentKeyDisplay).toBe("G Major Pentatonic");
    expect(music.currentScale.degreeCount).toBe(5);
    expect(music.currentScaleNotes).toEqual(["G", "A", "B", "D", "E"]);
    expect(music.solfegeData.map(note => note.name)).toEqual(["Do", "Re", "Mi", "Sol", "La"]);
  });

  it.each(["actions", "patch", "direct"] as const)(
    "updates audio and cached display getters in the same tick through %s",
    async change => {
      const music = useMusicStore();
      // Populate the display caches before changing context.
      expect(music.currentKeyDisplay).toBe("C Major");
      expect(music.currentScaleNotes[2]).toBe("E");
      expect(music.solfegeData[2].name).toBe("Mi");
      expect(music.currentScale.solfege[2].name).toBe("Mi");

      if (change === "actions") {
        music.setKey("D");
        music.setMode("harmonic minor");
      } else if (change === "patch") {
        music.$patch({ currentKey: "D", currentMode: "harmonic minor" });
      } else {
        music.currentKey = "D";
        music.currentMode = "harmonic minor";
      }

      // Audio must see the new context before any display getter can run.
      // The adapter publishes its Stage payload synchronously on submission.
      const output = probe("F4");
      expectAudioContext();
      expectDisplayContext(music);
    },
  );

  it("restores the existing persisted key and mode before audio or display reads", async () => {
    localStorage.setItem("music", JSON.stringify({ currentKey: "D", currentMode: "harmonic minor" }));
    const music = useMusicStore();

    const output = probe("F4");
    expectAudioContext();
    expectDisplayContext(music);
  });
});
