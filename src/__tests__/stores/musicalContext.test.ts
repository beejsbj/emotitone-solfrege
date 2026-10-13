import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { useMusicStore } from "@/stores/music";
import * as audio from "@/services/superdoughAudio";

vi.unmock("@/services/superdoughAudio");

// Keep the store, theory, and audio presentation adapter real; replace only
// the browser audio graph and the external sound engine.
vi.mock("@/services/audioRuntime", () => ({
  getAudioContext: () => ({ state: "running", currentTime: 12 }),
  getMasterGain: () => null,
  initializeAudio: vi.fn(),
  LIVE_ORBIT: 2,
}));
vi.mock("@strudel/webaudio", () => ({ webaudioOutput: vi.fn().mockResolvedValue(undefined) }));
vi.mock("superdough", () => ({
  superdough: vi.fn(), registerSynthSounds: vi.fn(), samples: vi.fn(),
  loadBuffer: vi.fn(), getSound: vi.fn(), soundMap: { get: () => ({}) },
  hasVoice: vi.fn(), stopVoice: vi.fn(), cancelVoice: vi.fn(),
  releaseVoice: vi.fn(), releaseAllVoices: vi.fn(),
  registerSound: vi.fn(),
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
  audio.stopStrudelVisuals();
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

function expectAudioContext() {
  expect(audio.getActiveStrudelStageNotes()).toEqual([
    expect.objectContaining({
      key: "D", mode: "harmonic minor", noteName: "F4", solfegeIndex: 2,
      solfege: expect.objectContaining({ name: "Me" }),
    }),
  ]);
}

describe("shared musical context", () => {
  it("updates key and mode independently, including sparse scales and borrowed pitches", async () => {
    const music = useMusicStore();
    expect(music.currentScaleNotes[0]).toBe("C");
    expect(music.currentScale.degreeCount).toBe(7);

    music.setKey("G");
    const firstOutput = audio.emotitoneStrudelOutput({ value: { note: "C5", s: "piano" } }, 12, .25, 1, 12);
    expect(audio.getActiveStrudelStageNotes()[0]).toMatchObject({
      key: "G", mode: "major", solfegeIndex: 3, keyboardOctave: 4, solfege: { name: "Fa" },
    });
    expect(music.currentKeyDisplay).toBe("G Major");
    expect(music.currentScaleNotes).toEqual(["G", "A", "B", "C", "D", "E", "F#"]);
    audio.stopStrudelVisuals();

    music.setMode("major pentatonic");
    const secondOutput = audio.emotitoneStrudelOutput({ value: { note: "C5", s: "piano" } }, 12, .25, 1, 12);
    expect(audio.getActiveStrudelStageNotes()[0]).toMatchObject({
      key: "G", mode: "major pentatonic", solfegeIndex: -1, solfege: { name: "Fa" },
    });
    expect(music.currentKeyDisplay).toBe("G Major Pentatonic");
    expect(music.currentScale.degreeCount).toBe(5);
    expect(music.currentScaleNotes).toEqual(["G", "A", "B", "D", "E"]);
    expect(music.solfegeData.map(note => note.name)).toEqual(["Do", "Re", "Mi", "Sol", "La"]);
    await Promise.all([firstOutput, secondOutput]);
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
      const output = audio.emotitoneStrudelOutput({ value: { note: "F4", s: "piano" } }, 12, .25, 1, 12);
      expectAudioContext();
      expectDisplayContext(music);
      await output;
    },
  );

  it("restores the existing persisted key and mode before audio or display reads", async () => {
    localStorage.setItem("music", JSON.stringify({ currentKey: "D", currentMode: "harmonic minor" }));
    const music = useMusicStore();

    const output = audio.emotitoneStrudelOutput({ value: { note: "F4", s: "piano" } }, 12, .25, 1, 12);
    expectAudioContext();
    expectDisplayContext(music);
    await output;
  });
});
