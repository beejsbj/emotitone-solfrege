import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { ActiveNote, FloatingPopupConfig } from "@/types";
import {
  resetHarmonicAnalysisState,
  useHarmonicAnalysis,
} from "@/composables/useHarmonicAnalysis";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";

const harmonicTestState = vi.hoisted(() => ({
  baseConfig: {
    isEnabled: true,
    accumulationWindow: 120,
    hideDelay: 240,
    maxNotes: 7,
    showChord: true,
    showIntervals: true,
    showEmotionalDescription: true,
    geometryMode: "outline",
    backdropBlur: 1,
    glassmorphOpacity: 0.4,
    animationDuration: 300,
    opacity: 0.5,
  } satisfies FloatingPopupConfig,
  activeNotes: null as { value: ActiveNote[] } | null,
  floatingPopupConfig: null as {
    value: FloatingPopupConfig;
  } | null,
}));

vi.mock("@/stores/music", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  const activeNotes = ref<ActiveNote[]>([]);
  harmonicTestState.activeNotes = activeNotes;

  return {
    useMusicStore: () => ({
      getActiveNotes: () => activeNotes.value,
    }),
  };
});

vi.mock("@/composables/useVisualConfig", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  const floatingPopupConfig = ref({
    ...harmonicTestState.baseConfig,
  });
  harmonicTestState.floatingPopupConfig = floatingPopupConfig;

  return {
    useVisualConfig: () => ({
      floatingPopupConfig,
    }),
  };
});

function createActiveNote(
  noteId: string,
  noteName: string,
  solfegeName: string,
  emotion = "Radiant"
): ActiveNote {
  const octave = Number(noteName.at(-1) ?? 4);

  return {
    solfegeIndex: 0,
    solfege: {
      name: solfegeName,
      number: 1,
      emotion,
      description: `${solfegeName} note`,
      fleckShape: "circle",
      texture: "soft",
      intervalName: "1P",
      semitones: 0,
    },
    frequency: 440,
    octave,
    noteId,
    noteName,
    mode: "major",
    key: "C",
  };
}

describe("useHarmonicAnalysis", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetHarmonicAnalysisState();
    harmonicTestState.activeNotes!.value = [];
    harmonicTestState.floatingPopupConfig!.value = {
      ...harmonicTestState.baseConfig,
    };
  });

  afterEach(() => {
    resetHarmonicAnalysisState();
    vi.useRealTimers();
  });

  it("defaults harmonic geometry to outline mode", () => {
    expect(DEFAULT_CONFIG.floatingPopup.geometryMode).toBe("outline");
  });

  it("keeps a shared harmonic snapshot visible until the configured timing window expires", async () => {
    const { snapshot } = useHarmonicAnalysis();

    harmonicTestState.activeNotes!.value = [
      createActiveNote("note-c4", "C4", "Do", "Grounded"),
      createActiveNote("note-e4", "E4", "Mi", "Radiant"),
    ];
    await nextTick();

    expect(snapshot.value.isVisible).toBe(true);
    expect(snapshot.value.displayedNotes).toHaveLength(2);
    expect(snapshot.value.intervalEdges).toHaveLength(1);
    expect(snapshot.value.emotionalDescription).toBe("Grounded & Radiant");

    harmonicTestState.activeNotes!.value = [];
    await nextTick();

    expect(snapshot.value.isVisible).toBe(true);

    vi.advanceTimersByTime(359);
    await nextTick();
    expect(snapshot.value.isVisible).toBe(true);

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(snapshot.value.isVisible).toBe(false);
    expect(snapshot.value.displayedNotes).toEqual([]);
  });

  it("caps displayed notes and respects label toggles", async () => {
    harmonicTestState.floatingPopupConfig!.value = {
      ...harmonicTestState.floatingPopupConfig!.value,
      maxNotes: 2,
      showChord: false,
      showIntervals: false,
      showEmotionalDescription: false,
    };

    const { snapshot } = useHarmonicAnalysis();

    harmonicTestState.activeNotes!.value = [
      createActiveNote("note-c4", "C4", "Do"),
      createActiveNote("note-e4", "E4", "Mi"),
      createActiveNote("note-g4", "G4", "So"),
    ];
    await nextTick();

    expect(snapshot.value.displayedNotes).toHaveLength(2);
    expect(snapshot.value.displayedNotes.map((note) => note.noteName)).toEqual([
      "E4",
      "G4",
    ]);
    expect(snapshot.value.intervalEdges).toEqual([]);
    expect(snapshot.value.chordLabel).toBe(null);
    expect(snapshot.value.emotionalDescription).toBe("");
  });
});
