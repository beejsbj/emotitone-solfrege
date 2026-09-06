import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, type EffectScope } from "vue";
import type { ActiveNote, HarmonicGeometryConfig } from "@/types";
import { useHarmonicAnalysis } from "@/composables/useHarmonicAnalysis";
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
  } satisfies HarmonicGeometryConfig,
  floatingPopupConfig: null as {
    value: HarmonicGeometryConfig;
  } | null,
}));

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
  let scope: EffectScope;

  const createAnalysis = () => {
    scope = effectScope();
    return scope.run(() => useHarmonicAnalysis())!;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    harmonicTestState.floatingPopupConfig!.value = {
      ...harmonicTestState.baseConfig,
    };
  });

  afterEach(() => {
    scope?.stop();
    vi.useRealTimers();
  });

  it("defaults harmonic geometry to outline mode", () => {
    expect(DEFAULT_CONFIG.floatingPopup.geometryMode).toBe("outline");
  });

  it("keeps event-driven harmonic history visible until its timing window expires", async () => {
    const { snapshot, notePlayed, noteReleased } = createAnalysis();
    const c4 = createActiveNote("note-c4", "C4", "Do", "Grounded");
    const e4 = createActiveNote("note-e4", "E4", "Mi", "Radiant");

    notePlayed(c4);
    notePlayed(e4);

    expect(snapshot.value.isVisible).toBe(true);
    expect(snapshot.value.displayedNotes).toHaveLength(2);
    expect(snapshot.value.intervalEdges).toHaveLength(1);
    expect(snapshot.value.intervalEdges[0].interval).toBe("3M");
    expect(snapshot.value.emotionalDescription).toBe("Grounded & Radiant");

    noteReleased(c4.noteId);
    vi.advanceTimersByTime(360);
    await nextTick();
    expect(snapshot.value.isVisible).toBe(true);

    noteReleased(e4.noteId);
    vi.advanceTimersByTime(359);
    await nextTick();
    expect(snapshot.value.isVisible).toBe(true);

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(snapshot.value.isVisible).toBe(false);
    expect(snapshot.value.displayedNotes).toEqual([]);
  });

  it("keeps harmonic relationships available when interval labels are hidden", async () => {
    harmonicTestState.floatingPopupConfig!.value = {
      ...harmonicTestState.floatingPopupConfig!.value,
      maxNotes: 2,
      showChord: false,
      showIntervals: false,
      showEmotionalDescription: false,
    };

    const { snapshot, notePlayed } = createAnalysis();

    notePlayed(createActiveNote("note-c4", "C4", "Do"));
    notePlayed(createActiveNote("note-e4", "E4", "Mi"));
    notePlayed(createActiveNote("note-g4", "G4", "So"));
    await nextTick();

    expect(snapshot.value.displayedNotes.map((note) => note.noteName)).toEqual([
      "E4",
      "G4",
    ]);
    expect(snapshot.value.intervalEdges).toHaveLength(1);
    expect(snapshot.value.chordLabel).toBe(null);
    expect(snapshot.value.emotionalDescription).toBe("");
  });
});
